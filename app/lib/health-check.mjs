import { AppError } from './errors.mjs';

export async function healthCheck(options = {}) {
  if (typeof options.check !== 'function')
    throw new AppError('Health check 尚未設定檢查器', { code: 'HEALTH_CHECK_NOT_CONFIGURED' });
  return options.check(options.force === true);
}
