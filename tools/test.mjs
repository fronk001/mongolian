/** Smoke tests for core/. Run: node tools/test.mjs */
import { makeFSRS } from '../src/core/fsrs.js';
import { blank, migrateV1, encodeCode, importCode, stats } from '../src/core/progress.js';
import { buildSession, applyGrade } from '../src/core/scheduler.js';
import { gradeText } from '../src/core/grade.js';
import fs from 'node:fs';

let pass = 0, fail = 0;
const ok = (name, cond) => { cond ? pass++ : fail++; console.log((cond ? '  ok  ' : ' FAIL ') + name); };

const W = JSON.parse(fs.readFileSync(new URL('../src/data/words.json', import.meta.url)));
const S = JSON.parse(fs.readFileSync(new URL('../src/data/sentences.json', import.meta.url)));

console.log('fsrs');
const f = makeFSRS();
ok('R(t=S) === 0.90', Math.abs(f.retrievability(10, 10) - 0.9) < 1e-9);
ok('interval(S) === S', Math.abs(f.interval(10) - 10) < 1e-9);
const pv = f.preview({ s: 10, d: 5, reps: 3, lapses: 0 }, 10);
ok('grades produce ascending intervals', pv[0] <= pv[1] && pv[1] <= pv[2] && pv[2] <= pv[3]);

console.log('grade');
ok('exact match', gradeText('door', 'door', 0.2).ok);
ok('slash variant accepted', gradeText('yard', 'yard/fence', 0.2).ok);
ok('short words are not typos', !gradeText('cat', 'eat', 0.2).ok);
ok('empty is wrong', !gradeText('', 'door', 0.2).ok);

console.log('progress');
const v1 = { learned: [90, 91], words: { 90: { box: 5, right: 9, wrong: 0 }, 91: { box: 0, right: 0, wrong: 4 } }, day: 2, newPerDay: 3, history: [] };
const m = migrateV1(v1);
ok('v1 migrates', Object.keys(m.items).length === 2 && m.schema === 2);
ok('strong word is easier than weak word', m.items[90].d < m.items[91].d);
ok('v1 backup code still imports', importCode(encodeCode(v1))?.schema === 2);
ok('v2 code round-trips', JSON.stringify(importCode(encodeCode(m))) === JSON.stringify(m));
ok('garbage rejected', importCode('nonsense') === null);

console.log('scheduler');
let p = blank();
const s1 = buildSession(p, W, S, { today: '2026-08-06' });
ok('cold start produces items', s1.items.length > 0);
ok('cold start is all i+1', s1.diagnostics.iPlusOneShare === 1);
s1.items.forEach(i => (i.kind === 'sentence' ? i.targetIds : [i.word.id]).forEach(id => applyGrade(p, id, 3, { today: '2026-08-06' })));
ok('no duplicate introductions', p.introduced.length === new Set(p.introduced).size);
const s2 = buildSession(p, W, S, { today: '2026-08-07' });
ok('day 2 introduces different words', !s2.fresh.some(id => s1.fresh.includes(id)));
ok('stats compute', stats(p).tracked > 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
