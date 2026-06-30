import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';

const appDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(appDir, 'public');
const jobsDir = path.join(appDir, 'jobs');
const toolsDir = path.join(appDir, 'tools');
const port = Number(process.env.PORT || 8790);

const toolPaths = {
  node: path.join(toolsDir, 'node', 'node.exe'),
  ffmpeg: path.join(toolsDir, 'ffmpeg', 'bin', 'ffmpeg.exe'),
  python: path.join(toolsDir, 'python-venv', 'Scripts', 'python.exe'),
  whisper: path.join(toolsDir, 'python-venv', 'Scripts', 'whisper.exe'),
  whisperModels: path.join(toolsDir, 'whisper-models'),
};

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.srt': 'text/plain; charset=utf-8',
  '.vtt': 'text/vtt; charset=utf-8',
  '.png': 'image/png',
  '.mp4': 'video/mp4',
  '.m4v': 'video/x-m4v',
  '.mov': 'video/quicktime',
};

fs.mkdirSync(jobsDir, { recursive: true });
fs.mkdirSync(toolPaths.whisperModels, { recursive: true });

const runningJobs = new Map();

function sendJson(res, status, value) {
  const body = JSON.stringify(value, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function sendText(res, status, text) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(text);
}

function readRequest(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function readJsonBody(req) {
  return JSON.parse((await readRequest(req)).toString('utf8') || '{}');
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function parseMultipart(buffer, contentType = '') {
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) throw new Error('Missing multipart boundary');
  const boundary = `--${boundaryMatch[1] || boundaryMatch[2]}`;
  const raw = buffer.toString('latin1');
  const fields = {};
  const files = {};

  for (const part of raw.split(boundary).slice(1, -1)) {
    const clean = part.replace(/^\r\n/, '').replace(/\r\n$/, '');
    const splitIndex = clean.indexOf('\r\n\r\n');
    if (splitIndex < 0) continue;
    const header = clean.slice(0, splitIndex);
    const bodyLatin1 = clean.slice(splitIndex + 4);
    const name = header.match(/name="([^"]+)"/i)?.[1];
    if (!name) continue;
    const filename = header.match(/filename="([^"]*)"/i)?.[1];
    const body = Buffer.from(bodyLatin1, 'latin1');
    const value = body.subarray(0, body.length >= 2 && body.at(-2) === 13 && body.at(-1) === 10 ? body.length - 2 : body.length);
    if (filename) {
      files[name] = { filename: path.basename(filename), buffer: value };
    } else {
      fields[name] = value.toString('utf8').trim();
    }
  }
  return { fields, files };
}

function loadJob(jobId) {
  const jobRoot = path.join(jobsDir, jobId);
  const configPath = path.join(jobRoot, 'job-config.json');
  const statusPath = path.join(jobRoot, 'job-status.json');
  if (!fs.existsSync(configPath) || !fs.existsSync(statusPath)) return null;
  return {
    jobRoot,
    config: readJson(configPath),
    status: readJson(statusPath),
  };
}

function saveStatus(job) {
  writeJson(path.join(job.jobRoot, 'job-status.json'), job.status);
}

function updateJob(job, patch, log) {
  job.status = { ...job.status, ...patch, updatedAt: new Date().toISOString() };
  const cleanLog = sanitizeLog(log);
  if (cleanLog) job.status.logs = [...(job.status.logs || []), cleanLog].slice(-120);
  saveStatus(job);
}

