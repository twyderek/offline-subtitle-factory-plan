import { AppError } from './errors.mjs';

export class ModelManager {
  constructor(options = {}) {
    this.options = options;
  }

  getWhisperModelStatusPayload(...args) {
    if (typeof this.options.getWhisperModelStatusPayload !== 'function')
      throw new AppError('Model manager 尚未設定 Whisper 模型服務', {
        code: 'MODEL_MANAGER_NOT_CONFIGURED',
      });
    return this.options.getWhisperModelStatusPayload(...args);
  }

  startWhisperModelDownload(...args) {
    if (typeof this.options.startWhisperModelDownload !== 'function')
      throw new AppError('Model manager 尚未設定下載服務', {
        code: 'MODEL_MANAGER_NOT_CONFIGURED',
      });
    return this.options.startWhisperModelDownload(...args);
  }

  cancelWhisperModelDownload(...args) {
    if (typeof this.options.cancelWhisperModelDownload !== 'function')
      throw new AppError('Model manager 尚未設定下載服務', {
        code: 'MODEL_MANAGER_NOT_CONFIGURED',
      });
    return this.options.cancelWhisperModelDownload(...args);
  }
}
