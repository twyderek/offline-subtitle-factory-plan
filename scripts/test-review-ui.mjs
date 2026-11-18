import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { isLoopbackAiUrl, providerFieldIsVisible, providerProfileMatches, providerProfileSnapshot, runProviderConnectionTest, validateProviderConnectionForm } from '../public/ai-provider-settings.mjs';
import { selectAiCues } from '../public/ai-scope.mjs';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(appDir, 'public', 'review.html'), 'utf8');
const css = fs.readFileSync(path.join(appDir, 'public', 'styles.css'), 'utf8');
const js = fs.readFileSync(path.join(appDir, 'public', 'review.js'), 'utf8');
const providerFormJs = fs.readFileSync(path.join(appDir, 'public', 'ai-provider-settings.mjs'), 'utf8');
const youtubePublishJs = fs.readFileSync(path.join(appDir, 'public', 'youtube-publish.mjs'), 'utf8');
const youtubeGuideImage = path.join(appDir, 'public', 'assets', 'youtube-setup-flow.zh-TW.png');
const youtubeReferenceDocx = path.join(appDir, 'public', 'assets', 'youtube-setup-reference.zh-TW.docx');

assert.match(html, /id="aiToolbar" class="review-ai-toolbar collapsed"/);
assert.match(html, /id="toggleAiToolbar"[^>]+aria-expanded="false"[^>]+aria-controls="aiToolbarContent"/);
assert.match(html, /展開 AI 優化/);
assert.match(css, /\.review-ai-toolbar\.collapsed \.review-ai-toolbar-content \{ display: none; \}/);
assert.match(css, /grid-template-rows: auto auto minmax\(0, 1fr\)/);
assert.match(js, /AI_TOOLBAR_COLLAPSED_KEY/);
assert.match(js, /setAiToolbarCollapsed\(false\)/);
assert.match(html, /<option value="ja">日文<\/option>/);
assert.doesNotMatch(html, /value="zh-CN"/);
assert.doesNotMatch(html, /簡體中文/);
assert.match(html, /<option value="custom">自訂 BCP 47…<\/option>/);
assert.match(html, /id="bilingualLayout"/);
assert.match(html, /原文在上／譯文在下/);
assert.match(html, /id="downloadAss"/);
assert.match(js, /normalizeBilingualCues/);
assert.match(html, /<select id="qualityFilter">/);
assert.match(html, /<option value="issues">全部問題<\/option>/);
assert.match(html, /<option value="low-confidence">低可信<\/option>/);
assert.match(html, /<option value="quality">只處理品質篩選結果<\/option>/);
assert.match(js, /filterQualityCues\(state\.cues, state\.qualityFilter\)/);
assert.doesNotMatch(js, /scope === 'quality'[\s\S]{0,500}(reviewVideo|reviewVideoFile|audio|video\.src)/);
const scopeCues = [
  { id: 1, startRaw: '00:00:00,000', endRaw: '00:00:02,000', text: '正常字幕', translatedText: '正常字幕', confidence: 0.95 },
  { id: 2, startRaw: '00:00:02,000', endRaw: '00:00:04,000', text: '低可信字幕', translatedText: '低可信字幕', confidence: 0.1, filePath: '/private/video.mp4' },
];
const qualityPayload = selectAiCues({ cues: scopeCues, scope: 'quality', qualityFilter: 'low-confidence' });
assert.deepEqual(qualityPayload.map((cue) => cue.id), [2], 'quality scope 應只送出篩選後 cue');
assert.deepEqual(Object.keys(qualityPayload[0]).sort(), ['end', 'id', 'sourceText', 'start', 'text', 'translatedText'], 'AI payload 不得含 raw quality 或影音欄位');
const translationPayload = selectAiCues({ cues: [{ ...scopeCues[1], sourceText: 'Source sentence', translatedText: '既有譯文' }], scope: 'selected', selectedCueIds: new Set(['2']), mode: 'translate' });
assert.equal(translationPayload[0].text, 'Source sentence', '翻譯模式應以原文作為輸入');
assert.match(js, /source-text/);
assert.match(js, /translated-text/);
assert.match(html, /id="aiCustomLanguageField" hidden/);
assert.match(html, /id="aiCustomLanguage"[^>]+maxlength="255"/);
assert.match(js, /function getAiLanguage\(\)/);
assert.match(js, /language: getAiLanguage\(\)/);
assert.match(js, /translate: '翻譯'/);
assert.doesNotMatch(js, /aiSuggestion\.reason \|\| '文字優化'/);
assert.match(js, /state\.aiSuggestions\.clear\(\)[\s\S]{0,120}updateAiSuggestionActions\(\)/);
assert.match(html, /<option value="groq">Groq<\/option>/);
assert.match(html, /<option value="nvidia">NVIDIA NIM<\/option>/);
assert.match(html, /<option value="gemini">Google Gemini<\/option>/);
assert.match(html, /<option value="anthropic">Anthropic Claude<\/option>/);
assert.match(js, /anthropic: 'https:\/\/api\.anthropic\.com'/);
assert.match(js, /nvidia: 'https:\/\/integrate\.api\.nvidia\.com\/v1'/);
assert.match(html, /<option value="ollama">Ollama（本機）<\/option>/);
assert.match(html, /<option value="lm-studio">LM Studio（本機）<\/option>/);
assert.match(html, /class="provider-field hidden" data-providers="azure"[^>]*>[\s\S]*id="aiDeployment"/);
assert.match(html, /class="provider-field hidden" data-providers="azure"[^>]*>[\s\S]*id="aiApiVersion"/);
assert.match(html, /id="aiApiKey"/);
assert.match(html, /class="provider-field full hidden" data-providers="openai openai-compatible azure groq nvidia gemini anthropic"[^>]*>[\s\S]*id="aiApiKey"/);
assert.match(html, /class="provider-field full" data-providers="ollama lm-studio"[^>]*>[\s\S]*id="aiApiKeyLocal"/);
assert.match(html, /本機 API Key（可留空）/);
assert.match(css, /\.review-ai-settings-grid \.provider-field\.hidden \{ display: none; \}/);
assert.match(html, /id="discoverLocalAi"/);
assert.match(html, /id="loadAiModels"/);
assert.match(html, /id="inspectAiModel"/);
assert.match(html, /id="aiPrivacyStatus"/);
assert.match(js, /VALID_AI_PROVIDERS/);
assert.match(js, /aiDeployment'\)\.disabled = !azure/);
assert.match(js, /aiApiVersion'\)\.disabled = !azure/);
assert.match(providerFormJs, /請先輸入 API Key 並儲存設定/);
assert.match(js, /ai\/key\?provider=/);
assert.match(js, /function setAiApiKeyFields\(\{ hasApiKey = false, placeholder = '' \} = \{\}\)/);
assert.match(js, /function applyAiProviderFieldVisibility\(provider\)/);
assert.match(js, /providerFieldIsVisible\(field\.dataset\.providers, provider\)/);
assert.match(js, /getAiApiKeyInput\(settings\.provider\)/);
assert.match(html, /<script type="module" src="\/review\.js"><\/script>/);
assert.match(js, /runProviderConnectionTest\(\{/);
assert.match(js, /回應文字過長，正在要求 Ollama 重新輸出/);
assert.match(youtubePublishJs, /src="\/assets\/youtube-setup-flow\.zh-TW\.png"/);
assert.match(youtubePublishJs, /href="\/assets\/youtube-setup-reference\.zh-TW\.docx" download/);
assert.match(youtubePublishJs, /目前版本請直接在本視窗使用「匯入 OAuth JSON」與「連結頻道」/);
assert.match(fs.readFileSync(path.join(appDir, 'public', 'styles.css'), 'utf8'), /\.review-youtube-guide img/);
assert.ok(fs.statSync(youtubeGuideImage).size > 0, 'YouTube 設定圖解必須是非空檔案');
assert.ok(fs.statSync(youtubeReferenceDocx).size > 0, 'YouTube 詳細設定 DOCX 必須是非空檔案');

const savedGroq = providerProfileSnapshot({ provider: 'groq', baseUrl: 'https://api.groq.com/openai/v1/', model: 'llama-3.3-70b-versatile' });
assert.equal(providerProfileMatches(savedGroq, { provider: 'groq', baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' }), true, '相同 Groq profile 應允許測試');
assert.equal(providerProfileMatches(savedGroq, { provider: 'groq', baseUrl: 'https://proxy.example/v1', model: 'llama-3.3-70b-versatile' }), false, '未儲存 Base URL 變更必須阻止測試');
assert.equal(providerProfileMatches(savedGroq, { provider: 'groq', baseUrl: 'https://api.groq.com/openai/v1', model: 'different-model' }), false, '未儲存模型變更必須阻止測試');
assert.equal(providerProfileMatches(savedGroq, { provider: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com', model: 'llama-3.3-70b-versatile' }), false, '未儲存供應商變更必須阻止測試');
const savedAzure = providerProfileSnapshot({ provider: 'azure', baseUrl: 'https://example.openai.azure.com', model: 'gpt-5', deployment: 'subtitle', apiVersion: '2024-12-01-preview' });
assert.equal(providerProfileMatches(savedAzure, { ...savedAzure, deployment: 'other' }), false, 'Azure deployment 未儲存變更必須阻止測試');
assert.equal(providerProfileMatches(savedAzure, { ...savedAzure, apiVersion: '2025-01-01-preview' }), false, 'Azure API version 未儲存變更必須阻止測試');
assert.equal(validateProviderConnectionForm(savedGroq, { ...savedGroq, apiKey: '' }, true), '', '已保存且未變更的 profile 應允許測試連線');
assert.match(validateProviderConnectionForm(savedGroq, { ...savedGroq, baseUrl: 'https://proxy.example/v1', apiKey: '' }, true), /未儲存變更/, '未保存 Base URL 不可進入連線 fetch');
assert.match(validateProviderConnectionForm(savedGroq, { ...savedGroq, model: 'different-model', apiKey: '' }, true), /未儲存變更/, '未保存 model 不可進入連線 fetch');
assert.match(validateProviderConnectionForm(savedGroq, { ...savedGroq, apiKey: 'new-key' }, true), /先儲存設定與 API Key/, '輸入中但未保存的 API Key 不可進入連線 fetch');
assert.match(validateProviderConnectionForm(savedGroq, { ...savedGroq, apiKey: '' }, false), /先輸入 API Key 並儲存設定/, '沒有已保存金鑰不可進入連線 fetch');
const savedOllama = providerProfileSnapshot({ provider: 'ollama', baseUrl: 'http://127.0.0.1:11434/v1', model: 'qwen-local' });
assert.equal(validateProviderConnectionForm(savedOllama, { ...savedOllama, apiKey: '' }, false), '', 'loopback 本機服務不應強制 API Key');
assert.equal(isLoopbackAiUrl('http://[::1]:1234/v1'), true, 'UI 應辨識 IPv6 loopback');
assert.equal(isLoopbackAiUrl('http://localhost.example.com/v1'), false, 'UI 不可把 localhost 子網域誤認為本機');
assert.equal(providerFieldIsVisible('openai openai-compatible azure groq nvidia gemini anthropic', 'nvidia'), true, 'NVIDIA 應顯示雲端 API Key 欄位');
assert.equal(providerFieldIsVisible('openai openai-compatible azure groq nvidia gemini anthropic', 'ollama'), false, 'Ollama 不應顯示雲端 API Key 欄位');
assert.equal(providerFieldIsVisible('ollama,lm-studio', 'lm-studio'), true, 'LM Studio 應顯示本機 API Key 欄位');
assert.equal(providerFieldIsVisible('azure', 'groq'), false, '非 Azure 不應顯示 Azure 專用欄位');

async function exerciseConnectionController({ savedProfile = savedGroq, currentSettings = { ...savedGroq, apiKey: '' }, hasSavedKey = true, response = { ok: true, status: 200, body: { ok: true, modelAvailable: true } } } = {}) {
  const button = { disabled: false };
  const statuses = [];
  let fetchCount = 0;
  const result = await runProviderConnectionTest({
    button,
    savedProfile,
    currentSettings,
    hasSavedKey,
    request: async () => {
      fetchCount += 1;
      return { ok: response.ok, status: response.status, json: async () => response.body };
    },
    setStatus: (message) => statuses.push(message),
  });
  return { button, statuses, fetchCount, result };
}

for (const [name, currentSettings, savedProfile = savedGroq, hasSavedKey = true] of [
  ['provider', { ...savedGroq, provider: 'gemini', apiKey: '' }],
  ['baseUrl', { ...savedGroq, baseUrl: 'https://proxy.example/v1', apiKey: '' }],
  ['model', { ...savedGroq, model: 'different-model', apiKey: '' }],
  ['Azure deployment', { ...savedAzure, deployment: 'other', apiKey: '' }, savedAzure],
  ['Azure apiVersion', { ...savedAzure, apiVersion: '2025-01-01-preview', apiKey: '' }, savedAzure],
  ['API Key input', { ...savedGroq, apiKey: 'unsaved-key' }],
  ['missing saved key', { ...savedGroq, apiKey: '' }, savedGroq, false],
]) {
  const outcome = await exerciseConnectionController({ savedProfile, currentSettings, hasSavedKey });
  assert.equal(outcome.fetchCount, 0, `${name} 未儲存時不可呼叫連線 API`);
  assert.equal(outcome.button.disabled, false, `${name} 阻擋後按鈕必須恢復`);
  assert.equal(outcome.result, null, `${name} 阻擋時不可回傳成功結果`);
  assert.match(outcome.statuses.at(-1), /連線失敗/, `${name} 阻擋時應顯示失敗原因`);
}

const successfulConnection = await exerciseConnectionController();
assert.equal(successfulConnection.fetchCount, 1, '已保存且未變更的 profile 應呼叫一次連線 API');
assert.equal(successfulConnection.button.disabled, false, '連線成功後按鈕必須恢復');
assert.equal(successfulConnection.result.ok, true, '連線成功應回傳結果');
assert.match(successfulConnection.statuses.at(-1), /連線成功：指定模型可用/, '連線成功應顯示模型狀態');

const failedConnection = await exerciseConnectionController({ response: { ok: false, status: 422, body: { ok: false, error: '供應商拒絕連線' } } });
assert.equal(failedConnection.fetchCount, 1, '供應商失敗案例應只呼叫一次連線 API');
assert.equal(failedConnection.button.disabled, false, '連線 HTTP 失敗後按鈕必須恢復');
assert.equal(failedConnection.result, null, '連線 HTTP 失敗不可回傳成功結果');
assert.match(failedConnection.statuses.at(-1), /供應商拒絕連線/, '連線 HTTP 失敗應顯示後端錯誤');

const thrownButton = { disabled: false };
const thrownStatuses = [];
const thrownConnection = await runProviderConnectionTest({
  button: thrownButton,
  savedProfile: savedGroq,
  currentSettings: { ...savedGroq, apiKey: '' },
  hasSavedKey: true,
  request: async () => { throw new Error('network down'); },
  setStatus: (message) => thrownStatuses.push(message),
});
assert.equal(thrownConnection, null, '連線 fetch 例外不可逃逸控制器');
assert.equal(thrownButton.disabled, false, '連線 fetch 例外後按鈕必須恢復');
assert.match(thrownStatuses.at(-1), /network down/, '連線 fetch 例外應顯示可診斷訊息');

// Execute the actual UI functions: a status GET begun before cancellation may
// return its old 'running' snapshot after the cancel POST has completed.
function uiFunctionSource(name) {
  const match = js.match(new RegExp(`(?:async )?function ${name}\\(`));
  assert.ok(match, `missing executable UI function ${name}`);
  let depth = 0;
  let parenDepth = 0;
  let bodyStarted = false;
  let quote = '';
  let escaped = false;
  for (let index = match.index; index < js.length; index += 1) {
    const character = js[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    if (!bodyStarted) {
      if (character === '(') parenDepth += 1;
      else if (character === ')') parenDepth -= 1;
      else if (character === '{' && parenDepth === 0) {
        bodyStarted = true;
        depth = 1;
      }
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) return js.slice(match.index, index + 1);
    }
  }
  assert.fail(`unterminated executable UI function ${name}`);
}

// A slow profile response from a previous provider must not restore stale
// fields, and save/test controls must remain fail-closed during the switch.
{
  const controls = {
    aiProvider: { value: 'openai-compatible' },
    aiBaseUrl: { value: 'https://legacy.example/v1' },
    aiModel: { value: 'legacy-model' },
    aiDeployment: { value: 'legacy-deployment', disabled: false },
    aiApiVersion: { value: 'legacy-version', disabled: false },
    aiBatchSize: { value: '30' },
    aiApiKey: { value: 'legacy-cloud-key', dataset: { hasKey: 'true' }, placeholder: '' },
    aiApiKeyLocal: { value: 'legacy-local-key', dataset: { hasKey: 'true' }, placeholder: '' },
    aiPrivacyStatus: { textContent: '' },
    aiConsent: { disabled: false },
    clearAiKey: { disabled: false },
    saveAiSettings: { disabled: false },
    testAiConnection: { disabled: false },
    loadAiModels: { disabled: false },
    inspectAiModel: { disabled: false },
    aiSettingsStatus: { textContent: '' },
  };
  const requests = [];
  const statuses = [];
  const context = vm.createContext({
    state: {
      aiProviderProfileGeneration: 0,
      aiProviderProfilePending: false,
      aiProviderProfileReady: true,
      aiProviderProfileSnapshot: null,
    },
    LOCAL_AI_PROVIDERS: new Set(['ollama', 'lm-studio']),
    VALID_AI_PROVIDERS: ['openai-compatible', 'nvidia', 'azure'],
    API_BASE: '',
    document: { getElementById: (id) => controls[id], querySelectorAll: () => [] },
    providerFieldIsVisible: () => true,
    isLoopbackAiUrl: () => false,
    providerProfileSnapshot: (value) => ({
      provider: value.provider,
      baseUrl: value.baseUrl,
      model: value.model,
      deployment: value.deployment || '',
      apiVersion: value.apiVersion || '',
    }),
    setAiSettingsStatus: (message) => statuses.push(message),
    fetch: (url) => new Promise((resolve, reject) => requests.push({ url: String(url), resolve, reject })),
  });
  vm.runInContext([
    'getAiApiKeyInput',
    'setAiApiKeyFields',
    'updateAiPrivacyStatus',
    'applyAiProviderFieldVisibility',
    'setAiProviderProfileState',
    'isCurrentAiProviderProfileRequest',
    'loadAiProviderProfile',
    'collectAiSettings',
    'saveAiSettings',
  ].map(uiFunctionSource).join('\n'), context);

  const staleLoad = context.loadAiProviderProfile();
  controls.aiProvider.value = 'nvidia';
  const currentLoad = context.loadAiProviderProfile();
  assert.equal(controls.aiApiKey.value, '', '切換 provider 必須同步清空雲端 API Key');
  assert.equal(controls.aiApiKeyLocal.value, '', '切換 provider 必須同步清空本機 API Key');
  assert.equal(controls.aiDeployment.value, '', '切換 provider 必須同步清空 Azure deployment');
  assert.equal(controls.saveAiSettings.disabled, true, 'provider 載入中不可儲存');
  await context.saveAiSettings();
  assert.match(statuses.at(-1), /尚未載入完成/, 'provider 載入中儲存應 fail-closed');

  const currentRequest = requests.find((request) => request.url.includes('provider=nvidia'));
  const staleRequest = requests.find((request) => request.url.includes('provider=openai-compatible'));
  assert.ok(currentRequest && staleRequest, '兩次 provider profile 請求都應建立');
  currentRequest.resolve({
    ok: true,
    status: 200,
    json: async () => ({ ok: true, profile: { baseUrl: 'https://integrate.api.nvidia.com/v1', model: 'nvidia/test' }, hasApiKey: false, capabilities: { jsonSchema: false, modelList: true } }),
  });
  await currentLoad;
  staleRequest.resolve({
    ok: true,
    status: 200,
    json: async () => ({ ok: true, profile: { baseUrl: 'https://legacy.example/v1', model: 'legacy-model' }, hasApiKey: true, capabilities: { jsonSchema: true, modelList: true } }),
  });
  await staleLoad;
  assert.equal(controls.aiBaseUrl.value, 'https://integrate.api.nvidia.com/v1', '舊 provider 回應不可覆寫目前 Base URL');
  assert.equal(controls.aiModel.value, 'nvidia/test', '舊 provider 回應不可覆寫目前模型');
  assert.equal(context.state.aiProviderProfileSnapshot.provider, 'nvidia', 'snapshot 必須屬於目前 provider');
  assert.equal(context.state.aiProviderProfileReady, true, '目前 provider 成功後才可解鎖設定');

  controls.aiProvider.value = 'azure';
  const failedLoad = context.loadAiProviderProfile();
  assert.equal(controls.saveAiSettings.disabled, true, 'provider 載入失敗前不可儲存');
  const failedRequest = requests.find((request) => request.url.includes('provider=azure'));
  failedRequest.reject(new Error('profile unavailable'));
  await failedLoad;
  assert.equal(context.state.aiProviderProfileReady, false, 'provider 載入失敗必須維持 fail-closed');
  assert.equal(context.state.aiProviderProfileSnapshot, null, 'provider 載入失敗不可保留舊 snapshot');
  assert.equal(controls.aiApiKey.value, '', 'provider 載入失敗不可保留舊雲端 API Key');
  assert.match(statuses.at(-1), /供應商載入失敗：profile unavailable/, 'provider 載入失敗應顯示診斷訊息');
}

// The bootstrap settings GET can race the first manual provider switch; its
// stale response must not recreate the old provider profile or ready state.
{
  const controls = { aiProvider: { value: 'openai-compatible' } };
  const statuses = [];
  let resolveSettings;
  let applied = false;
  const context = vm.createContext({
    state: { aiProviderProfileGeneration: 0, aiProviderProfilePending: true, aiProviderProfileReady: false },
    API_BASE: '',
    document: { getElementById: (id) => controls[id] },
    fetch: () => new Promise((resolve) => { resolveSettings = resolve; }),
    applyAiSettings: () => { applied = true; },
    setAiSettingsStatus: (message) => statuses.push(message),
  });
  vm.runInContext(['isCurrentAiProviderProfileRequest', 'loadAiSettings'].map(uiFunctionSource).join('\n'), context);
  const loading = context.loadAiSettings();
  controls.aiProvider.value = 'nvidia';
  context.state.aiProviderProfileGeneration = 1;
  context.state.aiProviderProfilePending = true;
  context.state.aiProviderProfileReady = false;
  resolveSettings({
    ok: true,
    status: 200,
    json: async () => ({ ok: true, settings: { provider: 'openai-compatible', baseUrl: 'https://legacy.example/v1', model: 'legacy-model' } }),
  });
  await loading;
  assert.equal(applied, false, '過期 bootstrap settings 不可套用舊 provider');
  assert.equal(context.state.aiProviderProfilePending, true, '過期 bootstrap settings 不可解除目前 pending 狀態');
  assert.equal(context.state.aiProviderProfileReady, false, '過期 bootstrap settings 不可重建 ready 狀態');
}

// A save already in flight must not apply its old provider response or unlock
// the controls after a newer provider transition has entered pending state.
{
  const controls = {
    saveAiSettings: { disabled: false },
    aiEnabled: { checked: false },
    aiProvider: { value: 'nvidia' },
    aiBaseUrl: { value: 'https://integrate.api.nvidia.com/v1' },
    aiModel: { value: 'nvidia/test' },
    aiDeployment: { value: '' },
    aiApiVersion: { value: '' },
    aiBatchSize: { value: '30' },
    aiApiKey: { value: '', dataset: { hasKey: 'true' } },
    aiApiKeyLocal: { value: '', dataset: { hasKey: 'false' } },
    aiTimeoutSeconds: { value: '60' },
    aiMaxRetries: { value: '3' },
    aiRetryBaseMs: { value: '1000' },
    aiInstructions: { value: '' },
    aiConsent: { checked: true },
  };
  const statuses = [];
  let resolveProject;
  let resolveSettings;
  let appliedProvider = '';
  const context = vm.createContext({
    state: { aiProviderProfileGeneration: 1, aiProviderProfilePending: false, aiProviderProfileReady: true },
    LOCAL_AI_PROVIDERS: new Set(['ollama', 'lm-studio']),
    API_BASE: '',
    document: { getElementById: (id) => controls[id] },
    window: { electronAPI: null },
    isLoopbackAiUrl: () => false,
    getAiLanguage: () => 'zh-TW',
    saveAiProjectSettings: () => new Promise((resolve) => { resolveProject = resolve; }),
    setAiSettingsStatus: (message) => statuses.push(message),
    applyAiSettings: (settings) => { appliedProvider = settings.provider; },
    fetch: () => new Promise((resolve) => { resolveSettings = resolve; }),
  });
  vm.runInContext([
    'getAiApiKeyInput',
    'collectAiSettings',
    'isCurrentAiProviderProfileRequest',
    'saveAiSettings',
  ].map(uiFunctionSource).join('\n'), context);
  assert.equal(context.isCurrentAiProviderProfileRequest('nvidia', 1), true, 'save test should begin on current provider generation');
  const saving = context.saveAiSettings();
  await new Promise(setImmediate);
  assert.equal(typeof resolveProject, 'function', 'save should enter the project settings request');
  resolveProject();
  await new Promise(setImmediate);
  assert.equal(typeof resolveSettings, 'function', 'save should enter the provider settings request');
  controls.aiProvider.value = 'azure';
  context.state.aiProviderProfileGeneration = 2;
  context.state.aiProviderProfilePending = true;
  context.state.aiProviderProfileReady = false;
  controls.saveAiSettings.disabled = true;
  resolveSettings({
    ok: true,
    status: 200,
    json: async () => ({ ok: true, settings: { provider: 'nvidia', baseUrl: controls.aiBaseUrl.value, model: controls.aiModel.value } }),
  });
  await saving;
  assert.equal(appliedProvider, '', '過期的 save response 不可套用舊 provider');
  assert.equal(controls.saveAiSettings.disabled, true, '過期的 save finally 不可解除目前 transition 鎖定');
  assert.equal(context.state.aiProviderProfilePending, true, '過期的 save 不可改寫目前 pending 狀態');
}

// Connection tests must also stay fail-closed during pending/failed profile
// states, and a response from an obsolete connection request must not unlock.
{
  const controls = { testAiConnection: { disabled: true } };
  const statuses = [];
  const context = vm.createContext({
    state: { aiProviderProfilePending: true, aiProviderProfileReady: false },
    document: { getElementById: (id) => controls[id] },
    setAiSettingsStatus: (message) => statuses.push(message),
  });
  vm.runInContext(uiFunctionSource('testAiConnection'), context);
  await context.testAiConnection();
  assert.match(statuses.at(-1), /尚未載入完成/, 'pending profile 不可測試連線');
  context.state.aiProviderProfilePending = false;
  await context.testAiConnection();
  assert.match(statuses.at(-1), /尚未載入完成/, 'failed profile 不可測試連線');

  let release;
  let current = true;
  const button = { disabled: false };
  const connectionStatuses = [];
  const connection = runProviderConnectionTest({
    button,
    savedProfile: savedGroq,
    currentSettings: { ...savedGroq, apiKey: '' },
    hasSavedKey: true,
    request: () => new Promise((resolve) => { release = resolve; }),
    setStatus: (message) => connectionStatuses.push(message),
    isCurrent: () => current,
  });
  await new Promise(setImmediate);
  current = false;
  release({ ok: true, status: 200, json: async () => ({ ok: true, modelAvailable: true }) });
  await connection;
  assert.equal(button.disabled, true, '過期 connection response 不可解除目前 transition 鎖定');
  assert.equal(connectionStatuses.at(-1), '正在測試 AI 服務…', '過期 connection response 不可更新成功／失敗狀態');
}

// Local discovery must use the same provider transition path before applying
// discovered endpoint/model values.
{
  const controls = {
    discoverLocalAi: { disabled: false },
    aiProvider: { value: 'nvidia' },
    aiBaseUrl: { value: 'https://integrate.api.nvidia.com/v1' },
    aiModel: { value: '' },
    aiBatchSize: { value: '30' },
  };
  const statuses = [];
  let resolveProfile;
  let profileLoads = 0;
  const context = vm.createContext({
    state: { aiProviderProfileGeneration: 0, aiProviderProfileReady: false },
    API_BASE: '',
    document: { getElementById: (id) => controls[id] },
    setAiSettingsStatus: (message) => statuses.push(message),
    showAiModels: () => {},
    updateAiPrivacyStatus: () => {},
    isCurrentAiProviderProfileRequest: (provider, generation) => controls.aiProvider.value === provider && context.state.aiProviderProfileGeneration === generation,
    loadAiProviderProfile: () => {
      profileLoads += 1;
      context.state.aiProviderProfileGeneration = 1;
      return new Promise((resolve) => { resolveProfile = resolve; });
    },
    fetch: async () => ({ ok: true, json: async () => ({ ok: true, services: [{ available: true, provider: 'ollama', baseUrl: 'http://127.0.0.1:11434/v1', models: ['qwen-local'], label: 'Ollama' }] }) }),
  });
  vm.runInContext(uiFunctionSource('discoverLocalAi'), context);
  const discovery = context.discoverLocalAi();
  await new Promise(setImmediate);
  assert.equal(profileLoads, 1, 'local discovery 必須走 provider profile transition');
  context.state.aiProviderProfileReady = true;
  resolveProfile();
  await discovery;
  assert.equal(controls.aiProvider.value, 'ollama', 'local discovery 應設定目前 provider');
  assert.equal(controls.aiBaseUrl.value, 'http://127.0.0.1:11434/v1', 'local discovery 應套用發現的 endpoint');
  assert.equal(controls.aiModel.value, 'qwen-local', 'local discovery 應套用第一個模型');
  assert.equal(controls.aiBatchSize.value, 8, 'local discovery 應套用本機 batch size');
}
async function exerciseCancellationRace({ retryable, cancelOk = true }) {
  const controls = {
    runAiOptimize: { disabled: true },
    cancelAiOptimize: { hidden: false },
    resumeAiOptimize: { hidden: true },
  };
  const messages = [];
  let releaseTimer;
  let releaseOldStatus;
  let statusReads = 0;
  const context = vm.createContext({
    state: { aiPolling: true }, API_BASE: '', jobId: 'synthetic-job',
    document: { getElementById: (id) => controls[id] },
    setTimeout: (callback) => { releaseTimer = callback; },
    setAiProgress: () => {}, statusMessage: (message) => messages.push(message),
    fetch: async () => ({ ok: cancelOk, status: cancelOk ? 200 : 409, json: async () => ({ ok: cancelOk, error: 'cancel rejected' }) }),
    requestAiStatusWithRetry: () => {
      statusReads += 1;
      if (statusReads === 1) return new Promise((resolve) => { releaseOldStatus = resolve; });
      return Promise.resolve({ status: 'cancelled', retryable, progress: { completedBatches: retryable ? 1 : 0 } });
    },
  });
  vm.runInContext(['setAiRunning', 'pollAiOptimization', 'restoreAiOptimizationStatus', 'cancelAiOptimize'].map(uiFunctionSource).join('\n'), context);
  const polling = context.pollAiOptimization();
  releaseTimer();
  await Promise.resolve();
  assert.equal(typeof releaseOldStatus, 'function', 'old status GET must be in flight');
  await context.cancelAiOptimize();
  if (!cancelOk) {
    assert.equal(context.state.aiPolling, true, 'rejected cancel must not stop active polling');
    assert.equal(controls.cancelAiOptimize.hidden, false);
    assert.match(messages.at(-1), /取消失敗/);
    context.state.aiPolling = false;
  }
  releaseOldStatus({ status: 'running', progress: { completedBatches: 0 } });
  await polling;
  if (cancelOk) {
    assert.equal(controls.resumeAiOptimize.hidden, !retryable, 'cancel must reconcile checkpoint controls even when the old poll exits on stale running status');
    assert.equal(controls.runAiOptimize.disabled, false);
    assert.equal(controls.cancelAiOptimize.hidden, true);
    assert.equal(statusReads, 2, 'successful cancellation must read authoritative terminal/checkpoint state');
  }
}
// A normal review job with no previous AI run receives an expected 404 from
// the status endpoint; preserve the HTTP status so the UI can treat it as idle.
{
  const controls = { resumeAiOptimize: { hidden: true } };
  const messages = [];
  const context = vm.createContext({
    API_BASE: '', jobId: 'job-without-ai-record', state: { aiPollingGeneration: 0 },
    document: { getElementById: (id) => controls[id] },
    fetch: async () => ({ ok: false, status: 404, json: async () => ({ ok: false, error: '找不到 AI 優化任務' }) }),
    statusMessage: (message) => messages.push(message),
  });
  vm.runInContext([uiFunctionSource('requestAiApi'), uiFunctionSource('restoreAiOptimizationStatus')].join('\n'), context);
  context.requestAiStatusWithRetry = () => context.requestAiApi('/api/jobs/job-without-ai-record/ai-optimize');
  const restored = await context.restoreAiOptimizationStatus();
  assert.equal(restored, null, 'missing AI record should resolve as idle');
  assert.deepEqual(messages, [], 'expected AI record 404 must not show an error in a normal review session');
  await assert.rejects(context.requestAiApi('/api/jobs/job-without-ai-record/ai-optimize'), (error) => error.status === 404);
}

await exerciseCancellationRace({ retryable: true });
await exerciseCancellationRace({ retryable: false });
await exerciseCancellationRace({ retryable: true, cancelOk: false });

for (const staleStatus of ['cancelled', 'failed', 'completed', 'network-error']) {
  const controls = { runAiOptimize: { disabled: true }, cancelAiOptimize: { hidden: false }, resumeAiOptimize: { hidden: true, disabled: false } };
  const timers = [];
  let releaseOldStatus;
  let rejectOldStatus;
  let reads = 0;
  const context = vm.createContext({
    state: { aiPolling: true, aiPollingGeneration: 0 }, jobId: 'synthetic-job', API_BASE: '',
    document: { getElementById: (id) => controls[id] },
    setTimeout: (callback) => { timers.push(callback); },
    setAiProgress: () => {}, statusMessage: () => {}, setAiToolbarCollapsed: () => {},
    updateAiSuggestionActions: () => {}, renderCueList: () => {}, updateAiSessionControls: () => {},
    fetch: async () => ({ ok: true, json: async () => ({ ok: true }) }),
    requestAiApi: async () => ({ ok: true, resumedFromBatch: 1 }),
    requestAiStatusWithRetry: () => {
      reads += 1;
      if (reads === 1) return new Promise((resolve, reject) => { releaseOldStatus = resolve; rejectOldStatus = reject; });
      if (reads === 2) return Promise.resolve({ status: 'cancelled', retryable: true });
      return Promise.resolve({ status: 'completed', sessionId: 'resumed-session', result: { suggestions: [] } });
    },
  });
  vm.runInContext(['setAiRunning', 'pollAiOptimization', 'restoreAiOptimizationStatus', 'cancelAiOptimize', 'resumeAiOptimize'].map(uiFunctionSource).join('\n'), context);
  const oldPoll = context.pollAiOptimization();
  timers.shift()();
  await Promise.resolve();
  await context.cancelAiOptimize();
  const resumed = context.resumeAiOptimize();
  await new Promise(setImmediate);
  assert.equal(context.state.aiPolling, true);
  if (staleStatus === 'network-error') rejectOldStatus(new Error('stale status request failed'));
  else releaseOldStatus({ status: staleStatus, retryable: true, sessionId: 'stale-session', result: { suggestions: [] } });
  await oldPoll;
  assert.equal(context.state.aiPolling, true, `late ${staleStatus} must not stop resumed polling`);
  assert.equal(controls.cancelAiOptimize.hidden, false, 'new running controls must remain visible');
  assert.equal(controls.resumeAiOptimize.hidden, true);
  timers.shift()();
  await resumed;
  assert.equal(context.state.aiSessionId, 'resumed-session', 'new generation must complete normally');
  assert.equal(reads, 3);
}

for (const restoreFails of [false, true]) {
  const controls = { runAiOptimize: { disabled: true }, cancelAiOptimize: { hidden: false }, resumeAiOptimize: { hidden: true }, aiScope: { value: 'all' }, aiPromptMode: { value: 'translate' }, aiPreserveTiming: { checked: true }, aiInstructions: { value: '' } };
  const messages = [];
  const timers = [];
  let resolveRestore;
  let rejectRestore;
  let statusReads = 0;
  const context = vm.createContext({
    state: { aiPolling: true, aiPollingGeneration: 0, aiSuggestions: new Map(), aiSessionId: 'original-session' }, jobId: 'synthetic-job', API_BASE: '',
    document: { getElementById: (id) => controls[id] },
    setAiProgress: (_progress, message) => messages.push(message), statusMessage: (message) => messages.push(message),
    aiRequestCues: () => [{ id: 1, text: 'fixture' }], getAiLanguage: () => 'en', setAiToolbarCollapsed: () => {},
    updateAiSuggestionActions: () => {}, renderCueList: () => {}, updateAiSessionControls: () => {},
    requestAiApi: async () => ({ ok: true }), isNetworkFetchFailure: () => false,
    setTimeout: (callback) => timers.push(callback),
    fetch: async () => ({ ok: true, json: async () => ({ ok: true }) }),
    requestAiStatusWithRetry: () => {
      statusReads += 1;
      if (statusReads === 1) return new Promise((resolve, reject) => { resolveRestore = resolve; rejectRestore = reject; });
      return Promise.resolve({ status: 'completed', sessionId: 'new-session', result: { suggestions: [] } });
    },
  });
  vm.runInContext(['setAiRunning', 'pollAiOptimization', 'runAiOptimize', 'restoreAiOptimizationStatus', 'cancelAiOptimize'].map(uiFunctionSource).join('\n'), context);
  const cancelled = context.cancelAiOptimize();
  await new Promise(setImmediate);
  assert.equal(typeof resolveRestore, 'function', 'cancel restore GET must be in flight');
  const newTask = context.runAiOptimize();
  await new Promise(setImmediate);
  messages.length = 0;
  messages.push('NEW_TASK_STATUS');
  if (restoreFails) rejectRestore(new Error('old status network failure'));
  else resolveRestore({ status: 'cancelled', retryable: true });
  await cancelled;
  assert.equal(context.state.aiPolling, true, 'late restore must not stop the newly started task');
  assert.equal(controls.runAiOptimize.disabled, true);
  assert.equal(controls.cancelAiOptimize.hidden, false);
  assert.equal(controls.resumeAiOptimize.hidden, true);
  assert.equal(context.state.aiSessionId, 'original-session', 'pending new task Session must not be overwritten by old restore');
  assert.deepEqual(messages, ['NEW_TASK_STATUS'], 'superseded cancel/restore must not overwrite the new task status');
  timers.shift()();
  await newTask;
  assert.equal(context.state.aiSessionId, 'new-session', 'the new actual UI task must complete normally');
  assert.equal(context.state.aiPolling, false);
  assert.equal(controls.runAiOptimize.disabled, false);
}

for (const scenario of ['superseded-start', 'current-start-failure', 'current-poll-failure']) {
  const controls = {
    runAiOptimize: { disabled: false }, cancelAiOptimize: { hidden: true }, resumeAiOptimize: { hidden: true },
    aiScope: { value: 'all' }, aiPromptMode: { value: 'translate' }, aiPreserveTiming: { checked: true }, aiInstructions: { value: '' },
  };
  const messages = [];
  const timers = [];
  let rejectStart;
  const context = vm.createContext({
    state: { aiPolling: false, aiPollingGeneration: 0, aiSuggestions: new Map() }, jobId: 'synthetic-job', API_BASE: '',
    document: { getElementById: (id) => controls[id] },
    aiRequestCues: () => [{ id: 1, text: 'fixture' }], getAiLanguage: () => 'en',
    updateAiSuggestionActions: () => {}, renderCueList: () => {}, setAiToolbarCollapsed: () => {},
    setAiProgress: (_progress, message) => messages.push(message), statusMessage: (message) => messages.push(message),
    isNetworkFetchFailure: () => false,
    requestAiApi: () => scenario === 'current-poll-failure' ? Promise.resolve({ ok: true }) : new Promise((_resolve, reject) => { rejectStart = reject; }),
    requestAiStatusWithRetry: async () => ({ status: 'failed', retryable: true, error: 'FIXTURE_ERROR' }),
    setTimeout: (callback) => timers.push(callback),
  });
  vm.runInContext(['setAiRunning', 'pollAiOptimization', 'runAiOptimize'].map(uiFunctionSource).join('\n'), context);
  const running = context.runAiOptimize();
  await new Promise(setImmediate);
  if (scenario === 'current-poll-failure') timers.shift()();
  else {
    if (scenario === 'superseded-start') {
      context.setAiRunning(false);
      context.setAiRunning(true);
      messages.length = 0;
      messages.push('NEW_TASK_STATUS');
    }
    rejectStart(new Error('FIXTURE_ERROR'));
  }
  await running;
  if (scenario === 'superseded-start') {
    assert.equal(context.state.aiPolling, true);
    assert.equal(controls.cancelAiOptimize.hidden, false);
    assert.deepEqual(messages, ['NEW_TASK_STATUS'], 'superseded start error must not stop or report over the new task');
  } else {
    assert.equal(context.state.aiPolling, false);
    assert.equal(controls.runAiOptimize.disabled, false);
    assert.ok(messages.some((message) => String(message).includes('FIXTURE_ERROR')), 'current task failures must remain visible');
  }
}

console.log('校閱 UI 測試通過：AI 面板預設收合、狀態記憶、自動展開與字幕清單空間');
