// ロジックのテスト（画面なし）：node tests/sim.js
// - すべてのカードを、使える状況で実際に1回以上使う
// - 3タイプそれぞれ、ランダムに遊ぶボットで何十回も挑戦して、例外や無限ループがないか調べる
'use strict';
const vm = require('vm');
const fs = require('fs');
const path = require('path');
global.window = global;
const root = path.join(__dirname, '..');
['data/config.js', 'data/crops.js', 'data/animals.js', 'data/cards.js', 'data/statuses.js', 'data/enemies.js', 'data/relics.js', 'data/farmers.js',
 'js/core/util.js', 'js/core/state.js', 'js/core/effects.js', 'js/battle.js', 'js/reward.js', 'js/score.js']
  .forEach(f => vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f }));

let failures = 0;
const fail = msg => { failures++; console.log('NG:', msg); };

// データの整合性：art・crop・animal・status の参照先があるか
const artNames = new Set(fs.readdirSync(path.join(root, 'assets/img/art')).map(f => f.replace('.svg', '')));
for (const [id, c] of Object.entries(FR.Cards)) {
  if (!artNames.has(c.art)) fail(`カード ${id} の絵 ${c.art} がない`);
  if (!FR.CardTypes[c.type]) fail(`カード ${id} の種類 ${c.type} が不明`);
  if (c.needs && !FR.Battle.NEEDS[c.needs]) fail(`カード ${id} の条件 ${c.needs} が不明`);
  for (const e of [...c.effects, ...((c.upgrade && c.upgrade.effects) || [])]) {
    if (!FR.Effects.OPS[e.op]) fail(`カード ${id} の効果 ${e.op} が不明`);
    if (e.op === 'plant' && !FR.Crops[e.crop]) fail(`カード ${id} の作物 ${e.crop} がない`);
    if (e.op === 'addAnimal' && !FR.Animals[e.animal]) fail(`カード ${id} の家畜 ${e.animal} がない`);
    if (e.op === 'status' && !FR.Statuses[e.id]) fail(`カード ${id} の状態 ${e.id} がない`);
  }
}
for (const f of Object.values(FR.Farmers)) f.deck.forEach(id => FR.Cards[id] || fail(`初期デッキの ${id} がない`));

// ボット：使えるカードをランダムに使う（たまに何もせずターン終了）
function botBattle(run, rnd, played) {
  const b = FR.Battle.create(run);
  let guard = 0;
  while (!b.over) {
    if (++guard > 5000) { fail('戦闘が終わらない'); break; }
    const playable = b.hand.filter(c => FR.Battle.canPlay(b, c).ok);
    if (playable.length && rnd() < 0.9) {
      const inst = playable[Math.floor(rnd() * playable.length)];
      const before = b.hand.length;
      if (!FR.Battle.play(b, inst.uid)) fail('使えるはずのカードが使えない: ' + inst.id);
      played[inst.id + (inst.upgraded ? '+' : '')] = (played[inst.id + (inst.upgraded ? '+' : '')] || 0) + 1;
      if (b.hand.length > FR.Config.handMax) fail('手札が上限を超えた');
    } else {
      FR.Battle.endTurn(b);
    }
    // 状態の検査
    b.plots.forEach(p => { if (p && p.tree && (p.fruits < 0 || p.fruits > p.maxFruits)) fail('実の数がおかしい ' + JSON.stringify(p)); });
    b.barns.forEach(a => { if (a && (a.growth > a.stages || a.growth < 0)) fail('家畜の段がおかしい'); });
    if (b.energy < 0) fail('エネルギーがマイナス');
    if (b.run.hp < 0 || b.run.hp > b.run.maxHp) fail('健康度が範囲外');
    if (Number.isNaN(b.run.gold) || Number.isNaN(b.enemy.hp)) fail('NaN');
    b.fx.length = 0;
  }
  return b;
}

const played = {};
const results = {};
for (const farmerId of Object.keys(FR.Farmers)) {
  const scores = [];
  for (let k = 0; k < 60; k++) {
    const seed = 1000 + k;
    const rnd = FR.Util.rng(seed * 31);
    const run = FR.Run.create(farmerId, seed);
    // 2戦に1回、強化済みのカードを混ぜる（強化後の効果も試す）
    for (let n = 0; n < 30 && run.hp > 0; n++) {
      const b = botBattle(run, rnd, played);
      if (!b.won) break;
      const rw = FR.Reward.make(run);
      if (rw.cards.some(id => { const c = FR.Cards[id]; return !(c.pool.includes('common') || c.pool.includes(farmerId)); })) fail('他のタイプのカードが報酬に出た');
      FR.Run.addCard(run, rw.cards[Math.floor(rnd() * rw.cards.length)], rnd() < 0.5);
      run.battleIndex++;
    }
    scores.push(run.stats.battlesWon);
  }
  results[farmerId] = { 平均勝利数: (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1), 最大: Math.max(...scores) };
}

// 1枚ずつ：使える状況を作って直接使い、期待どおり状態が変わるか
for (const [id, c] of Object.entries(FR.Cards)) {
  for (const upgraded of [false, true]) {
    const farmerId = c.pool.includes('common') ? 'livestock' : c.pool[0];
    const run = FR.Run.create(farmerId, 7);
    const b = FR.Battle.create(run);
    b.enemy.hp = b.enemy.maxHp = 999;
    // 畑：実った野菜・実のなった木・空き / 畜舎：出荷できる家畜・空き
    b.plots = [{ crop: 'komatsuna', growth: 2, stages: 2 }, { crop: 'unshu', tree: true, growth: 2, stages: 2, fruits: 1, maxFruits: 3 },
               { crop: 'yuzu', tree: true, growth: 0, stages: 3, fruits: 0, maxFruits: 3 }, null];
    b.barns = [{ animal: 'calf', growth: 3, stages: 3, care: 4 }, { animal: 'piglet', growth: 0, stages: 2, care: 0 }, null];
    b.discard.push({ uid: 900, id: 'sowKomatsuna', upgraded: false });
    b.energy = 10;
    const inst = { uid: 999, id, upgraded };
    b.hand.push(inst);
    run.hp = run.maxHp - 20;
    // 使ったカード自身が手札から減る分とエネルギーの支払いは除いて比べる
    const snap = JSON.stringify([b.enemy.hp, b.block, b.hand.length - 1, b.plots, b.barns, b.statuses, run.hp, run.gold, b.energy - FR.cardView(inst).cost]);
    const ok = FR.Battle.play(b, 999);
    if (!ok) { fail(`${id}${upgraded ? '+' : ''} が使えない: ${FR.Battle.canPlay(b, inst).reason}`); continue; }
    played[id] = (played[id] || 0) + 1;
    const after = JSON.stringify([b.enemy.hp, b.block, b.hand.length, b.plots, b.barns, b.statuses, run.hp, run.gold, b.energy]);
    if (after === snap) fail(`${id}${upgraded ? '+' : ''} を使っても何も変わらない`);
  }
}

// すべてのカードが使われたか（強化前）
const unused = Object.keys(FR.Cards).filter(id => !played[id]);
if (unused.length) fail('一度も使われなかったカード: ' + unused.join(', '));
console.log('ボットの成績（ランダムに遊んだ場合）', results);
console.log('使われたカード', Object.keys(played).length, '種（強化後を含む）');
console.log(failures ? `失敗 ${failures} 件` : 'すべて OK');
process.exit(failures ? 1 : 0);
