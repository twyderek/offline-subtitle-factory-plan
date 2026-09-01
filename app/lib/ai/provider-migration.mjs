export const DISCONTINUED_AI_PROVIDER = 'lm-studio';
export const AI_PROVIDER_MIGRATION_NOTICE = 'LM Studio 已停止支援，相關設定已移除，請重新選擇 AI 供應商。';

const DISCONTINUED_SECRET_FIELDS = [
  'apiKey',
  'apiKeyRef',
  'secret',
  'secretRef',
  'secretReference',
  'endpoint',
  'baseUrl',
  'model',
  'capabilities',
];

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function isDiscontinuedAiProvider(value) {
  return String(value || '').trim().toLowerCase() === DISCONTINUED_AI_PROVIDER;
}

function removeDiscontinuedProfile(profiles) {
  if (!isRecord(profiles) || !Object.hasOwn(profiles, DISCONTINUED_AI_PROVIDER)) return { profiles, migrated: false };
  const next = { ...profiles };
  delete next[DISCONTINUED_AI_PROVIDER];
  return { profiles: next, migrated: true };
}

export function migrateAiSettings(value = {}) {
  if (!isRecord(value)) return { settings: {}, migrated: false };

  let settings = { ...value };
  let migrated = false;
  const removedProvider = isDiscontinuedAiProvider(settings.provider);
  const profileResult = removeDiscontinuedProfile(settings.profiles);
  if (profileResult.migrated) {
    settings.profiles = profileResult.profiles;
    migrated = true;
  }

  if (removedProvider) {
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
    for (const field of DISCONTINUED_SECRET_FIELDS) delete settings[field];
    migrated = true;
  }

  if (migrated && !settings.migrationNotice) settings.migrationNotice = AI_PROVIDER_MIGRATION_NOTICE;
  return { settings, migrated };
}

export function migrateAppSettings(value = {}) {
  if (!isRecord(value)) return { settings: {}, migrated: false };
  const aiResult = migrateAiSettings(value.ai);
  if (!aiResult.migrated) return { settings: { ...value }, migrated: false };
  return { settings: { ...value, ai: aiResult.settings }, migrated: true };
}

export function migrateAiSecrets(value = {}, { removeLegacyApiKey = false } = {}) {
  if (!isRecord(value)) return { secrets: {}, migrated: false };
  const providers = isRecord(value.providers) ? { ...value.providers } : {};
  let migrated = false;
  if (Object.hasOwn(providers, DISCONTINUED_AI_PROVIDER)) {
    delete providers[DISCONTINUED_AI_PROVIDER];
    migrated = true;
  }

  const secrets = { ...value, providers };
  if (removeLegacyApiKey && Object.hasOwn(secrets, 'apiKey')) {
    delete secrets.apiKey;
    migrated = true;
  }
  if (!Object.keys(providers).length) delete secrets.providers;
  return { secrets, migrated };
}

function cloneJson(value) {
  try { return JSON.parse(JSON.stringify(value)); } catch { return value; }
}

export function migrateImportedProject(value = {}) {
  let project = cloneJson(value);
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
