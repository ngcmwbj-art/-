// ロジックのテスト（画面なし）：node tests/sim.js
// - すべてのカードを、使える状況で実際に1回以上使う
// - 3タイプそれぞれ、ランダムに遊ぶボットで何十回も挑戦して、例外や無限ループがないか調べる
'use strict';
const vm = require('vm');
const fs = require('fs');
const path = require('path');
global.window = global;
const root = path.join(__dirname, '..');
['data/config.js', 'data/crops.js', 'data/animals.js', 'data/cards.js', 'data/statuses.js', 'data/enemies.js', 'data/encounters.js', 'data/relics.js', 'data/farmers.js',
 'js/core/util.js', 'js/core/state.js', 'js/core/effects.js', 'js/battle.js', 'js/reward.js', 'js/score.js']
  .forEach(f => vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f }));

let failures = 0;
const fail = msg => { failures++; console.log('NG:', msg); };

// データの整合性：art・crop・animal・status の参照先があるか
const artNames = new Set(fs.readdirSync(path.join(root, 'assets/img/art')).map(f => f.replace('.svg', '')));
for (const [id, c] of Object.entries(FR.Cards)) {
  if (c.unplayable) continue;
  if (!artNames.has(c.art)) fail(`カード ${id} の絵 ${c.art} がない`);
  if (!fs.existsSync(path.join(root, 'assets/img/cards', id + '.jpg'))) fail(`カード ${id} の絵（JPEG）がない`);
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
      const alive = FR.Battle.aliveEnemies(b);
      const target = alive[Math.floor(rnd() * alive.length)].uid;
      if (FR.Battle.needsTarget(b, inst) && FR.Battle.play(b, inst.uid)) fail('狙いなしで1体狙いのカードが使えてしまった: ' + inst.id);
      if (!FR.Battle.play(b, inst.uid, target)) fail('使えるはずのカードが使えない: ' + inst.id);
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
    if (Number.isNaN(b.run.gold) || b.enemies.some(e => Number.isNaN(e.hp) || e.hp < 0)) fail('NaN か負の勢い');
    if (!b.over && !FR.Battle.aliveEnemies(b).length) fail('敵が全滅したのに戦闘が終わっていない');
    b.fx.length = 0;
  }
  return b;
}

// 顔ぶれ：すべての敵がどこかの顔ぶれに出てくるか
const appear = new Set(FR.Encounters.flatMap(e => e.enemies));
Object.keys(FR.Enemies).forEach(id => appear.has(id) || fail('どの顔ぶれにも出ない敵: ' + id));
FR.Encounters.forEach(e => e.enemies.forEach(id => FR.Enemies[id] || fail('顔ぶれの敵がない: ' + id)));

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

