import assert from 'node:assert/strict';
import { optimizeSubtitleCues } from '../lib/ai/subtitle-optimizer.mjs';

const cues = [
  { id: 'R01', start: '00:00:00,000', end: '00:00:01,000', text: '第一句字幕' },
  { id: 'R02', start: '00:00:01,000', end: '00:00:02,000', text: '第二句字幕' },
];

function response(content) {
  return { choices: [{ message: { content } }] };
}

function validResponse() {
  return response(JSON.stringify({ cues: cues.map((cue) => ({ id: cue.id, text: `${cue.text}修正`, reason: 'acceptance contract' })) }));
}

async function testCaseR01FencedJson() {
  let calls = 0;
  const result = await optimizeSubtitleCues({
    cues,
    config: { provider: 'ollama', model: 'test-model', batchSize: 2 },
    complete: async () => {
      calls += 1;
      return response(`說明：\n\`\`\`json\n${JSON.stringify({ cues: cues.map((cue) => ({ id: cue.id, text: `${cue.text} fenced`, reason: 'R01' })) })}\n\`\`\``);
    },
  });
  assert.equal(calls, 1, 'CASE-R01 valid fenced JSON 不應觸發 repair');
  assert.deepEqual(result.suggestions.map((cue) => cue.id), ['R01', 'R02']);
  assert.equal(result.suggestions[0].text, '第一句字幕 fenced');
}

async function testCaseR02OneShotRepair() {
  let calls = 0;
  const requests = [];
  const progress = [];
  const complete = async (body) => {
    calls += 1;
    requests.push(body);
    return calls === 1 ? response(JSON.stringify({ answer: 'invalid response without cues' })) : validResponse();
  };
  complete.progress = (value) => progress.push(value);
  const result = await optimizeSubtitleCues({
    cues,
    config: { provider: 'ollama', model: 'test-model', batchSize: 2 },
    complete,
  });
  assert.equal(calls, 2, 'CASE-R02 應為 initial request + one repair request');
  assert.equal(requests.length, 2);
  assert.match(requests[1].messages[0].content, /上一個回應不是有效 JSON/);
  assert.equal(progress.some((item) => item.validationRepair === true), true);
  assert.equal(result.suggestions.length, cues.length);
  assert.deepEqual(result.suggestions.map((cue) => cue.id), cues.map((cue) => cue.id));
}

async function testCaseR03RepairFailure() {
  let calls = 0;
  let checkpointCalls = 0;
  const progress = [];
  const complete = async () => {
    calls += 1;
    return calls === 1 ? response(JSON.stringify({ answer: 'invalid response without cues' })) : response('still-not-json');
  };
  complete.progress = (value) => progress.push(value);
  await assert.rejects(
    () => optimizeSubtitleCues({
      cues,
      config: { provider: 'ollama', model: 'test-model', batchSize: 2 },
      complete,
      onCheckpoint: async () => { checkpointCalls += 1; },
    }),
    (error) => error.code === 'invalid_json',
    'CASE-R03 repair response 仍 malformed 時應失敗',
  );
  assert.equal(calls, 2, 'CASE-R03 不得超過 initial + one repair request');
  assert.equal(checkpointCalls, 0, 'CASE-R03 失敗不得寫入半套 completed checkpoint');
  assert.equal(progress.some((item) => item.validationRepair === true), true);
}

await testCaseR01FencedJson();
await testCaseR02OneShotRepair();
await testCaseR03RepairFailure();

console.log('AI deterministic acceptance contract tests passed: CASE-R01, CASE-R02, CASE-R03');
