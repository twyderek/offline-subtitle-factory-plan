import assert from 'node:assert/strict';
import http from 'node:http';
import { requestAiJson } from '../lib/ai/openai-compatible.mjs';

let responseStatus = 200;
const server = http.createServer((req, res) => {
  if (responseStatus !== 200) {
    res.writeHead(responseStatus, {
      'content-type': 'application/json',
      'apim-request-id': 'local-error-diagnostic-test',
    });
    res.end(JSON.stringify({ error: { message: 'synthetic provider failure', code: 'synthetic_error' } }));
    return;
  }
  res.writeHead(200, {
    'content-type': 'application/json',
    'apim-request-id': 'local-diagnostic-test',
  });
  res.end(JSON.stringify({
    choices: [{
      finish_reason: 'stop',
      message: { role: 'assistant', content: '{"cues":[]}' },
    }],
  }));
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
try {
  const address = server.address();
  const result = await requestAiJson({
    baseUrl: `http://127.0.0.1:${address.port}`,
    pathname: '/chat/completions',
    method: 'POST',
    body: { messages: [{ role: 'user', content: 'diagnostic test' }] },
  });
  assert.equal(result.__aiDiagnostics.status, 200);
  assert.equal(result.__aiDiagnostics.ok, true);
  assert.equal(result.__aiDiagnostics.requestId, 'local-diagnostic-test');
  assert.deepEqual(result.__aiDiagnostics.topLevelKeys, ['choices']);
  assert.deepEqual(result.__aiDiagnostics.messageKeys, ['role', 'content']);
  assert.equal(result.__aiDiagnostics.finishReason, 'stop');
  assert.equal(result.__aiDiagnostics.contentKind, 'string');
  assert.equal(result.__aiDiagnostics.hasRefusal, false);
  assert.equal(Object.hasOwn(result.__aiDiagnostics, 'content'), false, '診斷資料不得保存回應全文');

  responseStatus = 400;
  await assert.rejects(
    () => requestAiJson({
      baseUrl: `http://127.0.0.1:${address.port}`,
      pathname: '/chat/completions',
      method: 'POST',
      body: { messages: [{ role: 'user', content: 'diagnostic error test' }] },
    }),
    (error) => {
      assert.equal(error.status, 400);
      assert.equal(error.responseDiagnostics.status, 400);
      assert.equal(error.responseDiagnostics.requestId, 'local-error-diagnostic-test');
      assert.equal(error.responseDiagnostics.hasError, true);
      return true;
    },
    '非 2xx 回應應保留安全 metadata',
  );
} finally {
  await new Promise((resolve) => server.close(resolve));
}

console.log('AI response diagnostics tests passed.');
