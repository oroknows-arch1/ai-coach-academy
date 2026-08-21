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
  assert.match(lesson.exercise,/what you want it to create/i);
  assert.match(lesson.answers[lesson.correct],/check the result before using it/i);
});
