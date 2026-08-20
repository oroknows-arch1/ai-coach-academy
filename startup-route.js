(() => {
  'use strict';

  const STORAGE_KEY = 'aiCoachAcademy.v1';
  const course = window.ACADEMY_COURSE;
  if (!course || !Array.isArray(course.LESSONS) || !course.LESSONS.length) return;

  const lessons = course.LESSONS;
  const idOf = lesson => `${lesson.module}-${lesson.lesson}`;
  const validIds = new Set(lessons.map(idOf));
  const firstId = idOf(lessons[0]);

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return; // app.js already defaults first-time learners to Lesson 1

    const state = JSON.parse(raw);
    if (!state || typeof state !== 'object') return;

    const completed = new Set(
      Array.isArray(state.completedLessons)
        ? state.completedLessons.filter(id => validIds.has(id))
        : []
    );

    const currentIsValid = validIds.has(state.currentLessonId);
    const currentIsUnfinished = currentIsValid && !completed.has(state.currentLessonId);
    const nextIncomplete = lessons.find(lesson => !completed.has(idOf(lesson)));

    const targetId = currentIsUnfinished
      ? state.currentLessonId
      : nextIncomplete
        ? idOf(nextIncomplete)
        : currentIsValid
          ? state.currentLessonId
          : firstId;

    const targetLesson = lessons.find(lesson => idOf(lesson) === targetId) || lessons[0];

    // Working-screen rule: launch directly into the learner's work, not the course index.
    state.view = 'lesson';
    state.currentLessonId = targetId;
    state.currentModuleId = targetLesson.module;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // If stored state is invalid, app.js safely falls back to its normal defaults.
  }
})();
