import { AppError } from './errors.mjs';

export class TrimRunner {
  constructor(options = {}) {
    this.options = options;
  }

  async applyTrim(...args) {
    if (typeof this.options.applyTrim !== 'function')
      throw new AppError('Trim runner 尚未設定修剪執行器', { code: 'TRIM_RUNNER_NOT_CONFIGURED' });
    return this.options.applyTrim(...args);
  }

  async runTrimProcess(...args) {
    if (typeof this.options.runTrimProcess !== 'function')
      throw new AppError('Trim runner 尚未設定 FFmpeg 修剪執行器', {
        code: 'TRIM_RUNNER_NOT_CONFIGURED',
      });
    return this.options.runTrimProcess(...args);
  }
}
