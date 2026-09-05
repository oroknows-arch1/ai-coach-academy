(() => {
  'use strict';

  const DECISIONS = Object.freeze({ PASS:'PASS', PASS_WITH_FEEDBACK:'PASS WITH FEEDBACK', CLARIFY:'CLARIFY', RETRY:'RETRY', BLOCKED:'BLOCKED' });
  const clean = value => String(value || '').toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z0-9' -]+/g, ' ').replace(/\s+/g, ' ').trim();
  const cosine = (a,b) => a.reduce((sum,v,i)=>sum+(v*(b[i]||0)),0);
  const SAFE_NEGATION_PREFIX = /\b(?:do not|don't|would not|wouldn't|will not|won't|should not|shouldn't|must not|mustn't|cannot|can't|never)\s*$/;
  function containsPattern(text, patterns=[]) {
    for (const pattern of patterns) {
      const target = clean(pattern);
      if (!target) continue;
      let from = 0;
      while (from <= text.length) {
        const index = text.indexOf(target, from);
        if (index < 0) break;
        const before = text.slice(Math.max(0, index - 32), index);
        if (!SAFE_NEGATION_PREFIX.test(before)) return pattern;
        from = index + target.length;
      }
    }
    return null;
  }
  const missingFeedback = (rubric, missing, opening='Good. Your request is clear.') => {
    const suggestions=missing.map(item=>rubric.meaningFeedback?.[item.id] || `Add ${item.label}.`);
    return suggestions.length ? `${opening} ${suggestions.join(' ')}` : opening;
  };

  function explicitMeaningMatch(text, meaning) {
    const normalized=clean(text);
    for (const pattern of meaning.explicitPatterns || []) {
      if (pattern instanceof RegExp ? pattern.test(normalized) : normalized.includes(clean(pattern))) return String(pattern);
    }
    return null;
  }

  function keywordStuffing(text, rubric) {
    const words = clean(text).split(' ').filter(Boolean);
    if (words.length < 5) return false;
    const unique = new Set(words);
    const requiredLabels = clean(rubric.requiredMeanings.map(x=>x.label).join(' ')).split(' ');
    const allLabels = clean([...rubric.requiredMeanings, ...(rubric.supportingMeanings || [])].map(x=>x.label).join(' ')).split(' ');
    const requiredLabelSet = new Set(requiredLabels);
    const allLabelSet = new Set(allLabels);
    const requiredLabelHits = words.filter(w=>requiredLabelSet.has(w)).length;
    const allLabelHits = words.filter(w=>allLabelSet.has(w)).length;
    const startsAsAction = /^(?:please\s+)?(?:i\b|we\b|use\b|remove\b|strip\b|keep\b|check\b|confirm\b|stop\b|pause\b|hold\b|draft\b|write\b|create\b|make\b|summari[sz]e\b|review\b|share\b|send\b|upload\b|include\b|identify\b|prepare\b)/i.test(String(text || '').trim());
    const labelEcho = words.length <= 24 && (allLabelHits / words.length) >= 0.78 && !/[.!?;:]/.test(text) && !startsAsAction;
    return unique.size / words.length < 0.56 || labelEcho || (requiredLabelHits / words.length > 0.65 && !/[.!?]|\b(i|we|would|will|before|because|so|then|using|use)\b/i.test(text));
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
      const evidence=scores.get(meaning.id), explicitMatch=explicitMeaningMatch(original,meaning);
      const semanticMatch=evidence.score>=(meaning.threshold ?? rubric.passConditions.minimumConfidence);
      const detected=meaning.explicitRequired ? !!explicitMatch : semanticMatch || !!explicitMatch;
      if(detected){
        const confidence=explicitMatch ? Math.max(evidence.score,0.99) : evidence.score;
        base.detectedMeanings.push({id:meaning.id,label:meaning.label,confidence});
        base.evidenceSpans.push({meaningId:meaning.id,responseEvidence:explicitMatch?original:evidence.responseEvidence,matchedExample:explicitMatch||evidence.example,confidence});
      }
    }
    const requiredIds=new Set(rubric.requiredMeanings.map(x=>x.id));
    base.requiredConceptsFound=base.detectedMeanings.filter(x=>requiredIds.has(x.id)).map(x=>x.id);
    base.missingConcepts=rubric.requiredMeanings.filter(x=>!base.requiredConceptsFound.includes(x.id)).map(x=>({id:x.id,label:x.label}));
    base.semanticConfidence=base.detectedMeanings.length ? Math.min(...base.detectedMeanings.filter(x=>requiredIds.has(x.id)).map(x=>x.confidence).concat([1])) : 0;
    const ratio=base.requiredConceptsFound.length/rubric.requiredMeanings.length;
    const mandatory=(rubric.passConditions.mandatoryMeaningIds || []).every(id=>base.requiredConceptsFound.includes(id));
    const minimum=rubric.passConditions.minimumRequiredMeanings ?? rubric.requiredMeanings.length;
    if(ratio===1){
      return {...base,decision:DECISIONS.PASS,pass:true,feedback:rubric.successFeedback || 'Good. Your response covers the actions needed for this task.'};
    }
    if(mandatory && base.requiredConceptsFound.length>=minimum) return {...base,decision:DECISIONS.PASS_WITH_FEEDBACK,pass:true,feedback:missingFeedback(rubric,base.missingConcepts)};
    if((rubric.passConditions.mandatoryMeaningIds || []).length && mandatory) return {...base,decision:DECISIONS.CLARIFY,pass:false,feedback:missingFeedback(rubric,base.missingConcepts,'You are on the right track.')};
    if(ratio>=0.5) return {...base,decision:DECISIONS.CLARIFY,pass:false,feedback:missingFeedback(rubric,base.missingConcepts,'You are close.')};
    return {...base,decision:DECISIONS.RETRY,pass:false,feedback:rubric.retryFeedback};
  }

  const api={ assess, DECISIONS, _test:{clean,cosine,containsPattern,keywordStuffing,explicitMeaningMatch} };
  if(typeof window!=='undefined')window.ACADEMY_SEMANTIC_SCORER=api;
  if(typeof module!=='undefined')module.exports=api;
})();
