const test = require('node:test');
const assert = require('node:assert/strict');
const scorer = require('../semantic-response-scorer.js');
const rubrics = require('../lesson-rubrics.js');

// Deterministic regression adapter: it makes the decision engine independently
// testable without downloading a model. Browser acceptance checks exercise the
// real pinned ONNX model; these tests verify aggregation and hard-rule priority.
function embedFor(foundIds = []) {
  return async texts => {
    const dims = texts.length - 1;
    const answer = Array(dims).fill(0);
    const examples = texts.slice(1).map((_, i) => { const v=Array(dims).fill(0);v[i]=1;return v; });
    const rubric = activeRubric;
    const all=[...rubric.requiredMeanings,...rubric.supportingMeanings];
    let offset=0;
    for(const meaning of all){
      for(let i=0;i<meaning.examples.length;i++) if(foundIds.includes(meaning.id)) answer[offset+i]=0.7;
      offset+=meaning.examples.length;
    }
    return [answer,...examples];
  };
}
let activeRubric;
async function assess(lessonId,response,foundIds){activeRubric=rubrics[lessonId];return scorer.assess({lessonId,response,rubric:activeRubric,embed:embedFor(foundIds)});}

test('all required meanings pass without requiring supporting wording', async()=>{
  const ids=rubrics['1-1'].requiredMeanings.map(x=>x.id);
  const result=await assess('1-1','I would make a usable note from the authorised report, avoid assumptions, and check the result before it goes out.',ids);
  assert.equal(result.decision,'PASS WITH FEEDBACK'); assert.equal(result.pass,true);
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
test('model failure preserves fail-closed outcome',async()=>{
  const result=await scorer.assess({lessonId:'1-1',response:'A reasonable saved answer',rubric:rubrics['1-1'],embed:async()=>{throw new Error('offline')}});
  assert.equal(result.decision,'RETRY'); assert.equal(result.pass,false); assert.equal(result.modelStatus,'failed'); assert.match(result.feedback,/saved/i);
});
test('keyword lists without a workplace proposition do not pass',async()=>{
  const ids=rubrics['1-1'].requiredMeanings.map(x=>x.id);
  const result=await assess('1-1','task output approved source boundary verification task output approved source boundary verification',ids);
  assert.equal(result.decision,'RETRY'); assert.equal(result.safeguard,'keyword-stuffing');
});
