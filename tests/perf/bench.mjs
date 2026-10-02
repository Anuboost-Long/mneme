import { DOMParser } from 'linkedom';
import { useTestDesktop } from '../support/desktop.mjs';

globalThis.DOMParser = DOMParser;

const scale = { courses: 50, modulesPerCourse: 10, pagesPerModule: 10, highlightsPerPage: 3 };
const { database, calls } = useTestDesktop();
const { initDb } = await import('../../src/shared/lib/db/index.ts');
await initDb();

const paragraph = 'Loops repeat a block of code while a condition holds. '.repeat(12);
const content = Array.from({ length: 8 }, (_, i) => `<h2>Section ${i}</h2><p>${paragraph}</p>`).join('');
database.exec('BEGIN');
const insertCourse = database.prepare('INSERT INTO course (name, position) VALUES (?, ?)');
const insertModule = database.prepare('INSERT INTO module (course_id, name, position) VALUES (?, ?, ?)');
const insertPage = database.prepare('INSERT INTO page (module_id, title, content, position, status) VALUES (?, ?, ?, ?, ?)');
const insertHighlight = database.prepare('INSERT INTO highlight (page_id, module_id, ref, html, position) VALUES (?, ?, ?, ?, ?)');
const insertRecording = database.prepare("INSERT INTO recording (page_id, name, file_reference, mime_type, duration_ms) VALUES (?, 'Lecture', 'ref.m4a', 'audio/mp4', 60000)");
for (let c = 1; c <= scale.courses; c++) {
  const courseId = Number(insertCourse.run(`Course ${c}`, c).lastInsertRowid);
  for (let m = 1; m <= scale.modulesPerCourse; m++) {
    const moduleId = Number(insertModule.run(courseId, `Module ${c}.${m}`, m).lastInsertRowid);
    for (let p = 1; p <= scale.pagesPerModule; p++) {
      const pageId = Number(insertPage.run(moduleId, `Page ${c}.${m}.${p}`, content, p, 1 + (p % 3)).lastInsertRowid);
      for (let h = 0; h < scale.highlightsPerPage; h++) insertHighlight.run(pageId, moduleId, `ref-${pageId}-${h}`, '<mark>key point</mark>', h);
      if (p === 1) insertRecording.run(pageId);
    }
  }
}
database.exec('COMMIT');

const counts = database.prepare('SELECT (SELECT COUNT(*) FROM course) c, (SELECT COUNT(*) FROM module) m, (SELECT COUNT(*) FROM page) p, (SELECT COUNT(*) FROM highlight) h').get();
const midCourse = Math.ceil(scale.courses / 2);
const midModule = database.prepare('SELECT id FROM module WHERE course_id = ? LIMIT 1').get(midCourse).id;
const midPage = database.prepare('SELECT id FROM page WHERE module_id = ? LIMIT 1').get(midModule).id;

const courses = await import('../../src/features/courses/lib/courses.ts');
const modules = await import('../../src/features/courses/lib/modules.ts');
const pages = await import('../../src/features/courses/lib/page/table.ts');
const highlights = await import('../../src/features/courses/lib/highlights.ts');
const recordings = await import('../../src/features/courses/lib/recordings.ts');
const dashboard = await import('../../src/features/home/lib/dashboard.ts');
const deleted = await import('../../src/features/recently-deleted/lib/recentlyDeleted.ts');

const cases = {
  'getCourses': () => courses.getCourses(),
  'getCourse': () => courses.getCourse(midCourse),
  'getModules (one course)': () => modules.getModules(midCourse),
  'getModule': () => modules.getModule(midModule),
  'getModuleCounts': () => modules.getModuleCounts(),
  'getModuleDestinations': () => modules.getModuleDestinations(),
  'searchModuleLinks': () => modules.searchModuleLinks('Module 2', 8),
  'getPages (one module)': () => pages.getPages(midModule),
  'getPage': () => pages.getPage(midPage),
  'getModulePageProgress': () => pages.getModulePageProgress(midCourse),
  'getCoursePageProgress': () => pages.getCoursePageProgress(),
  'searchPages': () => pages.searchPages('condition'),
  'searchPageLinks': () => pages.searchPageLinks('Page 2', 8),
  'getModuleHighlights': () => highlights.getModuleHighlights(midModule),
  'getAllRecordings': () => recordings.getAllRecordings(),
  'dashboard.getPages (recent)': () => dashboard.getPages({}, 'opened', 8),
  'dashboard.countPages': () => dashboard.countPages({}),
  'dashboard.getModuleProgress': () => dashboard.getModuleProgress({ limit: 6 }),
  'dashboard.getCourseActivity': () => dashboard.getCourseActivity(),
  'dashboard.countPagesBy status': () => dashboard.countPagesBy('status'),
  'dashboard.getLibraryCounts': () => dashboard.getLibraryCounts(),
  'dashboard.getRecentHighlights': () => dashboard.getRecentHighlights(8),
  'dashboard.getCourseShelf': () => dashboard.getCourseShelf(),
  'getDeletedItems': () => deleted.getDeletedItems(),
};

const runs = 7;
const results = [];
for (const [name, run] of Object.entries(cases)) {
  await run();
  const times = [];
  let sqls = [];
  for (let i = 0; i < runs; i++) {
    calls.length = 0;
    const start = performance.now();
    await run();
    times.push(performance.now() - start);
    sqls = calls.map((call) => call);
  }
  times.sort((a, b) => a - b);
  const scans = new Set();
  for (const { sql, params } of sqls) {
    if (!/^\s*SELECT/i.test(sql)) continue;
    for (const step of database.prepare(`EXPLAIN QUERY PLAN ${sql}`).all(...params)) {
      if (step.detail.startsWith('SCAN ') && !/USING (COVERING )?INDEX/.test(step.detail)) scans.add(step.detail.slice('SCAN '.length));
    }
  }
  results.push({ name, median: times[Math.floor(runs / 2)], calls: sqls.length, scans: [...scans].join(', ') });
}

const pageEditor = [];
const { updatePage } = pages;
for (const highlightCount of [0, 5, 20, 50]) {
  let html = content;
  for (let h = 0; h < highlightCount; h++) html += `<p><mark data-highlight-ref="bench-${h}">point ${h}</mark></p>`;
  await updatePage(midPage, { content: html });
  calls.length = 0;
  const start = performance.now();
  await updatePage(midPage, { content: html + ' ' });
  pageEditor.push({ highlights: highlightCount, ms: performance.now() - start, calls: calls.length });
}

console.log(`Seeded: ${counts.c} courses, ${counts.m} modules, ${counts.p} pages (~${(content.length / 1024).toFixed(1)} KB each), ${counts.h} highlights\n`);
console.log('SQL time only (node:sqlite, no IPC). median of 7 runs:\n');
for (const r of results) {
  const scanNote = r.scans ? '   SCAN: ' + r.scans : '';
  console.log(`${r.median.toFixed(2).padStart(8)} ms  ${String(r.calls).padStart(2)} call(s)  ${r.name}${scanNote}`);
}
console.log('\nupdatePage (an editor autosave), by highlights on the page:\n');
for (const r of pageEditor) console.log(`${r.ms.toFixed(2).padStart(8)} ms  ${String(r.calls).padStart(3)} calls  ${r.highlights} highlights`);
