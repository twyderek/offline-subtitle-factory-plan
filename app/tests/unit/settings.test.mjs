import { describe, expect, it } from 'vitest';
import {
  CURRENT_SCHEMA_VERSION,
  migrateSettings,
  normalizeAiSettings,
} from '../../lib/settings.mjs';

describe('settings migration', () => {
  it('upgrades legacy settings to schema v3 without dropping values', () => {
    const result = migrateSettings({
      appLanguage: 'zh-CN',
      projectFolder: 'C:/subtitle-jobs',
      ai: { language: 'zh-tw', model: 'my-model' },
    });
    expect(result.settings.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.settings.appLanguage).toBe('zh-TW');
    expect(result.settings.ai.language).toBe('zh-TW');
    expect(result.settings.ai.model).toBe('my-model');
    expect(result.migrated).toBe(true);
  });

  it('preserves an explicitly unselected provider', () => {
    const ai = normalizeAiSettings({ provider: '', enabled: true });
    expect(ai.provider).toBe('');
    expect(ai.enabled).toBe(false);
    expect(ai.baseUrl).toBe('');
  });
});
