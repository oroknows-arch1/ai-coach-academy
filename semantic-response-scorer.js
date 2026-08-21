(() => {
  'use strict';

  const DECISIONS = Object.freeze({ PASS:'PASS', PASS_WITH_FEEDBACK:'PASS WITH FEEDBACK', CLARIFY:'CLARIFY', RETRY:'RETRY', BLOCKED:'BLOCKED' });
  const clean = value => String(value || '').toLowerCase().replace(/[^a-z0-9' -]+/g, ' ').replace(/\s+/g, ' ').trim();
  const cosine = (a,b) => a.reduce((sum,v,i)=>sum+(v*(b[i]||0)),0);
  const containsPattern = (text, patterns=[]) => patterns.find(pattern => text.includes(clean(pattern))) || null;

  function keywordStuffing(text, rubric) {
    const words = clean(text).split(' ').filter(Boolean);
    if (words.length < 5) return false;
    const unique = new Set(words);
    const labels = clean(rubric.requiredMeanings.map(x=>x.label).join(' ')).split(' ');
    const labelSet = new Set(labels);
    const labelHits = words.filter(w=>labelSet.has(w)).length;
    return unique.size / words.length < 0.48 || (labelHits / words.length > 0.72 && !/[.!?]|\b(i|we|would|will|before|because|so|then|using|use)\b/i.test(text));
  }

  async function assess({ lessonId, response, rubric, embed }) {
    const original = String(response || '').trim();
    const text = clean(original);
    const base = { lessonId, rubricId:rubric?.id || null, response:original, detectedMeanings:[], evidenceSpans:[], requiredConceptsFound:[], missingConcepts:[], contradictions:[], semanticConfidence:0, triggeredRiskRules:[], modelStatus:'ready' };
    if (!rubric) return { ...base, decision:DECISIONS.RETRY, pass:false, feedback:'This lesson does not yet have a semantic rubric.' };
    if (!text) return { ...base, decision:DECISIONS.RETRY, pass:false, feedback:rubric.retryFeedback };

    for (const rule of rubric.blockConditions || []) {
      const match = containsPattern(text, rule.patterns);
      if (match) base.triggeredRiskRules.push({ id:rule.id, match });
    }
    for (const rule of rubric.contradictions || []) {
      const match = containsPattern(text, rule.patterns);
      if (match) base.contradictions.push({ id:rule.id, match });
    }
    if (base.triggeredRiskRules.length || base.contradictions.length) {
      return { ...base, decision:DECISIONS.BLOCKED, pass:false, feedback:rubric.blockedFeedback };
    }
    if (keywordStuffing(original, rubric)) return { ...base, decision:DECISIONS.RETRY, pass:false, feedback:rubric.retryFeedback, safeguard:'keyword-stuffing' };

    const meanings = [...rubric.requiredMeanings, ...(rubric.supportingMeanings || [])];
    const examples = meanings.flatMap(m=>m.examples.map(example=>({ meaning:m, example })));
    const responseSegments = original.split(/(?<=[.!?])\s+|[;\n]+/).map(x=>x.trim()).filter(x=>x.length>=8);
    const candidates = [original, ...responseSegments.filter(x=>x!==original)];
    let vectors;
    try { vectors = await embed([...candidates, ...examples.map(x=>x.example)]); }
    catch (error) {
      return { ...base, decision:DECISIONS.RETRY, pass:false, feedback:rubric.technicalFeedback, modelStatus:'failed', technicalError:String(error?.message || error) };
    }
    if (!vectors?.length || vectors.length !== examples.length + candidates.length) return { ...base, decision:DECISIONS.RETRY, pass:false, feedback:rubric.technicalFeedback, modelStatus:'failed', technicalError:'Invalid embedding output' };

    const scores = new Map(meanings.map(m=>[m.id,{ score:-1, example:null }]));
    const answerVectors=vectors.slice(0,candidates.length), exampleVectors=vectors.slice(candidates.length);
    examples.forEach((item,index)=>answerVectors.forEach((answerVector,candidateIndex)=>{ const score=cosine(answerVector,exampleVectors[index]); if(score>scores.get(item.meaning.id).score)scores.set(item.meaning.id,{score,example:item.example,responseEvidence:candidates[candidateIndex]}); }));
    base.meaningScores=[...scores].map(([id,evidence])=>({id,...evidence}));
    for (const meaning of meanings) {
      const evidence=scores.get(meaning.id), detected=evidence.score>=(meaning.threshold ?? rubric.passConditions.minimumConfidence);
      if(detected){base.detectedMeanings.push({id:meaning.id,label:meaning.label,confidence:evidence.score});base.evidenceSpans.push({meaningId:meaning.id,responseEvidence:evidence.responseEvidence,matchedExample:evidence.example,confidence:evidence.score});}
    }
    const requiredIds=new Set(rubric.requiredMeanings.map(x=>x.id));
    base.requiredConceptsFound=base.detectedMeanings.filter(x=>requiredIds.has(x.id)).map(x=>x.id);
    base.missingConcepts=rubric.requiredMeanings.filter(x=>!base.requiredConceptsFound.includes(x.id)).map(x=>({id:x.id,label:x.label}));
    base.semanticConfidence=base.detectedMeanings.length ? Math.min(...base.detectedMeanings.filter(x=>requiredIds.has(x.id)).map(x=>x.confidence).concat([1])) : 0;
    const ratio=base.requiredConceptsFound.length/rubric.requiredMeanings.length;
    const supporting=base.detectedMeanings.filter(x=>!requiredIds.has(x.id)).length;
    if(ratio===1){
      const decision=supporting>0?DECISIONS.PASS:DECISIONS.PASS_WITH_FEEDBACK;
      return {...base,decision,pass:true,feedback:decision===DECISIONS.PASS?'Your response shows the required meaning and keeps the key safeguards visible.':'Your response meets the core requirement. Consider adding the audience, format or human review detail to make it easier to use.'};
    }
    if(ratio>=0.5) return {...base,decision:DECISIONS.CLARIFY,pass:false,feedback:`You are close. Clarify: ${base.missingConcepts.map(x=>x.label).join('; ')}.`};
    return {...base,decision:DECISIONS.RETRY,pass:false,feedback:rubric.retryFeedback};
  }

  const api={ assess, DECISIONS, _test:{clean,cosine,keywordStuffing} };
  if(typeof window!=='undefined')window.ACADEMY_SEMANTIC_SCORER=api;
  if(typeof module!=='undefined')module.exports=api;
})();
