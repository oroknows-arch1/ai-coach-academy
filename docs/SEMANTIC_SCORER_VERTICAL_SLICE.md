# Semantic formative scorer — vertical slice

## Boundary and decision

The trial covers Lessons 1.1, 1.5 and 4.2 only. The other 29 lessons continue to use the existing scorer. No backend, authentication, database, lesson, progress, certificate, Toolkit, Workspace, branding or workplace-art boundary changes.

The browser lazily loads `Xenova/all-MiniLM-L6-v2` through pinned Transformers.js 3.7.2 and uses the WASM backend. The q8 ONNX weight is approximately 23 MB on first load and is normally cached by the browser. The model produces 384-dimensional sentence embeddings. Model and Transformers.js are Apache-2.0 licensed. GitHub Pages can serve the static application; the runtime and public model are fetched over HTTPS without an API key. Learner text is passed only to the local in-browser pipeline.

## Governance

Semantic similarity may detect alternative expression, but it cannot override deterministic block conditions or contradictions. Each rubric defines sufficient understanding and any mandatory industry-boundary meanings. Low-confidence, materially incomplete and technical-failure results do not unlock the understanding check. The response remains in local browser storage and the learner is not penalised.

### Assessment principle

Understanding earns progress; suggestions build capability; industry boundaries remain firm. Expression, grammar and style do not determine the result. Lesson 1.1 may return PASS WITH FEEDBACK when a meaningful task and workplace source/context are understood while boundary or verification detail could strengthen the prompt. Safety lessons 1.5 and 4.2 retain all required safety meanings as progress gates.

Thresholds are rubric data, not one universal number. Lesson 1.1 uses calibrated per-meaning thresholds because a multi-part prompt dilutes short-clause similarity; all required meanings must still be present and hard rules retain priority.

## Commercial capability reference

Public assessment-product patterns informed the shape—explicit rubrics, valid/incomplete/incorrect examples, confidence, safeguards, actionable feedback and QA evidence. No commercial code, prompts or protected implementation was copied.

## Known limitations

- First use requires a roughly 23 MB download and may be slow on older mobile devices.
- English MiniLM can still under-recognise very unusual phrasing, heavy code-switching or extremely short answers.
- Evidence is the closest rubric example, not a generative explanation or proof of reasoning.
- Phrase-based hard risks deliberately favour safety and require continuing adversarial regression work.
- CDN/model availability is a runtime dependency. Failure is visible and fail-closed.

## Broader migration gate

Do not migrate the remaining lessons until real desktop/mobile trials measure first-load latency, false pass/retry rates and accessibility, and the product owner behaviourally reviews all three lessons.
