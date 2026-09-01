const DISCONTINUED_AI_PROVIDER = 'lm-studio';
export const AI_PROVIDER_MIGRATION_NOTICE = 'LM Studio 已停止支援，相關設定已移除，請重新選擇 AI 供應商。';

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function migrateAiSettings(value = {}) {
  if (!isRecord(value)) return { settings: value, migrated: false };
  let settings = { ...value };
  let migrated = false;
  const provider = String(settings.provider || '').trim().toLowerCase();
  if (provider === DISCONTINUED_AI_PROVIDER) {
    settings = {
      ...settings,
      enabled: false,
      provider: '',
      baseUrl: '',
      model: '',
      deployment: '',
      apiVersion: '',
      migrationNotice: AI_PROVIDER_MIGRATION_NOTICE,
    };
    for (const key of ['endpoint', 'apiKey', 'apiKeyRef', 'secret', 'secretRef', 'secretReference', 'capabilities']) delete settings[key];
    migrated = true;
  }
  if (isRecord(settings.profiles) && Object.hasOwn(settings.profiles, DISCONTINUED_AI_PROVIDER)) {
    settings.profiles = { ...settings.profiles };
    delete settings.profiles[DISCONTINUED_AI_PROVIDER];
    migrated = true;
  }
  if (migrated && !settings.migrationNotice) settings.migrationNotice = AI_PROVIDER_MIGRATION_NOTICE;
  return { settings, migrated };
}

export function migrateImportedProject(value = {}) {
  let project;
  try { project = JSON.parse(JSON.stringify(value)); } catch { project = value; }
  if (!isRecord(project)) return { project, migrated: false };
  const direct = migrateAiSettings(project);
  let migrated = false;
  if (direct.migrated && (Object.hasOwn(project, 'provider') || Object.hasOwn(project, 'profiles'))) {
    project = direct.settings;
    migrated = true;
  }
  const migrateField = (container, field) => {
    if (!isRecord(container) || !isRecord(container[field])) return;
    const result = migrateAiSettings(container[field]);
    if (result.migrated) {
      container[field] = result.settings;
      migrated = true;
    }
  };
  migrateField(project, 'ai');
  migrateField(project, 'aiSettings');
  migrateField(project, 'settings');
  if (isRecord(project.settings)) migrateField(project.settings, 'ai');
  return { project, migrated };
}

export function migrateLegacyAiLocalStorage(storage) {
  if (!storage || typeof storage.length !== 'number') return { migrated: false, changedKeys: [] };
  const changedKeys = [];
  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index);
    const raw = key == null ? '' : String(storage.getItem(key) || '');
    if (!/ai|provider|setting|profile|secret/i.test(key || '')) continue;
    if (raw.trim().toLowerCase() === DISCONTINUED_AI_PROVIDER || /^https?:\/\/(?:127\.0\.0\.1|localhost):1234(?:\/|$)/i.test(raw.trim())) {
      try { storage.removeItem(key); changedKeys.push(key); } catch {}
      continue;
    }
    try {
      const parsed = JSON.parse(raw);
      const result = migrateImportedProject(parsed);
      let migratedValue = result.project;
      let migrated = result.migrated;
      if (isRecord(migratedValue) && isRecord(migratedValue.providers) && Object.hasOwn(migratedValue.providers, DISCONTINUED_AI_PROVIDER)) {
        migratedValue = { ...migratedValue, providers: { ...migratedValue.providers } };
        delete migratedValue.providers[DISCONTINUED_AI_PROVIDER];
        if (!Object.keys(migratedValue.providers).length) delete migratedValue.providers;
        migrated = true;
      }
      if (migrated) {
        storage.setItem(key, JSON.stringify(migratedValue));
        changedKeys.push(key);
      }
    } catch {}
  }
  return { migrated: changedKeys.length > 0, changedKeys };
}

export function providerProfileSnapshot(value = {}) {
  const provider = String(value.provider || '').trim();
  return {
    provider,
    baseUrl: String(value.baseUrl || '').trim().replace(/\/+$/, ''),
    model: String(value.model || '').trim(),
    deployment: provider === 'azure' ? String(value.deployment || '').trim() : '',
    apiVersion: provider === 'azure' ? String(value.apiVersion || '').trim() : '',
  };
}

export function providerProfileMatches(saved, current) {
  if (!saved) return false;
  const left = providerProfileSnapshot(saved);
  const right = providerProfileSnapshot(current);
  return Object.keys(left).every((key) => left[key] === right[key]);
}

export function isLoopbackAiUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return ['http:', 'https:'].includes(url.protocol)
      && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function validateProviderConnectionForm(saved, current, hasSavedKey) {
  const profile = providerProfileSnapshot(current);
  if (!profile.baseUrl) return '請先填寫 API Base URL 並儲存設定';
  if (!profile.model) return '請先填寫模型名稱並儲存設定';
  if (String(current?.apiKey || '').trim()) return '請先儲存設定與 API Key，再測試連線';
  if (!hasSavedKey && !isLoopbackAiUrl(profile.baseUrl)) return '請先輸入 API Key 並儲存設定';
  if (!providerProfileMatches(saved, profile)) return '供應商、Base URL 或模型已有未儲存變更；請先儲存設定';
  return '';
}

export async function runProviderConnectionTest({ button, savedProfile, currentSettings, hasSavedKey, request, setStatus }) {
  button.disabled = true;
  setStatus('正在測試 AI 服務…');
  try {
    const validationError = validateProviderConnectionForm(savedProfile, currentSettings, hasSavedKey);
    if (validationError) throw new Error(validationError);
    const response = await request();
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || `HTTP ${response.status}`);
    const modelMessage = result.modelAvailable ? '指定模型可用' : '已連線，但模型清單中找不到指定模型';
    setStatus(`連線成功：${modelMessage}`);
    return result;
  } catch (error) {
    setStatus(`連線失敗：${error.message}`);
    return null;
  } finally {
    button.disabled = false;
  }
}
