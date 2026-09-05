import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pipeline, env } from '@huggingface/transformers';

const require = createRequire(import.meta.url);
const scorer = require('../semantic-response-scorer.js');
const rubrics = require('../lesson-rubrics.js');

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';
const MODEL_OPTIONS = { dtype: 'q8', device: 'wasm' };
const OUT_DIR = path.resolve('artifacts');
const PASS_LIKE = new Set(['PASS', 'PASS WITH FEEDBACK']);

const matrix = [
  // Lesson 1.1 — Prompting structure
  { lesson:'1-1', inputType:'professional wording', expected:['PASS','PASS WITH FEEDBACK'], response:'Using only the approved monthly quality report, draft a short coaching note for regional leaders explaining the two issues and expected improvement. Show me the draft so I can check the key details against the report before sharing.' },
  { lesson:'1-1', inputType:'casual wording', expected:['PASS','PASS WITH FEEDBACK'], response:'Use the approved quality report and knock up a short note for the regional leaders about the two issues and what needs to improve. Give it back to me so I can check it against the report before I send it.' },
  { lesson:'1-1', inputType:'short valid answer', expected:['PASS','PASS WITH FEEDBACK'], response:'Draft the regional coaching note from the approved report; I will check it before sharing.' },
  { lesson:'1-1', inputType:'long valid answer', expected:['PASS'], response:'Create a short coaching note for regional lending leaders using only the approved monthly quality report. Explain that staff are not fully identifying customer needs and are relying on coaches to find guidance, then state the improvement expected. Do not invent causes or add unsupported facts. Return the draft to me so I can compare the important statements with the report before anything is shared.' },
  { lesson:'1-1', inputType:'spelling / grammar noise', expected:['PASS','PASS WITH FEEDBACK','CLARIFY'], response:'use aproved qualty report make short coaching note for regional leaders on the 2 issues and improvement i will chek it aganst report before sharing' },
  { lesson:'1-1', inputType:'voice-to-text wording', expected:['PASS','PASS WITH FEEDBACK','CLARIFY'], response:'okay so use the approved report make a short coaching note for regional leaders about the two issues what needs to improve and then give me the draft I will check it before it goes out' },
  { lesson:'1-1', inputType:'indirect phrasing', expected:['PASS','PASS WITH FEEDBACK','CLARIFY'], response:'Regional leaders need the two confirmed concerns and the expected improvement in a brief. The monthly quality report is the source. Nothing goes out until I compare the draft with that report.' },
  { lesson:'1-1', inputType:'industry terminology', expected:['PASS','PASS WITH FEEDBACK'], response:'From the approved QA report, draft a regional lending coaching brief on needs discovery and coach dependency, with the expected lift in independent guidance. I will reconcile the draft to the QA report before circulation.' },
  { lesson:'1-1', inputType:'EAL phrasing', expected:['PASS','PASS WITH FEEDBACK','CLARIFY'], response:'Please make short coaching note for regional leaders using approved quality report. Explain two problem and improvement. I check with report before share.' },
  { lesson:'1-1', inputType:'concise expert response', expected:['PASS','PASS WITH FEEDBACK'], response:'Approved QA report only → regional coaching note on both gaps + expected standard; return draft for source check before release.' },
  { lesson:'1-1', inputType:'keyword stuffing', expected:['RETRY'], response:'task output approved source verification task output approved source verification task output approved source verification' },
  { lesson:'1-1', inputType:'copied labels without meaning', expected:['RETRY'], response:'a clear task required output approved quality report result checked before sharing' },
  { lesson:'1-1', inputType:'confident incorrect answer', expected:['RETRY','BLOCKED'], response:'Write a polished coaching note from whatever information seems useful. If details are missing, make them up so the note sounds complete and decisive.' },
  { lesson:'1-1', inputType:'contradiction', expected:['BLOCKED'], response:'Draft the coaching note from the approved report, but there is no need to verify it before sending.' },
  { lesson:'1-1', inputType:'irrelevant verbosity', expected:['RETRY','CLARIFY'], response:'Leadership communication matters because people are busy and different regions have different pressures. A useful message should feel confident, modern and motivating, and it should help everyone feel aligned with the broader strategy and culture.' },
  { lesson:'1-1', inputType:'incomplete answer', expected:['CLARIFY','RETRY'], response:'Write a short coaching note for regional leaders.' },
  { lesson:'1-1', inputType:'ambiguous answer', expected:['CLARIFY'], response:'Write the regional coaching note and make sure it is right before it goes out.' },
  { lesson:'1-1', inputType:'unsafe / compliance-breaking answer', expected:['BLOCKED'], response:'Use any information you can find to write a convincing coaching note. Fill in any missing details and send the final version directly to the regional leaders.' },

  // Lesson 1.5 — Privacy / approved systems
  { lesson:'1-5', inputType:'professional wording', expected:['PASS','PASS WITH FEEDBACK'], response:'In the approved workplace AI system, identify common coaching themes using de-identified examples. Remove customer names, account numbers, contact details and include only the coaching information needed for the task.' },
  { lesson:'1-5', inputType:'casual wording', expected:['PASS','PASS WITH FEEDBACK'], response:'Keep it in our approved work AI, strip out names, account numbers and contact stuff first, then only use the bits needed to find the coaching themes.' },
  { lesson:'1-5', inputType:'short valid answer', expected:['PASS','PASS WITH FEEDBACK'], response:'Approved work AI only; de-identify the examples and use only what is needed for the themes.' },
  { lesson:'1-5', inputType:'long valid answer', expected:['PASS'], response:'Use only the approved workplace AI system. Before the task enters AI, remove customer names, account numbers, contact details and any other identifying information. Keep only the coaching information required to identify common themes, follow existing access rules and review the draft before it is shared.' },
  { lesson:'1-5', inputType:'spelling / grammar noise', expected:['PASS','PASS WITH FEEDBACK','CLARIFY'], response:'use aproved work ai remove customer names acount numbers and contact details only use coaching info needed for themes' },
  { lesson:'1-5', inputType:'voice-to-text wording', expected:['PASS','PASS WITH FEEDBACK','CLARIFY'], response:'use the approved workplace system first take out customer names account numbers contact details anything identifying and only use the coaching bits needed to find the themes' },
  { lesson:'1-5', inputType:'indirect phrasing', expected:['PASS','PASS WITH FEEDBACK','CLARIFY'], response:'The customers do not need to be identifiable for this analysis. The theme task stays inside the company-approved AI environment, with only the minimum coaching details retained.' },
  { lesson:'1-5', inputType:'industry terminology', expected:['PASS','PASS WITH FEEDBACK'], response:'Use the approved M365 Copilot tenant with de-identified coaching cases; strip PII and account identifiers and limit the prompt to the minimum data required for thematic analysis.' },
  { lesson:'1-5', inputType:'EAL phrasing', expected:['PASS','PASS WITH FEEDBACK','CLARIFY'], response:'Use approved company AI. Before use remove customer name account number contact detail. Keep only coaching detail need for find themes.' },
  { lesson:'1-5', inputType:'concise expert response', expected:['PASS','PASS WITH FEEDBACK'], response:'Approved Copilot; de-ID PII first; minimum coaching data only.' },
  { lesson:'1-5', inputType:'keyword stuffing', expected:['RETRY'], response:'approved system data minimisation approved system data minimisation approved system data minimisation' },
  { lesson:'1-5', inputType:'copied labels without meaning', expected:['RETRY'], response:'approved workplace system unnecessary personal sensitive information handling rules human check' },
  { lesson:'1-5', inputType:'confident incorrect answer', expected:['BLOCKED'], response:'Use any AI tool, upload the full customer file and call it confidential so the model has complete context.' },
  { lesson:'1-5', inputType:'contradiction', expected:['BLOCKED'], response:'Upload everything first and remove sensitive details later once the summary is finished.' },
  { lesson:'1-5', inputType:'irrelevant verbosity', expected:['RETRY','CLARIFY'], response:'Customer service teams are under pressure and coaching quality varies between regions. Better communication, stronger leadership and clearer performance expectations can help people improve over time.' },
  { lesson:'1-5', inputType:'incomplete answer', expected:['CLARIFY','RETRY'], response:'Use the approved workplace AI to identify the coaching themes.' },
  { lesson:'1-5', inputType:'ambiguous answer', expected:['CLARIFY'], response:'Use the approved workplace AI and make the customer information safer before identifying the coaching themes.' },
  { lesson:'1-5', inputType:'unsafe / compliance-breaking answer', expected:['BLOCKED'], response:'For efficiency, use personal ChatGPT to prepare a professional summary. Paste customer details so the answer has enough context, then mark the result confidential.' },

  // Lesson 4.2 — Policy / approved-tool boundaries
  { lesson:'4-2', inputType:'professional wording', expected:['PASS','PASS WITH FEEDBACK'], response:'Do not upload the lending material. Check the approved-tool register or policy owner and confirm the information-handling and access rules before any use.' },
  { lesson:'4-2', inputType:'casual wording', expected:['PASS','PASS WITH FEEDBACK'], response:'Do not put it in there yet. I would check whether the tool is approved and what data and access rules apply before doing anything.' },
  { lesson:'4-2', inputType:'short valid answer', expected:['PASS','PASS WITH FEEDBACK'], response:'Stop. Confirm tool approval and lending-data handling and access rules before upload.' },
  { lesson:'4-2', inputType:'long valid answer', expected:['PASS'], response:'I would stop and not upload the sensitive lending material. I would check the approved-tool register or ask the responsible policy owner whether this AI tool is authorised for the task, then confirm the information-handling classification and who is allowed to access the material. Only after those permissions are clear would I use an approved option.' },
  { lesson:'4-2', inputType:'spelling / grammar noise', expected:['PASS','PASS WITH FEEDBACK','CLARIFY'], response:'dont upload yet chek tool approval and confirm info handling and who can access before use' },
  { lesson:'4-2', inputType:'voice-to-text wording', expected:['PASS','PASS WITH FEEDBACK','CLARIFY'], response:'no I would not upload it yet first check if the tool is on the approved list and then confirm whether this lending information is allowed there and who can access it' },
  { lesson:'4-2', inputType:'indirect phrasing', expected:['PASS','PASS WITH FEEDBACK','CLARIFY'], response:'Until authorisation and information-handling permissions are confirmed, the lending material stays where it is. I would verify the tool with the policy owner first.' },
  { lesson:'4-2', inputType:'industry terminology', expected:['PASS','PASS WITH FEEDBACK'], response:'Hold the payload. Validate the AI service against the approved-tool register and confirm data-classification, access-control and handling requirements before transfer.' },
  { lesson:'4-2', inputType:'EAL phrasing', expected:['PASS','PASS WITH FEEDBACK','CLARIFY'], response:'I not upload now. First check tool approved and check lending information allowed and who can access. Then only use when clear.' },
  { lesson:'4-2', inputType:'concise expert response', expected:['PASS','PASS WITH FEEDBACK'], response:'No upload until tool approval plus lending-data handling and access are confirmed.' },
  { lesson:'4-2', inputType:'keyword stuffing', expected:['RETRY'], response:'approval policy handling boundary approval policy handling boundary approval policy handling boundary' },
  { lesson:'4-2', inputType:'copied labels without meaning', expected:['RETRY'], response:'stop confirm approval handling boundary stop confirm approval handling boundary' },
  { lesson:'4-2', inputType:'confident incorrect answer', expected:['BLOCKED'], response:'I am confident the tool is safe, so I will use it for a small test and check approval later.' },
  { lesson:'4-2', inputType:'contradiction', expected:['BLOCKED'], response:'I will check the register, but I will use it until told not to.' },
  { lesson:'4-2', inputType:'irrelevant verbosity', expected:['RETRY','CLARIFY'], response:'New tools can make teams faster and more innovative. People should keep an open mind, experiment with technology and share lessons so the organisation can improve its digital capability.' },
  { lesson:'4-2', inputType:'incomplete answer', expected:['CLARIFY','RETRY'], response:'I would ask whether the tool is approved.' },
  { lesson:'4-2', inputType:'ambiguous answer', expected:['CLARIFY'], response:'I would pause and check the approval and handling rules before using it.' },
  { lesson:'4-2', inputType:'unsafe / compliance-breaking answer', expected:['BLOCKED'], response:'I would confirm the policy and access rules, but if approval takes too long I would hide it from compliance and use the tool for the task.' },

  // Additional adversarial focus beyond the preserved 54-case matrix.
  { lesson:'1-5', inputType:'adversarial — polished unsafe paraphrase', expected:['BLOCKED'], response:'Use my own ChatGPT account to draft this. Copy the raw customer details into the prompt for context, then strip identifiers from the output.' },
  { lesson:'1-5', inputType:'adversarial — explicit safe negation', expected:['PASS'], response:'Use the approved workplace AI system. Do not paste customer details. Remove names, account numbers and contact details first, then use only the coaching information needed.' },
  { lesson:'4-2', inputType:'adversarial — approval pending bypass', expected:['BLOCKED'], response:'I will check the policy owner and data access rules, but if nobody replies today I will go ahead temporarily and use the tool while approval is pending.' },
  { lesson:'4-2', inputType:'adversarial — silence as permission', expected:['BLOCKED'], response:'I will confirm whether it is approved and check the handling rules. If the approval team stays silent, I will treat that as permission and proceed.' },
  { lesson:'4-2', inputType:'adversarial — explicit safe negation', expected:['PASS'], response:'I would not use the unapproved tool. I would stop, confirm approval with the policy owner and check the information-handling and access rules before any upload.' }
];

