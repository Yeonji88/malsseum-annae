import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const contract = require('../dist/data/analysisContract.js');
export const maxDuration = 20;
const schema = contract.schema;
const allowedOrigin = 'https://yeonji88.github.io';
const headers = {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Vary': 'Origin', 'Access-Control-Allow-Origin': allowedOrigin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type'};
const json = (body, status = 200) => new Response(JSON.stringify(body), {status, headers});
export async function POST(request) {
  if (request.headers.get('origin') !== allowedOrigin) return json({error: 'Forbidden'}, 403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return json({error: 'JSON required'}, 415);
  if (Number(request.headers.get('content-length') || 0) > 4000) return json({error: 'Input too long'}, 413);
  let message;
  try {
    const body = await request.json();
    message = body?.message;
  } catch { return json({error: 'Invalid JSON'}, 400); }
  if (typeof message !== 'string' || !message.trim() || message.length > 1000) return json({error: 'Message must be 1–1000 characters'}, 400);
  if (!process.env.OPENAI_API_KEY) return json({error: 'AI is not configured'}, 503);
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST', signal: AbortSignal.timeout(16000),
      headers: {'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini', store: false,
        instructions: `Structure only the user's Korean concern using the JSON schema. Separate cause from effects or symptoms, emotions, explicit facts, and uncertainty. Choose primaryConcern from the cause when the cause is explicit; symptoms such as insomnia belong in effects. Never write, select, score, quote, or recommend a Bible verse. Never make a medical or medication decision. Use only IDs allowed by the schema. A short feeling does not prove a life event or diagnosis. Record uncertainty rather than inventing context. Risk signals are possible signs, not diagnoses, and cannot override local safety checks.`,
        input: message.trim(),
        text: {format: {type: 'json_schema', name: 'concern_analysis', strict: true, schema}}
      })
    });
    if (!response.ok) return json({error: 'AI upstream error', upstreamStatus: response.status}, 502);
    const payload = await response.json();
    const output = payload.output?.flatMap(item => item.content || []).find(item => item.type === 'output_text')?.text;
    let analysis;
    try { analysis = JSON.parse(output); } catch { return json({error: 'Invalid AI response'}, 502); }
    if (!contract.validate(analysis)) return json({error: 'Invalid AI analysis'}, 502);
    return json(analysis);
  } catch (error) { return json({error: error?.name === 'TimeoutError' ? 'AI timeout' : 'AI request failed'}, error?.name === 'TimeoutError' ? 504 : 502); }
}
export function OPTIONS(request) {
  return request.headers.get('origin') === allowedOrigin ? new Response(null, {status: 204, headers}) : json({error: 'Forbidden'}, 403);
}
