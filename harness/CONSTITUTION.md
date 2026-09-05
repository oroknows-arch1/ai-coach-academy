# AI Coach Academy Harness Constitution

This file is the governing contract for harness-managed work on the Academy.

## Objective

Finish one credible, demonstrable Academy module before wider expansion. The harness may research, build, test, review and prepare release evidence, but it must not bypass unresolved gates.

## Laws

1. **Understanding earns progress. Suggestions build capability. Safety boundaries remain firm.**
2. **Evidence before status.** A claim is not `pass` without recorded evidence.
3. **Smallest lawful expansion.** Do not migrate the semantic scorer beyond the validated slice until its required gates pass.
4. **Fail closed.** Model/runtime failure must preserve the learner answer, prevent progress unlock and provide a clear retry path.
5. **No safety override by similarity.** Semantic confidence never overrides privacy, policy, approved-tool, contradiction or accountability rules.
6. **Human authority is explicit.** Physical-device review, external behavioural judgement and final product-owner release approval remain human gates.
7. **Rework before escalation.** The harness should autonomously fix testable failures and re-run evidence before asking for human judgement.
8. **No silent scope drift.** Changes outside the current completion target require a recorded scope change.
9. **Preserve working product behaviour.** Existing lessons, progress, certificates, Toolkit, Workspace behaviour, Developer Console and approved visual hierarchy must not regress.
10. **Memory is evidence-backed.** Record decisions, failures, accepted standards and gate outcomes for reuse; do not treat unverified assumptions as project memory.

11. **Assessment validity precedes scoring.** Every learner scenario and question must identify the workplace context, source material, requested action and observable answer boundary. Vague or void questions block scorer testing and cannot count as behavioural evidence.

## Harness statuses

- `pass` — requirement satisfied with evidence.
- `advisory` — improvement worth considering; not a gate.
- `clarification` — information is insufficient to decide safely.
- `approval-required` — evidence is complete but an authorised human decision is required.
- `blocked` — work must not proceed through the affected gate.
- `pending` — required work or evidence has not yet been completed.

## Current completion target

**Target:** one credible demonstrable module, beginning with Module 1 — AI Foundations.

The current semantic scorer remains a three-lesson vertical slice (1.1, 1.5 and 4.2) until its validation gates pass. Module 1 becomes the first expansion target after that slice is approved.

## Mandatory pre-migration gates

- Deterministic regression suite passes.
- Static validation passes.
- Full preserved real-model simulation matrix is recorded for Lessons 1.1, 1.5 and 4.2.
- Physical iPhone and Android cold/cached timing is recorded and acceptable for the intended learner experience.
- Product-owner behavioural review is recorded.
- No unresolved false-pass safety defect remains.
- No unresolved regression in learner progress or reassessment locking remains.

## Mandatory release gates

- Current completion target meets its lesson-quality and semantic-assessment standard.
- Desktop and mobile learner journeys are verified.
- Progress, retesting, completion, Toolkit and certificate behaviour are verified.
- External lending-professional behavioural review is recorded for the demonstrable module.
- Final product-owner approval is recorded.
- Merge/deploy occurs only after all required release gates are `pass` or the explicit approval gate is approved.