if (matrix.filter(x => !x.inputType.startsWith('adversarial')).length !== 54) {
  throw new Error('Preserved matrix must contain exactly 54 core cases.');
}

fs.mkdirSync(OUT_DIR, { recursive: true });
env.allowLocalModels = false;
env.allowRemoteModels = true;
env.cacheDir = path.resolve('.cache/transformers');

const startedAt = new Date();
console.log(`Loading ${MODEL_ID} with Transformers.js using q8/WASM...`);
const extractor = await pipeline('feature-extraction', MODEL_ID, MODEL_OPTIONS);
const cache = new Map();

async function embed(texts) {
  const uniqueMissing = [...new Set(texts.filter(text => !cache.has(text)))];
  if (uniqueMissing.length) {
    const output = await extractor(uniqueMissing, { pooling: 'mean', normalize: true });
    const vectors = output.tolist();
    uniqueMissing.forEach((text, index) => cache.set(text, vectors[index]));
  }
  return texts.map(text => cache.get(text));
}

function expectedPassLike(expected) {
  return expected.some(value => PASS_LIKE.has(value));
}

function recommendation(testCase, result, expectedMatch) {
  if (expectedMatch) return '';
  if (testCase.expected.includes('BLOCKED') && result.decision !== 'BLOCKED') {
    return 'Inspect deterministic hard-rule or contradiction coverage. Do not lower semantic thresholds.';
  }
  if (expectedPassLike(testCase.expected) && !result.pass) {
    return 'Inspect rubric examples and evidence spans for false-retry behaviour; preserve safety boundaries and avoid threshold-only tuning.';
  }
  if (/keyword|copied labels/i.test(testCase.inputType) && result.pass) {
    return 'Strengthen the proposition / keyword-stuffing safeguard without penalising concise valid answers.';
  }
  return 'Inspect rubric semantics, hard rules and learner wording; make the smallest lawful correction and add a regression.';
}

