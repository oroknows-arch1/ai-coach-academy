const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

test('Lesson 1.1 uses beginner-friendly learner language',()=>{
  const window={};
  vm.runInNewContext(fs.readFileSync('course-data.js','utf8'),{window});
  const lesson=window.ACADEMY_COURSE.LESSONS.find(x=>x.module===1&&x.lesson===1);
  const learnerCopy=[lesson.concept,lesson.exercise,lesson.checkQuestion,...lesson.answers,lesson.correctFeedback,lesson.incorrectFeedback].join(' ');
  for(const phrase of ['required output','boundaries','verify important claims','AI should avoid assuming'])assert.equal(learnerCopy.includes(phrase),false,`Learner copy contains advanced phrase: ${phrase}`);
  assert.match(lesson.exercise,/short coaching note/i);
  assert.match(lesson.exercise,/approved quality report/i);
  assert.match(lesson.exercise,/check before sharing/i);
  assert.match(lesson.answers[lesson.correct],/approved report/i);
  assert.match(lesson.answers[lesson.correct],/check the important details/i);
});


test('Lesson 4.2 has a concrete and answerable policy-boundary task',()=>{
  const window={};
  vm.runInNewContext(fs.readFileSync('course-data.js','utf8'),{window});
  const lesson=window.ACADEMY_COURSE.LESSONS.find(x=>x.module===4&&x.lesson===2);
  assert.match(lesson.scenario,/customer case file/i);
  assert.match(lesson.scenario,/names, account numbers and income details/i);
  assert.match(lesson.scenario,/public AI website/i);
  assert.match(lesson.scenario,/not listed as an approved workplace tool/i);
  assert.match(lesson.exercise,/say to the coach/i);
  assert.match(lesson.exercise,/will not upload/i);
  assert.match(lesson.exercise,/approval and information-handling checks/i);
  assert.doesNotMatch(lesson.scenario,/sensitive lending material/i);
  assert.doesNotMatch(lesson.exercise,/response and next step/i);
});
