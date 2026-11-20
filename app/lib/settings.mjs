import fs from 'node:fs';
import path from 'node:path';
import { isSupportedProvider, PROVIDER_DEFAULT_BASE_URLS } from './ai/providers.mjs';
import { isLocalAiProvider, isLoopbackAiUrl } from './ai/local-ai.mjs';
import { migrateAppSettings } from './ai/provider-migration.mjs';
import { normalizeLanguageTag } from './ai/languages.mjs';

export const CURRENT_SCHEMA_VERSION = 3;
export const SETTINGS_FILE = 'settings.json';

const DEFAULT_AI_SETTINGS = {
  enabled: false,
  provider: 'openai-compatible',
  baseUrl: 'https://api.openai.com/v1',
  model: '',
  batchSize: 30,
  language: 'zh-TW',
  timeoutSeconds: 60,
  maxRetries: 3,
  retryBaseMs: 1000,
  deployment: '',
  apiVersion: '2024-12-01-preview',
  consentGrantedAt: '',
  profiles: {},
  migrationNotice: '',
  instructions: '修正錯字與標點，保留原意；專有名詞使用一致寫法，不確定的內容不要自行補寫。',
};

export function createDefaultSettings({ projectFolder = '', ai = {} } = {}) {
  return {
    appLanguage: 'zh-TW',
    projectFolder,
    importFolder: '',
    exportFolder: '',
    ai: { ...DEFAULT_AI_SETTINGS, ...ai },
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
}

function normalizeFolder(value) {
  const text = String(value || '').trim();
  return text ? path.resolve(text) : '';
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

export function normalizeAiSettings(
  value = {},
  { defaultSettings = createDefaultSettings() } = {}
) {
  const migrated = migrateAppSettings({ ai: value }).settings.ai || {};
  const hasExplicitProvider = Object.hasOwn(migrated, 'provider');
  const requestedProvider = String(migrated.provider || '').trim();
  const provider =
    hasExplicitProvider && !requestedProvider
      ? ''
      : isSupportedProvider(requestedProvider)
        ? requestedProvider
        : defaultSettings.ai.provider;
  const providerDefaultBaseUrl = PROVIDER_DEFAULT_BASE_URLS[provider] ?? defaultSettings.ai.baseUrl;
  const localProvider = Boolean(provider) && isLocalAiProvider(provider);
  let baseUrl = String(
    Object.hasOwn(migrated, 'baseUrl') ? migrated.baseUrl : providerDefaultBaseUrl
  )
    .trim()
    .replace(/\/+$/, '');
  let model = String(migrated.model || '').trim();
  const looksLikeGeminiSetting =
    /generativelanguage\.googleapis\.com/i.test(baseUrl) ||
    /(^|[-_.])gemini([-.0-9]|$)/i.test(model);
  if (provider === 'openai-compatible' && looksLikeGeminiSetting) {
    baseUrl = providerDefaultBaseUrl;
    model = '';
  }
  if (!provider) {
    baseUrl = '';
    model = '';
  }
  const profiles =
    migrated.profiles && typeof migrated.profiles === 'object' ? { ...migrated.profiles } : {};
  delete profiles['lm-studio'];
  return {
    ...DEFAULT_AI_SETTINGS,
    ...defaultSettings.ai,
    enabled: Boolean(provider) && Boolean(migrated.enabled),
    provider,
    baseUrl,
    model,
    batchSize: clampNumber(
      migrated.batchSize,
      1,
      localProvider ? 20 : 100,
      localProvider ? 8 : defaultSettings.ai.batchSize
    ),
    language: normalizeLanguageTag(migrated.language, defaultSettings.ai.language),
    timeoutSeconds: clampNumber(
      migrated.timeoutSeconds,
      10,
      300,
      defaultSettings.ai.timeoutSeconds
    ),
    maxRetries: clampNumber(migrated.maxRetries, 0, 8, defaultSettings.ai.maxRetries),
    retryBaseMs: clampNumber(migrated.retryBaseMs, 100, 10000, defaultSettings.ai.retryBaseMs),
    deployment: String(migrated.deployment || '').trim(),
    apiVersion: String(migrated.apiVersion || defaultSettings.ai.apiVersion).trim(),
    consentGrantedAt: String(migrated.consentGrantedAt || '').trim(),
    profiles,
    migrationNotice: String(migrated.migrationNotice || '').trim(),
    instructions: String(migrated.instructions || defaultSettings.ai.instructions).trim(),
  };
}

export function normalizeSettings(value = {}, { defaultSettings = createDefaultSettings() } = {}) {
  return {
    appLanguage: ['zh-TW', 'en'].includes(value.appLanguage)
      ? value.appLanguage
      : defaultSettings.appLanguage,
    projectFolder: normalizeFolder(value.projectFolder) || defaultSettings.projectFolder,
    importFolder: normalizeFolder(value.importFolder),
    exportFolder: normalizeFolder(value.exportFolder),
    ai: normalizeAiSettings(value.ai, { defaultSettings }),
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
}

function migrateV1(settings) {
  const next = { ...settings };
  if (next.ai && !next.ai.profiles) next.ai = { ...next.ai, profiles: {} };
  return next;
}

function migrateV2(settings) {
  const next = { ...settings, ai: { ...(settings.ai || {}) } };
  if (next.ai.language) {
    next.ai.language = normalizeLanguageTag(next.ai.language, 'zh-TW');
  }
  if (next.appLanguage === 'zh-CN') next.appLanguage = 'zh-TW';
  return next;
}

function migrateV3(settings) {
  // v2 -> v3 reserves the version for Electron safeStorage migration. The
  // secret migration remains owned by the existing provider migration layer.
  return { ...settings };
}

export function migrateSettings(settings = {}, { defaultSettings = createDefaultSettings() } = {}) {
  const source = settings && typeof settings === 'object' ? settings : {};
  const rawVersion = Number(source.schemaVersion) || 0;
  let current = { ...source };
  for (let version = rawVersion + 1; version <= CURRENT_SCHEMA_VERSION; version += 1) {
    if (version === 1) current = migrateV1(current);
    if (version === 2) current = migrateV2(current);
    if (version === 3) current = migrateV3(current);
  }
  const normalized = normalizeSettings(
    { ...current, schemaVersion: CURRENT_SCHEMA_VERSION },
    { defaultSettings }
  );
  return {
    settings: normalized,
    migrated:
      rawVersion !== CURRENT_SCHEMA_VERSION ||
      JSON.stringify(source) !== JSON.stringify(normalized),
    fromVersion: rawVersion,
  };
}

export function loadSettings(
  settingsDir,
  { defaultSettings = createDefaultSettings(), onLoad } = {}
) {
  const settingsPath = path.join(settingsDir, SETTINGS_FILE);
  let raw = {};
  try {
    raw = JSON.parse(fs.readFileSync(settingsPath, 'utf8').replace(/^﻿/, ''));
  } catch {
    raw = {};
  }
  const providerMigrated = migrateAppSettings(raw);
  const result = migrateSettings(providerMigrated.settings, { defaultSettings });
  onLoad?.({ raw, providerMigrated, ...result });
  if (result.migrated) saveSettings(settingsDir, result.settings, { normalize: false });
  return result.settings;
}

export function saveSettings(
  settingsDir,
  settings,
  { defaultSettings = createDefaultSettings(), normalize = true } = {}
) {
  const value = normalize ? normalizeSettings(settings, { defaultSettings }) : settings;
  const settingsPath = path.join(settingsDir, SETTINGS_FILE);
  fs.mkdirSync(settingsDir, { recursive: true });
  fs.writeFileSync(settingsPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  return value;
}

export function isLocalSettingsEndpoint(value) {
  return isLoopbackAiUrl(value);
}
