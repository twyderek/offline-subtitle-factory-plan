/**
 * Application error contract shared by the HTTP layer and domain modules.
 * Every error exposed by an API boundary has a stable code, HTTP status and
 * retryability flag so callers do not need to parse localized messages.
 */
export class AppError extends Error {
  constructor(message, options = {}) {
    super(String(message || '未知錯誤'));
    this.name = this.constructor.name;
    this.code = options.code || 'APP_ERROR';
    this.status = Number.isInteger(options.status) ? options.status : 500;
    this.retryable = Boolean(options.retryable);
    this.cause = options.cause;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, details = {}) {
    super(message, { code: 'VALIDATION_ERROR', status: 400, retryable: false, ...details });
  }
}

export class ToolNotFoundError extends AppError {
  constructor(tool, details = {}) {
    super(`找不到必要工具：${tool}`, {
      code: 'TOOL_NOT_FOUND',
      status: 503,
      retryable: false,
      ...details,
    });
    this.tool = tool;
  }
}

export class ModelNotFoundError extends AppError {
  constructor(model, details = {}) {
    super(`模型不存在或驗證失敗：${model}`, {
      code: 'MODEL_NOT_FOUND',
      status: 404,
      retryable: false,
      ...details,
    });
    this.model = model;
  }
}

export class AiProviderError extends AppError {
  constructor(message, options = {}) {
    super(message, {
      code: options.code || 'AI_PROVIDER_ERROR',
      status: options.status || 502,
      retryable: options.retryable ?? true,
      ...options,
    });
    this.provider = options.provider;
    this.retryAfterMs = options.retryAfterMs || 0;
  }
}

export class JobNotFoundError extends AppError {
  constructor(jobId) {
    super(`找不到任務：${jobId}`, { code: 'JOB_NOT_FOUND', status: 404, retryable: false });
    this.jobId = jobId;
  }
}

export class JobConflictError extends AppError {
  constructor(message) {
    super(message, { code: 'JOB_CONFLICT', status: 409, retryable: false });
  }
}

export class CancellationError extends AppError {
  constructor(message = '操作已取消') {
    super(message, { code: 'CANCELLED', status: 499, retryable: false });
  }
}

export function isAppError(error) {
  return error instanceof AppError;
}

export function toAppError(error, defaultMessage = '未知錯誤') {
  if (error instanceof AppError) return error;
  const message = error?.message || String(error);
  if (error?.code === 'ENOENT') return new ToolNotFoundError(message);
  if (error?.code === 'EACCES')
    return new AppError(message, { code: 'PERMISSION_DENIED', status: 403 });
  return new AppError(`${defaultMessage}：${message}`, { cause: error });
}
