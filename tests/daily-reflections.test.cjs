const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, 'dist', file), 'utf8');
const goldenIds = ["psalm-143-8","psalm-139-14","matthew-11-28","romans-8-28","joshua-1-9"];
const approvedIds = ["psalm-143-8","psalm-139-14","matthew-11-28","romans-8-28","joshua-1-9","psalm-23-2","psalm-130-5","psalm-118-24","mark-6-31","john-14-27","luke-18-1","1-john-1-9","psalm-19-14","philippians-1-6","1-samuel-16-7","genesis-50-20","proverbs-4-23","ecclesiastes-3-11","isaiah-40-11","habakkuk-1-2","psalm-103-2","psalm-131-2","psalm-51-10","proverbs-15-1","ecclesiastes-4-10","matthew-6-34","luke-12-22","mark-9-24","romans-12-15","ephesians-2-10","hebrews-4-16","james-1-5","isaiah-49-15","lamentations-3-22","exodus-14-14","psalm-56-3","psalm-121-1-2","psalm-127-2","proverbs-3-5","proverbs-16-9","isaiah-55-9","jeremiah-29-11","zephaniah-3-17","matthew-5-4","matthew-10-30-31","romans-8-26","romans-12-18","ephesians-4-32","james-1-17","revelation-21-4","psalm-139-8","isaiah-40-31","galatians-6-9","philippians-4-6","james-1-19","psalm-4-8","isaiah-41-10","2-corinthians-5-17","1-peter-5-7","romans-8-39","psalm-56-8","isaiah-1-18","2-corinthians-12-9","hebrews-13-5","1-thessalonians-5-16-18","deuteronomy-6-5","jeremiah-33-3","ephesians-4-26-27","romans-8-1","james-1-22","psalm-32-8","psalm-73-26","isaiah-43-2","galatians-1-10","2-corinthians-10-12","psalm-40-1-2","psalm-147-3","isaiah-30-15","colossians-3-13","romans-12-19","psalm-37-7","psalm-42-5","micah-7-8","2-corinthians-4-8-9","romans-12-12","psalm-9-9-10","psalm-73-21-23","psalm-30-5","psalm-37-5-6","romans-8-37","psalm-27-10","psalm-62-5-6","psalm-10-1","psalm-34-18","psalm-138-8"];

const expectedIds = ["psalm-143-8","psalm-139-14","matthew-11-28","romans-8-28","joshua-1-9","psalm-23-2","psalm-130-5","psalm-118-24","mark-6-31","john-14-27","luke-18-1","1-john-1-9","psalm-19-14","philippians-1-6","1-samuel-16-7","genesis-50-20","proverbs-4-23","ecclesiastes-3-11","isaiah-40-11","habakkuk-1-2","psalm-103-2","psalm-131-2","psalm-51-10","proverbs-15-1","ecclesiastes-4-10","matthew-6-34","luke-12-22","mark-9-24","romans-12-15","ephesians-2-10","hebrews-4-16","james-1-5","isaiah-49-15","lamentations-3-22","exodus-14-14","psalm-56-3","psalm-121-1-2","psalm-127-2","proverbs-3-5","proverbs-16-9","isaiah-55-9","jeremiah-29-11","zephaniah-3-17","matthew-5-4","matthew-10-30-31","romans-8-26","romans-12-18","ephesians-4-32","james-1-17","revelation-21-4","psalm-139-8","isaiah-40-31","galatians-6-9","philippians-4-6","james-1-19","psalm-4-8","isaiah-41-10","2-corinthians-5-17","1-peter-5-7","romans-8-39","psalm-56-8","isaiah-1-18","2-corinthians-12-9","hebrews-13-5","1-thessalonians-5-16-18","deuteronomy-6-5","jeremiah-33-3","ephesians-4-26-27","romans-8-1","james-1-22","psalm-32-8","psalm-73-26","isaiah-43-2","galatians-1-10","2-corinthians-10-12","psalm-40-1-2","psalm-147-3","isaiah-30-15","colossians-3-13","romans-12-19","psalm-37-7","psalm-42-5","micah-7-8","2-corinthians-4-8-9","romans-12-12","psalm-9-9-10","psalm-73-21-23","psalm-30-5","psalm-37-5-6","romans-8-37","psalm-27-10","psalm-62-5-6","psalm-10-1","psalm-34-18","psalm-138-8","psalm-55-22","hebrews-13-5-6","psalm-37-23-24","psalm-46-1-3","psalm-94-19","psalm-55-12-14"];

