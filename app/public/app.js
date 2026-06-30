const form = document.getElementById('jobForm');
const progressNumber = document.getElementById('progressNumber');
const progressBar = document.getElementById('progressBar');
const stageName = document.getElementById('stageName');
const statusText = document.getElementById('statusText');
const logBox = document.getElementById('logBox');
const jobBadge = document.getElementById('jobBadge');
const openReview = document.getElementById('openReview');
const healthButton = document.getElementById('healthButton');
const openJobFolder = document.getElementById('openJobFolder');
const ffmpegMetric = document.getElementById('ffmpegMetric');
const pythonMetric = document.getElementById('pythonMetric');
const whisperMetric = document.getElementById('whisperMetric');

let currentJobId = null;
let pollTimer = null;

restoreLastJob();
bindFileLabel('videoFile', 'videoName');
bindFileLabel('ruleFile', 'ruleName');
bindFileLabel('existingSrt', 'srtName');
bindDropUploads();

document.querySelectorAll('.workflow button').forEach((button) => {
  button.addEventListener('click', () => {
    if (button.dataset.step === 'review') {
      openReviewStage('proofread');
      return;
    }
    if (button.dataset.step === 'burn') {
      openReviewStage('burn');
      return;
    }
    if (button.dataset.step === 'export') {
      handleExportStep();
      return;
    }
    document.querySelectorAll('.workflow button').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    const target = document.getElementById(button.dataset.step);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
});

healthButton.addEventListener('click', async () => {
  setStatus({
    progress: 8,
    stage: 'preflight',
    message: '正在檢查本機環境',
    logs: ['呼叫 /api/health'],
  });

  const response = await fetch('/api/health', { cache: 'no-store' });
  const health = await response.json();
  updateMetrics(health.tools);
  setStatus({
    progress: 18,
    stage: 'preflight',
    message: `Node ${health.node}，環境檢查完成`,
    logs: [
      `FFmpeg=${labelOk(health.tools.ffmpeg)}`,
      `Python=${labelOk(health.tools.python)}`,
      `Whisper=${labelOk(health.tools.whisper)}`,
    ],
    metrics: {
      hasFfmpeg: health.tools.ffmpeg,
      hasPython: health.tools.python,
      hasWhisper: health.tools.whisper,
    },
  });
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  openReview.disabled = true;
  setStatus({
    progress: 4,
    stage: 'uploading',
    message: '正在建立任務並上傳檔案',
    logs: ['準備送出影片、規則檔與需求說明'],
  });

  const response = await fetch('/api/jobs', {
    method: 'POST',
    body: new FormData(form),
  });

  if (!response.ok) {
    const text = await response.text();
    setStatus({
      status: 'failed',
      stage: 'failed',
      progress: 100,
      message: `建立任務失敗：${text}`,
      logs: [text],
    });
    return;
  }

  const created = await response.json();
  currentJobId = created.jobId;
  localStorage.setItem('offlineSubtitleFactory.currentJobId', currentJobId);
  jobBadge.textContent = `workspace/jobs/${currentJobId}`;
  setStatus(created.status);

  await fetch(`/api/jobs/${currentJobId}/start`, { method: 'POST' });
  startPolling();
});

openReview.addEventListener('click', () => {
  if (!currentJobId) return;
  openReviewStage('proofread');
});

openJobFolder.addEventListener('click', () => {
  openFolder('job');
});

function bindFileLabel(inputId, labelId) {
  const input = document.getElementById(inputId);
  const label = document.getElementById(labelId);
  input.addEventListener('change', () => {
    label.textContent = input.files[0]?.name || '尚未選擇';
  });
}

function bindDropUploads() {
  document.querySelectorAll('[data-drop-target]').forEach((dropZone) => {
    const input = document.getElementById(dropZone.dataset.dropTarget);
    if (!input) return;
    ['dragenter', 'dragover'].forEach((eventName) => {
      dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropZone.classList.add('drag-over');
      });
    });
    ['dragleave', 'drop'].forEach((eventName) => {
      dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropZone.classList.remove('drag-over');
      });
    });
    dropZone.addEventListener('drop', (event) => {
      const file = event.dataTransfer?.files?.[0];
      if (!file) return;
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
}

function startPolling() {
  clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    if (!currentJobId) return;
    const response = await fetch(`/api/jobs/${currentJobId}/status`, { cache: 'no-store' });
    if (!response.ok) return;
    const status = await response.json();
    setStatus(status);
    const terminalStates = ['completed', 'failed', 'cancelled', 'needs-action'];
    if (terminalStates.includes(status.status)) {
      clearInterval(pollTimer);
      openReview.disabled = status.status !== 'completed';
      if (status.status === 'completed') {
        localStorage.setItem('offlineSubtitleFactory.currentJobId', currentJobId);
      }
    }
  }, 1000);
}

