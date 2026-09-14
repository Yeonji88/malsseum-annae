const topics = ['rest', 'fear', 'loneliness', 'grief', 'relationship', 'future', 'failure', 'guilt', 'faith', 'gratitude'];
const situations = ['overload', 'uncertain_future', 'decision_uncertainty', 'seeking_guidance', 'sleep_worry', 'sudden_upheaval', 'anxious_waiting', 'seeking_help', 'prolonged_waiting', 'restless_urgency', 'uncontrollable_burden', 'seeking_calm', 'releasing_worry', 'crowded_thoughts', 'isolation', 'bereavement', 'separation', 'recent_loss', 'conflict', 'anger_processing', 'healthy_boundaries', 'prolonged_effort', 'discouraged_service', 'severe_exhaustion', 'need_rest', 'fresh_relationship_wound', 'forgiveness_when_ready', 'hope_when_ready', 'waiting_strength', 'entrusting_burdens', 'recovery', 'anxious_prayer', 'feeling_unsupported', 'tomorrow_worry', 'separation_anxiety', 'feeling_abandoned', 'family_rejection', 'hardship_companionship', 'displacement', 'unspoken_tears', 'grief_recovery', 'emotional_wounds', 'mourning', 'peace_with_boundaries', 'seeking_wisdom', 'plans_changed', 'long_wait_disrupted_plans', 'setback_recovery', 'limits_and_weakness', 'slow_growth', 'adversity_and_worth', 'hope_after_setback', 'acknowledging_wrong', 'renewal_after_regret', 'persistent_self_condemnation', 'returning_with_responsibility', 'new_beginning', 'wordless_prayer', 'mixed_belief_and_doubt', 'feeling_unheard', 'prayer_in_confinement', 'hesitant_prayer', 'gratitude_practice', 'celebrating_today', 'recognizing_gifts', 'remembering_grace', 'shared_joy'];
const risks = ['violence', 'abuse', 'coercive_control', 'self_harm'];
const schema = {
  type: 'object', additionalProperties: false,
  properties: {
    primaryTopic: {type: 'string', enum: ['', ...topics]},
    secondaryTopics: {type: 'array', items: {type: 'string', enum: topics}},
    situations: {type: 'array', items: {type: 'string', enum: situations}},
    riskSignals: {type: 'array', items: {type: 'string', enum: risks}},
    uncertainties: {type: 'array', items: {type: 'string'}}
  },
  required: ['primaryTopic', 'secondaryTopics', 'situations', 'riskSignals', 'uncertainties']
};
const allowedOrigin = 'https://yeonji88.github.io';
const headers = {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Vary': 'Origin', 'Access-Control-Allow-Origin': allowedOrigin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type'};
const json = (body, status = 200) => new Response(JSON.stringify(body), {status, headers});
const uniqueValid = (value, allowed) => Array.isArray(value) && value.length <= 30 && value.every(item => typeof item === 'string' && (!allowed || allowed.includes(item))) && new Set(value).size === value.length;
function validAnalysis(value) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).sort().join(',') === Object.keys(schema.properties).sort().join(',') &&
    topics.concat('').includes(value.primaryTopic) &&
    uniqueValid(value.secondaryTopics, topics) && !value.secondaryTopics.includes(value.primaryTopic) &&
    uniqueValid(value.situations, situations) && uniqueValid(value.riskSignals, risks) &&
    uniqueValid(value.uncertainties) && value.uncertainties.every(item => item.length <= 200);
}
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
      method: 'POST', signal: AbortSignal.timeout(8000),
      headers: {'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini', store: false,
        instructions: `Analyze only the user's Korean concern. Never write or recommend a Bible verse. Use only the allowed topic, situation and risk IDs in the JSON schema. A short feeling does not prove a specific life event or medical diagnosis. Record uncertainty rather than inventing context. Risk signals are possible signs, not diagnoses.`,
        input: message.trim(),
        text: {format: {type: 'json_schema', name: 'concern_analysis', strict: true, schema}}
      })
    });
    if (!response.ok) return json({error: 'AI unavailable'}, 502);
    const payload = await response.json();
    const output = payload.output?.flatMap(item => item.content || []).find(item => item.type === 'output_text')?.text;
    const analysis = JSON.parse(output);
    if (!validAnalysis(analysis)) return json({error: 'Invalid AI analysis'}, 502);
    return json(analysis);
  } catch { return json({error: 'AI unavailable'}, 502); }
}
export function OPTIONS(request) {
  return request.headers.get('origin') === allowedOrigin ? new Response(null, {status: 204, headers}) : json({error: 'Forbidden'}, 403);
}
