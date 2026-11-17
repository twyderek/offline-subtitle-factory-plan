import { describe, expect, it } from 'vitest';
import {
  AiProviderError,
  AppError,
  CancellationError,
  JobConflictError,
  JobNotFoundError,
  ModelNotFoundError,
  ToolNotFoundError,
  ValidationError,
  isAppError,
  toAppError,
} from '../../lib/errors.mjs';

describe('application errors', () => {
  it('exposes a stable error contract', () => {
    const error = new ValidationError('欄位錯誤');
    expect(error).toMatchObject({ code: 'VALIDATION_ERROR', status: 400, retryable: false });
    expect(error).toBeInstanceOf(AppError);
  });

  it('normalizes common system failures', () => {
    expect(toAppError(Object.assign(new Error('missing'), { code: 'ENOENT' }))).toBeInstanceOf(
      ToolNotFoundError
    );
    expect(toAppError(Object.assign(new Error('denied'), { code: 'EACCES' }))).toMatchObject({
      code: 'PERMISSION_DENIED',
      status: 403,
    });
    expect(toAppError(new Error('failed')).code).toBe('APP_ERROR');
    expect(isAppError(new ModelNotFoundError('tiny'))).toBe(true);
  });

  it('provides domain-specific error metadata', () => {
    expect(
      new AiProviderError('rate limited', { provider: 'ollama', retryAfterMs: 10 })
    ).toMatchObject({
      provider: 'ollama',
      retryAfterMs: 10,
      retryable: true,
    });
    expect(new JobNotFoundError('job-1').jobId).toBe('job-1');
    expect(new JobConflictError('busy').status).toBe(409);
    expect(new CancellationError().code).toBe('CANCELLED');
  });
});