const results = [];
for (const testCase of matrix) {
  const rubric = rubrics[testCase.lesson];
  const result = await scorer.assess({ lessonId:testCase.lesson, response:testCase.response, rubric, embed });
  const expectedMatch = testCase.expected.includes(result.decision);
  const safetyBoundaryMiss = testCase.expected.includes('BLOCKED') && result.decision !== 'BLOCKED';
  const falsePassRisk = result.pass && !expectedPassLike(testCase.expected);
  const falseRetryRisk = expectedPassLike(testCase.expected) && !result.pass && !testCase.expected.includes(result.decision);
  results.push({
    lesson: testCase.lesson,
    inputType: testCase.inputType,
    exactResponse: testCase.response,
    expectedResult: testCase.expected,
    actualResult: result.decision,
    confidenceEvidence: {
      semanticConfidence: result.semanticConfidence,
      modelStatus: result.modelStatus,
      requiredConceptsFound: result.requiredConceptsFound,
      missingConcepts: result.missingConcepts,
      evidenceSpans: result.evidenceSpans,
      triggeredRiskRules: result.triggeredRiskRules,
      contradictions: result.contradictions,
      safeguard: result.safeguard || null
    },
    classification: result.decision,
    learnerProgressUnlocks: result.pass === true,
    expectedMatch,
    safetyBoundaryMiss,
    falsePassRisk,
    falseRetryRisk,
    recommendedChange: recommendation(testCase, result, expectedMatch)
  });
  console.log(`${testCase.lesson} | ${testCase.inputType} | ${result.decision} | expected ${testCase.expected.join(' / ')}`);
}

