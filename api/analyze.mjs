import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const contract = require('../dist/data/analysisContract.js');
export const maxDuration = 20;
const schema = contract.schema;
export const analysisInstructions = `You structure a Korean user's concern. Return only the schema fields. You do not counsel, diagnose, make decisions, or select religious content.

Evidence rule:
- A cause or explicit fact is explicit only when the user's own words state it. Put an exact short quote from the input in evidence.
- Never invent a job, relationship, financial, medical, pregnancy, loss, or safety context. If no real-world cause is stated, use cause.category "none", explicit false, empty evidence and no cause situation IDs.
- Effects are outcomes or symptoms that follow the cause. Emotions are feelings. Do not reverse cause and effect.
- When an explicit cause leads to insomnia, fatigue, anxiety, or another symptom, primaryConcern should represent the cause or its most specific situation; put the symptom in effects and secondaryConcerns.
- When only a feeling and symptom are stated, the feeling may be primary. Do not invent a cause.
- Never repeat primaryTopic in secondaryTopics. secondaryTopics contains only different additional topics.
- If cause.category is "none", cause.explicit must be false, cause.evidence must be "", and cause.situationIds must be []. Never attach a situation or evidence to a none cause; represent the supported meaning in situations and primaryConcern instead.

Specific distinctions:
- A request to start, stop, change, or dose medication is medical_decision with an explicit medication_decision fact. Merely mentioning treatment, a hospital, medicine, pain, or pregnancy is not a medical decision. Emotional exhaustion during treatment remains an emotional concern.
- Negative evaluation of visible appearance or external conditions should use self_image as the cause, judged_by_external_conditions as the situation, and appearance_self_evaluation as an explicit fact when directly stated. Use the failure topic rather than rest unless tiredness or a need for rest is actually expressed. Rejection of one's whole self/body may use difficulty_accepting_self. Feeling useless or unimportant uses the corresponding existing situation; do not merge these roles.
- Distinguish prayer_feels_unheard, persistent_prayer_fatigue, wanting_to_give_up_prayer, feeling_forgotten_by_god, doubting_gods_love, and guilt_after_anger_at_god. Use the most specific supported situation rather than only the broad faith topic.
- For relationship conflict with anger followed by insomnia, relationship/conflict is the cause context, anger is an emotion, and insomnia is an effect.

Concern ordering: risk signal; verified professional-decision fact; explicit real-world cause; explicit action or request; specific situation; emotion; effect; uncertainty.

Safety:
- Mark violence, abuse, coercive_control, or self_harm when supported. These are possible signals, not diagnoses. Never omit a supported risk because another concern is present.

Use only IDs allowed by the schema. Do not write, quote, select, score, or recommend a Bible verse. Do not make medical or medication decisions. Do not create a spiritual conclusion. Record material uncertainty instead of guessing.`;
const allowedOrigin = 'https://yeonji88.github.io';
const headers = {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Vary': 'Origin', 'Access-Control-Allow-Origin': allowedOrigin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type'};
const json = (body, status = 200) => new Response(JSON.stringify(body), {status, headers});
const textShape = value => ({type: typeof value, length: typeof value === 'string' ? value.length : null});
const diagnosticShape = value => ({
  topLevelKeys: value && typeof value === 'object' && !Array.isArray(value) ? Object.keys(value).sort() : [],
  primaryTopic: value?.primaryTopic,
  secondaryTopics: value?.secondaryTopics,
  cause: value?.cause && {category: value.cause.category, situationIds: value.cause.situationIds, evidence: textShape(value.cause.evidence), explicit: value.cause.explicit},
  effects: Array.isArray(value?.effects) ? value.effects.map(effect => ({type: effect?.type, situationIds: effect?.situationIds, evidence: textShape(effect?.evidence)})) : textShape(value?.effects),
  emotions: value?.emotions,
  situations: value?.situations,
  explicitFacts: Array.isArray(value?.explicitFacts) ? value.explicitFacts.map(fact => ({type: fact?.type, value: textShape(fact?.value), evidence: textShape(fact?.evidence)})) : textShape(value?.explicitFacts),
  uncertainties: Array.isArray(value?.uncertainties) ? {type: 'array', length: value.uncertainties.length} : textShape(value?.uncertainties),
  primaryConcern: value?.primaryConcern,
  secondaryConcerns: value?.secondaryConcerns,
  riskSignals: value?.riskSignals
});
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
        instructions: analysisInstructions,
        input: message.trim(),
        text: {format: {type: 'json_schema', name: 'concern_analysis', strict: true, schema}}
      })
    });
    if (!response.ok) return json({error: 'AI upstream error', upstreamStatus: response.status}, 502);
    const payload = await response.json();
    const output = payload.output?.flatMap(item => item.content || []).find(item => item.type === 'output_text')?.text;
    let analysis;
    try { analysis = JSON.parse(output); } catch { return json({error: 'Invalid AI response'}, 502); }
    analysis = contract.normalizeAnalysis(analysis);
    const validation = contract.validateDetailed(analysis,message);
    if (!validation.ok) {
      const diagnostic = process.env.VERCEL_ENV !== 'production' && request.headers.get('x-malsseum-diagnostic') === 'validation';
      return json(diagnostic ? {error: 'Invalid AI analysis', diagnostic: {structure: diagnosticShape(analysis), errors: validation.errors}} : {error: 'Invalid AI analysis'}, 502);
    }
    return json(analysis);
  } catch (error) { return json({error: error?.name === 'TimeoutError' ? 'AI timeout' : 'AI request failed'}, error?.name === 'TimeoutError' ? 504 : 502); }
}
export function OPTIONS(request) {
  return request.headers.get('origin') === allowedOrigin ? new Response(null, {status: 204, headers}) : json({error: 'Forbidden'}, 403);
}
