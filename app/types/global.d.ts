/// <reference types="node" />

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      OFFLINE_SUBTITLE_DATA_DIR?: string;
      OFFLINE_SUBTITLE_TOOLS_DIR?: string;
      OFFLINE_SUBTITLE_SETTINGS_DIR?: string;
      OFFLINE_SUBTITLE_API_TOKEN?: string;
      OFFLINE_SUBTITLE_MAX_JOBS?: string;
      PORT?: string;
      SUBTITLE_AI_API_KEY?: string;
      SUBTITLE_AI_KEYS_JSON?: string;
      NODE_ENV?: 'development' | 'test' | 'production';
      ELECTRON_RUN_AS_NODE?: string;
    }
  }
}

export {};
