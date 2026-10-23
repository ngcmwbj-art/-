// カードの一覧表（docs/cards.md）をデータから作る：node tools/card_list.js
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');
global.window = global;
const root = path.join(__dirname, '..');
['data/config.js', 'data/crops.js', 'data/animals.js', 'data/cards.js', 'data/farmers.js']
  .forEach(f => vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8')));
const R = { basic: '初期', common: 'よく出る', uncommon: 'ときどき', rare: 'まれ' };
const groups = [
  ['全員共通', id => FR.Cards[id].pool.includes('common')],
  ['野菜農家', id => FR.Cards[id].pool.includes('vegetable')],
  ['畜産農家', id => FR.Cards[id].pool.includes('livestock')],
  ['柑橘農家', id => FR.Cards[id].pool.includes('citrus')]
];
const order = { basic: 0, common: 1, uncommon: 2, rare: 3 };
let md = '# カード一覧\n\n`data/cards.js` から `node tools/card_list.js` で自動生成しています（手で直さないでください）。\n\n';
md += '各農家タイプの欄には、そのタイプの報酬に出るカード（他のタイプと共有のものも含む）を載せています。「全員共通」のカードはどのタイプにも出ます。\n\n';
for (const [title, f] of groups) {
  const ids = Object.keys(FR.Cards).filter(f).sort((a, b) => order[FR.Cards[a].rarity] - order[FR.Cards[b].rarity]);
  md += `## ${title}（${ids.length}種）\n\n| 名前 | 種類 | コスト | 出やすさ | 効果 | 強化すると |\n| --- | --- | --- | --- | --- | --- |\n`;
  for (const id of ids) {
    const c = FR.Cards[id];
    const u = c.upgrade || {};
    const up = [u.cost !== undefined && u.cost !== c.cost ? `コスト${u.cost}` : '', u.text || ''].filter(Boolean).join('。') || '—';
    md += `| ${c.name} | ${FR.CardTypes[c.type]} | ${c.cost} | ${R[c.rarity]} | ${c.text} | ${up} |\n`;
  }
  md += '\n';
}
md += '## 初期デッキ\n\n';
for (const f of Object.values(FR.Farmers)) {
  const cnt = {};
  f.deck.forEach(id => { cnt[id] = (cnt[id] || 0) + 1; });
  md += `- **${f.name}**：` + Object.entries(cnt).map(([id, n]) => `${FR.Cards[id].name}×${n}`).join('、') + '\n';
}
fs.writeFileSync(path.join(root, 'docs/cards.md'), md);
console.log('docs/cards.md を書き出しました');
