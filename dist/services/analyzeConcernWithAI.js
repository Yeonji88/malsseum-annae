(function () {
 const data = window.Malsseum.data;
 const topicIds = new Set(data.topics.map(topic => topic.id));
 const situationIds = new Set([...data.situationRules.map(rule => rule.id), ...data.verses.flatMap(verse => verse.situations), 'recent_loss']);
 const riskIds = new Set(data.riskRules.map(rule => rule.id));
 const fields = ['primaryTopic', 'secondaryTopics', 'situations', 'riskSignals', 'uncertainties'];
 const validList = (items, allowed) => Array.isArray(items) && items.length <= 30 && new Set(items).size === items.length && items.every(item => typeof item === 'string' && (!allowed || allowed.has(item)));
 function validate(value) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
   Object.keys(value).sort().join(',') === fields.slice().sort().join(',') &&
   typeof value.primaryTopic === 'string' && (!value.primaryTopic || topicIds.has(value.primaryTopic)) &&
   validList(value.secondaryTopics, topicIds) && !value.secondaryTopics.includes(value.primaryTopic) &&
   validList(value.situations, situationIds) && validList(value.riskSignals, riskIds) &&
   validList(value.uncertainties) && value.uncertainties.every(item => item.length <= 200);
 }
 const endpoint = window.MalsseumAIEndpoint;
 window.Malsseum.services.analyzeConcernWithAI = async function (message, local) {
  if (!endpoint) return local;
  try {
   const response = await fetch(endpoint, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({message}), signal: AbortSignal.timeout(18000), cache: 'no-store'});
   if (!response.ok) return local;
   const ai = await response.json();
   if (!validate(ai)) return local;
   const primaryTopic = ai.primaryTopic || local.primaryTopic;
   return {...local, method: 'ai+rules', primaryTopic,
    secondaryTopics: [...new Set([...ai.secondaryTopics, ...local.secondaryTopics])].filter(id => id !== primaryTopic),
    situations: [...new Set([...local.situations, ...ai.situations])],
    riskSignals: [...new Set([...local.riskSignals, ...ai.riskSignals])],
    uncertainties: [...new Set([...local.uncertainties, ...ai.uncertainties])],
    matched: Boolean(primaryTopic), mixed: Boolean(ai.secondaryTopics.length || local.secondaryTopics.length)};
  } catch { return local; }
 };
})();
