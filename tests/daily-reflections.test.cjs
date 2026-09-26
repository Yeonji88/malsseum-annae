const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, 'dist', file), 'utf8');
const goldenIds = ["john-11-35","psalm-139-13-14","matthew-11-28","romans-8-28","joshua-1-9"];
const approvedIds = ["john-11-35","psalm-139-13-14","matthew-11-28","romans-8-28","joshua-1-9","psalm-23-2-3","psalm-130-5","psalm-118-24","mark-6-31","john-14-27","luke-18-1","1-john-1-9","galatians-6-2","philippians-1-6","1-samuel-16-7","genesis-50-20","proverbs-4-23","ecclesiastes-3-11","isaiah-40-11","habakkuk-1-2"];

const expectedIds = ["john-11-35","psalm-139-13-14","matthew-11-28","romans-8-28","joshua-1-9","psalm-23-2-3","psalm-130-5","psalm-118-24","mark-6-31","john-14-27","luke-18-1","1-john-1-9","galatians-6-2","philippians-1-6","1-samuel-16-7","genesis-50-20","proverbs-4-23","ecclesiastes-3-11","isaiah-40-11","habakkuk-1-2","psalm-103-2","psalm-131-1-2","psalm-51-10","proverbs-15-1","ecclesiastes-4-9-10","matthew-6-34","luke-12-22-24","mark-9-24","romans-12-15","ephesians-2-10","hebrews-4-16","james-1-5","isaiah-49-15-16","lamentations-3-22-23","exodus-14-14"];

test('daily review samples have exactly thirty-five known verse IDs and complete, distinct content', () => {
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
  const approved = Object.fromEntries(approvedIds.map(id => [id, samples[id]]));
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(approved)).digest('hex'),
    '1920fd1e3dcc8423a8770b9202cfd6b16e6eb46ffa19af77b4132f91a98161b7', 'all 20 reviewed manuscripts must remain unchanged');
  const golden = Object.fromEntries(goldenIds.map(id => [id, samples[id]]));
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(golden)).digest('hex'),
    '93623333ffd42eae0c6521b272c189e50eb44e801ca48a3cdb0d92a73e7bf5e4', 'approved golden manuscripts must remain unchanged');
  const known = new Set(data.verses.map(verse => verse.id));
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
    assert.equal(entry.questions.length, 3, id);
    for (const question of entry.questions) {
      assert.equal(typeof question, 'string', id);
      assert.ok(question.trim(), id + ': empty question');
      assert.ok(!allQuestions.has(question.trim()), id + ': duplicate question across samples');
      allQuestions.add(question.trim());
    }
    assert.equal(new Set(entry.questions.map(question => question.trim())).size, 3, id);
  }
  assert.equal(JSON.stringify(data.reflections), concernBefore);
  assert.equal(JSON.stringify(data.verses), versesBefore);
});

test('review samples remain disconnected from production and concern content stays unchanged', () => {
  assert.doesNotMatch(read('index.html'), /daily-reflections|dailyReflections/);
  assert.doesNotMatch(read('app.js'), /daily-reflections|dailyReflections/);
  // Approved concern content at sample creation; ignore checkout line-ending differences.
  const hash = crypto.createHash('sha256')
    .update(read('data/reflections.js').replace(/\r\n/g, '\n')).digest('hex');
  assert.equal(hash, '8c4210cd3bcbbe0604c188ed4685f9eee333ab4737b072a7db93b247ccc59a19');
});
