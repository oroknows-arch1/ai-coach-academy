const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('semantic review mode is isolated and exposes only the three trial lessons',()=>{
  const app=fs.readFileSync('app.js','utf8');
  const route=fs.readFileSync('startup-route.js','utf8');
  assert.match(app,/aiCoachAcademy\.semanticTest\.v1/);
  assert.match(app,/\['1-1','1-5','4-2'\]/);
  assert.match(app,/data-semantic-test/);
  assert.match(app,/qaUnlockAll: SEMANTIC_TEST_MODE/);
  assert.match(route,/semantic-test/);
});

test('editing a passed response immediately relocks progress',()=>{
  const app=fs.readFileSync('app.js','utf8');
  assert.match(app,/changedAfterPass/);
  assert.match(app,/formativePassed:false,assessment:null,selectedAnswer:null,understandingPassed:false/);
  assert.match(app,/RECHECK REQUIRED/);
  assert.match(app,/continueLesson'\)\.disabled=true/);
});
