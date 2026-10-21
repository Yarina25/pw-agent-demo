import fs from 'node:fs';

const file = process.argv[2] || 'explore/run_final.json';
const raw = fs.readFileSync(file);
let text = raw[0] === 0xff && raw[1] === 0xfe ? raw.toString('utf16le') : raw.toString('utf8');
text = text.slice(text.indexOf('{'));
const data = JSON.parse(text);

const rows = [];
function walk(suites, path) {
  for (const s of suites || []) {
    const p = s.title ? `${path} > ${s.title}` : path;
    for (const spec of s.specs || []) {
      for (const t of spec.tests || []) {
        const r = (t.results || [])[0] || {};
        rows.push({
          title: `${p} > ${spec.title}`,
          status: r.status || t.status,
          duration: r.duration || 0,
          error: r.error && r.error.message ? String(r.error.message).slice(0, 600) : '',
        });
      }
    }
    walk(s.suites, p);
  }
}
walk(data.suites, '');

const stats = data.stats || {};
const out = {
  stats,
  total: rows.length,
  byStatus: rows.reduce((acc, r) => ((acc[r.status] = (acc[r.status] || 0) + 1), acc), {}),
  failed: rows.filter((r) => r.status !== 'passed' && r.status !== 'skipped'),
  skipped: rows.filter((r) => r.status === 'skipped').map((r) => r.title),
  slowest: [...rows].sort((a, b) => b.duration - a.duration).slice(0, 8).map((r) => `${r.title} :: ${r.duration}ms`),
};
fs.writeFileSync('explore/run_final.summary.json', JSON.stringify(out, null, 2), 'utf8');
console.log('stats:', JSON.stringify(stats));
console.log('total:', out.total, 'byStatus:', JSON.stringify(out.byStatus));
console.log('--- failed ---');
for (const f of out.failed) console.log(`[${f.status}] ${f.title}\n    ${f.error.replace(/\n/g, '\n    ')}`);
console.log('--- skipped ---');
for (const s of out.skipped) console.log(' ', s);
console.log('--- slowest ---');
for (const s of out.slowest) console.log(' ', s);
