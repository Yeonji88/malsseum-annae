(function () {
 const contract = window.Malsseum.analysisContract;
 const endpoint = window.MalsseumAIEndpoint;
 window.Malsseum.services.analyzeConcernWithAI = async function (message, local) {
  if (!endpoint) return local;
  try {
   const response = await fetch(endpoint, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({message}), signal: AbortSignal.timeout(18000), cache: 'no-store'});
   if (!response.ok) return local;
   const ai = await response.json();
   if (!contract || !contract.validate(ai)) return local;
   const primaryTopic = ai.primaryTopic || local.primaryTopic;
   return {...local, method: 'ai+rules', primaryTopic,
    cause: ai.cause, effects: ai.effects, emotions: ai.emotions, explicitFacts: ai.explicitFacts,
    primaryConcern: ai.primaryConcern, secondaryConcerns: ai.secondaryConcerns,
    secondaryTopics: [...new Set([...ai.secondaryTopics, ...local.secondaryTopics])].filter(id => id !== primaryTopic),
    situations: [...new Set([...local.situations, ...ai.situations])],
    riskSignals: [...new Set([...local.riskSignals, ...ai.riskSignals])],
    uncertainties: [...new Set([...local.uncertainties, ...ai.uncertainties])],
    matched: Boolean(primaryTopic), mixed: Boolean(ai.secondaryTopics.length || local.secondaryTopics.length)};
  } catch { return local; }
 };
})();
