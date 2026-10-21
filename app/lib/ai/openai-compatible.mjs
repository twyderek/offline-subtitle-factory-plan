import { isLoopbackAiUrl } from './local-ai.mjs';

function buildUrl(baseUrl, pathname) {
  const normalized = String(baseUrl || '').trim().replace(/\/+$/, '');
  const url = new URL(`${normalized}${pathname}`);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('AI Base URL 僅支援 HTTP 或 HTTPS');
  return url;
}

export class AiProviderError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'AiProviderError';
    this.status = options.status || 0;
    this.code = options.code || '';
    this.retryable = Boolean(options.retryable);
    this.retryAfterMs = Math.max(0, Number(options.retryAfterMs) || 0);
  }
}

function parseRetryAfter(value) {
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const at = Date.parse(value);
  return Number.isFinite(at) ? Math.max(0, at - Date.now()) : 0;
}

function isRetryableStatus(status) {
  return [408, 429, 500, 502, 503, 504].includes(status);
}

function mergeStreamingRecords(text) {
  const records = String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);
  if (!records.length) return {};
  if (records.length === 1 && (records[0].choices || records[0].data || records[0].error)) return records[0];
  let content = '';
  let result = {};
  for (const record of records) {
    result = { ...result, ...record };
    const fragment = record?.message?.content ?? record?.response;
    if (typeof fragment === 'string') content += fragment;
  }
  if (!content && result?.message?.content) content = result.message.content;
  return { ...result, message: { ...(result.message || {}), content } };
}

async function readStreamingJson(response, armTimeout) {
  if (!response.body?.getReader) return mergeStreamingRecords(await response.text());
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    armTimeout();
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';
    text += `${lines.join('\n')}\n`;
  }
  text += buffer;
  return mergeStreamingRecords(text);
}

function objectKeys(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? Object.keys(value).slice(0, 32)
    : [];
}

function valueKind(value) {
  if (value === undefined) return 'missing';
  if (value === null) return 'null';
  if (Array.isArray(value)) {
    const types = [...new Set(value.slice(0, 16).map((item) => String(item?.type || typeof item)))];
    return types.length ? `array:${types.join(',')}` : 'array:empty';
  }
  return typeof value;
}

function textLength(value) {
  if (typeof value === 'string') return value.length;
  if (!Array.isArray(value)) return null;
  return value.reduce((total, item) => total + (typeof item?.text === 'string' ? item.text.length : 0), 0);
}

export function summarizeAiResponse(result, response, bodyLength = null) {
  const choice = result?.choices?.[0];
  const message = choice?.message;
  return {
    status: Number(response?.status || 0),
    ok: Boolean(response?.ok),
    contentType: String(response?.headers?.get?.('content-type') || ''),
    requestId: String(response?.headers?.get?.('apim-request-id') || response?.headers?.get?.('x-request-id') || ''),
    bodyLength: Number.isFinite(bodyLength) ? bodyLength : null,
    resultKind: Array.isArray(result) ? 'array' : typeof result,
    topLevelKeys: objectKeys(result),
    choiceKeys: objectKeys(choice),
    messageKeys: objectKeys(message),
    finishReason: String(choice?.finish_reason || ''),
    contentKind: valueKind(message?.content),
    contentLength: textLength(message?.content),
    parsedKind: valueKind(message?.parsed),
    outputKind: valueKind(result?.output),
    outputTextLength: typeof result?.output_text === 'string' ? result.output_text.length : null,
    toolCallCount: Array.isArray(message?.tool_calls) ? message.tool_calls.length : 0,
    hasRefusal: Boolean(message?.refusal || choice?.refusal || result?.refusal),
    hasError: Boolean(result?.error),
  };
}

function attachAiResponseDiagnostics(result, diagnostics) {
  if (!result || typeof result !== 'object') return result;
  try {
    Object.defineProperty(result, '__aiDiagnostics', { value: diagnostics, enumerable: false, configurable: true });
  } catch {}
  return result;
}

export async function requestAiJson({ baseUrl, apiKey, pathname, method = 'GET', body, timeoutSeconds = 60, signal, headers = {}, authHeader = 'Authorization', authPrefix = 'Bearer ', streamResponse = false }) {
  const localEndpoint = isLoopbackAiUrl(baseUrl);
  if (!apiKey && !localEndpoint) throw new Error('尚未設定 AI API Key');
  const timeoutController = new AbortController();
  let timer;
  const armTimeout = () => {
    clearTimeout(timer);
    timer = setTimeout(() => timeoutController.abort(new Error('AI 請求逾時')), timeoutSeconds * 1000);
  };
  armTimeout();
  const abort = () => timeoutController.abort(signal?.reason || new Error('AI 請求已取消'));
  signal?.addEventListener('abort', abort, { once: true });
  try {
    const response = await fetch(buildUrl(baseUrl, pathname), {
      method,
      redirect: 'manual',
      headers: {
        ...(apiKey ? { [authHeader]: `${authPrefix}${apiKey}` } : {}),
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: timeoutController.signal,
    });
    // Fetch resolves when headers arrive, but Ollama may take additional time
    // before emitting the first NDJSON record.  Treat the body wait as a new
    // idle window instead of charging it against the request/headers window.
    armTimeout();
    let bodyLength = null;
    let result;
    if (response.ok && streamResponse) {
      result = await readStreamingJson(response, armTimeout);
    } else {
      const text = await response.text();
      bodyLength = text.length;
      try { result = text ? JSON.parse(text) : {}; } catch { result = { raw: null, rawLength: text.length, rawJson: false }; }
    }
    const diagnostics = summarizeAiResponse(result, response, bodyLength);
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const error = new AiProviderError('AI 服務重新導向已被安全政策拒絕', {
        status: response.status,
        code: 'redirect_blocked',
        retryable: false,
      });
      error.responseDiagnostics = diagnostics;
      throw error;
    }
    if (!response.ok) {
      const detail = result?.error?.message || result?.message || result?.raw || `HTTP ${response.status}`;
      const error = new AiProviderError(`AI 服務回應失敗：${detail}`, {
        status: response.status,
        code: String(result?.error?.code || ''),
        retryable: isRetryableStatus(response.status),
        retryAfterMs: parseRetryAfter(response.headers.get('retry-after')),
      });
      error.responseDiagnostics = diagnostics;
      throw error;
    }
    return attachAiResponseDiagnostics(result, diagnostics);
  } catch (error) {
    if (error instanceof AiProviderError || signal?.aborted) throw error;
    const timedOut = timeoutController.signal.aborted;
    throw new AiProviderError(timedOut ? 'AI 請求逾時' : `AI 網路請求失敗：${error.message}`, {
      code: timedOut ? 'timeout' : 'network_error',
      retryable: true,
    });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

export async function testOpenAiCompatible(config) {
  const result = await requestAiJson({ ...config, pathname: '/models', method: 'GET' });
  const models = Array.isArray(result.data) ? result.data.map((item) => item?.id).filter(Boolean) : [];
  return { ok: true, modelAvailable: !config.model || models.length === 0 || models.includes(config.model), modelCount: models.length };
}

export function stripInternalChatFields(body, { dropModel = false } = {}) {
  const externalBody = { ...(body || {}) };
  for (const field of ['operation', 'output_language', 'subtitle_cue_count', 'subtitle_cue_ids']) delete externalBody[field];
  if (dropModel) delete externalBody.model;
  return externalBody;
}

export async function createChatCompletion(config, body, signal) {
  return requestAiJson({ ...config, pathname: '/chat/completions', method: 'POST', body: stripInternalChatFields(body), signal });
}
