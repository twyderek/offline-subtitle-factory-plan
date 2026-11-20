export interface JobConfig {
  jobId: string;
  createdAt: string;
  language: string;
  asrEngine: 'whisper-cpp' | 'breeze-asr-25' | 'manual';
  modelName: 'tiny' | 'base' | 'small';
  performancePreset: 'fast' | 'balanced' | 'accurate';
  cpuThreads: number;
  outputFormats: string;
  requirements: string;
  files: {
    video: string | null;
    ruleFile: string | null;
    existingSrt: string | null;
  };
}

export type JobStatusName =
  | 'created'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'needs-action'
  | 'interrupted';

export interface JobStatus {
  jobId: string;
  status: JobStatusName;
  stage: string;
  progress: number;
  message: string;
  logs: string[];
  metrics: Record<string, unknown>;
  folder: string;
  files: Record<string, unknown>;
  updatedAt: string;
}

export interface Job {
  jobRoot: string;
  config: JobConfig;
  status: JobStatus;
}
