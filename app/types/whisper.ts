export type WhisperModelName = 'tiny' | 'base' | 'small';

export interface WhisperModelDefinition {
  name: WhisperModelName;
  label: string;
  description: string;
  filename: string;
  minimumBytes: number;
}

export interface WhisperModelDownload {
  name: WhisperModelName;
  filename: string;
  size: number;
  sha256: string;
  url: string;
}

export interface WhisperModelStatus {
  name: WhisperModelName;
  label: string;
  description: string;
  filename: string;
  installed: boolean;
  valid: boolean;
  reason: 'ok' | 'missing' | 'too-small' | 'sha256-mismatch' | 'size-mismatch';
  path: string;
  size: number;
  sha256: string;
  status: 'installed' | 'missing' | 'downloading' | 'completed' | 'failed' | 'cancelled';
  download: WhisperModelDownload;
  progress: number;
  bytesDownloaded: number;
  totalBytes: number;
  message: string;
  error: string | null;
}