// 敵：すべての行動を、作物・木・家畜がある状態で1回ずつ実行する
const INTENTS = ['attack', 'steal', 'trample', 'blight', 'debuff', 'addCard', 'infect', 'heal', 'buff'];
for (const [id, def] of Object.entries(FR.Enemies)) {
  const ok = def.art.startsWith('enemy:') ? fs.existsSync(path.join(root, 'assets/img/enemies', def.art.slice(6) + '.png')) : artNames.has(def.art);
  if (!ok) fail(`敵 ${id} の絵 ${def.art} がない`);
  for (const [mk, m] of Object.entries(def.moves)) {
    if (!INTENTS.includes(m.intent)) fail(`敵 ${id} の行動 ${mk} の種類 ${m.intent} が不明`);
    if (m.intent === 'debuff' && !FR.Statuses[m.status]) fail(`敵 ${id} の状態 ${m.status} がない`);
    if (m.intent === 'addCard' && !FR.Cards[m.card]) fail(`敵 ${id} のカード ${m.card} がない`);
    for (const farmerId of Object.keys(FR.Farmers)) {
      const run = FR.Run.create(farmerId, 11);
      const b = FR.Battle.create(run);
      b.enemies = [{ uid: 1, id, def, name: def.name, hp: 30, maxHp: 50, strength: 0, dead: false, turnsLeft: def.turns || null, moveIndex: 0, intent: Object.assign({ key: mk }, m) }];
      if (b.plots.length) b.plots[0] = { crop: 'komatsuna', growth: 1, stages: 2 };
      if (b.plots.length > 1) b.plots[1] = { crop: 'unshu', tree: true, growth: 2, stages: 2, fruits: 2, maxFruits: 3 };
      if (b.barns.length) b.barns[0] = { animal: 'calf', growth: 2, stages: 3, care: 2 };
      const label = FR.Battle.intentLabel(b, b.enemies[0]);
      if (!label || label.value === undefined) fail(`敵 ${id} の ${mk} の予告が作れない`);
      const before = JSON.stringify([run.hp, b.plots, b.barns, b.statuses, b.discard.length, b.enemies[0].hp, b.enemies[0].strength]);
      try { FR.Battle.enemyAct(b); } catch (err) { fail(`敵 ${id} の ${mk} で例外: ${err.message}`); continue; }
      const after = JSON.stringify([run.hp, b.plots, b.barns, b.statuses, b.discard.length, b.enemies[0].hp, b.enemies[0].strength]);
      if (before === after) fail(`敵 ${id} の ${mk}（${farmerId}）で何も起きない`);
    }
  }
}
// 天候はターン数がたつと過ぎ去って勝ちになる
{
  const run = FR.Run.create('vegetable', 5);
  const b = FR.Battle.create(run);
  const def = FR.Enemies.frost;
  b.enemies = [{ uid: 1, id: 'frost', def, name: def.name, hp: 999, maxHp: 999, strength: 0, dead: false, turnsLeft: def.turns, moveIndex: 0, intent: null }];
  FR.Battle.chooseIntents(b);
  run.hp = 999; run.maxHp = 999;
  for (let t = 0; t < def.turns && !b.over; t++) FR.Battle.endTurn(b);
  if (!b.won) fail('天候が過ぎ去っても勝ちにならない');
}
// 病斑は使えず、報酬にも出ない
{
  const run = FR.Run.create('vegetable', 5);
  const b = FR.Battle.create(run);
  if (FR.Battle.canPlay(b, { uid: 1, id: 'lesion' }).ok) fail('病斑が使えてしまう');
  for (let k = 0; k < 50; k++) { run.battleIndex = k; if (FR.Reward.make(run).cards.includes('lesion')) fail('病斑が報酬に出た'); }
}

// 1枚ずつ：使える状況を作って直接使い、期待どおり状態が変わるか
for (const [id, c] of Object.entries(FR.Cards)) {
  if (c.unplayable) continue;
  for (const upgraded of [false, true]) {
    const farmerId = c.pool.includes('common') ? 'livestock' : c.pool[0];
    const run = FR.Run.create(farmerId, 7);
    const b = FR.Battle.create(run);
    b.enemies.forEach(e => { e.hp = e.maxHp = 999; });
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
    const ehp = () => b.enemies.reduce((t, e) => t + e.hp, 0);
    const snap = JSON.stringify([ehp(), b.block, b.hand.length - 1, b.plots, b.barns, b.statuses, run.hp, run.gold, b.energy - FR.cardView(inst).cost]);
    const ok = FR.Battle.play(b, 999, b.enemies[0].uid);
    if (!ok) { fail(`${id}${upgraded ? '+' : ''} が使えない: ${FR.Battle.canPlay(b, inst).reason}`); continue; }
    played[id] = (played[id] || 0) + 1;
    const after = JSON.stringify([ehp(), b.block, b.hand.length, b.plots, b.barns, b.statuses, run.hp, run.gold, b.energy]);
    if (after === snap) fail(`${id}${upgraded ? '+' : ''} を使っても何も変わらない`);
  }
}

// すべてのカードが使われたか（強化前）
const unused = Object.keys(FR.Cards).filter(id => !played[id] && !FR.Cards[id].unplayable);
if (unused.length) fail('一度も使われなかったカード: ' + unused.join(', '));
console.log('ボットの成績（ランダムに遊んだ場合）', results);
console.log('使われたカード', Object.keys(played).length, '種（強化後を含む）');
console.log(failures ? `失敗 ${failures} 件` : 'すべて OK');
process.exit(failures ? 1 : 0);
