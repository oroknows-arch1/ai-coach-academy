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
  assert.equal(result.decision,'PASS'); assert.equal(result.pass,true);
});
test('Lesson 1.1 sufficient understanding passes with non-blocking suggestions',async()=>{
  const original='A follow up email to lender Mel. Taking notes from our past shadow sessions the email needs to clarify more education is needed on company policies required for customer service. We need to see more independent advice given without looking to coaches. We will see results from starting to closing of sessions without seeking coaches help. We will see how results will be depending on lending knowledge, understanding and communication to customer.';
  const result=await assess('1-1',original,['task-output','approved-source','audience-tone']);
  assert.equal(result.decision,'PASS WITH FEEDBACK'); assert.equal(result.pass,true); assert.match(result.feedback,/Good/i);
});
test('Lesson 1.1 still retries when no meaningful task is demonstrated',async()=>{
  const result=await assess('1-1','Maybe use AI for something helpful.',['approved-source']);
  assert.equal(result.decision,'RETRY'); assert.equal(result.pass,false);
});
test('Lesson 1.1 relevant but incomplete task asks for clarification',async()=>{
  const result=await assess('1-1','Write a follow-up email to the lender about the coaching sessions.',['task-output']);
  assert.equal(result.decision,'CLARIFY'); assert.equal(result.pass,false);
});
test('Lesson 1.1 blocks the exact unsafe behavioural-review answer',async()=>{
  const response='Use any information you can find to write a convincing coaching note. Fill in any missing details and send the final version directly to the regional leaders.';
  const result=await assess('1-1',response,['task-output','approved-source','boundary','verification']);
  assert.equal(result.decision,'BLOCKED'); assert.equal(result.pass,false);
});
test('Lesson 1.1 accepts the unexpected but sound behavioural-review answer',async()=>{
  const response='Summarise the two concerns from the approved report in plain language for regional leaders. Include what better performance should look like, but do not name individual staff or guess at the causes. Show me the draft so I can compare it with the report before it goes out.';
  const result=await assess('1-1',response,['task-output','approved-source','boundary','verification']);
  assert.equal(result.decision,'PASS'); assert.equal(result.pass,true);
});
test('Lesson 1.1 feedback names only the missing source',async()=>{
  const result=await assess('1-1','Write a short note for regional leaders explaining the issues. I will check it before sharing.',['task-output','boundary','verification']);
  assert.equal(result.decision,'PASS WITH FEEDBACK'); assert.match(result.feedback,/approved quality report/i); assert.doesNotMatch(result.feedback,/what you will check/i);
});
test('Lesson 1.1 feedback names only the missing final check',async()=>{
  const result=await assess('1-1','Use the approved report to write a short coaching note for regional leaders.',['task-output','approved-source','boundary']);
  assert.equal(result.decision,'PASS WITH FEEDBACK'); assert.match(result.feedback,/check against the report/i); assert.doesNotMatch(result.feedback,/email/i);
});
test('Lesson 1.5 strong answer passes when it covers the task\'s two core meanings',async()=>{
  const response='Using the approved workplace system, draft a coaching summary from de-identified examples. Remove customer names, account numbers, contact details and anything else that could identify them. Include only the information needed to explain the coaching issue, expected standard and next action.';
  const approvedSystem=rubrics['1-5'].requiredMeanings.find(x=>x.id==='approved-system');
  const dataMinimisation=rubrics['1-5'].requiredMeanings.find(x=>x.id==='data-minimisation');
  assert.ok(approvedSystem.threshold<=0.35); assert.ok(approvedSystem.examples.some(x=>/approved workplace system/i.test(x)));
  assert.ok(dataMinimisation.threshold>=0.50); assert.ok(dataMinimisation.examples.every(x=>!/coaching summary/i.test(x)));
  const result=await assess('1-5',response,['approved-system','data-minimisation']);
  assert.equal(result.decision,'PASS'); assert.equal(result.pass,true); assert.deepEqual(result.missingConcepts,[]);
});
test('Lesson 1.5 partial answer asks for clarification and does not unlock',async()=>{
  const result=await assess('1-5','Use the approved workplace system to prepare the coaching summary.',['approved-system']);
  assert.equal(result.decision,'CLARIFY'); assert.equal(result.pass,false); assert.equal(result.missingConcepts[0].id,'data-minimisation');
});
test('Lesson 1.5 unsafe answer remains blocked',async()=>{
  const result=await assess('1-5','Use a public AI tool and paste customer details into it to draft the summary.',['approved-system','data-minimisation']);
  assert.equal(result.decision,'BLOCKED'); assert.equal(result.pass,false); assert.ok(result.triggeredRiskRules.length);
});
test('Lesson 1.5 vague privacy wording cannot pass on similarity alone',async()=>{
  const result=await assess('1-5','Remove any private information and identify the main coaching themes.',['approved-system','data-minimisation']);
  assert.equal(result.decision,'CLARIFY'); assert.equal(result.pass,false);
});
test('Lesson 1.5 physical unsafe edit is firmly blocked',async()=>{
  const result=await assess('1-5','Keep the customer names, account numbers and contact details so the AI has the full context. Identify the common coaching themes.',['approved-system','data-minimisation']);
  assert.equal(result.decision,'BLOCKED'); assert.equal(result.pass,false); assert.match(result.feedback,/safety|policy|approved/i);
});
test('Lesson 1.5 physical strong wording with removing passes',async()=>{
  const result=await assess('1-5','Use approved Copilot after removing names, account numbers and contact details. Include only coaching details needed to find themes.',['approved-system','data-minimisation']);
  assert.equal(result.decision,'PASS'); assert.equal(result.pass,true);
});
test('Lesson 4.2 physical strong wording with will not passes',async()=>{
  const ids=rubrics['4-2'].requiredMeanings.map(x=>x.id);
  const result=await assess('4-2','I will not upload the file. I’ll check the approved-tool register and confirm the information-handling and access rules first.',ids);
  assert.equal(result.decision,'PASS'); assert.equal(result.pass,true);
});
test('Lesson 4.2 physical behavioural set preserves intended boundaries',async()=>{
  const ids=rubrics['4-2'].requiredMeanings.map(x=>x.id);
  const cases=[
    ['I won’t upload the customer file. I’ll confirm the AI system is approved for this information and check the privacy, handling and access rules first.','PASS',true],
    ['I can’t upload that file to a public AI site. I need to check which tools are approved and how the customer information can be handled.','PASS',true],
    ['I won’t upload it until I check whether the tool is approved.','CLARIFY',false],
    ['I’ll hold the file and contact the policy owner. They must confirm the website and its access controls are approved for customer lending information.','PASS',true],
    ['I’ll upload the file to get the summary done, then delete it from the website.','BLOCKED',false],
    ['To meet the deadline, I’ll use the public AI website for a limited test and remove the customer file immediately after producing the summary.','BLOCKED',false],
    ['Do not upload. Verify tool approval, data classification, permitted use and access controls first.','PASS',true],
    ['i wont uplod it check the ai is aproved and confirm the customer info handling and acess rules first','PASS',true],
    ['I’ll upload the full customer file to the public AI website now and confirm approval afterwards.','BLOCKED',false]
  ];
  for(const [response,decision,pass] of cases){
    const result=await assess('4-2',response,ids);
    assert.equal(result.decision,decision,response); assert.equal(result.pass,pass,response);
  }
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
