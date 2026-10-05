import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const contract=require('../dist/data/analysisContract.js');
const catalog=require('../dist/data/situation-catalog.json');
// Run the same local guards as the browser, without duplicating their rules.
const context=vm.createContext({window:{Malsseum:{data:{},services:{}}}});
const sources=[
 fs.readFileSync(new URL('../dist/data/topics.js',import.meta.url),'utf8'),
 fs.readFileSync(new URL('../dist/data/verses.js',import.meta.url),'utf8'),
 fs.readFileSync(new URL('../dist/services/classifyConcern.js',import.meta.url),'utf8')
];
for(const source of sources)vm.runInContext(source,context);
export const localAnalysis=message=>context.window.Malsseum.services.classifyConcern(message);
export const blocksComparison=analysis=>Boolean(analysis.riskSignals?.length||analysis.requiresProfessionalJudgment||analysis.sexualVictimContext||analysis.sexualSafetyUnclear||analysis.cause?.category==='medical_decision'||analysis.explicitFacts?.some(f=>['medication_decision','sexual_victimization'].includes(f.type)));
const grams=text=>{
 const s=String(text).normalize('NFKC').toLowerCase().replace(/[^가-힣a-z0-9]/g,'');
 return new Set(Array.from({length:Math.max(0,s.length-1)},(_,i)=>s.slice(i,i+2)));
};
const documents=catalog.map(item=>({item,terms:grams([...item.recommendationNotes,...item.expressions].join(' '))}));
const weight=term=>Math.log(1+documents.length/(1+documents.filter(d=>d.terms.has(term)).length));
const eventWords={user:'',parent:'부모 엄마 아빠 어머니 아버지',deceive:'거짓말 속임 사실 숨김',disrespect:'무례 함부로 말 말대꾸',other:'다른 사람',betray:'배신',hurtful_words:'상처 주는 말',help:'도움 돕기',material:'물질 경제적'};
export function shortlist(message,facts,local=localAnalysis(message)){
 if(blocksComparison(local)||blocksComparison(facts))return [];
 if(!facts.explicitFacts.length&&!facts.emotions.length&&!facts.effects.length&&!facts.cause.explicit)return [];
 const events=facts.explicitFacts.filter(f=>f.type==='relationship_event').map(f=>f.value.split('|'));
 // A report about someone else, a quotation, or a negated/hypothetical event
 // is not evidence of the user's own action, hurt or emotional response.
 const onlyEvents=facts.explicitFacts.every(f=>f.type==='relationship_event')&&!facts.emotions.length&&!facts.effects.length;
 if(events.length&&onlyEvents&&events.every(([actor,,target,status])=>status!=='asserted'||actor!=='user'&&target!=='user'))return [];
 const query=grams([message,...facts.explicitFacts.map(f=>f.value.split('|').map(t=>eventWords[t]||t).join(' '))].join(' '));
 const verified=contract.verifiedRelationshipSituations(message,facts);
 // The sole concrete context is this verified event. Feelings about it do not
 // license additional victimization, rejection or future-event classifications.
 if(verified.length&&facts.explicitFacts.every(f=>f.type==='relationship_event'||f.type==='other'&&f.value.startsWith('emotion|'))&&facts.effects.every(e=>['emotional_distress','anxiety'].includes(e.type))){return documents.filter(({item})=>verified.includes(item.id)).map(({item})=>({id:item.id,topics:item.topics,meaning:item.recommendationNotes,boundaries:item.contextNotes}));}
 const topics=new Set([facts.primaryTopic,...facts.secondaryTopics,local.primaryTopic,...(local.secondaryTopics||[])].filter(Boolean));
 // A feeling accompanying a verified relationship action does not establish
 // a second life context (a new job, bereavement, financial insecurity, etc.).
 if(verified.length&&facts.explicitFacts.every(f=>f.type==='relationship_event'||f.type==='other'&&f.value.startsWith('emotion|'))){topics.clear();topics.add('relationship');}
 const restricted=new Set(context.window.Malsseum.data.concernExpansionRules.map(rule=>rule.id));
 return documents.filter(({item})=>!local.concernExclusions?.includes(item.id)&&(!restricted.has(item.id)||local.situations.includes(item.id)||verified.includes(item.id))&&(verified.includes(item.id)||!topics.size||!item.topics.length||item.topics.some(t=>topics.has(t)))).map(({item,terms})=>({item,score:[...query].reduce((n,t)=>n+(terms.has(t)?weight(t):0),0)/Math.sqrt(terms.size||1)+(verified.includes(item.id)?10:0)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.item.id.localeCompare(b.item.id)).slice(0,8).map(({item})=>({id:item.id,topics:item.topics,meaning:item.recommendationNotes,boundaries:item.contextNotes}));
}
// The comparison step may select situations, not rewrite facts, emotions or risks.
export function applyComparison(message,facts,choice,candidates){
 const allowed=new Set(candidates.map(c=>c.id));
 const verified=contract.verifiedRelationshipSituations(message,facts);
 const risks=[...new Set([...facts.riskSignals,...choice.riskSignals])];
 // An evidence-verified event is a classification fact, not an inferred feeling
 // or a wish to reconcile. Do not let a second pass silently drop that fact.
 const supported=!risks.length&&!blocksComparison(facts)&&!blocksComparison(choice)?verified.filter(id=>allowed.has(id)):[];
 const situations=[...new Set([...supported,...choice.situations.filter(id=>allowed.has(id)&&(id!=='parent_relationship_self_review'||supported.includes(id)))])];
 const keep=concern=>concern.kind!=='situation'||situations.includes(concern.id);
 const parent=situations.includes('parent_relationship_self_review');
 return contract.normalizeAnalysis({...facts,
  primaryTopic:parent?'relationship':facts.primaryTopic,
  situations,riskSignals:risks,
  cause:{...facts.cause,situationIds:(choice.cause.category===facts.cause.category&&choice.cause.evidence===facts.cause.evidence?choice.cause.situationIds:[]).filter(id=>situations.includes(id))},
  effects:facts.effects.map(e=>({...e,situationIds:(choice.effects.find(c=>c.type===e.type&&c.evidence===e.evidence)?.situationIds||[]).filter(id=>situations.includes(id))})),
  primaryConcern:parent?{kind:'situation',id:'parent_relationship_self_review'}:choice.primaryConcern.kind==='situation'&&situations.includes(choice.primaryConcern.id)?choice.primaryConcern:keep(facts.primaryConcern)?facts.primaryConcern:{kind:'unknown',id:''},
  secondaryConcerns:facts.secondaryConcerns.filter(keep)
 });
}


// A verb describing an event is not evidence for a feeling. These are evidence
// validators shared across topics, never sentence-to-situation classification rules.
const emotionWords={
 anxiety:/불안|걱정|초조|조마조마/,fear:/두렵|두려|무섭|무서|겁이|겁나|공포/,
 sadness:/슬프|슬퍼|서글|서러|서럽/,grief:/비통|애통|그리워|그립|상실감|슬프|슬퍼/,
 anger:/화가|화나|화났|분노|짜증|미워|밉|싫/,loneliness:/외롭|외로|고독|쓸쓸/,
 guilt:/죄책|미안|후회|양심|마음에\s*걸|찔려|죄송/,
 shame:/부끄|수치|창피/,discouragement:/낙심|낙담|좌절|의욕이\s*없/,
 overwhelm:/벅차|벅찬|버겁|감당.*(?:안|않|못)|압도/,
 frustration:/답답|막막|좌절|짜증/,hope:/소망|희망|기대/,
 gratitude:/감사|고마/,uncertainty:/불확실|확신.*(?:없|않)|모르|막막/
};
export function groundEmotions(message,analysis){
 const supported=analysis.explicitFacts.filter(f=>{
  if(f.type!=='other'||!f.value.startsWith('emotion|'))return true;
  const id=f.value.slice(8),evidence=f.evidence.trim();
  return evidence.length>=2&&message.includes(evidence)&&emotionWords[id]?.test(evidence)&&!/않|아니|없|안\s/.test(evidence.replace(/의욕이\s*없|확신.*없/g,''));
 });
 const emotions=analysis.emotions.filter(id=>supported.some(f=>f.type==='other'&&f.value==='emotion|'+id));
 const keep=c=>c.kind==='emotion'?emotions.includes(c.id):c.kind==='fact'?supported.some(f=>f.type===c.id):true;
 const topicSupported=id=>id==='fear'?emotions.some(e=>['fear','anxiety'].includes(e)):id==='guilt'?emotions.some(e=>['guilt','shame'].includes(e)):true;
 return {...analysis,primaryTopic:topicSupported(analysis.primaryTopic)?analysis.primaryTopic:'',secondaryTopics:analysis.secondaryTopics.filter(topicSupported),explicitFacts:supported,emotions,primaryConcern:keep(analysis.primaryConcern)?analysis.primaryConcern:{kind:'unknown',id:''},secondaryConcerns:analysis.secondaryConcerns.filter(keep)};
}

// Invalid model output must not turn an already detected local safety/professional
// condition into an ordinary recommendation. The browser retains the local flags.
export function guardedFallback(local){
 if(!blocksComparison(local))return null;
 return {primaryTopic:local.primaryTopic||'',secondaryTopics:(local.secondaryTopics||[]).filter(id=>id!==local.primaryTopic),cause:{category:'none',explicit:false,evidence:'',situationIds:[]},effects:[],emotions:[],situations:[],explicitFacts:[],uncertainties:['로컬 안전·전문가 판단을 우선 적용함'],primaryConcern:{kind:'unknown',id:''},secondaryConcerns:[],riskSignals:[...local.riskSignals]};
}

// The schema permits "none" as a cause ID, but an unknown concern has no ID.
// Canonicalize this empty-value spelling only; do not repair invented facts/IDs.
export function normalizeModelAnalysis(value){
 const normalized=contract.normalizeAnalysis(value);
 if(!normalized||typeof normalized!=='object')return normalized;
 const concern=c=>c?.kind==='unknown'&&c.id==='none'?{...c,id:''}:c?.kind==='cause'&&contract.schema.properties.cause.properties.category.enum.includes(c.id)&&c.id!==normalized.cause?.category?{...c,kind:'unknown',id:''}:c;
 const explicitFacts=Array.isArray(normalized.explicitFacts)?normalized.explicitFacts.filter(f=>!(f&&Object.keys(f).sort().join(',')==='evidence,type,value'&&f.type==='other'&&f.value==='emotion|none'&&f.evidence==='')):normalized.explicitFacts;
 return {...normalized,explicitFacts,primaryConcern:concern(normalized.primaryConcern),secondaryConcerns:Array.isArray(normalized.secondaryConcerns)?normalized.secondaryConcerns.map(concern):normalized.secondaryConcerns};
}

// Constrain empty/unknown alternatives at generation time, without guessing
// missing meaning or loosening the public contract's validation.
export function extractionSchema(){
 const schema=structuredClone(contract.schema),cause=schema.properties.cause,concern=schema.properties.primaryConcern;
 const none=structuredClone(cause),explicit=structuredClone(cause);
 none.properties.category.enum=['none'];none.properties.explicit={type:'boolean',enum:[false]};none.properties.evidence={type:'string',enum:['']};
 explicit.properties.category.enum=explicit.properties.category.enum.filter(id=>id!=='none');explicit.properties.explicit={type:'boolean',enum:[true]};
 schema.properties.cause={anyOf:[none,explicit]};
 const unknown=structuredClone(concern),known=structuredClone(concern);
 unknown.properties.kind.enum=['unknown'];unknown.properties.id={type:'string',enum:['']};known.properties.kind.enum=known.properties.kind.enum.filter(k=>k!=='unknown');
 // Ordering and situation mapping belong to the comparison step. Keeping
 // these empty prevents contradictory references to unselected effects/IDs.
 schema.properties.primaryConcern={anyOf:[unknown]};
 schema.properties.secondaryConcerns.maxItems=0;
 schema.properties.situations.maxItems=0;
 for(const variant of schema.properties.cause.anyOf)variant.properties.situationIds.maxItems=0;
 schema.properties.effects.items.properties.situationIds.maxItems=0;
 return schema;
}

// Carry an uncertain actor forward as uncertain, rather than allowing another
// candidate to reuse a rejected first-person interpretation.
export function groundRelationshipFacts(message,analysis){
 return {...analysis,explicitFacts:analysis.explicitFacts.map(f=>{
  if(f.type!=='relationship_event')return f;
  const [actor,action,target,status]=f.value.split('|');
  const roles=['user','parent','spouse','friend','other','unknown'];
  const actions=['deceive','disrespect','hurtful_words','betray','help','violence','other'];
  if(f.value.split('|').length!==4||!roles.includes(actor)||!roles.includes(target)||!actions.includes(action)||!['asserted','negated','hypothetical','reported','unknown'].includes(status))return {...f,value:'unknown|other|unknown|unknown'};
  if(target==='user'&&!/(?:나|저)(?:에게|한테|를)|내게|제게/.test(f.evidence))return {...f,value:actor+'|'+action+'|unknown|unknown'};
  if(!['user|deceive|parent|asserted','user|disrespect|parent|asserted'].includes(f.value))return f;
  if(contract.verifiedRelationshipSituations(message,{explicitFacts:[f]}).length)return f;
  return {...f,value:'unknown|'+f.value.split('|')[1]+'|parent|unknown'};
 })};
}

// Comparison has a smaller internal schema. It cannot rewrite extracted facts.
export function selectionSchema(candidates,facts){
 const ids=candidates.map(c=>c.id),list={type:'array',items:{type:'string',enum:ids}};
 const result={type:'object',additionalProperties:false,properties:{situations:list,primarySituation:{type:'string',enum:['',...ids]},causeSituationIds:list,effectSituations:{type:'array',items:{type:'object',additionalProperties:false,properties:{type:{type:'string',enum:facts?.effects.length?[...new Set(facts.effects.map(e=>e.type))]:contract.effectIds},situationIds:list},required:['type','situationIds']}},riskSignals:{type:'array',items:{type:'string',enum:contract.riskIds}}},required:['situations','primarySituation','causeSituationIds','effectSituations','riskSignals']};
 if(facts&&!facts.effects.length){delete result.properties.effectSituations;result.required=result.required.filter(k=>k!=='effectSituations');}
 return result;
}
export function readSelection(value,facts,candidates){
 // Empty effects have no writable field in the model's schema. Accept the
 // legacy empty list in internal callers, but never a newly invented effect.
 if(value&& !Object.hasOwn(value,'effectSituations')&&!facts.effects.length)value={...value,effectSituations:[]};
 const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===keys.slice().sort().join(',');
 const ids=candidates.map(c=>c.id),list=(v,allowed)=>Array.isArray(v)&&new Set(v).size===v.length&&v.every(id=>allowed.includes(id));
 if(!exact(value,selectionSchema(candidates).required)||!list(value.situations,ids)||!['',...value.situations].includes(value.primarySituation)||!list(value.causeSituationIds,value.situations)||!list(value.riskSignals,contract.riskIds)||!Array.isArray(value.effectSituations)||new Set(value.effectSituations.map(e=>e.type)).size!==value.effectSituations.length||value.effectSituations.some(e=>!exact(e,['type','situationIds'])||!facts.effects.some(f=>f.type===e.type)||!list(e.situationIds,value.situations)))throw new Error('Invalid situation selection');
 return {...facts,situations:value.situations,riskSignals:value.riskSignals,
  primaryConcern:value.primarySituation?{kind:'situation',id:value.primarySituation}:facts.primaryConcern,
  cause:{...facts.cause,situationIds:facts.cause.explicit?value.causeSituationIds:[]},
  effects:facts.effects.map(e=>({...e,situationIds:value.effectSituations.find(x=>x.type===e.type)?.situationIds||[]}))
 };
}
