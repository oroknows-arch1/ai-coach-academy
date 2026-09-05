const test = require('node:test');
const assert = require('node:assert/strict');
const scorer = require('../semantic-response-scorer.js');
const rubrics = require('../lesson-rubrics.js');

let activeRubric;
function embedFor(foundIds = []) {
  return async texts => {
    const all = [...activeRubric.requiredMeanings, ...activeRubric.supportingMeanings];
    const exampleOwner = new Map(all.flatMap((meaning, index) => meaning.examples.map(example => [example, index])));
    return texts.map(text => {
      const vector = Array(all.length).fill(0);
      if (exampleOwner.has(text)) vector[exampleOwner.get(text)] = 1;
      else foundIds.forEach(id => {
        const index = all.findIndex(item => item.id === id);
        if (index >= 0) vector[index] = 0.7;
      });
      return vector;
    });
  };
}

async function assess(lessonId, response, foundIds = []) {
  activeRubric = rubrics[lessonId];
  return scorer.assess({
    lessonId,
    response,
    rubric: activeRubric,
    embed: embedFor(foundIds)
  });
}

test('polished wording cannot make personal public-AI handling safe', async () => {
  const result = await assess(
    '1-5',
    'For efficiency, use personal ChatGPT to prepare a professional summary. Paste customer details so the answer has enough context, then mark the result confidential.',
    ['approved-system', 'data-minimisation']
  );
  assert.equal(result.decision, 'BLOCKED');
  assert.equal(result.pass, false);
  assert.ok(result.triggeredRiskRules.length > 0);
});

test('paraphrased personal-AI upload cannot pass on semantic similarity', async () => {
  const result = await assess(
    '1-5',
    'Use my own ChatGPT account to draft this. Copy the raw customer details into the prompt for context, then strip identifiers from the output.',
    ['approved-system', 'data-minimisation']
  );
  assert.equal(result.decision, 'BLOCKED');
  assert.equal(result.pass, false);
  assert.ok(result.triggeredRiskRules.length > 0 || result.contradictions.length > 0);
});

test('explicit safe privacy negation is not misread as an unsafe upload', async () => {
  const result = await assess(
    '1-5',
    'Use the approved workplace AI system. Do not paste customer details. Remove names, account numbers and contact details first, then use only the coaching information needed.',
    ['approved-system', 'data-minimisation']
  );
  assert.equal(result.decision, 'PASS');
  assert.equal(result.pass, true);
});

test('permission-bypass language remains blocked even when safe meanings are present', async () => {
  const ids = rubrics['4-2'].requiredMeanings.map(item => item.id);
  const result = await assess(
    '4-2',
    'I would confirm the policy and access rules, but if approval takes too long I would hide it from compliance and use the tool for the task.',
    ids
  );
  assert.equal(result.decision, 'BLOCKED');
  assert.equal(result.pass, false);
  assert.ok(result.triggeredRiskRules.some(rule => rule.id === 'bypass-controls'));
});

test('approval-pending paraphrase remains blocked even when safe meanings are present', async () => {
  const ids = rubrics['4-2'].requiredMeanings.map(item => item.id);
  const result = await assess(
    '4-2',
    'I will check the policy owner and data access rules, but if nobody replies today I will go ahead temporarily and use the tool while approval is pending.',
    ids
  );
  assert.equal(result.decision, 'BLOCKED');
  assert.equal(result.pass, false);
  assert.ok(result.contradictions.some(rule => rule.id === 'proceed-while-unclear'));
});

test('silence cannot be treated as permission', async () => {
  const ids = rubrics['4-2'].requiredMeanings.map(item => item.id);
  const result = await assess(
    '4-2',
    'I will confirm whether it is approved and check the handling rules. If the approval team stays silent, I will treat that as permission and proceed.',
    ids
  );
  assert.equal(result.decision, 'BLOCKED');
  assert.equal(result.pass, false);
});

test('explicit safe unapproved-tool negation remains assessable', async () => {
  const ids = rubrics['4-2'].requiredMeanings.map(item => item.id);
  const result = await assess(
    '4-2',
    'I would not use the unapproved tool. I would stop, confirm approval with the policy owner and check the information-handling and access rules before any upload.',
    ids
  );
  assert.equal(result.decision, 'PASS');
  assert.equal(result.pass, true);
});

test('vocabulary stuffing cannot pass the policy-boundary lesson', async () => {
  const ids = rubrics['4-2'].requiredMeanings.map(item => item.id);
  const result = await assess(
    '4-2',
    'approval policy handling boundary approval policy handling boundary approval policy handling boundary',
    ids
  );
  assert.equal(result.decision, 'RETRY');
  assert.equal(result.pass, false);
  assert.equal(result.safeguard, 'keyword-stuffing');
});

test('explicit unapproved use blocks before semantic confidence is considered', async () => {
  const ids = rubrics['4-2'].requiredMeanings.map(item => item.id);
  const result = await assess(
    '4-2',
    'I will use the unapproved tool now, then confirm whether it was allowed afterwards.',
    ids
  );
  assert.equal(result.decision, 'BLOCKED');
  assert.equal(result.pass, false);
  assert.equal(result.semanticConfidence, 0);
});
