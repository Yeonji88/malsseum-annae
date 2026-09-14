const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const cases = [
 ['불안해서 잠이 안 와요', 'fear', ['sleep_worry'], []],
 ['남편이 나를 때려서 무서워요', 'fear', [], ['violence']],
 ['기도해도 하나님이 안 듣는 것 같아요', 'faith', [], []],
 ['다른 사람들이랑 자꾸 비교하게 돼요', 'failure', [], []],
 ['결정을 못 하겠어요', 'future', ['decision_uncertainty'], []]
];
function browser(endpoint, fetchImpl) {
 const context = {window: {MalsseumAIEndpoint: endpoint}, fetch: fetchImpl, AbortSignal, Set};
 context.window.Malsseum = {data: {}, services: {}};
 vm.createContext(context);
 for (const file of ['dist/data/topics.js', 'dist/data/verses.js', 'dist/services/classifyConcern.js', 'dist/services/analyzeConcernWithAI.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file});
 }
 return context.window.Malsseum.services;
}
test('five inputs use validated AI analysis while retaining local safety', async () => {
 const services = browser('https://example.vercel.app/api/analyze', async (_url, options) => {
  const message = JSON.parse(options.body).message;
  const [_, primaryTopic, situations, riskSignals] = cases.find(row => row[0] === message);
  return {ok: true, json: async () => ({primaryTopic, secondaryTopics: [], situations, riskSignals: [], uncertainties: []})};
 });
 for (const [message, topic, situation, risks] of cases) {
  const local = services.classifyConcern(message);
  const result = await services.analyzeConcernWithAI(message, local);
  assert.equal(result.primaryTopic, topic, message);
  for (const id of situation) assert.ok(result.situations.includes(id), message);
  for (const id of risks) assert.ok(result.riskSignals.includes(id), message);
  assert.equal(result.method, 'ai+rules');
 }
});
test('unconfigured, API error, invalid JSON, invalid schema and timeout fall back', async () => {
 const message = '불안해요';
 for (const [endpoint, fetchImpl] of [
  ['', () => {throw Error('should not call');}],
  ['https://example.vercel.app/api/analyze', async () => ({ok: false})],
  ['https://example.vercel.app/api/analyze', async () => ({ok: true, json: async () => {throw Error('invalid JSON');}})],
  ['https://example.vercel.app/api/analyze', async () => ({ok: true, json: async () => ({primaryTopic: 'fake', secondaryTopics: [], situations: [], riskSignals: [], uncertainties: []})})],
  ['https://example.vercel.app/api/analyze', async () => {throw new DOMException('timeout', 'TimeoutError');}]
 ]) {
  const services = browser(endpoint, fetchImpl);
  const local = services.classifyConcern(message);
  assert.strictEqual(await services.analyzeConcernWithAI(message, local), local);
 }
});
test('Vercel function validates request and structured OpenAI response', async () => {
 const {POST} = await import('../api/analyze.mjs');
 const originalKey = process.env.OPENAI_API_KEY;
 const originalFetch = global.fetch;
 process.env.OPENAI_API_KEY = 'test-only';
 try {
  global.fetch = async (_url, options) => {
   const request = JSON.parse(options.body);
   assert.equal(request.store, false);
   assert.equal(request.text.format.type, 'json_schema');
   assert.ok(!request.instructions.includes('recommend a specific'));
   return {ok: true, json: async () => ({output: [{content: [{type: 'output_text', text: JSON.stringify({primaryTopic: 'fear', secondaryTopics: [], situations: ['sleep_worry'], riskSignals: [], uncertainties: []})}]}]})};
  };
  const makeRequest = () => new Request('https://example.vercel.app/api/analyze', {method: 'POST', headers: {Origin: 'https://yeonji88.github.io', 'Content-Type': 'application/json'}, body: JSON.stringify({message: cases[0][0]})});
  const request = makeRequest();
  const response = await POST(request);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).primaryTopic, 'fear');
  assert.equal((await POST(new Request('https://example.vercel.app/api/analyze', {method: 'POST', headers: {Origin: 'https://evil.example', 'Content-Type': 'application/json'}, body: '{}'}))).status, 403);
  global.fetch = async () => ({ok: true, json: async () => ({output: [{content: [{type: 'output_text', text: 'not json'}]}]})});
  assert.equal((await POST(makeRequest())).status, 502);
 } finally {
  global.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey;
 }
});
