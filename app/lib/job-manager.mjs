import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  AppError,
  CancellationError,
  JobConflictError,
  JobNotFoundError,
  ValidationError,
} from './errors.mjs';
import { sanitizeLog } from './utils.mjs';

const QUEUE_STATE_FILE = '.queue-state.json';

export class JobManager {
  constructor({ jobsDir, maxConcurrentJobs = 1, runner = null, loggerFactory = null } = {}) {
    if (!jobsDir) throw new ValidationError('缺少任務資料夾');
    this.jobsDir = path.resolve(jobsDir);
    this.maxConcurrentJobs = Math.max(1, Math.floor(Number(maxConcurrentJobs) || 1));
    this.runner = runner;
    this.loggerFactory = loggerFactory;
    this.runningJobs = new Map();
    this.jobQueue = [];
    this.activeJobCount = 0;
    this.jobsListCache = null;
    fs.mkdirSync(this.jobsDir, { recursive: true });
    this.restoreQueueState();
  }

  getJobRoot(jobId) {
    const safeId = String(jobId || '').trim();
    if (!/^[A-Za-z0-9_-]+$/.test(safeId)) throw new ValidationError('無效的任務 ID');
    const root = path.resolve(this.jobsDir, safeId);
    if (path.relative(this.jobsDir, root).startsWith('..'))
      throw new ValidationError('任務路徑超出資料夾');
    return root;
  }

  loadJob(jobId) {
    const jobRoot = this.getJobRoot(jobId);
    try {
      const config = JSON.parse(fs.readFileSync(path.join(jobRoot, 'job-config.json'), 'utf8'));
      const status = JSON.parse(fs.readFileSync(path.join(jobRoot, 'job-status.json'), 'utf8'));
      return { jobRoot, config, status };
    } catch (error) {
      if (error?.code === 'ENOENT') return null;
      throw new AppError(`讀取任務失敗：${jobId}`, { code: 'JOB_READ_FAILED', cause: error });
    }
  }

  createJob({ fields = {}, files = {} } = {}) {
    if (!files.video || Number(files.video.size || 0) <= 0)
      throw new ValidationError('請選擇有效的影片或音訊檔案');
    const stamp = new Date()
      .toISOString()
      .replace(/[-:T.Z]/g, '')
      .slice(0, 14);
    const jobId = `${stamp}-${crypto.randomBytes(3).toString('hex')}`;
    const jobRoot = this.getJobRoot(jobId);
    for (const directory of ['input', 'working', 'review-output', 'output', 'logs']) {
      fs.mkdirSync(path.join(jobRoot, directory), { recursive: true });
    }
    const config = {
      jobId,
      createdAt: new Date().toISOString(),
      language: fields.language || 'zh-TW',
      requirements: fields.requirements || '',
      files: {
        video: files.video.filename || null,
        ruleFile: files.ruleFile?.filename || null,
        existingSrt: files.existingSrt?.filename || null,
      },
    };
    const status = {
      jobId,
      status: 'created',
      stage: 'created',
      progress: 0,
      message: '任務已建立，等待開始處理',
      logs: ['建立任務資料夾與設定檔'],
      metrics: {},
      folder: jobRoot,
      files: {},
      updatedAt: new Date().toISOString(),
    };
    this.writeJobFiles({ jobRoot, config, status });
    this.jobsListCache = null;
    return { jobId, folder: jobRoot, status };
  }

  writeJobFiles({ jobRoot, config, status }) {
    fs.writeFileSync(
      path.join(jobRoot, 'job-config.json'),
      `${JSON.stringify(config, null, 2)}\n`,
      'utf8'
    );
    fs.writeFileSync(
      path.join(jobRoot, 'job-status.json'),
      `${JSON.stringify(status, null, 2)}\n`,
      'utf8'
    );
  }

  saveStatus(job) {
    fs.writeFileSync(
      path.join(job.jobRoot, 'job-status.json'),
      `${JSON.stringify(job.status, null, 2)}\n`,
      'utf8'
    );
    this.jobsListCache = null;
  }

  updateJob(job, patch = {}, logMessage = '') {
    job.status = { ...job.status, ...patch, updatedAt: new Date().toISOString() };
    const cleanLog = sanitizeLog(logMessage);
    if (cleanLog) job.status.logs = [...(job.status.logs || []), cleanLog].slice(-120);
    this.saveStatus(job);
    return job;
  }

