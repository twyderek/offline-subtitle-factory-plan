import type { AiSettings } from './ai.js';

export interface AppSettings {
  appLanguage: 'zh-TW' | 'en';
  projectFolder: string;
  importFolder: string;
  exportFolder: string;
  ai: AiSettings;
  schemaVersion: number;
}