async function restoreLastJob() {
  const savedJobId = localStorage.getItem('offlineSubtitleFactory.currentJobId');
  if (!savedJobId) return;
  currentJobId = savedJobId;
  jobBadge.textContent = `workspace/jobs/${currentJobId}`;

  try {
    const response = await fetch(`/api/jobs/${encodeURIComponent(savedJobId)}/status`, { cache: 'no-store' });
    if (!response.ok) {
      // 伺服器上找不到這個 job，清除 localStorage
      localStorage.removeItem('offlineSubtitleFactory.currentJobId');
      currentJobId = null;
      return;
    }
    const status = await response.json();
    setStatus(status);

    // 根據狀態設定按鈕
    if (status.status === 'completed') {
      openReview.disabled = false;
      localStorage.setItem('offlineSubtitleFactory.currentJobId', savedJobId);
    } else {
      openReview.disabled = true;
    }
  } catch {
    // 網路錯誤或伺服器未啟動，清除殘留的 localStorage
    localStorage.removeItem('offlineSubtitleFactory.currentJobId');
    currentJobId = null;
  }
}

function openReviewStage(stage) {
  if (!currentJobId) {
    setStatus({
      progress: 0,
      stage: 'waiting',
      message: '請先完成字幕生成，才能進入校閱或燒錄預覽。',
      logs: ['尚未有可校閱的任務 ID'],
    });
    return;
  }
  window.location.href = `/review/${encodeURIComponent(currentJobId)}?stage=${encodeURIComponent(stage)}`;
}

async function openFolder(target) {
  if (!currentJobId) {
    setStatus({
      progress: 0,
      stage: 'waiting',
      message: '請先建立任務，才能開啟任務資料夾。',
      logs: ['尚未有可開啟的任務資料夾'],
    });
    return;
  }
  const response = await fetch(`/api/jobs/${encodeURIComponent(currentJobId)}/open-folder?target=${encodeURIComponent(target)}`, {
    method: 'POST',
  });
  const result = await response.json();
  setStatus({
    progress: Number(progressNumber.textContent.replace('%', '')) || 0,
    stage: result.ok ? 'ready-review' : 'failed',
    message: result.ok ? `已開啟資料夾：${result.folder}` : `開啟資料夾失敗：${result.error}`,
    logs: [result.ok ? `已開啟 ${result.folder}` : result.error],
  });
}

function handleExportStep() {
  if (!currentJobId) {
    setStatus({
      progress: 0,
      stage: 'waiting',
      message: '請先完成字幕生成與校閱，再進行輸出。',
      logs: ['尚未有可輸出的任務'],
    });
    return;
  }

  const confirmed = confirm(
    '輸出功能說明：\n\n' +
    '1. 若已完成校閱，系統會開啟 review-output 資料夾。\n' +
    '2. 若要燒錄字幕到影片，請先在「9 燒錄預覽」確認字幕樣式並儲存校稿包。\n' +
    '3. 後續會依 review-output 內的 reviewed.srt 與 burn-settings 進行 FFmpeg 燒錄。\n\n' +
    '是否開啟輸出資料夾？'
  );
  if (confirmed) openFolder('review-output');
}

function setStatus(status) {
  const progress = Number(status.progress || 0);
  progressNumber.textContent = `${Math.round(progress)}%`;
  progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
  stageName.textContent = stageLabel(status.stage || 'waiting');
  statusText.textContent = status.message || status.status || '等待開始';

  const logs = status.logs?.length ? status.logs : ['等待建立字幕任務'];
  logBox.textContent = sanitizeLogs(logs).join('\n');

  if (status.metrics) {
    updateMetrics({
      ffmpeg: status.metrics.hasFfmpeg,
      python: status.metrics.hasPython,
      whisper: status.metrics.hasWhisper,
    });
  }
}

