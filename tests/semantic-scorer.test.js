const test = require('node:test');
const assert = require('node:assert/strict');
const scorer = require('../semantic-response-scorer.js');
const rubrics = require('../lesson-rubrics.js');

// Deterministic regression adapter: it makes the decision engine independently
// testable without downloading a model. Browser acceptance checks exercise the
// real pinned ONNX model; these tests verify aggregation and hard-rule priority.
function embedFor(foundIds = []) {
  return async texts => {
    const rubric = activeRubric;
    const all=[...rubric.requiredMeanings,...rubric.supportingMeanings];
    const exampleOwner=new Map(all.flatMap((meaning,index)=>meaning.examples.map(example=>[example,index])));
    return texts.map(text=>{
      const vector=Array(all.length).fill(0);
      if(exampleOwner.has(text))vector[exampleOwner.get(text)]=1;
      else foundIds.forEach(id=>{const index=all.findIndex(x=>x.id===id);if(index>=0)vector[index]=0.7;});
      return vector;
    });
  };
}
let activeRubric;
async function assess(lessonId,response,foundIds){activeRubric=rubrics[lessonId];return scorer.assess({lessonId,response,rubric:activeRubric,embed:embedFor(foundIds)});}

test('all required meanings pass without requiring supporting wording', async()=>{
  const ids=rubrics['1-1'].requiredMeanings.map(x=>x.id);
  const result=await assess('1-1','I would make a usable note from the authorised report, avoid assumptions, and check the result before it goes out.',ids);
  assert.equal(result.decision,'PASS WITH FEEDBACK'); assert.equal(result.pass,true);
});
test('Lesson 1.1 sufficient understanding passes with non-blocking suggestions',async()=>{
  const original='A follow up email to lender Mel. Taking notes from our past shadow sessions the email needs to clarify more education is needed on company policies required for customer service. We need to see more independent advice given without looking to coaches. We will see results from starting to closing of sessions without seeking coaches help. We will see how results will be depending on lending knowledge, understanding and communication to customer.';
  const result=await assess('1-1',original,['task-output','approved-source','audience-tone']);
  assert.equal(result.decision,'PASS WITH FEEDBACK'); assert.equal(result.pass,true); assert.match(result.feedback,/strengthen/i);
});
test('Lesson 1.1 still retries when no meaningful task is demonstrated',async()=>{
  const result=await assess('1-1','Maybe use AI for something helpful.',['approved-source']);
  assert.equal(result.decision,'RETRY'); assert.equal(result.pass,false);
});
test('partial meaning asks for clarification and does not unlock',async()=>{
  const result=await assess('1-5','I will use the approved workplace system and remove identifiers before asking for a summary.',['approved-system','data-minimisation']);
  assert.equal(result.decision,'CLARIFY'); assert.equal(result.pass,false); assert.equal(result.missingConcepts[0].id,'handling-rules');
});
test('hard risk blocks regardless of semantic matches',async()=>{
  const ids=rubrics['4-2'].requiredMeanings.map(x=>x.id);
  const result=await assess('4-2','I know it is not approved but I will use the unapproved tool for a small test.',ids);
  assert.equal(result.decision,'BLOCKED'); assert.equal(result.pass,false); assert.ok(result.triggeredRiskRules.length || result.contradictions.length);
});
test('blocked decision is explicitly non-unlocking',async()=>{
  const result=await assess('1-1','Trust it without checking and send it.',['task-output','approved-source','boundary','verification']);
  assert.equal(result.decision,'BLOCKED'); assert.equal(result.pass,false);
});
test('model failure preserves fail-closed outcome',async()=>{
  const result=await scorer.assess({lessonId:'1-1',response:'A reasonable saved answer',rubric:rubrics['1-1'],embed:async()=>{throw new Error('offline')}});
  assert.equal(result.decision,'RETRY'); assert.equal(result.pass,false); assert.equal(result.modelStatus,'failed'); assert.match(result.feedback,/saved/i);
});
test('keyword lists without a workplace proposition do not pass',async()=>{
  const ids=rubrics['1-1'].requiredMeanings.map(x=>x.id);
  const result=await assess('1-1','task output approved source boundary verification task output approved source boundary verification',ids);
  assert.equal(result.decision,'RETRY'); assert.equal(result.safeguard,'keyword-stuffing');
});
