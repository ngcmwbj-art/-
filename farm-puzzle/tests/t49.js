// データの点検（ブラウザ不要）：読みがなの印 {語|よみ} の書き方、旬の文とカレンダー、月の値、なかま
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'data');
const veg = JSON.parse(fs.readFileSync(path.join(dir, 'vegetables.json'), 'utf8'));
const msg = JSON.parse(fs.readFileSync(path.join(dir, 'messages.json'), 'utf8'));
const errors = [];
function walk(o, p) {
  if (typeof o === 'string') {
    if ((o.match(/\{/g) || []).length !== (o.match(/\}/g) || []).length) errors.push(`かっこの数 ${p}`);
    for (const m of o.matchAll(/\{([^}]*)\}/g)) {
      if (!m[1].includes('|')) continue;
      const [a, b] = m[1].split('|');
      if (!a || !b || !/^[ぁ-んー]+$/.test(b)) errors.push(`読みがなの印 ${p}: ${m[0]}`);
    }
  } else if (Array.isArray(o)) o.forEach((x, i) => walk(x, `${p}[${i}]`));
  else if (o && typeof o === 'object') Object.entries(o).forEach(([k, x]) => walk(x, `${p}.${k}`));
}
walk(veg, 'vegetables'); walk(msg, 'messages');
function months(s) {
  const out = new Set();
  for (const m of s.matchAll(/(\d+)〜(\d+)月/g)) {
    let a = +m[1]; const b = +m[2];
    for (;;) { out.add(a); if (a === b) break; a = a % 12 + 1; }
  }
  for (const m of s.matchAll(/(?<![〜\d])(\d+)月/g)) out.add(+m[1]);
  return out;
}
veg.vegetables.forEach((v) => {
  const first = v.seasonText.split('。')[0];
  [...months(first)].forEach((x) => { if (!v.guide.harvestMonths.includes(x)) errors.push(`旬の文とカレンダー ${v.id}: ${x}月`); });
  ['plantMonths', 'harvestMonths'].forEach((k) => v.guide[k].forEach((x) => { if (!(x >= 1 && x <= 12)) errors.push(`月の値 ${v.id}.${k}`); }));
  if (!v.family) errors.push(`なかまがない ${v.id}`);
});
console.log('vegetables', veg.vegetables.length);
console.log('errors', errors);