const finishedAt = new Date();
const unexpected = results.filter(item => !item.expectedMatch);
const falsePasses = results.filter(item => item.falsePassRisk || item.safetyBoundaryMiss);
const falseRetries = results.filter(item => item.falseRetryRisk);
const payload = {
  schemaVersion: 1,
  model: { id:MODEL_ID, runtime:'@huggingface/transformers 3.7.2', dtype:'q8', device:'wasm' },
  startedAt: startedAt.toISOString(),
  finishedAt: finishedAt.toISOString(),
  durationMs: finishedAt - startedAt,
  coreCaseCount: 54,
  adversarialCaseCount: matrix.length - 54,
  totalCaseCount: matrix.length,
  summary: {
    expectedMatches: results.length - unexpected.length,
    unexpected: unexpected.length,
    falsePassOrSafetyBoundaryMisses: falsePasses.length,
    falseRetryRisks: falseRetries.length
  },
  results
};

fs.writeFileSync(path.join(OUT_DIR, 'real-model-semantic-matrix.json'), JSON.stringify(payload, null, 2));

const escapeCell = value => String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const lines = [
  '# Real-model semantic simulation matrix',
  '',
  `Model: \`${MODEL_ID}\` · Transformers.js 3.7.2 · q8 · WASM`,
  '',
  `Core cases: **54** · Additional adversarial cases: **${matrix.length - 54}** · Unexpected: **${unexpected.length}** · False-pass/safety misses: **${falsePasses.length}** · False-retry risks: **${falseRetries.length}**`,
  '',
  '| Lesson | Input type | Exact response | Expected | Actual | Confidence | Unlocks | False-pass risk | False-retry risk | Recommended change |',
  '|---|---|---|---|---|---:|---|---|---|---|'
];
for (const item of results) {
  lines.push(`| ${item.lesson} | ${escapeCell(item.inputType)} | ${escapeCell(item.exactResponse)} | ${item.expectedResult.join(' / ')} | ${item.actualResult} | ${Number(item.confidenceEvidence.semanticConfidence || 0).toFixed(3)} | ${item.learnerProgressUnlocks ? 'yes' : 'no'} | ${item.falsePassRisk || item.safetyBoundaryMiss ? 'YES' : 'no'} | ${item.falseRetryRisk ? 'YES' : 'no'} | ${escapeCell(item.recommendedChange)} |`);
}
fs.writeFileSync(path.join(OUT_DIR, 'real-model-semantic-matrix.md'), `${lines.join('\n')}\n`);

console.log(JSON.stringify(payload.summary));
if (unexpected.length) process.exitCode = 1;
