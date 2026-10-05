const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const contract=require('../dist/data/analysisContract.js');
const parent='parent_relationship_self_review';
const fact=(message,value='user|deceive|parent|asserted')=>({type:'relationship_event',value,evidence:message});
const analysis=(message,override={})=>({primaryTopic:'relationship',secondaryTopics:[],cause:{category:'none',explicit:false,evidence:'',situationIds:[]},effects:[],emotions:[],situations:[],explicitFacts:[fact(message)],uncertainties:[],primaryConcern:{kind:'fact',id:'relationship_event'},secondaryConcerns:[],riskSignals:[],...override});
function browser(ai){
 const c=vm.createContext({window:{MalsseumAIEndpoint:'test',Malsseum:{data:{},services:{}}},AbortSignal,fetch:async()=>({ok:true,json:async()=>JSON.parse(JSON.stringify(ai))})});
 for(const f of ['data/topics.js','data/verses.js','data/analysisContract.js','services/classifyConcern.js','services/analyzeConcernWithAI.js','services/resolveConcernRoles.js','services/findCandidates.js','services/recommendationPolicy.js','services/selectVerse.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),c);
 return c.window.Malsseum.services;
}
const positives=['엄마한테 거짓말을 했어요','엄마를 속였어요','아빠한테 사실을 숨겼어요','제가 어머니께 사실을 숨긴 일이 있어요','부모님에게 거짓말했어요','아버지를 속인 일이 있어요'];
for(const message of positives)test('semantic fact + shortlist + existing selection: '+message,async()=>{
 const {shortlist,applyComparison}=await import('../server/semantic-analysis.mjs');
 const facts=analysis(message),candidates=shortlist(message,facts);
 assert.ok(candidates.length<=8);assert.ok(candidates.some(c=>c.id===parent));
 const ai=applyComparison(message,facts,{...facts,situations:[parent],primaryConcern:{kind:'situation',id:parent}},candidates);
 assert.deepEqual(ai.emotions,[]);assert.equal(ai.primaryTopic,'relationship');assert.equal(contract.validate(ai,message),true);
 const s=browser(ai),local=s.classifyConcern(message),merged=await s.analyzeConcernWithAI(message,local);
 assert.ok(merged.situations.includes(parent));
 const roles=s.resolveConcernRoles(message,merged),result=s.selectVerse(roles,s.findCandidates(roles));
 assert.equal(result.verse?.id,'ephesians-6-1-3');
});
const negatives=['철수가 엄마한테 거짓말했어요','엄마한테 철수가 거짓말했어요','제가 들었는데 철수가 엄마한테 거짓말했어요','엄마가 나한테 거짓말했어요','엄마가 너무 싫어요','부모님이 저를 때려요','엄마한테 거짓말을 하지 않았어요','엄마를 속인 적 없어요','엄마한테 거짓말 안했어요','만약 엄마한테 거짓말한다면 어떨까요','엄마한테 거짓말하려고 해요','친구가 엄마한테 거짓말을 했어요','엄마한테 거짓말한 건 동생이에요','“엄마한테 거짓말했어요”라는 소설 속 대사예요','엄마한테 거짓말했나요?','엄마한테 거짓말했다고 친구가 말했어요'];
for(const message of negatives)test('untrusted direction/negation/quotation cannot open parent passage: '+message,async()=>{
 const ai=analysis(message,{situations:[parent],primaryConcern:{kind:'situation',id:parent}});
 assert.deepEqual(contract.verifiedRelationshipSituations(message,ai),[]);
 const s=browser(ai),local=s.classifyConcern(message),merged=await s.analyzeConcernWithAI(message,local);
 assert.ok(!merged.situations.includes(parent));
 const r=s.resolveConcernRoles(message,merged),result=s.selectVerse(r,s.findCandidates(r));
 assert.notEqual(result.verse?.id,'ephesians-6-1-3');
});
test('a label or a fabricated quote alone never opens an expansion gate',async()=>{
 for(const facts of [[],[fact('없는 문장')],[fact('엄마한테 거짓말을 했어요','parent|deceive|user|asserted')]]){
  const message='엄마한테 거짓말을 했어요',ai=analysis(message,{explicitFacts:facts,situations:[parent],primaryConcern:{kind:'situation',id:parent}}),s=browser(ai),local=s.classifyConcern(message),merged=await s.analyzeConcernWithAI(message,local);
  assert.ok(!merged.situations.includes(parent));
 }
});
for(const message of ['부모님이 저를 때려요','죽고 싶어요','엄마한테 거짓말을 했어요. 약을 끊어도 될까요?','배우자가 싫다고 해도 강제로 성관계를 해요'])test('local safety/professional guards precede comparison: '+message,async()=>{
 const {localAnalysis,blocksComparison,shortlist}=await import('../server/semantic-analysis.mjs');
 const local=localAnalysis(message);assert.equal(blocksComparison(local),true);assert.deepEqual(shortlist(message,analysis(message),local),[]);
});
test('candidate membership and first-pass facts are immutable at comparison',async()=>{
 const {shortlist,applyComparison}=await import('../server/semantic-analysis.mjs'),message=positives[0],facts=analysis(message),candidates=shortlist(message,facts);
 const choice=analysis(message,{situations:[parent,'not_allowed'],emotions:['fear','guilt'],riskSignals:[],explicitFacts:[],primaryConcern:{kind:'situation',id:parent}});
 const result=applyComparison(message,facts,choice,candidates);
 assert.deepEqual(result.emotions,[]);assert.deepEqual(result.explicitFacts,facts.explicitFacts);assert.deepEqual(result.situations,[parent]);
});
test('catalog has all contract IDs and readable definitions',()=>{
 const catalog=require('../dist/data/situation-catalog.json');assert.deepEqual(catalog.map(c=>c.id).sort(),[...contract.situationIds].sort());
 for(const item of catalog){assert.ok(item.recommendationNotes.length);assert.doesNotMatch(JSON.stringify(item),/\?{2,}/);}
});
const request=message=>new Request('https://test/api',{method:'POST',headers:{origin:'https://yeonji88.github.io','content-type':'application/json'},body:JSON.stringify({message})});
const output=value=>({ok:true,json:async()=>({output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]})});
test('API extracts facts first, sends <=8 candidates next, shares deadline, preserves emotions',async()=>{
 const {POST}=await import('../api/analyze.mjs'),previous=global.fetch,key=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test';
 try{for(const message of positives){const facts=analysis(message),calls=[];global.fetch=async(_url,opts)=>{
   const body=JSON.parse(opts.body);calls.push({body,signal:opts.signal});
   if(calls.length===1){assert.equal(body.input,message);assert.ok(!body.input.includes('Situation catalog'));return output(facts);}
   const input=JSON.parse(body.input);assert.ok(input.candidates.length<=8);assert.ok(input.candidates.some(c=>c.id===parent));
   return output({situations:[parent],primarySituation:parent,causeSituationIds:[],effectSituations:[],riskSignals:[]});
  };
  const response=await POST(request(message)),result=await response.json();assert.equal(response.status,200);assert.deepEqual(result.situations,[parent]);assert.deepEqual(result.emotions,[]);assert.equal(calls.length,2);assert.strictEqual(calls[0].signal,calls[1].signal);
 }}finally{global.fetch=previous;if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key;}
});
test('API skips comparison for local violence even when model omits risk',async()=>{
 const {POST}=await import('../api/analyze.mjs'),previous=global.fetch,key=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test';let count=0;
 try{global.fetch=async()=>{count++;return output(analysis('부모님이 저를 때려요',{explicitFacts:[],primaryConcern:{kind:'unknown',id:''}}));};
 const response=await POST(request('부모님이 저를 때려요')),result=await response.json();assert.equal(response.status,200);assert.ok(result.riskSignals.includes('violence'));assert.equal(count,1);assert.deepEqual(result.situations,[]);
 }finally{global.fetch=previous;if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key;}
});
test('emotion needs a separate exact source quote, not an action label',async()=>{
 const {groundEmotions}=await import('../server/semantic-analysis.mjs'),message='엄마를 속였어요';
 const invented=groundEmotions(message,analysis(message,{emotions:['fear','guilt'],primaryConcern:{kind:'emotion',id:'fear'}}));assert.deepEqual(invented.emotions,[]);assert.equal(invented.primaryConcern.kind,'unknown');
 const stated=groundEmotions(message+' 무서워요',analysis(message,{emotions:['fear'],explicitFacts:[fact(message),{type:'other',value:'emotion|fear',evidence:'무서워요'}],primaryConcern:{kind:'emotion',id:'fear'}}));assert.deepEqual(stated.emotions,['fear']);
});
test('second-stage failure fails closed instead of using an unreviewed classification',async()=>{
 const {POST}=await import('../api/analyze.mjs'),previous=global.fetch,key=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test';
 try{for(const failure of [{ok:false,status:503},output({...analysis(positives[0]),extra:true}),{ok:true,json:async()=>{throw Error('bad response');}}]){let count=0;global.fetch=async()=>++count===1?output(analysis(positives[0])):failure;assert.equal((await POST(request(positives[0]))).status,502);}}
 finally{global.fetch=previous;if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key;}
});
test('comparison retains cause/effect role mapping without changing source facts',async()=>{
 const {applyComparison}=await import('../server/semantic-analysis.mjs');
 const facts=analysis('돈 걱정 때문에 잠이 안 와요',{primaryTopic:'fear',explicitFacts:[],cause:{category:'financial',explicit:true,evidence:'돈 걱정',situationIds:[]},effects:[{type:'insomnia',evidence:'잠이 안 와요',situationIds:[]}],primaryConcern:{kind:'cause',id:'financial'}});
 const choice={...facts,situations:['practical_financial_worry','sleep_worry'],cause:{...facts.cause,situationIds:['practical_financial_worry']},effects:[{...facts.effects[0],situationIds:['sleep_worry']}]};
 const result=applyComparison('돈 걱정 때문에 잠이 안 와요',facts,choice,choice.situations.map(id=>({id})));
 assert.deepEqual(result.cause.situationIds,['practical_financial_worry']);assert.deepEqual(result.effects[0].situationIds,['sleep_worry']);assert.equal(result.cause.evidence,facts.cause.evidence);
});
test('live-model regression: event quote cannot stand in for guilt or fear evidence',async()=>{
 const {groundEmotions}=await import('../server/semantic-analysis.mjs');
 for(const [message,id] of [['부모에게 사실을 숨겼어요','guilt'],['거짓말한다면 어떨까요','fear'],['친구를 속였어요','shame']]){
  const a=analysis(message,{emotions:[id],explicitFacts:[{type:'other',value:'emotion|'+id,evidence:message}],primaryConcern:{kind:'emotion',id}});
  const result=groundEmotions(message,a);assert.deepEqual(result.emotions,[]);assert.deepEqual(result.explicitFacts,[]);assert.equal(result.primaryConcern.kind,'unknown');
 }
});
test('live-model regression: verified event survives empty second-pass selection without inventing regret',async()=>{
 const {applyComparison}=await import('../server/semantic-analysis.mjs');
 for(const message of positives){const facts=analysis(message);const result=applyComparison(message,facts,facts,[{id:parent}]);assert.deepEqual(result.situations,[parent]);assert.deepEqual(result.emotions,[]);}
});
test('verified event never bypasses a second-pass safety or medical block',async()=>{
 const {applyComparison}=await import('../server/semantic-analysis.mjs'),facts=analysis(positives[0]);
 for(const extra of [{riskSignals:['violence']},{cause:{category:'medical_decision',explicit:true,evidence:positives[0],situationIds:[]}}]){
  const result=applyComparison(positives[0],facts,{...facts,...extra},[{id:parent}]);assert.ok(!result.situations.includes(parent));
 }
});
test('invalid live model output cannot suppress already detected local guards',async()=>{
 const {POST}=await import('../api/analyze.mjs'),previous=global.fetch,key=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test';
 try{for(const message of ['부모님이 저를 때려요','엄마한테 거짓말을 했어요. 약을 끊어도 될까요?']){
  global.fetch=async()=>output({...analysis(message),extra:true});
  const response=await POST(request(message)),a=await response.json();assert.equal(response.status,200);assert.equal(contract.validate(a,message),true);assert.deepEqual(a.situations,[]);
  const s=browser(a),merged=await s.analyzeConcernWithAI(message,s.classifyConcern(message)),resolved=s.resolveConcernRoles(message,merged),r=s.selectVerse(resolved,s.findCandidates(resolved));
  assert.equal(r.status,message.includes('약을')?'no_suitable_candidate':'safety_first');
 }}finally{global.fetch=previous;if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key;}
});
test('third-party and non-asserted events alone do not create personal situation candidates',async()=>{
 const {shortlist}=await import('../server/semantic-analysis.mjs');
 for(const [message,value] of [['엄마한테 철수가 거짓말했어요','other|deceive|parent|asserted'],['엄마한테 거짓말 안했어요','user|deceive|parent|negated'],['만약 엄마를 속인다면','user|deceive|parent|hypothetical']]){
  assert.deepEqual(shortlist(message,analysis(message,{explicitFacts:[fact(message,value)]})),[]);
 }
});
test('live-model empty unknown ID spelling is normalized without accepting invented IDs',async()=>{
 const {normalizeModelAnalysis}=await import('../server/semantic-analysis.mjs');
 const a=analysis('모르겠어요',{explicitFacts:[],primaryConcern:{kind:'unknown',id:'none'}});
 const normalized=normalizeModelAnalysis(a);assert.equal(normalized.primaryConcern.id,'');assert.equal(a.primaryConcern.id,'none');assert.equal(contract.validate(normalized,'모르겠어요'),true);
 assert.equal(contract.validate(normalizeModelAnalysis({...a,primaryConcern:{kind:'unknown',id:'medical_decision'}}),'모르겠어요'),false);
 assert.equal(contract.validate(normalizeModelAnalysis({...a,extra:true}),'모르겠어요'),false);
});
test('rejected first-person fact cannot leak into another personal regret situation',async()=>{
 const {groundRelationshipFacts,shortlist}=await import('../server/semantic-analysis.mjs');
 for(const message of ['철수가 엄마한테 거짓말했어요','엄마한테 철수가 거짓말했어요','엄마한테 거짓말 안했어요']){
  const facts=groundRelationshipFacts(message,analysis(message));assert.equal(facts.explicitFacts[0].value,'unknown|deceive|parent|unknown');assert.deepEqual(shortlist(message,facts),[]);
 }
 for(const message of positives)assert.deepEqual(groundRelationshipFacts(message,analysis(message)),analysis(message));
});
test('empty emotion-none placeholder is absence, never a fact or fabricated evidence',async()=>{
 const {normalizeModelAnalysis}=await import('../server/semantic-analysis.mjs'),a=analysis(positives[0]);
 const placeholder={type:'other',value:'emotion|none',evidence:''};
 assert.deepEqual(normalizeModelAnalysis({...a,explicitFacts:[...a.explicitFacts,placeholder]}).explicitFacts,a.explicitFacts);
 for(const invalid of [{...placeholder,value:'emotion|fear'},{...placeholder,extra:true}])assert.equal(contract.validate(normalizeModelAnalysis({...a,explicitFacts:[...a.explicitFacts,invalid]}),positives[0]),false);
});
test('relationship target cannot become the user without a first-person recipient',async()=>{
 const {groundRelationshipFacts,shortlist}=await import('../server/semantic-analysis.mjs');
 const message='엄마한테 철수가 거짓말했어요',a=analysis(message,{explicitFacts:[fact(message,'other|deceive|user|asserted')]});
 const grounded=groundRelationshipFacts(message,a);assert.equal(grounded.explicitFacts[0].value,'other|deceive|unknown|unknown');assert.deepEqual(shortlist(message,grounded),[]);
 for(const m of ['엄마가 나한테 거짓말했어요','아빠가 저에게 거짓말했어요']){
  const a=analysis(m,{explicitFacts:[fact(m,'parent|deceive|user|asserted')]});assert.deepEqual(groundRelationshipFacts(m,a),a);
 }
});
test('comparison schema cannot rewrite facts and rejects foreign IDs, extra fields and invented effects',async()=>{
 const {readSelection,selectionSchema}=await import('../server/semantic-analysis.mjs'),facts=analysis(positives[0]),candidates=[{id:parent}];
 const selection={situations:[parent],primarySituation:parent,causeSituationIds:[],effectSituations:[],riskSignals:[]};
 const result=readSelection(selection,facts,candidates);assert.deepEqual(result.explicitFacts,facts.explicitFacts);assert.deepEqual(result.emotions,[]);assert.ok(!Object.keys(selectionSchema(candidates).properties).includes('explicitFacts'));
 for(const bad of [{...selection,emotions:['guilt']},{...selection,situations:['need_rest']},{...selection,primarySituation:'need_rest'},{...selection,effectSituations:[{type:'fatigue',situationIds:[parent]}]},{...selection,situations:[parent,parent]}])assert.throws(()=>readSelection(bad,facts,candidates));
});
test('candidate retrieval does not cross from a relationship context into self-image merely by word overlap',async()=>{
 const {shortlist}=await import('../server/semantic-analysis.mjs');
 const a=analysis('엄마가 너무 싫어요',{explicitFacts:[],emotions:['anger'],primaryConcern:{kind:'emotion',id:'anger'}});
 const candidates=shortlist('엄마가 너무 싫어요',a);assert.ok(candidates.length);assert.ok(!candidates.some(c=>c.id==='difficulty_accepting_self'));assert.ok(!candidates.some(c=>c.id==='regret_after_hurtful_words'));
});
test('rejected emotion does not remain as an unsupported fear/guilt topic',async()=>{
 const {groundEmotions}=await import('../server/semantic-analysis.mjs');
 const a=analysis('거짓말했어요',{primaryTopic:'guilt',secondaryTopics:['fear'],emotions:['guilt'],explicitFacts:[{type:'other',value:'emotion|guilt',evidence:'거짓말했어요'}]});
 const r=groundEmotions('거짓말했어요',a);assert.equal(r.primaryTopic,'');assert.deepEqual(r.secondaryTopics,[]);assert.deepEqual(r.emotions,[]);
});

test('ungrounded questions and invalid relationship vocabulary cannot generate candidates',async()=>{
 const {shortlist,groundRelationshipFacts}=await import('../server/semantic-analysis.mjs');
 const empty=analysis('만약 친구를 속인다면',{explicitFacts:[]});assert.deepEqual(shortlist('만약 친구를 속인다면',empty),[]);
 const quoted='“친구에게 거짓말했어요”라는 대사예요';
 const grounded=groundRelationshipFacts(quoted,analysis(quoted,{explicitFacts:[fact(quoted,'user|deceive|mother|asserted')]}));
 assert.deepEqual(shortlist(quoted,grounded),[]);
});
test('selection schema exposes only effects actually extracted from the input',async()=>{
 const {selectionSchema,readSelection}=await import('../server/semantic-analysis.mjs'),facts=analysis(positives[0]),candidates=[{id:parent}];
 assert.equal(selectionSchema(candidates,facts).properties.effectSituations,undefined);
 assert.deepEqual(readSelection({situations:[parent],primarySituation:parent,causeSituationIds:[],riskSignals:[]},facts,candidates).effects,[]);
 const withEffects={...facts,effects:[{type:'insomnia',evidence:'잠이 안 와요',situationIds:[]}]};
 assert.deepEqual(selectionSchema(candidates,withEffects).properties.effectSituations.items.properties.type.enum,['insomnia']);
});
test('a verified event plus a feeling does not admit unrelated life contexts',async()=>{
 const {shortlist,extractionSchema}=await import('../server/semantic-analysis.mjs');
 const message='엄마를 속였고 무서워요',a=analysis(message,{primaryTopic:'fear',secondaryTopics:['relationship'],emotions:['fear'],explicitFacts:[fact('엄마를 속였고'),{type:'other',value:'emotion|fear',evidence:'무서워요'}]});
 assert.deepEqual(shortlist(message,a).map(x=>x.id),[parent]);
 const s=extractionSchema();assert.deepEqual(s.properties.cause.anyOf[0].properties.explicit.enum,[false]);assert.deepEqual(s.properties.primaryConcern.anyOf[0].properties.id.enum,['']);
 assert.deepEqual(s.required,contract.schema.required);
});
test('a mismatched cause reference becomes unknown without rewriting the extracted cause',async()=>{
 const {normalizeModelAnalysis}=await import('../server/semantic-analysis.mjs');
 const a=analysis('친구가 엄마에게 거짓말했어요',{cause:{category:'other',explicit:true,evidence:'친구가 엄마에게 거짓말했어요',situationIds:[]},primaryConcern:{kind:'cause',id:'relationship'}});
 const result=normalizeModelAnalysis(a);assert.deepEqual(result.primaryConcern,{kind:'unknown',id:''});assert.deepEqual(result.cause,a.cause);assert.deepEqual(result.explicitFacts,a.explicitFacts);
});
