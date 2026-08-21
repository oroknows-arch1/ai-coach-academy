const test=require('node:test');
const assert=require('node:assert/strict');
const score=require('../response-scoring.js');
test('legacy scorer remains available for the other 29 lessons',()=>{
  const result=score('Prepare a coaching summary from the approved report, check the result against the source, and have a human review it before communicating it.');
  assert.equal(typeof result.pass,'boolean'); assert.equal(result.dimensions.task,true); assert.equal(result.dimensions.judgement,true);
});