function updateMetrics(tools) {
  ffmpegMetric.textContent = labelPending(tools.ffmpeg);
  pythonMetric.textContent = labelPending(tools.python);
  whisperMetric.textContent = labelPending(tools.whisper);
}

function labelPending(value) {
  if (value === undefined) return '待檢查';
  return labelOk(value);
}

function labelOk(value) {
  return value ? 'OK' : '未安裝';
}

function stageLabel(stage) {
  const labels = {
    waiting: '等待開始',
    created: '建立任務',
    uploading: '上傳中',
    preflight: '環境檢查',
    'import-srt': '匯入 SRT',
    transcribing: '自動轉錄',
    'rule-cleanup': '套用規則',
    'ready-review': '準備校閱',
    'missing-asr': '缺少 ASR',
    failed: '流程失敗',
    cancelled: '已取消',
  };
  return labels[stage] || stage;
}

function sanitizeLogs(logs) {
  return logs
    .map((line) => String(line || '').replace(/[�]+/g, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map((line) => {
      const percentMatch = line.match(/(\d{1,3})%/);
      const speedMatch = line.match(/([0-9.]+\s*(?:MiB|KiB|B|it)\/s)/i);
      if (percentMatch) {
        const speed = speedMatch ? `，速度 ${speedMatch[1]}` : '';
        return `Whisper 轉錄進度 ${percentMatch[1]}%${speed}`;
      }
      return line.length > 160 ? line.slice(0, 160) : line;
    });
}

// ── Cancel / Retry ──────────────────────────────

let cancelBtn = document.getElementById('cancelButton');
let retryBtn = document.getElementById('retryButton');

function updateActionButtons(status) {
  if (!cancelBtn || !retryBtn) return;

  const isRunning = status?.status === 'running';
  const isTerminal = ['completed', 'failed', 'cancelled', 'needs-action'].includes(status?.status);

  cancelBtn.style.display = isRunning ? 'inline-block' : 'none';
  retryBtn.style.display = (status?.status === 'cancelled' || status?.status === 'failed') ? 'inline-block' : 'none';
}

if (cancelBtn) {
  cancelBtn.addEventListener('click', async () => {
    if (!currentJobId) return;
    if (!confirm('確定要取消目前任務嗎？')) return;

    cancelBtn.disabled = true;
    cancelBtn.textContent = '取消中...';

    const response = await fetch(`/api/jobs/${encodeURIComponent(currentJobId)}/cancel`, {
      method: 'POST',
    });

    if (!response.ok) {
      const err = await response.json();
      setStatus({
        progress: Number(progressNumber.textContent.replace('%', '')) || 0,
        stage: 'failed',
        message: `取消失敗：${err.error}`,
        logs: [`取消任務失敗：${err.error}`],
      });
    } else {
      // 立即讀取最新狀態
      const statusResp = await fetch(`/api/jobs/${encodeURIComponent(currentJobId)}/status`);
      if (statusResp.ok) {
        const status = await statusResp.json();
        setStatus(status);
        clearInterval(pollTimer);
      }
    }
    cancelBtn.disabled = false;
    cancelBtn.textContent = '中止任務';
  });
}

if (retryBtn) {
  retryBtn.addEventListener('click', async () => {
    if (!currentJobId) return;
    if (!confirm('確定要重試此任務嗎？系統將從頭重新執行。')) return;

    retryBtn.disabled = true;
    retryBtn.textContent = '重試中...';

    const response = await fetch(`/api/jobs/${encodeURIComponent(currentJobId)}/retry`, {
      method: 'POST',
    });

    if (!response.ok) {
      const err = await response.json();
      setStatus({
        progress: 0,
        stage: 'failed',
        message: `重試失敗：${err.error}`,
        logs: [`重試任務失敗：${err.error}`],
      });
    } else {
      setStatus({
        progress: 0,
        stage: 'preflight',
        message: '任務重試中...',
        logs: ['已重新啟動任務'],
      });
      startPolling();
    }
    retryBtn.disabled = false;
    retryBtn.textContent = '重新執行';
  });
}

// 在 setStatus 中自動更新按鈕狀態
const originalSetStatus = setStatus;
setStatus = function (status) {
  originalSetStatus(status);
  updateActionButtons(status);
};
