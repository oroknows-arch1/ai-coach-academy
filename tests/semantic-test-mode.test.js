const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('semantic review mode is isolated and exposes only the three trial lessons',()=>{
  const app=fs.readFileSync('app.js','utf8');
  const route=fs.readFileSync('startup-route.js','utf8');
  assert.match(app,/aiCoachAcademy\.semanticTest\.v1/);
  assert.match(app,/aiCoachAcademy\.guidedTest\.v1/);
  assert.match(app,/\['1-1','1-5','4-2'\]/);
  assert.match(app,/data-semantic-test/);
  assert.match(app,/qaUnlockAll: SEMANTIC_TEST_MODE/);
  assert.match(route,/semantic-test/);
  assert.match(route,/guided-test/);
});

test('editing a passed response immediately relocks progress',()=>{
  const app=fs.readFileSync('app.js','utf8');
  assert.match(app,/changedAfterPass/);
  assert.match(app,/formativePassed:false,assessment:null,selectedAnswer:null,understandingPassed:false/);
  assert.match(app,/RECHECK REQUIRED/);
  assert.match(app,/continueLesson'\)\.disabled=true/);
});

test('editing any assessed response clears stale feedback and requires recheck',()=>{
  const app=fs.readFileSync('app.js','utf8');
  assert.match(app,/changedAfterAssessment/);
  assert.match(app,/previous\.assessment!==null/);
  assert.match(app,/if\(changedAfterAssessment\)/);
  assert.match(app,/RECHECK REQUIRED/);
});

test('guided practice replaces blank text entry for reviewed lessons',()=>{
  const app=fs.readFileSync('app.js','utf8');
  assert.match(app,/l\.guidedPractice/);
  assert.match(app,/data-practice-answer/);
  assert.match(app,/CHECK MY CHOICE/);
  assert.match(app,/option\.outcome==='pass'/);
  assert.match(app,/TRY ANOTHER CHOICE/);
});

test('guided beginner assessment does not require semantic-model timing gate',()=>{
  const validator=fs.readFileSync('scripts/harness-validation.js','utf8');
  const state=JSON.parse(fs.readFileSync('harness/academy-mvp-state.json','utf8'));
  assert.equal(state.scope.assessmentMode,'guided-multiple-choice');
  assert.equal(state.scope.advancedSemanticPractice,'preserved-not-learner-facing');
  assert.match(validator,/assessmentMode === 'semantic-free-text'/);
  assert.equal(state.gates.physicalMobileTiming.status,'advisory');
});
