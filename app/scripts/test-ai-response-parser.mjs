import assert from 'node:assert/strict';
import { optimizeSubtitleCues } from '../lib/ai/subtitle-optimizer.mjs';

const source = [{ id: 'C1', text: '原始字幕' }];
const expectedCue = { id: 'C1', text: '修正後字幕', reason: 'parser test' };
const jsonObject = JSON.stringify({ cues: [expectedCue] });
const jsonArray = JSON.stringify([expectedCue]);

async function optimizeWithContent(content, config = {}) {
  return optimizeSubtitleCues({
    cues: source,
    config: { model: 'test-model', batchSize: 1, ...config },
    complete: async () => ({ choices: [{ message: { content } }] }),
  });
}

const rootArray = await optimizeWithContent(jsonArray, { provider: 'openai-compatible' });
assert.equal(rootArray.suggestions[0].text, expectedCue.text, 'root JSON array 應視為字幕 cues');

const plainFence = await optimizeWithContent('```json\n' + jsonObject + '\n```', { provider: 'openai-compatible' });
assert.equal(plainFence.suggestions[0].text, expectedCue.text, 'plain Markdown fence 應解析 JSON');

const proseFence = await optimizeWithContent('整理結果如下：\n\n```json\n' + jsonObject + '\n```\n\n以上是字幕修正。', { provider: 'openai-compatible' });
assert.equal(proseFence.suggestions[0].text, expectedCue.text, '帶前後說明的 fenced JSON 應解析 JSON');

const textParts = await optimizeWithContent([
  { type: 'text', text: '我已完成字幕校對。' },
  { type: 'text', text: '```json\n' + jsonObject + '\n```' },
], { provider: 'openai-compatible' });
assert.equal(textParts.suggestions[0].text, expectedCue.text, 'text-part array 應使用相同 JSON candidate extraction');

const splitTextParts = await optimizeSubtitleCues({
  cues: [
    { id: 'C1', text: '第一原始字幕' },
    { id: 'C2', text: '第二原始字幕' },
  ],
  config: { provider: 'openai-compatible', model: 'test-model', batchSize: 2 },
  complete: async () => ({ choices: [{ message: { content: [
    { type: 'text', text: '{"cues":[{"id":"C1","text":"第一修正","reason":"one"},' },
    { type: 'text', text: '{"id":"C2","text":"第二修正","reason":"two"}]}' },
  ] } }] }),
});
assert.deepEqual(splitTextParts.suggestions.map((cue) => cue.id), ['C1', 'C2'], '跨 text parts 的 JSON 應依原順序組合解析');

await assert.rejects(
  () => optimizeWithContent([{ type: 'text', text: jsonArray }], { provider: 'openai-compatible' }),
  /AI 回傳缺少 cues 陣列/,
  'text-part 容器的 root array 仍不得視為 cues',
);

const directObject = await optimizeWithContent({ cues: [expectedCue] }, { provider: 'openai-compatible' });
assert.equal(directObject.suggestions[0].text, expectedCue.text, 'direct cues object 應解析');

for (const field of ['response', 'output', 'result', 'data', 'content', 'message']) {
  const nestedObject = await optimizeWithContent({ [field]: { cues: [expectedCue] } }, { provider: 'openai-compatible' });
  assert.equal(nestedObject.suggestions[0].text, expectedCue.text, `${field}.cues explicit object 應解析`);
}

const nestedObject = await optimizeWithContent({ response: { data: { cues: [expectedCue] } } }, { provider: 'openai-compatible' });
assert.equal(nestedObject.suggestions[0].text, expectedCue.text, 'deeply nested explicit cues 應解析');

const nestedString = await optimizeWithContent({
  response: '模型回應：\n```json\n' + jsonObject + '\n```\n請確認。',
}, { provider: 'openai-compatible' });
assert.equal(nestedString.suggestions[0].text, expectedCue.text, 'nested response string 的 fenced JSON 應解析');

const fencedRootArrayWithProse = '模型回應如下：\n```json\n' + jsonArray + '\n```\n以上。';
const nestedWrapperCases = ['response', 'output', 'result', 'data', 'content', 'message'].flatMap((field) => [
  [`${field} direct array`, { [field]: [expectedCue] }],
  [`${field} JSON-stringified array`, { [field]: jsonArray }],
  [`${field} fenced root array with prose`, { [field]: fencedRootArrayWithProse }],
]).concat([
  ['arbitrary nested object array', { metadata: { items: [expectedCue] } }],
  ['arbitrary nested object JSON-stringified array', { metadata: { items: jsonArray } }],
]);

for (const [label, wrapper] of nestedWrapperCases) {
  let calls = 0;
  await assert.rejects(
    () => optimizeSubtitleCues({
      cues: source,
      config: { provider: 'openai-compatible', model: 'test-model', batchSize: 1 },
      complete: async () => {
        calls += 1;
        return { choices: [{ message: { content: wrapper } }] };
      },
    }),
    /AI 回傳缺少 cues 陣列/,
    `${label} 不得自動視為 cues`,
  );
  assert.equal(calls, 1, `${label} 在非本機 provider 上不得 repair`);
}

