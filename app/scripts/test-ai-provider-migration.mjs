import assert from 'node:assert/strict';
import {
  AI_PROVIDER_MIGRATION_NOTICE,
  migrateAiSecrets,
  migrateAiSettings,
  migrateAppSettings,
  migrateImportedProject,
} from '../lib/ai/provider-migration.mjs';
import {
  migrateImportedProject as migrateBrowserProject,
  migrateLegacyAiLocalStorage,
} from '../public/ai-provider-settings.mjs';

const legacyAi = {
  provider: 'lm-studio',
  enabled: true,
  baseUrl: 'http://127.0.0.1:1234/v1',
  model: 'legacy-model',
  deployment: 'legacy-deployment',
  apiVersion: 'legacy-api-version',
  apiKey: 'legacy-key',
  secretRef: 'legacy-secret-ref',
  capabilities: { jsonSchema: true, structuredOutput: 'json-schema' },
  profiles: {
    'lm-studio': { baseUrl: 'http://127.0.0.1:1234/v1', model: 'legacy-model' },
    ollama: { baseUrl: 'http://127.0.0.1:11434/v1', model: 'keep-ollama' },
    openai: { model: 'keep-openai' },
  },
};

const settingsMigration = migrateAiSettings(legacyAi);
assert.equal(settingsMigration.migrated, true);
assert.equal(settingsMigration.settings.provider, '');
assert.equal(settingsMigration.settings.enabled, false);
assert.equal(settingsMigration.settings.baseUrl, undefined);
assert.equal(settingsMigration.settings.model, undefined);
assert.equal(settingsMigration.settings.deployment, '');
assert.equal(settingsMigration.settings.apiVersion, '');
assert.equal(settingsMigration.settings.apiKey, undefined);
assert.equal(settingsMigration.settings.secretRef, undefined);
assert.equal(settingsMigration.settings.capabilities, undefined);
assert.equal(settingsMigration.settings.profiles['lm-studio'], undefined);
assert.equal(settingsMigration.settings.profiles.ollama.model, 'keep-ollama');
assert.equal(settingsMigration.settings.profiles.openai.model, 'keep-openai');
assert.equal(settingsMigration.settings.migrationNotice, AI_PROVIDER_MIGRATION_NOTICE);
const secondSettingsMigration = migrateAiSettings(settingsMigration.settings);
assert.equal(secondSettingsMigration.migrated, false, '設定 migration 必須具備 idempotence');

const appMigration = migrateAppSettings({ appLanguage: 'zh-TW', ai: legacyAi, unrelated: { keep: true } });
assert.equal(appMigration.migrated, true);
assert.deepEqual(appMigration.settings.unrelated, { keep: true });

const secretsMigration = migrateAiSecrets({
  providers: { 'lm-studio': 'remove-me', ollama: 'keep-ollama-secret', openai: 'keep-openai-secret' },
  apiKey: 'legacy-key',
}, { removeLegacyApiKey: true });
assert.equal(secretsMigration.secrets.providers['lm-studio'], undefined);
assert.equal(secretsMigration.secrets.providers.ollama, 'keep-ollama-secret');
assert.equal(secretsMigration.secrets.providers.openai, 'keep-openai-secret');
assert.equal(secretsMigration.secrets.apiKey, undefined);
assert.equal(migrateAiSecrets(secretsMigration.secrets).migrated, false, 'secret migration 必須具備 idempotence');

const projectMigration = migrateImportedProject({
  title: 'keep project',
  ai: legacyAi,
  settings: { ai: legacyAi, keep: 'value' },
});
assert.equal(projectMigration.migrated, true);
assert.equal(projectMigration.project.ai.provider, '');
assert.equal(projectMigration.project.settings.ai.provider, '');
assert.equal(projectMigration.project.settings.keep, 'value');
assert.equal(projectMigration.project.title, 'keep project');
assert.equal(migrateImportedProject(projectMigration.project).migrated, false);
assert.equal(migrateBrowserProject({ ai: legacyAi }).project.ai.provider, '', 'renderer 匯入 migration 應同樣回到未選擇');

const entries = new Map([
  ['offlineSubtitleFactory.aiSettings', JSON.stringify({ ai: legacyAi, keep: 'value' })],
  ['offlineSubtitleFactory.aiProvider', 'lm-studio'],
  ['unrelated.preference', JSON.stringify({ keep: true })],
]);
const storage = {
  get length() { return entries.size; },
  key(index) { return [...entries.keys()][index] ?? null; },
  getItem(key) { return entries.get(key) ?? null; },
  setItem(key, value) { entries.set(key, String(value)); },
  removeItem(key) { entries.delete(key); },
};
const storageMigration = migrateLegacyAiLocalStorage(storage);
assert.equal(storageMigration.migrated, true);
assert.equal(entries.has('offlineSubtitleFactory.aiProvider'), false, '舊 LM provider localStorage entry 應移除');
const storedSettings = JSON.parse(entries.get('offlineSubtitleFactory.aiSettings'));
assert.equal(storedSettings.ai.provider, '', '舊 localStorage settings 應回到未選擇');
assert.equal(storedSettings.ai.profiles.ollama.model, 'keep-ollama');
assert.deepEqual(JSON.parse(entries.get('unrelated.preference')), { keep: true }, '無關 localStorage 必須保留');
assert.equal(migrateLegacyAiLocalStorage(storage).migrated, false, 'localStorage migration 必須具備 idempotence');

console.log('AI provider migration regression tests passed.');
