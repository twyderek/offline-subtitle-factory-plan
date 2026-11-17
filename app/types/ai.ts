export type AiProvider = 'openai' | 'openai-compatible' | 'azure' | 'groq' | 'gemini' | 'ollama';

export interface AiSettings {
  enabled: boolean;
  provider: AiProvider | '';
  baseUrl: string;
  model: string;
  batchSize: number;
  language: string;
  timeoutSeconds: number;
  maxRetries: number;
  retryBaseMs: number;
  deployment: string;
  apiVersion: string;
  consentGrantedAt: string;
  profiles: Record<string, unknown>;
  migrationNotice?: string;
  instructions: string;
}

export interface AiOptimizeRequest {
  cues: Array<{ id: number | string; start: string; end: string; text: string }>;
  mode?: 'proofread' | 'breaks' | 'terms' | 'fillers' | 'translate';
  instructions?: string;
  search?: string;
  language?: string;
}

export interface AiSuggestion {
  id: number | string;
  text: string;
  reason: string;
  original?: string;
}

export interface AiOptimizeResponse {
  sessionId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  progress: {
    completedBatches: number;
    totalBatches: number;
    processedCues: number;
    totalCues: number;
    totalRetries: number;
  };
  result?: {
    suggestions: AiSuggestion[];
    totalCues: number;
    changedCues: number;
    totalBatches: number;
    totalRetries: number;
    resumedFromBatch: number;
  };
  error?: string;
  retryable?: boolean;
}