function sanitizeLog(value) {
  if (!value) return '';
  return String(value)
    .replace(/\r/g, '\n')
    .replace(/\u001b\[[0-9;?]*[A-Za-z]/g, '')
    .replace(/[�]+/g, '')
    .split('\n')
    .map((line) => line.trim().replace(/[^\S\r\n]+/g, ' '))
    .filter((line) => line && !/^[\s\-=|/\\_.:,%\d]+$/.test(line))
    .join('\n')
    .slice(0, 500);
}

function createJob({ fields, files }) {
  const stamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const jobId = `${stamp}-${crypto.randomBytes(3).toString('hex')}`;
  const jobRoot = path.join(jobsDir, jobId);
  const inputDir = path.join(jobRoot, 'input');
  const workingDir = path.join(jobRoot, 'working');
  const reviewOutputDir = path.join(jobRoot, 'review-output');
  const outputDir = path.join(jobRoot, 'output');
  const logsDir = path.join(jobRoot, 'logs');
  for (const dir of [inputDir, workingDir, reviewOutputDir, outputDir, logsDir]) fs.mkdirSync(dir, { recursive: true });

  if (files.video) fs.writeFileSync(path.join(inputDir, files.video.filename || 'media.mp4'), files.video.buffer);
  if (files.ruleFile) fs.writeFileSync(path.join(inputDir, files.ruleFile.filename || 'rule.txt'), files.ruleFile.buffer);
  if (files.existingSrt) fs.writeFileSync(path.join(inputDir, files.existingSrt.filename || 'source.srt'), files.existingSrt.buffer);

  const config = {
    jobId,
    createdAt: new Date().toISOString(),
    language: fields.language || 'zh-TW',
    asrEngine: fields.asrEngine || 'manual',
    modelName: fields.modelName || '',
    outputFormats: fields.outputFormats || 'srt,vtt',
    requirements: fields.requirements || '',
    files: {
      video: files.video?.filename || null,
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
  };
  writeJson(path.join(jobRoot, 'job-config.json'), config);
  writeJson(path.join(jobRoot, 'job-status.json'), status);
  return { jobId, folder: jobRoot, status };
}

function commandExists(command, args = ['--version']) {
  return new Promise((resolve) => {
    if (!fs.existsSync(command)) {
      resolve(false);
      return;
    }
    const child = spawn(command, args, { shell: false, stdio: 'ignore' });
    child.on('exit', (code) => resolve(code === 0));
    child.on('error', () => resolve(false));
  });
}

async function healthCheck() {
  const [hasNode, hasFfmpeg, hasPython, hasWhisper] = await Promise.all([
    commandExists(toolPaths.node),
    commandExists(toolPaths.ffmpeg, ['-version']),
    commandExists(toolPaths.python),
    commandExists(toolPaths.python, ['-c', 'import whisper; print("ok")']),
  ]);
  return {
    ok: true,
    node: process.version,
    localToolsDir: toolsDir,
    tools: { node: hasNode, ffmpeg: hasFfmpeg, python: hasPython, whisper: hasWhisper },
    paths: toolPaths,
  };
}

async function startJob(jobId) {
  if (runningJobs.has(jobId)) return;
  const job = loadJob(jobId);
  if (!job) return;
  const promise = runJob(job).finally(() => runningJobs.delete(jobId));
  runningJobs.set(jobId, promise);
}

async function runJob(job) {
  updateJob(job, { status: 'running', stage: 'preflight', progress: 8, message: '檢查本機環境與工具' }, '開始環境檢查');
  const hasFfmpeg = await commandExists(toolPaths.ffmpeg, ['-version']);
  const hasPython = await commandExists(toolPaths.python);
  const hasWhisper = await commandExists(toolPaths.python, ['-c', 'import whisper; print("ok")']);
  updateJob(job, {
    progress: 22,
    message: '環境檢查完成',
    metrics: { hasFfmpeg, hasPython, hasWhisper },
  }, `FFmpeg=${hasFfmpeg ? 'OK' : '未安裝'} Python=${hasPython ? 'OK' : '未安裝'} Whisper=${hasWhisper ? 'OK' : '未安裝'}`);

  const inputDir = path.join(job.jobRoot, 'input');
  const workingDir = path.join(job.jobRoot, 'working');
  const existingSrtName = job.config.files.existingSrt;
  if (existingSrtName) {
    updateJob(job, { stage: 'import-srt', progress: 42, message: '偵測到既有 SRT，略過 ASR 轉錄' }, '匯入使用者提供的 SRT');
    fs.copyFileSync(path.join(inputDir, existingSrtName), path.join(workingDir, 'draft.srt'));
  } else if (hasWhisper && job.config.files.video) {
    updateJob(job, { stage: 'transcribing', progress: 35, message: '使用 Whisper 進行本機轉錄' }, '啟動 Whisper 轉錄');
    await runWhisper(job, inputDir, workingDir);
  } else {
    updateJob(job, {
      status: 'needs-action',
      stage: 'missing-asr',
      progress: 35,
      message: '尚未偵測到可用 ASR。請先執行 setup-local-tools.bat，或上傳既有 SRT 後再執行。',
    }, '缺少 ASR 工具，流程暫停等待處理');
    return;
  }

  updateJob(job, { stage: 'rule-cleanup', progress: 72, message: '套用字幕規則並產生校稿資料' }, '建立初稿與校稿報告');
  const draft = path.join(workingDir, 'draft.srt');
  const cleaned = path.join(workingDir, 'rule-cleaned.srt');
  const report = path.join(workingDir, 'correction-report.md');
  const settings = path.join(job.jobRoot, 'review-output', 'subtitle-style-settings.json');
  fs.copyFileSync(draft, cleaned);
  fs.writeFileSync(report, buildCorrectionReport(job), 'utf8');
  writeJson(settings, {
    fontFamily: 'Microsoft JhengHei',
    fontSize: 32,
    position: 'bottom',
    bottomMarginPercent: 8,
    textColor: '#ffffff',
    outlineColor: '#111111',
    outlineWidth: 3,
  });
  updateJob(job, {
    status: 'completed',
    stage: 'ready-review',
    progress: 100,
    message: '字幕初稿已完成，可進入校閱頁面',
    files: { draftSrt: draft, cleanedSrt: cleaned, report, styleSettings: settings, reviewUrl: `/review/${job.config.jobId}` },
  }, '任務完成，等待人工校閱');
}

function runWhisper(job, inputDir, workingDir) {
  return new Promise((resolve, reject) => {
    const videoFile = path.join(inputDir, job.config.files.video);
    const args = [
      videoFile,
      '--language', job.config.language.startsWith('zh') ? 'Chinese' : job.config.language,
      '--output_format', 'srt',
      '--output_dir', workingDir,
      '--model_dir', toolPaths.whisperModels,
    ];
    if (job.config.modelName) args.push('--model', job.config.modelName);
    let lastProgressLogAt = 0;
    const child = spawn(toolPaths.whisper, args, {
      shell: false,
      env: {
        ...process.env,
        PATH: `${path.dirname(toolPaths.ffmpeg)};${path.dirname(toolPaths.whisper)};${process.env.PATH || ''}`,
        XDG_CACHE_HOME: toolsDir,
        WHISPER_CACHE: toolPaths.whisperModels,
        PYTHONIOENCODING: 'utf-8',
        PYTHONUTF8: '1',
      },
    });
    child.stdout.on('data', (data) => {
      const log = normalizeWhisperLog(data);
      if (log) updateJob(job, { progress: 48, message: 'Whisper 本機轉錄中' }, log);
    });
    child.stderr.on('data', (data) => {
      const log = normalizeWhisperLog(data);
      const now = Date.now();
      if (log && now - lastProgressLogAt > 1200) {
        lastProgressLogAt = now;
        updateJob(job, { progress: 52, message: 'Whisper 本機轉錄中' }, log);
      }
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Whisper exit code ${code}`));
        return;
      }
      const srtFile = fs.readdirSync(workingDir).find((file) => file.toLowerCase().endsWith('.srt'));
      if (!srtFile) {
        reject(new Error('Whisper did not produce an SRT file'));
        return;
      }
      fs.copyFileSync(path.join(workingDir, srtFile), path.join(workingDir, 'draft.srt'));
      resolve();
    });
  });
}

function normalizeWhisperLog(buffer) {
  const cleaned = sanitizeLog(buffer.toString('utf8'));
  if (!cleaned) return '';
  const percentMatch = cleaned.match(/(\d{1,3})%/);
  const speedMatch = cleaned.match(/([0-9.]+\s*(?:MiB|KiB|B|it)\/s)/i);
  if (percentMatch) {
    const percent = Math.min(100, Math.max(0, Number(percentMatch[1])));
    const speed = speedMatch ? `，速度 ${speedMatch[1]}` : '';
    return `Whisper 轉錄進度 ${percent}%${speed}`;
  }
  if (/Detected language/i.test(cleaned)) return 'Whisper 已偵測語言';
  if (/Loading/i.test(cleaned)) return 'Whisper 載入模型中';
  if (/Downloading/i.test(cleaned)) return 'Whisper 模型下載中';
  if (/UserWarning|FutureWarning|WARNING/i.test(cleaned)) return '';
  return cleaned.length > 120 ? cleaned.slice(0, 120) : cleaned;
}

function buildCorrectionReport(job) {
  return [
    '# 字幕初稿校閱報告',
    '',
    `- 任務 ID：${job.config.jobId}`,
    `- 語言：${job.config.language}`,
    `- ASR 引擎：${job.config.asrEngine}`,
    `- 輸出格式：${job.config.outputFormats}`,
    '',
    '## 使用者字幕需求',
    '',
    job.config.requirements || '未填寫額外需求。',
    '',
    '## 待人工確認',
    '',
    '- 專有名詞是否正確',
    '- 課程平台、系統名稱、英文縮寫是否一致',
    '- 斷句、閱讀速度與字幕時間軸是否自然',
    '- 是否需要調整燒錄字幕的字體、大小、顏色與位置',
    '',
  ].join('\n');
}

function getReviewSubtitlePath(job) {
  const candidates = [
    path.join(job.jobRoot, 'review-output', 'reviewed.srt'),
    path.join(job.jobRoot, 'working', 'rule-cleaned.srt'),
    path.join(job.jobRoot, 'working', 'draft.srt'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function getVideoPath(job) {
  if (!job.config.files.video) return null;
  const videoPath = path.join(job.jobRoot, 'input', job.config.files.video);
  return fs.existsSync(videoPath) ? videoPath : null;
}

function normalizeBurnSettings(settings) {
  const position = ['top', 'middle', 'bottom'].includes(settings.position) ? settings.position : 'bottom';
  return {
    fontFamily: String(settings.fontFamily || 'Microsoft JhengHei'),
    fontSize: clampNumber(settings.fontSize, 8, 96, 24),
    fontColor: normalizeColor(settings.fontColor, '#ffffff'),
    outlineColor: normalizeColor(settings.outlineColor, '#000000'),
    outlineWidth: clampNumber(settings.outlineWidth, 0, 8, 2),
    position,
    marginV: clampNumber(settings.marginV, 0, 300, 42),
    bold: Boolean(settings.bold),
    alignment: position === 'top' ? 8 : position === 'middle' ? 5 : 2,
  };
}

function buildFfmpegStyle(settings) {
  return [
    `FontName=${settings.fontFamily}`,
    `FontSize=${settings.fontSize}`,
    `Bold=${settings.bold ? 1 : 0}`,
    `PrimaryColour=${hexToAssColor(settings.fontColor)}`,
    `OutlineColour=${hexToAssColor(settings.outlineColor)}`,
    'BorderStyle=1',
    `Outline=${settings.outlineWidth}`,
    'Shadow=0',
    `Alignment=${settings.alignment}`,
    `MarginV=${settings.marginV}`,
  ].join(',');
}

function hexToAssColor(hex) {
  const clean = normalizeColor(hex, '#ffffff').slice(1);
  return `&H00${clean.slice(4, 6)}${clean.slice(2, 4)}${clean.slice(0, 2)}`.toUpperCase();
}

function normalizeColor(value, fallback) {
  const text = String(value || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(text) ? text.toLowerCase() : fallback;
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function relativeToApp(filePath) {
  return path.relative(appDir, filePath).replace(/\\/g, '/');
}

function resolveJobFolder(job, target) {
  const map = {
    job: job.jobRoot,
    input: path.join(job.jobRoot, 'input'),
    working: path.join(job.jobRoot, 'working'),
    output: path.join(job.jobRoot, 'output'),
    'review-output': path.join(job.jobRoot, 'review-output'),
  };
  const folder = path.resolve(map[target] || map.job);
  if (!folder.startsWith(path.resolve(job.jobRoot))) return null;
  fs.mkdirSync(folder, { recursive: true });
  return folder;
}

function openFolderInExplorer(folder) {
  return new Promise((resolve, reject) => {
    const child = spawn('explorer.exe', [folder], { detached: true, stdio: 'ignore', shell: false });
    child.on('error', reject);
    child.on('spawn', () => {
      child.unref();
      resolve();
    });
  });
}

function serveFile(req, res, filePath) {
  if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    sendText(res, 404, 'Not Found');
    return;
  }
  const stat = fs.statSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const type = contentTypes[ext] || 'application/octet-stream';
  const range = req.headers.range;
  if (range) {
    const match = range.match(/bytes=(\d+)-(\d*)/);
    if (!match) {
      res.writeHead(416);
      res.end();
      return;
    }
    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : stat.size - 1;
    res.writeHead(206, {
      'Content-Type': type,
      'Content-Length': end - start + 1,
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size, 'Accept-Ranges': 'bytes' });
  fs.createReadStream(filePath).pipe(res);
}

function getSafeJobFile(job, parts) {
  const target = path.resolve(job.jobRoot, ...parts);
  return target.startsWith(path.resolve(job.jobRoot)) ? target : null;
}

function serveStatic(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const reviewMatch = url.pathname.match(/^\/review\/([^/]+)$/);
  if (reviewMatch) {
    serveFile(req, res, path.join(publicDir, 'review.html'));
    return;
  }
  const mediaMatch = url.pathname.match(/^\/job-media\/([^/]+)\/(.+)$/);
  if (mediaMatch) {
    const job = loadJob(mediaMatch[1]);
    if (!job) {
      sendText(res, 404, 'Job Not Found');
      return;
    }
    serveFile(req, res, getSafeJobFile(job, mediaMatch[2].split('/').map(decodeURIComponent)));
    return;
  }
  const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const filePath = path.normalize(path.join(publicDir, pathname));
  if (!filePath.startsWith(publicDir)) {
    sendText(res, 403, 'Forbidden');
    return;
  }
  serveFile(req, res, filePath);
}

async function handleApi(req, res) {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'GET' && url.pathname === '/api/health') {
    sendJson(res, 200, await healthCheck());
    return;
  }
  if (req.method === 'POST' && url.pathname === '/api/jobs') {
    try {
      sendJson(res, 201, createJob(parseMultipart(await readRequest(req), req.headers['content-type'])));
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  const match = url.pathname.match(/^\/api\/jobs\/([^/]+)(?:\/([^/]+))?$/);
  if (!match) {
    sendJson(res, 404, { error: 'Unknown API' });
    return;
  }
  const jobId = match[1];
  const action = match[2];
  const job = loadJob(jobId);
  if (!job) {
    sendJson(res, 404, { error: '找不到任務' });
    return;
  }

  if (req.method === 'POST' && action === 'start') {
    startJob(jobId);
    sendJson(res, 202, { ok: true });
    return;
  }
  if (req.method === 'GET' && action === 'status') {
    sendJson(res, 200, job.status);
    return;
  }
  if (req.method === 'GET' && action === 'files') {
    sendJson(res, 200, job.status.files || {});
    return;
  }
  if (req.method === 'POST' && action === 'open-folder') {
    try {
      const folder = resolveJobFolder(job, url.searchParams.get('target') || 'job');
      if (!folder) throw new Error('Invalid folder target');
      await openFolderInExplorer(folder);
      sendJson(res, 200, { ok: true, folder: relativeToApp(folder) });
    } catch (error) {
      sendJson(res, 400, { ok: false, error: error.message });
    }
    return;
  }
  if (req.method === 'GET' && action === 'review-data') {
    const subtitlePath = getReviewSubtitlePath(job);
    const videoPath = getVideoPath(job);
    if (!subtitlePath) {
      sendJson(res, 404, { error: '找不到可校閱字幕，請先完成字幕生成' });
      return;
    }
    if (!videoPath) {
      sendJson(res, 404, { error: '找不到任務影片' });
      return;
    }
    sendJson(res, 200, {
      jobId,
      videoFileName: path.basename(videoPath),
      subtitleFileName: path.basename(subtitlePath),
      videoUrl: `/job-media/${encodeURIComponent(jobId)}/input/${encodeURIComponent(path.basename(videoPath))}`,
      subtitle: fs.readFileSync(subtitlePath, 'utf8'),
    });
    return;
  }
  if (req.method === 'POST' && action === 'save-review') {
    try {
      const payload = await readJsonBody(req);
      if (typeof payload.subtitle !== 'string') throw new Error('Missing subtitle');
      const reviewOutputDir = path.join(job.jobRoot, 'review-output');
      fs.mkdirSync(reviewOutputDir, { recursive: true });
      const subtitlePath = path.join(reviewOutputDir, 'reviewed.srt');
      fs.writeFileSync(subtitlePath, payload.subtitle.replace(/\r?\n/g, '\r\n'), 'utf8');
      updateJob(job, { files: { ...(job.status.files || {}), reviewedSrt: subtitlePath } }, '已儲存校閱後字幕');
      sendJson(res, 200, { ok: true, files: { subtitle: relativeToApp(subtitlePath) } });
    } catch (error) {
      sendJson(res, 400, { ok: false, error: error.message });
    }
    return;
  }
  if (req.method === 'POST' && action === 'save-review-package') {
    try {
      const payload = await readJsonBody(req);
      if (typeof payload.subtitle !== 'string') throw new Error('Missing subtitle');
      if (!payload.settings || typeof payload.settings !== 'object') throw new Error('Missing burn settings');
      const reviewOutputDir = path.join(job.jobRoot, 'review-output');
      fs.mkdirSync(reviewOutputDir, { recursive: true });
      const subtitlePath = path.join(reviewOutputDir, 'reviewed.srt');
      const settingsPath = path.join(reviewOutputDir, 'burn-settings.json');
      const stylePath = path.join(reviewOutputDir, 'burn-settings.ffmpeg-style.txt');
      const manifestPath = path.join(reviewOutputDir, 'export-manifest.json');
      const settings = normalizeBurnSettings(payload.settings);
      const manifest = {
        ...(payload.manifest || {}),
        savedAt: new Date().toISOString(),
        files: {
          subtitle: relativeToApp(subtitlePath),
          settings: relativeToApp(settingsPath),
          ffmpegStyle: relativeToApp(stylePath),
          manifest: relativeToApp(manifestPath),
        },
      };
      fs.writeFileSync(subtitlePath, payload.subtitle.replace(/\r?\n/g, '\r\n'), 'utf8');
      writeJson(settingsPath, settings);
      fs.writeFileSync(stylePath, `${buildFfmpegStyle(settings)}\n`, 'utf8');
      writeJson(manifestPath, manifest);
      updateJob(job, {
        files: { ...(job.status.files || {}), reviewedSrt: subtitlePath, burnSettings: settingsPath, ffmpegStyle: stylePath, manifest: manifestPath },
      }, '已儲存完整校稿包');
      sendJson(res, 200, { ok: true, folder: relativeToApp(reviewOutputDir), files: manifest.files });
    } catch (error) {
      sendJson(res, 400, { ok: false, error: error.message });
    }
    return;
  }

  sendJson(res, 404, { error: 'Unknown API' });
}

const server = createServer(async (req, res) => {
  try {
    if (req.url.startsWith('/api/')) await handleApi(req, res);
    else serveStatic(req, res);
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Offline Subtitle Factory running at http://127.0.0.1:${port}`);
});