let unrelatedArrayCalls = 0;
await assert.rejects(
  () => optimizeSubtitleCues({
    cues: source,
    config: { provider: 'openai-compatible', model: 'test-model', batchSize: 1 },
    complete: async () => {
      unrelatedArrayCalls += 1;
      return { choices: [{ message: { content: { data: [expectedCue], response: [expectedCue], message: [expectedCue] } } }] };
    },
  }),
  /AI 回傳缺少 cues 陣列/,
  'unrelated nested arrays 不得自動視為 cues',
);
assert.equal(unrelatedArrayCalls, 1, '非本機 provider 遇到 unrelated nested arrays 不得 repair');

let strictMissingCuesCalls = 0;
await assert.rejects(
  () => optimizeSubtitleCues({
    cues: source,
    config: { provider: 'openai-compatible', model: 'test-model', batchSize: 1 },
    complete: async () => {
      strictMissingCuesCalls += 1;
      return { choices: [{ message: { content: JSON.stringify({ answer: '合法 JSON 但沒有 cues' }) } }] };
    },
  }),
  /AI 回傳缺少 cues 陣列/,
  '非本機 provider 缺少 cues 時應維持 strict failure',
);
assert.equal(strictMissingCuesCalls, 1, '非本機 provider 不得進行本機格式 repair');

for (const provider of ['ollama', 'lm-studio']) {
  let calls = 0;
  const requestBodies = [];
  const repaired = await optimizeSubtitleCues({
    cues: source,
    config: {
      provider,
      model: 'test-model',
      batchSize: 1,
      ...(provider === 'lm-studio' ? { capabilities: { jsonSchema: true, structuredOutput: 'json-schema' } } : {}),
    },
    complete: async (body) => {
      calls += 1;
      requestBodies.push(body);
      const content = calls === 1
        ? JSON.stringify({ answer: '合法 JSON 但沒有 cues' })
        : '說明：\n```json\n' + jsonObject + '\n```\n';
      return { choices: [{ message: { content } }] };
    },
  });
  assert.equal(calls, 2, `${provider} 缺少 cues 時應只 repair 一次`);
  assert.match(requestBodies[1].messages[0].content, /只能輸出一個 JSON object/);
  assert.equal(repaired.suggestions[0].text, expectedCue.text);
  if (provider === 'lm-studio') {
    assert.deepEqual(
      requestBodies[1].response_format,
      requestBodies[0].response_format,
      'LM Studio repair 不得覆寫初始 JSON Schema response_format',
    );
  }
}

for (const provider of ['ollama', 'lm-studio']) {
  let calls = 0;
  const repaired = await optimizeSubtitleCues({
    cues: source,
    config: {
      provider,
      model: 'test-model',
      batchSize: 1,
      ...(provider === 'lm-studio' ? { capabilities: { jsonSchema: true, structuredOutput: 'json-schema' } } : {}),
    },
    complete: async () => {
      calls += 1;
      const content = calls === 1
        ? { response: jsonArray }
        : jsonObject;
      return { choices: [{ message: { content } }] };
    },
  });
  assert.equal(calls, 2, `${provider} nested wrapper root array 應只 repair 一次`);
  assert.equal(repaired.suggestions[0].text, expectedCue.text);
}

let failedRepairCalls = 0;
let failedRepairCheckpoint = null;
await assert.rejects(
  () => optimizeSubtitleCues({
    cues: source,
    config: { provider: 'lm-studio', model: 'test-model', batchSize: 1 },
    complete: async () => {
      failedRepairCalls += 1;
      return { choices: [{ message: { content: JSON.stringify({ answer: '仍然沒有 cues' }) } }] };
    },
    onCheckpoint: async (checkpoint) => { failedRepairCheckpoint = checkpoint; },
  }),
  /AI 回傳缺少 cues 陣列/,
  '第二次回應仍缺少 cues 時應失敗',
);
assert.equal(failedRepairCalls, 2, 'failed repair 不得超過初次回應加一次 repair');
assert.equal(failedRepairCheckpoint, null, 'failed repair 不得寫入 completed checkpoint');

let lmStudioBody;
await optimizeSubtitleCues({
  cues: source,
  config: {
    provider: 'lm-studio',
    model: 'test-model',
    batchSize: 1,
  },
  complete: async (body) => {
    lmStudioBody = body;
    return { choices: [{ message: { content: jsonObject } }] };
  },
});
assert.equal(lmStudioBody.response_format.type, 'json_schema', 'LM Studio 應保留 JSON Schema response_format');
assert.equal(lmStudioBody.response_format.json_schema.name, 'subtitle_optimization');
assert.equal(lmStudioBody.response_format.json_schema.schema.required.includes('cues'), true);

console.log('AI response parser regression tests passed.');