test('daily review samples have exactly 101 known verse IDs and complete, distinct content', () => {
  const context = vm.createContext({window: {}});
  for (const file of ['topics', 'verses', 'reflections']) {
    vm.runInContext(read('data/' + file + '.js'), context);
  }
  const data = context.window.Malsseum.data;
  const concernBefore = JSON.stringify(data.reflections);
  const versesBefore = JSON.stringify(data.verses);
  vm.runInContext(read('data/daily-reflections.js'), context);
  const samples = data.dailyReflections;
  assert.deepEqual(Object.keys(samples).sort(), [...expectedIds].sort());
  assert.deepEqual(Object.keys(samples).slice(0, approvedIds.length), approvedIds, 'approved Daily order must match');
  assert.doesNotMatch(JSON.stringify(samples), /[“”]/, 'Bible quotations use single curly quotes');
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(Object.entries(samples).slice(70))).digest('hex'),
    'd82aa34bbc03f471500d85496989d67075808a31830e223022b352efd626f1a6','Daily 71 onward must remain unchanged');
  assert.deepEqual(JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(samples).slice(0,5)))),require('./fixtures/daily-approved-five.json'));
  assert.deepEqual(JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(samples).slice(50,55)))),require('./fixtures/daily-approved-fifty-one-five.json'));
  assert.deepEqual(JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(samples).slice(55,60)))),require('./fixtures/daily-approved-fifty-six-sixty.json'));
  assert.deepEqual(JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(samples).slice(60,65)))),require('./fixtures/daily-approved-sixty-one-five.json'));
  assert.deepEqual(JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(samples).slice(65,70)))),require('./fixtures/daily-approved-sixty-six-seventy.json'));
  const known = new Set([...data.verses,...Object.values(data.dailyVerseOverrides)].map(verse=>verse.id));
  const reflections = new Set();
  const allQuestions = new Set();
  for (const [id, entry] of Object.entries(samples)) {
    assert.ok(known.has(id), id);
    assert.deepEqual(Object.keys(entry).sort(), ['questions', 'reflection']);
    assert.equal(typeof entry.reflection, 'string', id);
    assert.ok(entry.reflection.trim(), id);
    assert.ok(!reflections.has(entry.reflection.trim()), id + ': duplicate reflection');
    reflections.add(entry.reflection.trim());
    assert.ok(Array.isArray(entry.questions), id);
    assert.equal(entry.questions.length, (goldenIds.includes(id)||Object.hasOwn(require('./fixtures/daily-approved-six-ten.json'),id)||Object.hasOwn(require('./fixtures/daily-approved-eleven-fifteen.json'),id)||Object.hasOwn(require('./fixtures/daily-approved-sixteen-twenty.json'),id)||Object.hasOwn(require('./fixtures/daily-approved-twenty-one-five.json'),id)||Object.hasOwn(require('./fixtures/daily-approved-twenty-six-thirty.json'),id)||Object.hasOwn(require('./fixtures/daily-approved-thirty-one-five.json'),id)||Object.hasOwn(require('./fixtures/daily-approved-thirty-six-forty.json'),id)||Object.hasOwn(require('./fixtures/daily-approved-forty-one-five.json'),id)||Object.hasOwn(require('./fixtures/daily-approved-forty-six-fifty.json'),id)||Object.hasOwn(require('./fixtures/daily-approved-fifty-one-five.json'),id)||Object.hasOwn(require('./fixtures/daily-approved-fifty-six-sixty.json'),id)||Object.hasOwn(require('./fixtures/daily-approved-sixty-one-five.json'),id)||Object.hasOwn(require('./fixtures/daily-approved-sixty-six-seventy.json'),id))?2:3, id);
    for (const question of entry.questions) {
      assert.equal(typeof question, 'string', id);
      assert.ok(question.trim(), id + ': empty question');
      assert.ok(!allQuestions.has(question.trim()), id + ': duplicate question across samples');
      allQuestions.add(question.trim());
    }
    assert.equal(new Set(entry.questions.map(question => question.trim())).size, (goldenIds.includes(id)||Object.hasOwn(require('./fixtures/daily-approved-six-ten.json'),id)||Object.hasOwn(require('./fixtures/daily-approved-eleven-fifteen.json'),id)||Object.hasOwn(require('./fixtures/daily-approved-sixteen-twenty.json'),id)||Object.hasOwn(require('./fixtures/daily-approved-twenty-one-five.json'),id)||Object.hasOwn(require('./fixtures/daily-approved-twenty-six-thirty.json'),id)||Object.hasOwn(require('./fixtures/daily-approved-thirty-one-five.json'),id)||Object.hasOwn(require('./fixtures/daily-approved-thirty-six-forty.json'),id)||Object.hasOwn(require('./fixtures/daily-approved-forty-one-five.json'),id)||Object.hasOwn(require('./fixtures/daily-approved-forty-six-fifty.json'),id)||Object.hasOwn(require('./fixtures/daily-approved-fifty-one-five.json'),id)||Object.hasOwn(require('./fixtures/daily-approved-fifty-six-sixty.json'),id)||Object.hasOwn(require('./fixtures/daily-approved-sixty-one-five.json'),id)||Object.hasOwn(require('./fixtures/daily-approved-sixty-six-seventy.json'),id))?2:3, id);
  }
  assert.equal(JSON.stringify(data.reflections), concernBefore);
  assert.equal(JSON.stringify(data.verses), versesBefore);
});

test('production uses Daily guidance and concern content stays unchanged', () => {
  assert.match(read('index.html'), /data\/daily-reflections.js/);
  assert.match(read('app.js'), /const daily=window.Malsseum.data.dailyReflections\[verse.id\]/);
  // Approved concern content at sample creation; ignore checkout line-ending differences.
  const hash = crypto.createHash('sha256')
    .update(read('data/reflections.js').replace(/,\r?\n  "1-corinthians-7-3-4":[\s\S]*?(?=\r?\n};\r?\nfor \(const id)/, '').replace('psalm-46-1-3', 'psalm-46-1-2').replace(/\r\n/g, '\n')).digest('hex');
  assert.equal(hash, '2c9c9fe494277db6d74690ec781d8719e35ca60e9a8823b9b6c9729541c656f2');
});

test('Psalm 55 addition matches approved copy and excludes 101-104',()=>{
 const context=vm.createContext({window:{Malsseum:{data:{}}}});
 vm.runInContext(read('data/daily-reflections.js'),context);
 const data=JSON.parse(JSON.stringify(context.window.Malsseum.data.dailyReflections));
 assert.deepEqual(data['psalm-55-12-14'],require('./fixtures/daily-psalm-55-12-14.json'));
 for(const id of ['1-corinthians-7-3-4','song-of-songs-7-10-12','ephesians-5-28','1-thessalonians-4-3-5'])assert.equal(Object.hasOwn(data,id),false);
});
