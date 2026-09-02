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

const contentFieldParts = await optimizeWithContent([
  { content: '{"cues":[{' },
  { content: '"id":"C1","text":"content part","reason":"content"}]}' },
], { provider: 'openai-compatible' });
assert.equal(contentFieldParts.suggestions[0].text, 'content part', '沒有 type 的 content text parts 也應依序組合解析');

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

for (const provider of ['ollama']) {
  let calls = 0;
  const requestBodies = [];
  const repaired = await optimizeSubtitleCues({
    cues: source,
    config: {
      provider,
      model: 'test-model',
      batchSize: 1,
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
}

for (const provider of ['ollama']) {
  let calls = 0;
  const repaired = await optimizeSubtitleCues({
    cues: source,
    config: {
      provider,
      model: 'test-model',
      batchSize: 1,
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
    config: { provider: 'ollama', model: 'test-model', batchSize: 1 },
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

let schemaInitialBody;
let schemaRepairBody;
await optimizeSubtitleCues({
  cues: source,
  config: {
    provider: 'openai',
    model: 'test-model',
    batchSize: 1,
    capabilities: { jsonSchema: true, structuredOutput: 'json-schema' },
  },
  complete: async (body) => {
    if (!schemaInitialBody) schemaInitialBody = body;
    else schemaRepairBody = body;
    return { choices: [{ message: { content: jsonObject } }] };
  },
});
assert.equal(schemaInitialBody.response_format.type, 'json_schema', 'generic JSON Schema provider 應送出 JSON Schema response_format');
assert.equal(schemaInitialBody.response_format.json_schema.name, 'subtitle_optimization');
assert.equal(schemaInitialBody.response_format.json_schema.schema.required.includes('cues'), true);
assert.deepEqual(schemaRepairBody, undefined, '成功的初次 JSON Schema 回應不需要 repair');

let schemaRepairInitial;
let schemaRepairRetry;
let schemaRepairCalls = 0;
await optimizeSubtitleCues({
  cues: source,
  config: {
    provider: 'ollama',
    model: 'test-model',
    batchSize: 1,
    capabilities: { jsonSchema: true, structuredOutput: 'json-schema' },
  },
  complete: async (body) => {
    schemaRepairCalls += 1;
    if (schemaRepairCalls === 1) schemaRepairInitial = body;
    else schemaRepairRetry = body;
    return { choices: [{ message: { content: schemaRepairCalls === 1 ? JSON.stringify({ answer: 'missing cues' }) : jsonObject } }] };
  },
});
assert.equal(schemaRepairCalls, 2, 'Ollama generic JSON Schema response 缺少 cues 時應只 repair 一次');
assert.deepEqual(schemaRepairRetry.response_format, schemaRepairInitial.response_format, 'Ollama repair 不得覆寫 generic JSON Schema response_format');

async function testParserNoLanguageFenceAndCrLf() {
  const content = `  \`\`\`\r\n${jsonObject}\r\n  \`\`\`  `;
  const result = await optimizeWithContent(content, { provider: 'openai-compatible' });
  assert.equal(result.suggestions[0].text, expectedCue.text, '無語言 Markdown fence、CRLF 與外圍空白應解析 JSON');
}

async function testParserIgnoresEmptyAndNonTextParts() {
  const result = await optimizeWithContent([
    { type: 'text', text: '' },
    { type: 'image', image_url: 'image-not-text' },
    { type: 'text' },
    { type: 'text', text: null },
    { type: 'text', text: jsonObject },
  ], { provider: 'openai-compatible' });
  assert.equal(result.suggestions[0].text, expectedCue.text, 'empty、missing、null 與非文字 parts 不得拒絕合法文字 response');
}

async function testParserNestedJsonStringAndCandidatePriority() {
  const invalidCandidate = JSON.stringify({ cues: [{ id: 'WRONG', text: '錯誤候選', reason: '' }] });
  const validNestedCandidate = JSON.stringify({ response: JSON.stringify({ cues: [expectedCue] }) });
  const result = await optimizeWithContent(`前言含有 {不是 JSON}；第一個可 parse 但不符合 cue context：${invalidCandidate}；後續才是有效 nested JSON string：${validNestedCandidate}`, { provider: 'openai-compatible' });
  assert.equal(result.suggestions[0].id, expectedCue.id, 'parser 不得接受第一個可 parse 但 context-invalid 的 JSON candidate');
  assert.equal(result.suggestions[0].text, expectedCue.text);
}

async function testParserBoundsCyclicCandidates() {
  const cyclic = {};
  cyclic.self = cyclic;
  const startedAt = Date.now();
  await assert.rejects(
    () => optimizeWithContent(cyclic, { provider: 'openai-compatible' }),
    (error) => error.code === 'missing_cues',
    '循環 response candidate 應依 contract reject',
  );
  assert.ok(Date.now() - startedAt < 1000, '循環 candidate traversal 不得 hang');

  let deeplyNested = { leaf: 'not cues' };
  for (let index = 0; index < 128; index += 1) deeplyNested = { wrapper: deeplyNested };
  const deepStartedAt = Date.now();
  await assert.rejects(
    () => optimizeWithContent(deeplyNested, { provider: 'openai-compatible' }),
    (error) => error.code === 'missing_cues',
    '超深 nested candidate 應依 bounded traversal contract reject',
  );
  assert.ok(Date.now() - deepStartedAt < 1000, '超深 candidate traversal 不得 hang');
}

await testParserNoLanguageFenceAndCrLf();
await testParserIgnoresEmptyAndNonTextParts();
await testParserNestedJsonStringAndCandidatePriority();
await testParserBoundsCyclicCandidates();

console.log('AI response parser regression tests passed.');
