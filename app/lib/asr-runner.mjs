import { AppError } from './errors.mjs';

export class AsrRunner {
  constructor(options = {}) {
    this.options = options;
  }

  async runWhisper(...args) {
    if (typeof this.options.runWhisper !== 'function')
      throw new AppError('ASR runner 尚未設定 Whisper 執行器', {
        code: 'ASR_RUNNER_NOT_CONFIGURED',
      });
    return this.options.runWhisper(...args);
  }

  async runWhisperCpp(...args) {
    if (typeof this.options.runWhisperCpp !== 'function')
      throw new AppError('ASR runner 尚未設定 Whisper.cpp 執行器', {
        code: 'ASR_RUNNER_NOT_CONFIGURED',
      });
    return this.options.runWhisperCpp(...args);
  }

  async runBreezeAsr(...args) {
    if (typeof this.options.runBreezeAsr !== 'function')
      throw new AppError('ASR runner 尚未設定 Breeze 執行器', {
        code: 'ASR_RUNNER_NOT_CONFIGURED',
      });
    return this.options.runBreezeAsr(...args);
  }

  async prepareWhisperAudio(...args) {
    if (typeof this.options.prepareWhisperAudio !== 'function')
      throw new AppError('ASR runner 尚未設定音訊前處理器', { code: 'ASR_RUNNER_NOT_CONFIGURED' });
    return this.options.prepareWhisperAudio(...args);
  }
}
