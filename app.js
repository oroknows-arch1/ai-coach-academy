(() => {
  'use strict';

  const STORAGE_KEY = 'aiCoachAcademy.frontendFoundation.v1';
  const modules = [
    { id: 1, title: 'AI Foundations', subtitle: 'Core AI concepts, prompting, verification and responsible use.', lessons: 6 },
    { id: 2, title: 'Microsoft 365 Copilot at Work', subtitle: 'Use Copilot where work already lives across Microsoft 365.', lessons: 6 },
    { id: 3, title: 'Analysis & Decision Support', subtitle: 'Turn verified evidence into comparisons, recommendations and decision briefs.', lessons: 6 },
    { id: 4, title: 'Safe & Responsible AI', subtitle: 'Privacy, policy, verification, governance and human accountability.', lessons: 5 },
    { id: 5, title: 'Automation & AI Systems', subtitle: 'Build controlled, repeatable workflows and useful AI-assisted systems.', lessons: 5 },
    { id: 6, title: 'Implementation & Capstone', subtitle: 'Apply the Academy method to a practical workplace implementation.', lessons: 4 }
  ];

  const lesson = {
    module: 1,
    number: 1,
    title: 'Prompting for lending work',
    concept: 'A useful workplace prompt reduces ambiguity. For lending work, give Copilot the task, the context, the source it can rely on, the output you need and the boundary it must not cross. This reduces guessing and makes the answer easier to verify before it is used.',
    scenario: 'Prepare a coaching note for regional lending leaders from an approved quality report.',
    exercise: 'Write a stronger prompt for a lending coaching note. Include how you verify the output and carry only trusted information into the next step.',
    checkQuestion: 'Which approach gives Copilot the clearest and safest instructions?',
    answers: [
      'Ask Copilot to write a strong lending message and trust the result if it sounds confident.',
      'Give the task, context, approved source, required output and boundaries, then verify important claims before reuse.',
      'Copy every available document into one prompt so Copilot has as much information as possible.'
    ],
    correct: 1
  };

  const defaultState = {
    view: 'lesson',
    unlockedModules: [1],
    completedLessons: [],
    completedModules: [],
    certificates: [],
    toolkitUnlocked: true,
    toolkit: [],
    response: '',
    formativePassed: false,
    selectedAnswer: null,
    understandingPassed: false
  };

  const main = document.getElementById('appMain');
  const navButtons = [...document.querySelectorAll('.nav-item')];
  const brandTrigger = document.getElementById('brandTrigger');
  const devBackdrop = document.getElementById('devBackdrop');
  const devStatus = document.getElementById('devStatus');
  const closeDev = document.getElementById('closeDev');

  let logoTapCount = 0;
  let logoTapTimer = null;
  let state = loadState();

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return parsed ? { ...defaultState, ...parsed } : { ...defaultState };
    } catch {
      return { ...defaultState };
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function setState(patch, render = true) {
    state = { ...state, ...patch };
    saveState();
    if (render) renderApp();
  }

  function setView(view) {
    state.view = view;
    saveState();
    renderApp();
    main.focus({ preventScroll: true });
  }

  function renderApp() {
    navButtons.forEach(button => {
      const key = button.dataset.view;
      const active = (state.view === 'lesson' && key === 'modules') || key === state.view;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });

    if (state.view === 'modules') renderModules();
    else if (state.view === 'toolkit') renderToolkit();
    else if (state.view === 'certificates') renderCertificates();
    else renderLesson();
  }

  function renderModules() {
    const completedTotal = state.completedLessons.length;
    main.innerHTML = `
      <section class="dashboard-panel" aria-labelledby="modulesTitle">
        <div class="page-intro">
          <div>
            <p class="eyebrow">Academy pathway</p>
            <h1 id="modulesTitle">Modules</h1>
            <p>Move through focused workplace lessons one at a time. Progress is saved in this browser.</p>
          </div>
          <div class="summary-pill">${completedTotal} lesson${completedTotal === 1 ? '' : 's'} completed</div>
        </div>
        <div class="module-grid">
          ${modules.map(moduleCard).join('')}
        </div>
      </section>`;

    main.querySelectorAll('[data-module]').forEach(button => {
      button.addEventListener('click', () => {
        if (Number(button.dataset.module) === 1) setView('lesson');
      });
    });
  }

  function moduleCard(module) {
    const unlocked = state.unlockedModules.includes(module.id);
    const completed = state.completedModules.includes(module.id);
    const completedLessons = module.id === 1 && state.completedLessons.includes('1-1') ? 1 : completed ? module.lessons : 0;
    const pct = Math.round((completedLessons / module.lessons) * 100);
    return `
      <button class="module-card" type="button" data-module="${module.id}" ${unlocked ? '' : 'disabled'}>
        <span class="module-number">Module ${module.id}${completed ? ' · Complete' : unlocked ? '' : ' · Locked'}</span>
        <h2>${module.title}</h2>
        <p>${module.subtitle}</p>
        <div class="module-progress">
          <div class="progress-track"><span class="progress-fill" style="width:${pct}%"></span></div>
          <div class="progress-label"><span>${completedLessons} of ${module.lessons}</span><span>${pct}%</span></div>
        </div>
      </button>`;
  }

  function renderLesson() {
    main.innerHTML = `
      <section class="lesson-layout" aria-label="Module 1 lesson 1 workspace">
        <div class="workplace-panel" aria-label="Workplace learning environment">
          <picture>
            <source media="(max-width:760px)" srcset="assets/workplace-mobile.jpg">
            <img src="assets/workplace-desktop.jpg" alt="Professional lending coach working at a laptop in a modern office">
          </picture>
        </div>

        <article class="lesson-panel">
          <div class="lesson-topline">
            <p class="lesson-kicker">Module ${lesson.module} · Lesson ${lesson.number}</p>
            <div class="progress-steps" aria-label="Lesson progress">
              ${[0,1,2,3,4,5].map((_, i) => `<span class="progress-step ${i < 1 ? 'done' : i === 1 ? 'current' : ''}"></span>`).join('')}
            </div>
          </div>

          <h1 class="lesson-title">${lesson.title}</h1>

          <button id="conceptToggle" class="concept-toggle" type="button" aria-expanded="false" aria-controls="conceptBody">
            <span>Learn · Review the lesson concept</span><span class="plus" aria-hidden="true">+</span>
          </button>
          <div id="conceptBody" class="concept-body hidden">${lesson.concept}</div>

          <div class="mobile-workplace" aria-label="Workplace learning environment">
            <img src="assets/workplace-mobile.jpg" alt="Professional lending coach working at a laptop in a modern office">
          </div>

          <section class="lesson-section">
            <div class="section-icon" aria-hidden="true">▣</div>
            <div>
              <h2 class="section-heading">Workplace scenario</h2>
              <p class="section-copy">${lesson.scenario}</p>
            </div>
          </section>

          <section class="exercise-card">
            <div class="lesson-section exercise">
              <div class="section-icon" aria-hidden="true">✎</div>
              <div>
                <h2 class="section-heading">Try it</h2>
                <p class="section-copy">${lesson.exercise}</p>
              </div>
            </div>
            <textarea id="responseBox" class="response-box" placeholder="Write or edit your response here..." aria-label="Lesson response">${escapeHtml(state.response)}</textarea>
            <div class="response-meta"><span id="responseHint">Aim for a clear, checkable workplace prompt.</span><span id="responseCount">${state.response.trim().length} characters</span></div>
            <button id="checkResponse" class="primary-action" type="button">CHECK MY ANSWER</button>
            <div id="formativeFeedback" aria-live="polite"></div>
          </section>

          ${renderUnderstandingCheck()}

          <button id="saveToolkit" class="secondary-action" type="button" ${state.response.trim().length < 20 ? 'disabled' : ''}>⌑ &nbsp; Save to Toolkit</button>
          <button id="continueLesson" class="footer-action" type="button" ${state.understandingPassed ? '' : 'disabled'}>${state.understandingPassed ? 'Lesson complete — return to modules →' : 'Complete understanding check to continue →'}</button>
        </article>
      </section>`;

    bindLessonEvents();
  }

  function renderUnderstandingCheck() {
    if (!state.formativePassed) {
      return `
        <section class="check-card locked" aria-label="Understanding check locked">
          <div class="check-header">
            <div class="check-badge">?</div>
            <div><h2 class="check-title">Check your understanding</h2><p class="check-note">Complete the formative response above to unlock the final understanding check.</p></div>
            <span class="lock-icon" aria-hidden="true">♙</span>
          </div>
        </section>`;
    }

    return `
      <section class="check-card" aria-labelledby="checkTitle">
        <div class="check-header">
          <div class="check-badge">?</div>
          <div><h2 id="checkTitle" class="check-title">Check your understanding</h2><p class="check-note">${lesson.checkQuestion}</p></div>
          <span class="lock-icon" aria-hidden="true">✓</span>
        </div>
        <div class="check-options" role="radiogroup" aria-label="Understanding check answers">
          ${lesson.answers.map((answer, index) => `<button class="check-option ${state.selectedAnswer === index ? 'selected' : ''}" type="button" data-answer="${index}" role="radio" aria-checked="${state.selectedAnswer === index}">${answer}</button>`).join('')}
        </div>
        ${state.selectedAnswer !== null ? `<button id="submitUnderstanding" class="primary-action" type="button">CONFIRM ANSWER</button>` : ''}
        ${state.understandingPassed ? '<div class="feedback good">Correct. You have confirmed the core lesson principle.</div>' : ''}
      </section>`;
  }

  function bindLessonEvents() {
    const conceptToggle = document.getElementById('conceptToggle');
    const conceptBody = document.getElementById('conceptBody');
    const responseBox = document.getElementById('responseBox');
    const count = document.getElementById('responseCount');
    const formativeFeedback = document.getElementById('formativeFeedback');

    conceptToggle.addEventListener('click', () => {
      const expanded = conceptToggle.getAttribute('aria-expanded') === 'true';
      conceptToggle.setAttribute('aria-expanded', String(!expanded));
      conceptBody.classList.toggle('hidden', expanded);
    });

    responseBox.addEventListener('input', () => {
      state.response = responseBox.value;
      saveState();
      count.textContent = `${responseBox.value.trim().length} characters`;
      document.getElementById('saveToolkit').disabled = responseBox.value.trim().length < 20;
    });

    document.getElementById('checkResponse').addEventListener('click', () => {
      state.response = responseBox.value.trim();
      const enough = state.response.length >= 45;
      const hasBoundary = /verify|check|approved|source|trusted|do not|only/i.test(state.response);
      if (enough && hasBoundary) {
        state.formativePassed = true;
        saveState();
        renderLesson();
      } else {
        state.formativePassed = false;
        saveState();
        formativeFeedback.innerHTML = '<div class="feedback bad">Strengthen the response by making the task clear and adding how you will verify or limit the information used.</div>';
      }
    });

    main.querySelectorAll('[data-answer]').forEach(button => {
      button.addEventListener('click', () => {
        setState({ selectedAnswer: Number(button.dataset.answer), understandingPassed: false });
      });
    });

    const submitUnderstanding = document.getElementById('submitUnderstanding');
    if (submitUnderstanding) {
      submitUnderstanding.addEventListener('click', () => {
        if (state.selectedAnswer === lesson.correct) {
          const completedLessons = Array.from(new Set([...state.completedLessons, '1-1']));
          setState({ understandingPassed: true, completedLessons });
        } else {
          const card = submitUnderstanding.closest('.check-card');
          const old = card.querySelector('.feedback');
          if (old) old.remove();
          card.insertAdjacentHTML('beforeend', '<div class="feedback bad">Not quite. Look for the answer that keeps evidence, boundaries and human verification in the workflow.</div>');
        }
      });
    }

    document.getElementById('saveToolkit').addEventListener('click', () => {
      const value = responseBox.value.trim();
      if (value.length < 20) return;
      const existing = state.toolkit.filter(item => item.id !== 'prompting-lending');
      state.toolkit = [{ id: 'prompting-lending', title: 'Lending coaching prompt', source: 'Module 1 · Lesson 1', output: value }, ...existing];
      saveState();
      const button = document.getElementById('saveToolkit');
      button.textContent = '✓ Saved to Toolkit';
    });

    document.getElementById('continueLesson').addEventListener('click', () => {
      if (state.understandingPassed) setView('modules');
    });
  }

  function renderToolkit() {
    main.innerHTML = `
      <section class="content-panel" aria-labelledby="toolkitTitle">
        <div class="page-intro">
          <div><p class="eyebrow">Reusable outputs</p><h1 id="toolkitTitle">Toolkit</h1><p>Save useful lesson outputs here so the Academy becomes easier to reuse in real work.</p></div>
          <div class="summary-pill">${state.toolkit.length} saved</div>
        </div>
        ${state.toolkit.length ? `<div class="tool-list">${state.toolkit.map(tool => `<article class="tool-card"><h2>${escapeHtml(tool.title)}</h2><p>${escapeHtml(tool.source)}</p><div class="tool-output">${escapeHtml(tool.output)}</div></article>`).join('')}</div>` : `<div class="empty-state"><div><div class="empty-icon">◎</div><h2>Your toolkit is ready to grow</h2><p>Complete lesson exercises and choose “Save to Toolkit” to keep reusable prompts and workplace outputs.</p></div></div>`}
      </section>`;
  }

  function renderCertificates() {
    main.innerHTML = `
      <section class="content-panel" aria-labelledby="certTitle">
        <div class="page-intro">
          <div><p class="eyebrow">Completion records</p><h1 id="certTitle">Certificates</h1><p>Module completion records will appear here as the learner progresses through the Academy.</p></div>
          <div class="summary-pill">${state.certificates.length} earned</div>
        </div>
        ${state.certificates.length ? `<div class="certificate-list">${state.certificates.map(cert => `<article class="certificate-card"><h2>${escapeHtml(cert.title)}</h2><p>${escapeHtml(cert.detail)}</p></article>`).join('')}</div>` : `<div class="empty-state"><div><div class="empty-icon">♙</div><h2>No certificates yet</h2><p>Certificates remain separate from the learning workspace and unlock only when completion requirements are met.</p></div></div>`}
      </section>`;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  }

  navButtons.forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));

  brandTrigger.addEventListener('click', () => {
    logoTapCount += 1;
    clearTimeout(logoTapTimer);
    logoTapTimer = setTimeout(() => { logoTapCount = 0; }, 2200);
    if (logoTapCount >= 7) {
      logoTapCount = 0;
      clearTimeout(logoTapTimer);
      devBackdrop.classList.remove('hidden');
      closeDev.focus();
    } else if (logoTapCount === 1) {
      setView('modules');
    }
  });

  closeDev.addEventListener('click', () => devBackdrop.classList.add('hidden'));
  devBackdrop.addEventListener('click', event => {
    if (event.target === devBackdrop) devBackdrop.classList.add('hidden');
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') devBackdrop.classList.add('hidden');
  });

  document.querySelectorAll('[data-dev]').forEach(button => {
    button.addEventListener('click', () => {
      const action = button.dataset.dev;
      if (action === 'unlock-modules') {
        state.unlockedModules = modules.map(module => module.id);
        devStatus.textContent = 'All modules unlocked for QA.';
      } else if (action === 'unlock-toolkits') {
        state.toolkitUnlocked = true;
        devStatus.textContent = 'Toolkit access unlocked for QA.';
      } else if (action === 'complete-module') {
        state.completedLessons = Array.from(new Set([...state.completedLessons, '1-1']));
        state.completedModules = Array.from(new Set([...state.completedModules, 1]));
        state.understandingPassed = true;
        devStatus.textContent = 'Current module marked complete.';
      } else if (action === 'award-certificates') {
        state.certificates = modules.map(module => ({ title: `${module.title} Certificate`, detail: `QA-awarded completion record for Module ${module.id}.` }));
        devStatus.textContent = 'Certificates awarded for QA.';
      } else if (action === 'simulate-progress') {
        state.unlockedModules = [1,2,3];
        state.completedLessons = ['1-1'];
        state.completedModules = [1];
        state.toolkit = [{ id: 'qa-tool', title: 'Verified coaching prompt', source: 'Simulated learner progress', output: 'Draft from approved source only. Identify the three recurring quality issues, state where each issue appears in the source, and flag anything that needs human verification before use.' }];
        state.certificates = [{ title: 'AI Foundations Certificate', detail: 'Simulated completion record for Module 1.' }];
        devStatus.textContent = 'Representative learner progress simulated.';
      } else if (action === 'reset-progress') {
        state = { ...defaultState };
        devStatus.textContent = 'Learner progress reset.';
      } else if (action === 'clear-storage') {
        localStorage.removeItem(STORAGE_KEY);
        state = { ...defaultState };
        devStatus.textContent = 'Academy local storage cleared.';
      }
      saveState();
      renderApp();
    });
  });

  renderApp();
})();