  listJobs() {
    if (this.jobsListCache) return this.jobsListCache;
    this.jobsListCache = fs
      .readdirSync(this.jobsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => this.loadJob(entry.name))
      .filter(Boolean)
      .sort((a, b) => new Date(b.config.createdAt || 0) - new Date(a.config.createdAt || 0));
    return this.jobsListCache;
  }

  startJob(jobId, runner = this.runner) {
    const job = this.loadJob(jobId);
    if (!job) throw new JobNotFoundError(jobId);
    if (!['created', 'failed', 'cancelled', 'interrupted'].includes(job.status.status)) {
      throw new JobConflictError('任務目前不可開始或重試');
    }
    if (!runner) throw new AppError('尚未設定任務執行器', { code: 'RUNNER_NOT_CONFIGURED' });
    const controller = new AbortController();
    this.runningJobs.set(jobId, { job, controller });
    this.jobQueue.push({ jobId, job, controller, runner });
    this.updateJob(job, { status: 'queued', stage: 'queued', message: '任務已加入佇列' });
    this.persistQueueState();
    this.drainJobQueue();
    return job;
  }

  async drainJobQueue() {
    while (this.activeJobCount < this.maxConcurrentJobs && this.jobQueue.length) {
      const entry = this.jobQueue.shift();
      if (!entry || entry.controller.signal.aborted) continue;
      this.activeJobCount += 1;
      this.updateJob(entry.job, { status: 'running', stage: 'running', message: '任務處理中' });
      void Promise.resolve()
        .then(() => entry.runner(entry.job, entry.controller.signal))
        .then(() => {
          const latest = this.loadJob(entry.jobId) || entry.job;
          if (!entry.controller.signal.aborted && latest.status.status === 'running') {
            this.updateJob(latest, {
              status: 'completed',
              stage: 'completed',
              progress: 100,
              message: '任務完成',
            });
          }
        })
        .catch((error) => {
          const latest = this.loadJob(entry.jobId) || entry.job;
          if (entry.controller.signal.aborted || error instanceof CancellationError) {
            this.updateJob(latest, {
              status: 'cancelled',
              stage: 'cancelled',
              message: error.message || '操作已取消',
            });
          } else {
            this.updateJob(
              latest,
              { status: 'failed', stage: 'failed', message: error.message || '任務失敗' },
              error.message
            );
          }
        })
        .finally(() => {
          this.runningJobs.delete(entry.jobId);
          this.activeJobCount = Math.max(0, this.activeJobCount - 1);
          this.persistQueueState();
          void this.drainJobQueue();
        });
    }
    this.persistQueueState();
  }

  cancelJob(jobId) {
    const entry = this.runningJobs.get(jobId);
    const job = entry?.job || this.loadJob(jobId);
    if (!job) throw new JobNotFoundError(jobId);
    entry?.controller.abort();
    this.jobQueue = this.jobQueue.filter((queued) => queued.jobId !== jobId);
    this.updateJob(job, { status: 'cancelled', stage: 'cancelled', message: '任務已取消' });
    this.persistQueueState();
    return job;
  }

  retryJob(jobId, runner = this.runner) {
    const job = this.loadJob(jobId);
    if (!job) throw new JobNotFoundError(jobId);
    if (!['failed', 'cancelled', 'interrupted'].includes(job.status.status))
      throw new JobConflictError('只有失敗、中止或取消的任務可以重試');
    return this.startJob(jobId, runner);
  }

  persistQueueState() {
    const state = {
      queue: this.jobQueue.map(({ jobId }) => jobId),
      activeCount: this.activeJobCount,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(
      path.join(this.jobsDir, QUEUE_STATE_FILE),
      `${JSON.stringify(state, null, 2)}\n`,
      'utf8'
    );
  }

  restoreQueueState() {
    const statePath = path.join(this.jobsDir, QUEUE_STATE_FILE);
    try {
      const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      for (const jobId of Array.isArray(state.queue) ? state.queue : []) {
        const job = this.loadJob(jobId);
        if (job && ['queued', 'created'].includes(job.status.status))
          this.jobQueue.push({
            jobId,
            job,
            controller: new AbortController(),
            runner: this.runner,
          });
      }
      for (const job of this.listJobs()) {
        if (job.status.status === 'running')
          this.updateJob(job, {
            status: 'interrupted',
            stage: 'interrupted',
            message: '伺服器重新啟動，中斷任務可重試',
          });
      }
      this.activeJobCount = 0;
    } catch {
      this.jobQueue = [];
      this.activeJobCount = 0;
    }
  }
}

export { QUEUE_STATE_FILE };
