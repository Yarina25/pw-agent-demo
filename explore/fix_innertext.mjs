import fs from 'node:fs';
import path from 'node:path';

const dir = 'tests';
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.spec.ts'));
const re = /\.toContainText\(\s*('(?:[^'\\]|\\.)*'|`(?:[^`\\$]|\\.)*`)\s*\)/g;
let total = 0;
const report = [];
for (const f of files) {
  const p = path.join(dir, f);
  const src = fs.readFileSync(p, 'utf8');
  let n = 0;
  const next = src.replace(re, (_m, lit) => {
    n++;
    return `.toContainText(${lit}, { useInnerText: true })`;
  });
  if (n) {
    fs.writeFileSync(p, next, 'utf8');
    report.push(`${f}: ${n}`);
    total += n;
  }
}
console.log(report.join('\n'));
console.log('total rewritten:', total);
