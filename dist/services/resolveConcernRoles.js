(function(){
 const normalize=value=>String(value||'').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu,'');
 const isQuoted=(message,evidence)=>{const needle=normalize(evidence);return needle.length>=2&&normalize(message).includes(needle);};
 window.Malsseum.services.resolveConcernRoles=function(message,analysis){
  if(!analysis?.cause||!Array.isArray(analysis.effects)||!Array.isArray(analysis.explicitFacts))return analysis;
  const verifiedFacts=analysis.explicitFacts.filter(fact=>isQuoted(message,fact.evidence));
  const explicitCause=analysis.cause.explicit&&isQuoted(message,analysis.cause.evidence);
  const professionalJudgment=Boolean(analysis.requiresProfessionalJudgment)||verifiedFacts.some(fact=>fact.type==='medication_decision')||(explicitCause&&analysis.cause.category==='medical_decision');
  const causeSituationIds=explicitCause?[...analysis.cause.situationIds]:[];
  const effectSituationIds=[...new Set(analysis.effects.filter(effect=>isQuoted(message,effect.evidence)).flatMap(effect=>effect.situationIds))];
  const primary=analysis.primaryConcern||{kind:'unknown',id:''};
  const trustedPrimary=primary.kind==='cause'?(explicitCause?primary:{kind:'unknown',id:''}):primary.kind==='fact'?(verifiedFacts.some(fact=>fact.type===primary.id)?primary:{kind:'unknown',id:''}):primary.kind==='situation'?(analysis.situations.includes(primary.id)?primary:{kind:'unknown',id:''}):primary;
  const primarySituationIds=primary.kind==='situation'&&analysis.situations.includes(primary.id)?[primary.id]:[];
  const secondarySituationIds=[...new Set((analysis.secondaryConcerns||[]).filter(item=>item.kind==='situation'&&analysis.situations.includes(item.id)).map(item=>item.id))];
  const emotionalConcernInHealthContext=Boolean(analysis.emotionalConcernInHealthContext)||explicitCause&&analysis.cause.category==='health'&&analysis.effects.some(effect=>['fatigue','emotional_distress','anxiety'].includes(effect.type)&&isQuoted(message,effect.evidence));
  const resolvedPrimary=professionalJudgment?{kind:'fact',id:'medication_decision'}:explicitCause&&trustedPrimary.kind==='situation'&&causeSituationIds.includes(trustedPrimary.id)?trustedPrimary:explicitCause?{kind:'cause',id:analysis.cause.category}:trustedPrimary;
  return {...analysis,requiresProfessionalJudgment:professionalJudgment,emotionalConcernInHealthContext,concernResolution:{
   primaryConcern:resolvedPrimary,
   causeSituationIds,primarySituationIds,secondarySituationIds,effectSituationIds,
   verifiedFactTypes:verifiedFacts.map(fact=>fact.type)
  }};
 };
})();
