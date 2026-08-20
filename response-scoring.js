(() => {
  'use strict';

  // Formative checks should recognise a useful workplace response, not demand
  // specific Academy vocabulary. This lightweight scorer rewards substance
  // across four dimensions while keeping the final understanding check as the
  // explicit knowledge confirmation.
  window.ACADEMY_SCORE_RESPONSE = function scoreAcademyResponse(value) {
    const text = String(value || '').trim();
    const words = text.match(/[A-Za-z0-9'-]+/g) || [];

    const dimensions = {
      task: /\b(email|note|draft|prepare|write|follow[- ]?up|message|summary|plan|clarif\w*|coach\w*|session)\b/i.test(text),
      context: /\b(note\w*|shadow\w*|session\w*|report\w*|polic(?:y|ies)|procedure\w*|customer\w*|lender\w*|source\w*|approved|evidence|past|previous)\b/i.test(text),
      outcome: /\b(result\w*|outcome\w*|improv\w*|independent\w*|knowledge|understand\w*|communicat\w*|service|start\w*|clos\w*|measure\w*|success\w*)\b/i.test(text),
      judgement: /\b(verify|check\w*|review\w*|confirm\w*|boundar\w*|trusted|human|independent\w*|coach\w*|polic(?:y|ies)|without|before|after)\b/i.test(text)
    };

    let score = 0;
    if (words.length >= 18) score += 1;
    if (words.length >= 35) score += 1;
    score += Object.values(dimensions).filter(Boolean).length;

    return {
      pass: words.length >= 18 && score >= 4,
      score,
      wordCount: words.length,
      dimensions
    };
  };
})();
