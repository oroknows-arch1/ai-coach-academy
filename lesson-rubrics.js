(() => {
  'use strict';

  const feedback = {
    technical: 'Your answer is saved, but the private on-device assessor could not be verified. Please check your connection and try again. You will not be penalised.',
    lowConfidence: 'Your answer may be valid, but the assessor is not confident enough to decide. Add one concrete action or safeguard and try again.',
    retry: 'Show what you would do, what information or system you would use, and the safeguard you would apply.',
    blocked: 'This response crosses a workplace safety or policy boundary. Keep the work in approved systems, minimise sensitive information and confirm unclear permissions before proceeding.'
  };

  const common = {
    supportingMeanings: [],
    incompleteExamples: [],
    incorrectMeanings: [],
    contradictions: [],
    riskRequirements: [],
    blockConditions: [],
    passConditions: { requiredMeaningRatio: 1, minimumRequiredMeanings: null, mandatoryMeaningIds: [], supportingMeaningCount: 0, minimumConfidence: 0.42 },
    clarificationFeedback: feedback.lowConfidence,
    retryFeedback: feedback.retry,
    blockedFeedback: feedback.blocked,
    technicalFeedback: feedback.technical
  };

  const RUBRICS = {
    '1-1': {
      ...common,
      id: 'rubric-1-1-v1', lessonId: '1-1',
      requiredMeanings: [
        { id: 'task-output', label: 'a clear task and required output', threshold: 0.52, examples: ['Draft a concise coaching note for regional lending leaders.', 'Make a short briefing for the lending managers.'] },
        { id: 'approved-source', label: 'a workplace source or context is identified', threshold: 0.38, examples: ['Use only the approved quality report.', 'Base it on the authorised quality results provided.', 'Use notes from our previous shadow sessions.', 'Taking notes from past coaching sessions, prepare the follow-up.'] },
        { id: 'boundary', label: 'a boundary limits invention or unsupported claims', threshold: 0.37, examples: ['Do not invent causes and flag anything the report does not support.', 'Separate evidence from assumptions and leave unknowns marked.'] },
        { id: 'verification', label: 'important output will be checked by a person', threshold: 0.45, examples: ['List the claims I must verify before sharing.', 'I will compare key points with the source before sending it.'] }
      ],
      supportingMeanings: [{ id: 'audience-tone', label: 'audience or useful format', examples: ['Use a professional tone and headings for regional leaders.', 'Keep it brief and practical for the managers.'] }],
      validExpressionExamples: [
        'Using the approved quality report, draft a short coaching note for regional leaders. Do not guess why issues happened. Flag unsupported points and show what I need to check before sharing.',
        'Can you make the managers a brief from our authorised report only? Keep facts separate from assumptions and I will check the important claims against the report.'
      ],
      incompleteExamples: ['Write a coaching note about the report.', 'Summarise this and make it sound professional.'],
      incorrectMeanings: ['Confidence or professional tone makes verification unnecessary.'],
      contradictions: [{ id: 'trust-without-checking', patterns: ['trust it without checking', 'no need to verify', 'do not need to check', 'assume it is correct'] }],
      blockConditions: [],
      passConditions: { requiredMeaningRatio: 1, minimumRequiredMeanings: 2, mandatoryMeaningIds: ['task-output'], supportingMeaningCount: 0, minimumConfidence: 0.42 },
      clarificationFeedback: 'Your request is on the right track. Add what information Copilot should use and what you will check before using the result.',
      sufficientFeedback: 'Good. Your request is clear. You could make it stronger by saying what information Copilot should use and what you will check before sending the email.'
    },
    '1-5': {
      ...common,
      id: 'rubric-1-5-v1', lessonId: '1-5',
      requiredMeanings: [
        { id: 'approved-system', label: 'use an approved workplace system', examples: ['Keep the task inside an approved organisational AI system.', 'Use only the company-approved Copilot environment.'] },
        { id: 'data-minimisation', label: 'remove unnecessary personal or sensitive information', examples: ['Remove customer names and account numbers before using the examples.', 'Share only de-identified details needed for the coaching summary.'] },
        { id: 'handling-rules', label: 'follow access and information-handling rules', examples: ['Respect existing access controls and handling policy.', 'Confirm the material is allowed in that system before use.'] }
      ],
      supportingMeanings: [{ id: 'human-check', label: 'human review before use', examples: ['Review the draft before sharing it.', 'A coach checks the result against the safe source.'] }],
      validExpressionExamples: ['In approved Copilot, use de-identified examples with names and account references removed. Include only what is needed, follow access rules and review the summary before sharing.'],
      incompleteExamples: ['Take the names out and ask AI.', 'Mark it confidential in the prompt.'],
      incorrectMeanings: ['A confidentiality instruction makes an unapproved tool safe.', 'Sensitive data can be removed after it is uploaded.'],
      contradictions: [{ id: 'upload-then-remove', patterns: ['paste everything first', 'upload everything first', 'remove sensitive details later'] }],
      riskRequirements: ['approved-system', 'data-minimisation', 'handling-rules'],
      blockConditions: [
        { id: 'unapproved-tool', patterns: ['any ai tool', 'personal chatgpt', 'public ai', 'unapproved tool', 'tool is not approved', 'not approved but'] },
        { id: 'sensitive-upload', patterns: ['include customer names', 'include account numbers', 'paste customer details', 'upload customer details', 'full customer file'] }
      ]
    },
    '4-2': {
      ...common,
      id: 'rubric-4-2-v1', lessonId: '4-2',
      requiredMeanings: [
        { id: 'stop', label: 'do not use the tool while approval is unclear', examples: ['I would not upload the lending material yet.', 'Pause the request and do not test the unknown tool.'] },
        { id: 'confirm-approval', label: 'confirm whether the tool and use are approved', examples: ['Check the approved-tool register or ask the responsible policy owner.', 'Confirm the tool is authorised for this type of information.'] },
        { id: 'handling-boundary', label: 'confirm information handling and access boundaries', examples: ['Check whether sensitive lending information is permitted and who may access it.', 'Follow policy and access controls before moving any material.'] }
      ],
      supportingMeanings: [{ id: 'safe-alternative', label: 'offer an approved alternative', examples: ['Use the approved internal system instead.', 'Offer a de-identified example in an authorised tool once permitted.'] }],
      validExpressionExamples: ['I would stop and not upload the file. I would check the approved-tool register and confirm the information-handling and access rules with the policy owner, then use an approved alternative if needed.'],
      incompleteExamples: ['I would ask whether it is approved.', 'I would remove the filename and test it.'],
      incorrectMeanings: ['A small test in an unapproved tool is acceptable.', 'Removing the filename removes the policy risk.'],
      contradictions: [{ id: 'proceed-while-unclear', patterns: ['test it first', 'small test', 'try it anyway', 'proceed while', 'use it until told not to', 'remove the file name and proceed'] }],
      riskRequirements: ['stop', 'confirm-approval', 'handling-boundary'],
      blockConditions: [
        { id: 'explicit-unapproved-use', patterns: ['use the unapproved tool', 'upload to the unapproved tool', 'send it to the tool anyway', 'use it even though it is not approved'] },
        { id: 'bypass-controls', patterns: ['bypass access', 'get around policy', 'avoid the policy', 'hide it from compliance'] }
      ]
    }
  };

  if (typeof window !== 'undefined') window.ACADEMY_LESSON_RUBRICS = RUBRICS;
  if (typeof module !== 'undefined') module.exports = RUBRICS;
})();
