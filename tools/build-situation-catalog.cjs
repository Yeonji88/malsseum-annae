const fs = require('fs');
const vm = require('vm');

const versesPath = './dist/data/verses.js';
const outputPath = './dist/data/situation-catalog.json';

const context = {
  window: {
    Malsseum: {
      data: {}
    }
  }
};

vm.createContext(context);
vm.runInContext(fs.readFileSync(versesPath, 'utf8'), context);

const verses = context.window.Malsseum.data.verses;
if (!Array.isArray(verses)) throw new Error('verses not loaded');

const supplementalDefinitions = [
  {id:'physical_health_concern',topics:[],recommendationNotes:['몸의 통증, 질병, 검사나 치료 등 신체 건강에 관한 걱정.'],expressions:[],contextNotes:['의학적 판단이나 치료 결정을 말씀 추천으로 대신하지 않는다.']},
  {id:'acute_hardship',topics:[],recommendationNotes:['사고나 갑작스러운 위기 등 현재 겪는 급박한 어려움.'],expressions:[],contextNotes:['위험 신호와 즉각적인 도움이 필요한지 우선 확인한다.']},
  {id:'severe_exhaustion',topics:['rest'],recommendationNotes:['일상생활을 이어가기 힘들 정도로 심하게 지치거나 소진된 상태.'],expressions:[],contextNotes:['구체적인 피로 근거 없이 휴식이 필요하다고 추측하지 않는다.']},
  {id:'fresh_relationship_wound',topics:['relationship'],recommendationNotes:['관계에서 겪은 거절, 다툼, 배신 등으로 아직 아픈 마음.'],expressions:[],contextNotes:['즉시 용서하거나 화해할 준비가 되었다고 해석하지 않는다.']}
];

const catalog = {};

for (const verse of verses) {
  for (const situationId of verse.situations || []) {
    if (!catalog[situationId]) {
      catalog[situationId] = {
        id: situationId,
        topics: [],
        recommendationNotes: [],
        expressions: [],
        contextNotes: []
      };
    }

    const item = catalog[situationId];

    for (const topic of verse.topics || []) {
      if (topic && !item.topics.includes(topic)) item.topics.push(topic);
    }

    if (
      verse.recommendationNote &&
      !item.recommendationNotes.includes(verse.recommendationNote)
    ) {
      item.recommendationNotes.push(verse.recommendationNote);
    }

    for (const expression of verse.expressions || []) {
      if (expression && !item.expressions.includes(expression)) {
        item.expressions.push(expression);
      }
    }

    if (
      verse.contextNote &&
      !item.contextNotes.includes(verse.contextNote)
    ) {
      item.contextNotes.push(verse.contextNote);
    }
  }
}

for (const item of supplementalDefinitions) {
  if (!catalog[item.id]) catalog[item.id] = item;
}

const contract = require('../dist/data/analysisContract.js');
const ids = Object.keys(catalog);
if (ids.length !== contract.situationIds.length || ids.some(id => !contract.situationIds.includes(id))) throw new Error('Situation catalog coverage mismatch');
if (Object.values(catalog).some(item => !item.recommendationNotes.length || /\?{2,}/.test(JSON.stringify(item)))) throw new Error('Missing or corrupted situation definition');

fs.writeFileSync(
  outputPath,
  JSON.stringify(Object.values(catalog), null, 2) + '\n',
  'utf8'
);

console.log('situation catalog generated:', Object.keys(catalog).length);
console.log('output:', outputPath);
