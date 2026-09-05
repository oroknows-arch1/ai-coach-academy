(() => {
  'use strict';
  const { MODULES, LESSONS } = window.ACADEMY_COURSE;

  const SEMANTIC_TEST_IDS = ['1-1','1-5','4-2'];
  const semanticTestMatch = location.hash.match(/^#semantic-test(?:=(1-1|1-5|4-2))?/);
  const SEMANTIC_TEST_MODE = !!semanticTestMatch;
  const semanticTestTarget = semanticTestMatch?.[1] || '1-1';
  const STORAGE_KEY = SEMANTIC_TEST_MODE ? 'aiCoachAcademy.semanticTest.v1' : 'aiCoachAcademy.v1';
  const LEGACY_KEY = 'aiCoachAcademy.frontendFoundation.v1';
  const main = document.getElementById('appMain');
  const navButtons = [...document.querySelectorAll('.nav-item')];
  const brandTrigger = document.getElementById('brandTrigger');
  const devBackdrop = document.getElementById('devBackdrop');
  const devStatus = document.getElementById('devStatus');
  const devAssessment = document.getElementById('devAssessment');
  const closeDev = document.getElementById('closeDev');
  const lessonsFor = moduleId => LESSONS.filter(l => l.module === moduleId);
  const idOf = lesson => `${lesson.module}-${lesson.lesson}`;
  const firstId = idOf(LESSONS[0]);

  const defaultState = {
    view: 'lesson', currentLessonId: SEMANTIC_TEST_MODE ? semanticTestTarget : firstId, currentModuleId: SEMANTIC_TEST_MODE ? Number(semanticTestTarget.split('-')[0]) : 1,
    completedLessons: [], certificates: [], toolkit: [], lessonWork: {},
    qaUnlockAll: SEMANTIC_TEST_MODE, qaToolkitUnlocked: false
  };

  let state = loadState();
  let logoTapCount = 0;
  let logoTapTimer = null;

  function clone(v){ return JSON.parse(JSON.stringify(v)); }
  function loadState(){
    try {
      const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (current) return normalise(current);
      const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null');
      if (legacy) return normalise({ ...defaultState, completedLessons: legacy.completedLessons || [], toolkit: legacy.toolkit || [] });
    } catch {}
    return clone(defaultState);
  }
  function normalise(candidate){
    const ids = new Set(LESSONS.map(idOf));
    return {
      ...clone(defaultState), ...candidate,
      currentLessonId: ids.has(candidate.currentLessonId) ? candidate.currentLessonId : (SEMANTIC_TEST_MODE ? semanticTestTarget : firstId),
      currentModuleId: Number(candidate.currentModuleId) || 1,
      completedLessons: [...new Set((candidate.completedLessons || []).filter(id => ids.has(id)))],
      certificates: Array.isArray(candidate.certificates) ? candidate.certificates : [],
      toolkit: Array.isArray(candidate.toolkit) ? candidate.toolkit : [],
      lessonWork: candidate.lessonWork && typeof candidate.lessonWork === 'object' ? candidate.lessonWork : {},
      qaUnlockAll: SEMANTIC_TEST_MODE || !!candidate.qaUnlockAll,
      qaToolkitUnlocked: !!candidate.qaToolkitUnlocked
    };
  }
  function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function currentLesson(){ return LESSONS.find(l => idOf(l) === state.currentLessonId) || LESSONS[0]; }
  function work(id = state.currentLessonId){ return { response:'', formativePassed:false, selectedAnswer:null, understandingPassed:false, assessment:null, ...(state.lessonWork[id] || {}) }; }
  function setWork(id, patch){ state.lessonWork = { ...state.lessonWork, [id]: { ...work(id), ...patch } }; save(); }
  function complete(id){ return state.completedLessons.includes(id); }
  function moduleComplete(moduleId){ const ls=lessonsFor(moduleId); return ls.length && ls.every(l => complete(idOf(l))); }
  function moduleUnlocked(moduleId){ return state.qaUnlockAll || moduleId === 1 || moduleComplete(moduleId - 1); }
  function lessonUnlocked(lesson){ if(state.qaUnlockAll) return true; if(!moduleUnlocked(lesson.module)) return false; if(lesson.lesson===1) return true; return complete(`${lesson.module}-${lesson.lesson-1}`); }
  function completedInModule(moduleId){ return lessonsFor(moduleId).filter(l => complete(idOf(l))).length; }
  function academyComplete(){ return state.completedLessons.length === LESSONS.length; }
  function setView(view){ state.view=view; save(); render(); main.focus({preventScroll:true}); }
  function openModule(moduleId){ if(!moduleUnlocked(moduleId)) return; state.currentModuleId=moduleId; state.view='module'; save(); render(); }
  function openLesson(id){ const l=LESSONS.find(x=>idOf(x)===id); if(!l||!lessonUnlocked(l)) return; state.currentLessonId=id; state.currentModuleId=l.module; state.view='lesson'; save(); render(); }

  function render(){
    navButtons.forEach(b=>{
      const key=b.dataset.view; const active=key==='modules' ? ['modules','module','lesson'].includes(state.view) : key===state.view;
      b.classList.toggle('active',active); active?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current');
    });
    if(state.view==='modules') renderModules(); else if(state.view==='module') renderModule(); else if(state.view==='toolkit') renderToolkit(); else if(state.view==='certificates') renderCertificates(); else renderLesson();
  }

  function renderModules(){
    const pct=Math.round(state.completedLessons.length/LESSONS.length*100);
    main.innerHTML=`<section class="dashboard-panel"><div class="page-intro"><div><p class="eyebrow">Academy pathway</p><h1>Modules</h1><p>Build practical AI capability through focused lending and workplace scenarios. Each lesson keeps evidence, verification and human judgement visible.</p></div><div class="summary-stack"><div class="summary-pill">${state.completedLessons.length} of ${LESSONS.length} lessons</div><div class="overall-progress"><span style="width:${pct}%"></span></div></div></div><div class="module-grid">${MODULES.map(moduleCard).join('')}</div></section>`;
    main.querySelectorAll('[data-module]').forEach(b=>b.addEventListener('click',()=>openModule(Number(b.dataset.module))));
  }
  function moduleCard(m){
    const unlocked=moduleUnlocked(m.id), done=moduleComplete(m.id), count=completedInModule(m.id), pct=Math.round(count/m.count*100);
    const next=lessonsFor(m.id).find(l=>!complete(idOf(l))) || lessonsFor(m.id)[0];
    return `<button class="module-card ${done?'complete':''}" data-module="${m.id}" ${unlocked?'':'disabled'} type="button"><div class="module-card-top"><span class="module-number">Module ${m.id}</span><span class="module-status ${done?'done':''}">${done?'✓ Complete':unlocked?(count?'Continue':'Start'):'⌁ Locked'}</span></div><h2>${esc(m.title)}</h2><p>${esc(m.subtitle)}</p><div class="module-progress"><div class="progress-track"><span class="progress-fill" style="width:${pct}%"></span></div><div class="progress-label"><span>${count} of ${m.count} lessons</span><span>${pct}%</span></div></div>${unlocked?`<span class="module-next">${done?'Review module':`Next: ${esc(next.title)}`} →</span>`:''}</button>`;
  }
  function renderModule(){
    const m=MODULES.find(x=>x.id===state.currentModuleId)||MODULES[0], count=completedInModule(m.id), pct=Math.round(count/m.count*100);
    main.innerHTML=`<section class="content-panel module-detail"><button class="back-link" data-back type="button">← All modules</button><div class="page-intro module-intro"><div><p class="eyebrow">Module ${m.id}</p><h1>${esc(m.title)}</h1><p>${esc(m.subtitle)}</p></div><div class="summary-stack"><div class="summary-pill">${count} of ${m.count} complete</div><div class="overall-progress"><span style="width:${pct}%"></span></div></div></div><div class="lesson-list">${lessonsFor(m.id).map(lessonRow).join('')}</div></section>`;
    main.querySelector('[data-back]').addEventListener('click',()=>setView('modules'));
    main.querySelectorAll('[data-lesson]').forEach(b=>b.addEventListener('click',()=>openLesson(b.dataset.lesson)));
  }
  function lessonRow(l){ const id=idOf(l), unlocked=lessonUnlocked(l), done=complete(id); return `<button class="lesson-row ${done?'complete':''} ${id===state.currentLessonId?'current':''}" data-lesson="${id}" ${unlocked?'':'disabled'} type="button"><span class="lesson-index">${done?'✓':l.lesson}</span><span class="lesson-row-copy"><strong>${esc(l.title)}</strong><small>15–20 min · one concept · one scenario · one exercise · one check</small></span><span class="lesson-row-status">${done?'Complete':unlocked?'Open':'Locked'}</span><span class="lesson-chevron">›</span></button>`; }

  function renderLesson(){
    const l=currentLesson(); if(!lessonUnlocked(l)){ state.currentLessonId=firstId; save(); return renderLesson(); }
    const m=MODULES.find(x=>x.id===l.module), ls=lessonsFor(l.module), w=work(), done=complete(idOf(l)), saved=state.toolkit.some(t=>t.lessonId===idOf(l));
    const priorFeedback=w.assessment?assessmentFeedback(w.assessment):w.formativePassed?'<div class="feedback good">Good. The response is developed enough to move to the understanding check.</div>':'';
    const testNav=SEMANTIC_TEST_MODE?`<nav class="semantic-test-nav" aria-label="Semantic test lessons"><strong>Testing:</strong>${SEMANTIC_TEST_IDS.map(id=>{const x=LESSONS.find(item=>idOf(item)===id);return `<button type="button" data-semantic-test="${id}" class="${id===idOf(l)?'active':''}">Lesson ${x.module}.${x.lesson}</button>`;}).join('')}</nav>`:'';
    main.innerHTML=`${testNav}<section class="lesson-layout"><aside class="workplace-panel"><img src="assets/workplace-desktop.png" alt="Professional lending coach working at a laptop in a modern office"></aside><article class="lesson-panel"><div class="lesson-topline"><div><button class="lesson-back" data-back-module type="button">Module ${l.module} · Lesson ${l.lesson}</button><span class="time-label">15–20 min</span></div><div class="progress-steps">${ls.map(x=>`<span class="progress-step ${complete(idOf(x))?'done':idOf(x)===idOf(l)?'current':''}"></span>`).join('')}</div></div><h1 class="lesson-title">${esc(l.title)}</h1><button class="concept-toggle" id="conceptToggle" aria-expanded="false" type="button"><span>Learn · Review the lesson concept</span><span class="plus">+</span></button><div id="conceptBody" class="concept-body hidden">${esc(l.concept)}</div><div class="mobile-workplace"><img src="assets/workplace-mobile.png" alt="Professional lending coach working at a laptop in a modern office"></div><section class="lesson-section scenario-section"><div class="section-icon">▣</div><div><h2>Workplace scenario</h2><p>${esc(l.scenario)}</p></div></section><section class="exercise-card"><div class="lesson-section exercise"><div class="section-icon">✎</div><div><h2>Try it</h2><p>${esc(l.exercise)}</p></div></div><textarea id="responseBox" class="response-box" placeholder="Write or edit your response here...">${esc(w.response)}</textarea><div class="response-meta"><span>Aim for a clear, checkable workplace response.</span><span id="responseCount">${w.response.trim().length} characters</span></div><button id="checkResponse" class="primary-action" type="button">CHECK MY ANSWER</button>${w.formativePassed?'<button id="testAnotherResponse" class="secondary-action" type="button">TEST ANOTHER RESPONSE</button>':''}<div id="formativeFeedback" aria-live="polite">${priorFeedback}</div></section>${renderCheck(l,w)}<button id="saveToolkit" class="secondary-action" type="button" ${w.response.trim().length<20?'disabled':''}>${saved?'✓ Saved to Toolkit':'⌑  Save to Toolkit'}</button><button id="continueLesson" class="footer-action" type="button" ${done?'':'disabled'}>${done?nextLabel(l):'Complete understanding check to continue →'}</button></article></section>`;
    bindLesson(l,w);
  }
  function assessmentFeedback(assessment){
    const good=assessment.pass, label=assessment.decision?`<strong>${esc(assessment.decision)}</strong> — `:'';
    return `<div class="feedback ${good?'good':'bad'}">${label}${esc(assessment.feedback || '')}</div>`;
  }
  function renderCheck(l,w){
    if(!w.formativePassed) return `<section class="check-card locked"><div class="check-header"><div class="check-badge">?</div><div><h2>Check your understanding</h2><p>Complete the formative response above to unlock the final understanding check.</p></div><span class="lock-icon">⌁</span></div></section>`;
    return `<section class="check-card"><div class="check-header"><div class="check-badge">?</div><div><h2>Check your understanding</h2><p>${esc(l.checkQuestion)}</p></div><span class="lock-icon">✓</span></div><div class="check-options">${l.answers.map((a,i)=>`<button class="check-option ${w.selectedAnswer===i?'selected':''}" data-answer="${i}" type="button">${esc(a)}</button>`).join('')}</div>${w.selectedAnswer!==null?'<button id="submitUnderstanding" class="primary-action" type="button">CONFIRM ANSWER</button>':''}<div id="understandingFeedback" aria-live="polite">${w.understandingPassed?`<div class="feedback good">${esc(l.correctFeedback || 'Correct. You have confirmed the core lesson principle.')}</div>`:''}</div></section>`;
  }
  function bindLesson(l,w){
    const id=idOf(l), toggle=document.getElementById('conceptToggle'), body=document.getElementById('conceptBody'), box=document.getElementById('responseBox');
    toggle.addEventListener('click',()=>{ const open=toggle.getAttribute('aria-expanded')==='true'; toggle.setAttribute('aria-expanded',String(!open)); body.classList.toggle('hidden',open); });
    box.addEventListener('input',()=>{
      const previous=work(id), responseChanged=box.value!==previous.response;
      const changedAfterPass=previous.formativePassed && responseChanged;
      const changedAfterAssessment=previous.assessment!==null && previous.assessment!==undefined && responseChanged;
      setWork(id,changedAfterAssessment?{response:box.value,formativePassed:false,assessment:null,selectedAnswer:null,understandingPassed:false}:{response:box.value});
      document.getElementById('responseCount').textContent=`${box.value.trim().length} characters`;
      document.getElementById('saveToolkit').disabled=box.value.trim().length<20;
      if(changedAfterAssessment){
        document.getElementById('formativeFeedback').innerHTML=`<div class="feedback bad"><strong>RECHECK REQUIRED</strong> — Your answer changed. Check it again${changedAfterPass?' to unlock progress':''}.</div>`;
        document.getElementById('testAnotherResponse')?.remove();
        if(changedAfterPass){
          const checkCard=main.querySelector('.check-card');
          if(checkCard) checkCard.outerHTML=renderCheck(l,{formativePassed:false});
          document.getElementById('continueLesson').disabled=true;
        }
      }
    });
    document.getElementById('checkResponse').addEventListener('click',async()=>{
      const text=box.value.trim();
      const rubric=window.ACADEMY_LESSON_RUBRICS?.[id];
      const button=document.getElementById('checkResponse');
      let assessment;
      if(rubric && window.ACADEMY_SEMANTIC_SCORER && window.ACADEMY_SEMANTIC_MODEL){
        button.disabled=true; button.textContent='CHECKING ON THIS DEVICE…';
        assessment=await window.ACADEMY_SEMANTIC_SCORER.assess({lessonId:id,response:text,rubric,embed:window.ACADEMY_SEMANTIC_MODEL.embed});
      } else {
        assessment=window.ACADEMY_SCORE_RESPONSE?window.ACADEMY_SCORE_RESPONSE(text):{pass:false,feedback:'The response checker is unavailable. Please try again.'};
      }
      const passed=assessment.pass;
      setWork(id,{response:text,formativePassed:passed,assessment:rubric?assessment:null,selectedAnswer:passed?w.selectedAnswer:null,understandingPassed:passed?w.understandingPassed:false});
      if(rubric) updateDeveloperAssessment(assessment);
      if(rubric || passed) renderLesson();
      else {button.disabled=false;button.textContent='CHECK MY ANSWER';document.getElementById('formativeFeedback').innerHTML=assessmentFeedback(assessment);}
    });
    const testAnother=document.getElementById('testAnotherResponse');
    if(testAnother) testAnother.addEventListener('click',()=>{
      setWork(id,{response:'',formativePassed:false,assessment:null,selectedAnswer:null,understandingPassed:false});
      renderLesson();
      document.getElementById('responseBox').focus();
    });
    main.querySelectorAll('[data-answer]').forEach(b=>b.addEventListener('click',()=>{ setWork(id,{selectedAnswer:Number(b.dataset.answer),understandingPassed:false}); renderLesson(); }));
    const submit=document.getElementById('submitUnderstanding'); if(submit) submit.addEventListener('click',()=>{
      const now=work(id); if(now.selectedAnswer===l.correct){ setWork(id,{understandingPassed:true}); completeLesson(l); renderLesson(); }
      else document.getElementById('understandingFeedback').innerHTML=`<div class="feedback bad">${esc(l.incorrectFeedback || 'Not quite. Choose the answer that keeps evidence, boundaries and human accountability visible.')}</div>`;
    });
    document.getElementById('saveToolkit').addEventListener('click',()=>saveToolkit(l,box.value.trim()));
    document.getElementById('continueLesson').addEventListener('click',()=>{ if(!complete(id)) return; const next=nextLesson(l); if(next) openLesson(idOf(next)); else setView('certificates'); });
    document.querySelector('[data-back-module]').addEventListener('click',()=>openModule(l.module));
    main.querySelectorAll('[data-semantic-test]').forEach(button=>button.addEventListener('click',()=>openLesson(button.dataset.semanticTest)));
  }
  function updateDeveloperAssessment(assessment){
    if(!devAssessment)return;
    const model=window.ACADEMY_SEMANTIC_MODEL?.getStatus?.() || {state:'unavailable'};
    devAssessment.textContent=JSON.stringify({
      lessonId:assessment.lessonId,rubricId:assessment.rubricId,
      detectedMeanings:assessment.detectedMeanings,evidenceSpans:assessment.evidenceSpans,
      meaningScores:assessment.meaningScores,
      requiredConceptsFound:assessment.requiredConceptsFound,missingConcepts:assessment.missingConcepts,
      contradictions:assessment.contradictions,semanticConfidence:assessment.semanticConfidence,
      triggeredRiskRules:assessment.triggeredRiskRules,finalDecision:assessment.decision,
      modelLoad:{...model,assessmentStatus:assessment.modelStatus}
    },null,2);
  }
  function completeLesson(l){ const id=idOf(l); if(!state.completedLessons.includes(id)) state.completedLessons.push(id); ensureCertificates(l.module); save(); }
  function nextLesson(l){ const i=LESSONS.findIndex(x=>idOf(x)===idOf(l)); return i>=0&&i<LESSONS.length-1?LESSONS[i+1]:null; }
  function nextLabel(l){ const next=nextLesson(l); if(!next) return 'Academy complete — view certificates →'; if(next.module===l.module) return `Continue to Lesson ${next.lesson} →`; return `Module ${l.module} complete — continue →`; }
  function ensureCertificates(moduleId){
    if(moduleComplete(moduleId)&&!state.certificates.some(c=>c.id===`module-${moduleId}`)){ const m=MODULES.find(x=>x.id===moduleId); state.certificates.push({id:`module-${moduleId}`,title:`${m.title} Certificate`,detail:`Completed all ${m.count} lessons in Module ${moduleId}.`,earnedAt:new Date().toISOString(),type:'module'}); }
    if(academyComplete()&&!state.certificates.some(c=>c.id==='academy')) state.certificates.push({id:'academy',title:'AI Coach Academy Certificate',detail:'Completed the full AI Coach Academy workplace learning pathway.',earnedAt:new Date().toISOString(),type:'academy'});
  }
  function saveToolkit(l,text){ if(text.length<20) return; const id=`tool-${idOf(l)}`; state.toolkit=[{id,lessonId:idOf(l),title:l.toolkitTitle,source:`Module ${l.module} · Lesson ${l.lesson}`,output:text,savedAt:new Date().toISOString()},...state.toolkit.filter(t=>t.id!==id)]; save(); document.getElementById('saveToolkit').textContent='✓ Saved to Toolkit'; }

  function renderToolkit(){
    main.innerHTML=`<section class="content-panel"><div class="page-intro"><div><p class="eyebrow">Reusable outputs</p><h1>Toolkit</h1><p>Keep useful lesson outputs close so the Academy becomes easier to reuse in real work.</p></div><div class="summary-pill">${state.toolkit.length} saved</div></div>${state.toolkit.length?`<div class="tool-search-wrap"><input id="toolSearch" class="tool-search" type="search" placeholder="Search your toolkit"></div><div class="tool-list">${state.toolkit.map(toolCard).join('')}</div>`:`<div class="empty-state"><div><div class="empty-icon">◎</div><h2>Your toolkit is ready to grow</h2><p>Complete lesson exercises and choose Save to Toolkit to keep reusable prompts and workplace outputs.</p><button class="empty-action" data-go-modules type="button">Go to modules</button></div></div>`}</section>`;
    const go=main.querySelector('[data-go-modules]'); if(go) go.addEventListener('click',()=>setView('modules'));
    const search=document.getElementById('toolSearch'); if(search) search.addEventListener('input',()=>{ const q=search.value.toLowerCase().trim(); main.querySelectorAll('[data-tool-card]').forEach(c=>c.classList.toggle('hidden',q&&!c.dataset.search.includes(q))); });
    main.querySelectorAll('[data-copy-tool]').forEach(b=>b.addEventListener('click',async()=>{ const t=state.toolkit.find(x=>x.id===b.dataset.copyTool); if(!t)return; try{await navigator.clipboard.writeText(t.output);b.textContent='Copied';setTimeout(()=>b.textContent='Copy',1200);}catch{b.textContent='Copy manually';} }));
    main.querySelectorAll('[data-delete-tool]').forEach(b=>b.addEventListener('click',()=>{state.toolkit=state.toolkit.filter(t=>t.id!==b.dataset.deleteTool);save();renderToolkit();}));
  }
  function toolCard(t){ const search=esc(`${t.title} ${t.source} ${t.output}`.toLowerCase()); return `<article class="tool-card" data-tool-card data-search="${search}"><div class="tool-card-head"><div><p class="eyebrow">${esc(t.source)}</p><h2>${esc(t.title)}</h2></div><div class="tool-actions"><button data-copy-tool="${t.id}" type="button">Copy</button><button class="text-danger" data-delete-tool="${t.id}" type="button">Remove</button></div></div><div class="tool-output">${esc(t.output)}</div></article>`; }

  function renderCertificates(){
    const certs=[...state.certificates].sort((a,b)=>(b.earnedAt||'').localeCompare(a.earnedAt||''));
    main.innerHTML=`<section class="content-panel"><div class="page-intro"><div><p class="eyebrow">Completion records</p><h1>Certificates</h1><p>Module records are earned automatically when every lesson in that module is completed. The Academy certificate appears after the full pathway.</p></div><div class="summary-pill">${certs.length} earned</div></div>${certs.length?`<div class="certificate-list">${certs.map(c=>`<article class="certificate-card ${c.type==='academy'?'academy-cert':''}"><div class="certificate-mark">✦</div><div><p class="eyebrow">${c.type==='academy'?'Academy completion':'Module completion'}</p><h2>${esc(c.title)}</h2><p>${esc(c.detail)}</p><small>Earned ${formatDate(c.earnedAt)}</small></div></article>`).join('')}</div>`:`<div class="empty-state"><div><div class="empty-icon">♙</div><h2>No certificates yet</h2><p>Your first certificate appears when all lessons in Module 1 are complete.</p><button class="empty-action" data-go-modules type="button">Continue learning</button></div></div>`}</section>`;
    const go=main.querySelector('[data-go-modules]'); if(go)go.addEventListener('click',()=>setView('modules'));
  }
  function formatDate(v){ const d=new Date(v); return Number.isNaN(d.getTime())?'':new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short',year:'numeric'}).format(d); }
  function esc(v){ return String(v??'').replace(/[&<>\'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

  function markModuleComplete(moduleId){ lessonsFor(moduleId).forEach(l=>{ const id=idOf(l); if(!state.completedLessons.includes(id))state.completedLessons.push(id); state.lessonWork[id]={response:'QA completion: approved source identified, task defined, important output verified and human review retained.',formativePassed:true,selectedAnswer:l.correct,understandingPassed:true}; }); ensureCertificates(moduleId); }
  function qaTools(){ return LESSONS.map(l=>({id:`qa-${idOf(l)}`,lessonId:idOf(l),title:l.toolkitTitle,source:`QA preview · Module ${l.module} · Lesson ${l.lesson}`,output:`QA preview for ${l.toolkitTitle}. Complete the lesson to replace this with the learner's own reusable output.`,savedAt:new Date().toISOString(),qa:true})); }

  navButtons.forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
  brandTrigger.addEventListener('click',()=>{
    logoTapCount++; clearTimeout(logoTapTimer);
    if(logoTapCount>=7){ logoTapCount=0; devBackdrop.classList.remove('hidden'); closeDev.focus(); return; }
    logoTapTimer=setTimeout(()=>{logoTapCount=0;setView('modules');},650);
  });
  closeDev.addEventListener('click',()=>devBackdrop.classList.add('hidden'));
  devBackdrop.addEventListener('click',e=>{if(e.target===devBackdrop)devBackdrop.classList.add('hidden');});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')devBackdrop.classList.add('hidden');});
  document.querySelectorAll('[data-dev]').forEach(b=>b.addEventListener('click',()=>{
    const action=b.dataset.dev, cur=currentLesson();
    if(action==='unlock-modules'){state.qaUnlockAll=true;devStatus.textContent='All modules and lessons unlocked for QA.';}
    else if(action==='unlock-toolkits'){state.qaToolkitUnlocked=true;const learner=state.toolkit.filter(t=>!t.qa);state.toolkit=[...learner,...qaTools().filter(q=>!learner.some(t=>t.lessonId===q.lessonId))];devStatus.textContent='All toolkit outputs available as labelled QA previews.';}
    else if(action==='complete-module'){markModuleComplete(cur.module);devStatus.textContent=`Module ${cur.module} marked complete for QA.`;}
    else if(action==='award-certificates'){MODULES.forEach(m=>{if(!state.certificates.some(c=>c.id===`module-${m.id}`))state.certificates.push({id:`module-${m.id}`,title:`${m.title} Certificate`,detail:`QA-awarded Module ${m.id} completion record.`,earnedAt:new Date().toISOString(),type:'module',qa:true});});if(!state.certificates.some(c=>c.id==='academy'))state.certificates.push({id:'academy',title:'AI Coach Academy Certificate',detail:'QA-awarded full Academy completion record.',earnedAt:new Date().toISOString(),type:'academy',qa:true});devStatus.textContent='All completion records awarded for QA.';}
    else if(action==='simulate-progress'){state=clone(defaultState);markModuleComplete(1);state.currentLessonId='2-2';state.currentModuleId=2;state.view='lesson';state.completedLessons.push('2-1');state.lessonWork['2-1']={response:'Summarise the verified meeting decisions, separate open questions, confirm names and commitments against the source, then carry only checked actions into the follow-up.',formativePassed:true,selectedAnswer:LESSONS.find(l=>idOf(l)==='2-1').correct,understandingPassed:true};state.toolkit=[{id:'tool-1-1',lessonId:'1-1',title:'Lending coaching prompt',source:'Module 1 · Lesson 1',output:'Using only the approved quality report, draft a concise coaching note for regional lending leaders. Identify the confirmed recurring issues, do not infer causes, flag unsupported points, and list the claims I should verify before sharing.',savedAt:new Date().toISOString()}];devStatus.textContent='Representative learner progress simulated.';}
    else if(action==='reset-progress'){state=clone(defaultState);devStatus.textContent='Learner progress reset.';}
    else if(action==='clear-storage'){localStorage.removeItem(STORAGE_KEY);localStorage.removeItem(LEGACY_KEY);state=clone(defaultState);devStatus.textContent='Academy local storage cleared.';}
    save();render();
  }));

  render();
})();
