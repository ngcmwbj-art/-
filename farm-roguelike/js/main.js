'use strict';
/* =========================================================
   起動と画面のつなぎ役
   タイトル → 農家タイプ選択 → 戦闘 → 報酬 → 戦闘 … → 健康度0で経営評価
   （②でマップ、③で市場・休憩・イベント、④で季節とボスが間に入る）
   ========================================================= */
const App = {
  data: null,     // 保存データ { run, meta }
  battle: null,   // 戦闘中の状態
  rewardPick: null,

  init() {
    App.data = FR.Save.load();
    document.querySelectorAll('[data-game-title]').forEach(el => { el.textContent = FR.Config.title; });
    document.querySelectorAll('[data-game-subtitle]').forEach(el => { el.textContent = FR.Config.subtitle; });
    document.title = FR.Config.title;

    // タイトル
    document.getElementById('btn-new').onclick = () => App.showSelect();
    document.getElementById('btn-continue').onclick = () => App.resume();
    // 戦闘
    document.getElementById('b-end').onclick = () => App.endTurn();
    document.getElementById('b-harvest').onclick = () => App.harvestNow();
    document.getElementById('b-menu').onclick = () => App.showMenu();
    document.getElementById('b-pile-draw').onclick = () => App.showPile('山札', App.battle.draw, true);
    document.getElementById('b-pile-discard').onclick = () => App.showPile('捨て札', App.battle.discard);
    // 敵をタップ：カードを選んでいればその敵に使う。選んでいなければ敵の説明
    document.getElementById('b-enemies').onclick = ev => {
      const u = ev.target.closest('.enemy-unit');
      if (!u || !App.battle) return;
      const e = App.battle.enemies.find(x => x.uid === +u.dataset.uid);
      if (!e || e.dead) return;
      if (FR.HandInput.selected) { App.playCard(FR.HandInput.selected, e.uid); return; }
      const it = FR.Battle.intentLabel(App.battle, e);
      FR.Screens.toast(`${e.name}　勢い ${e.hp}/${e.maxHp}${e.strength ? '　力+' + e.strength : ''}　次は「${it.name}」`);
    };
    document.getElementById('b-relics').onclick = ev => {
      const btn = ev.target.closest('[data-relic]');
      if (!btn) return;
      const r = FR.Relics[btn.dataset.relic];
      FR.Screens.modal(r.name, `<p class="relic-text">${FR.Util.escape(r.text)}</p>`);
    };
    // 区画・畜舎をタップすると説明
    document.getElementById('b-field').onclick = ev => {
      const bt = App.battle;
      const pe = ev.target.closest('.plot');
      const be = ev.target.closest('.barn');
      if (pe) {
        const i = +pe.dataset.plot;
        if (!bt.plots[i]) { FR.Screens.toast('空いた区画。種まきや苗木の植え付けで使う'); return; }
        App.showCrop(i);
      } else if (be) {
        const i = +be.dataset.barn;
        if (!bt.barns[i]) { FR.Screens.toast('空いた畜舎。子牛導入などで使う'); return; }
        App.showAnimal(i);
      }
    };
    FR.HandInput.attach(document.getElementById('hand'), {
      onPlay: (uid, targetUid) => App.playCard(uid, targetUid),
      onSelect: () => App.battle && FR.BattleView.updateTargeting(App.battle)
    });
    // ダイアログを閉じる
    document.getElementById('modal').onclick = ev => {
      if (ev.target.id === 'modal' || ev.target.closest('.modal-close')) FR.Screens.closeModal();
    };
    // 報酬
    document.getElementById('reward-take').onclick = () => App.takeReward(App.rewardPick);
    document.getElementById('reward-skip').onclick = () => App.takeReward(null);
    document.getElementById('reward-cards').onclick = ev => {
      const c = ev.target.closest('.card');
      if (!c) return;
      App.rewardPick = c.dataset.id;
      document.querySelectorAll('#reward-cards .card').forEach(x => x.classList.toggle('selected', x === c));
      document.getElementById('reward-take').disabled = false;
    };
    // 経営評価
    document.getElementById('btn-again').onclick = () => App.showSelect();
    document.getElementById('btn-title').onclick = () => App.showTitle();

    App.showTitle();
  },

  save() { FR.Save.write(App.data); },

  // ── タイトル ───────────────────────────────
  showTitle() {
    const has = !!App.data.run;
    document.getElementById('btn-continue').hidden = !has;
    document.getElementById('title-best').textContent = App.data.meta.best ? `最高の経営評価 ${App.data.meta.best}点` : '';
    FR.Screens.show('title');
  },

  // ── 農家タイプ選択 ────────────────────────────
  showSelect() {
    const E = FR.Util.escape;
    const list = document.getElementById('farmer-list');
    list.innerHTML = Object.keys(FR.Farmers).map(id => {
      const f = FR.Farmers[id];
      return `<button class="farmer ${f.enabled ? '' : 'locked'}" data-farmer="${id}" ${f.enabled ? '' : 'disabled'}>
        <span class="farmer-art">${FR.Art.farmerImg(id, f.name)}</span>
        <span class="farmer-body">
          <span class="farmer-name">${E(f.name)}${f.enabled ? '' : '<em>準備中</em>'}</span>
          <span class="farmer-text">${E(f.text)}</span>
          <span class="farmer-hp">健康度 ${f.hp}</span>
        </span>
      </button>`;
    }).join('');
    list.onclick = ev => {
      const b = ev.target.closest('[data-farmer]');
      if (b && !b.disabled) App.newRun(b.dataset.farmer);
    };
    FR.Screens.show('select');
  },

  newRun(farmerId) {
    App.data.run = FR.Run.create(farmerId, FR.Util.newSeed());
    App.data.meta.runs++;
    App.startBattle();
  },

  resume() {
    const run = App.data.run;
    if (!run) return App.showTitle();
    if (run.phase === 'reward') App.showReward();
    else App.startBattle();
  },

  // ── 戦闘 ─────────────────────────────────
  startBattle() {
    const run = App.data.run;
    run.phase = 'battle';
    App.save();   // 戦闘の途中で閉じたら、この時点からやり直し
    App.battle = FR.Battle.create(run);
    FR.HandInput.locked = false;
    FR.HandInput.clear();
    FR.Screens.show('battle');
    App.refresh();
  },

  refresh() {
    FR.BattleView.render(App.battle);
    FR.BattleView.playFx(App.battle);
  },

  // 戦闘のテンポ（ミリ秒）。数を大きくするとゆっくりになる
  TEMPO: {
    fly: 380,         // カードが飛んでいく時間
    afterPlay: 350,   // カードの効果が出たあと、次の操作ができるまで
    discard: 450,     // ターン終了で手札を捨てる
    banner: 900,      // 「敵のターン」の文字
    enemyWindup: 320, // 敵が前に出てから当たるまで
    enemyGap: 950,    // 敵1体ごとの間
    endBattle: 1700   // 勝ち負けが決まってから次の画面まで
  },
  wait(ms) { return new Promise(r => setTimeout(r, ms)); },

  playCard(uid, targetUid) {
    const b = App.battle;
    if (!b || b.over || FR.HandInput.locked) return;
    const inst = b.hand.find(c => c.uid === uid);
    if (!inst) return;
    // 敵が2体以上いて、1体を狙うカードなら、敵を選んでもらう
    if (FR.Battle.canPlay(b, inst).ok && FR.Battle.needsTarget(b, inst) && !b.enemies.some(e => e.uid === targetUid && !e.dead)) {
      FR.HandInput.select(uid);
      FR.Screens.toast('どの敵に使う？　敵をタップ');
      return;
    }
    const chk = FR.Battle.canPlay(b, inst);
    if (!chk.ok) { FR.Screens.toast(chk.reason, 'warn'); return; }
    const v = FR.cardView(inst);
    const T = App.TEMPO;
    // 狙う先：1体狙いなら選んだ敵、攻撃なら先頭の敵、それ以外は自分の畑のあたり
    const alive = FR.Battle.aliveEnemies(b);
    const targetEnemy = b.enemies.find(e => e.uid === targetUid && !e.dead) || (alive.length === 1 ? alive[0] : null);
    const isAttack = v.effects.some(e => /^damage/.test(e.op));
    const enemyEl = e => e && document.querySelector(`.enemy-unit[data-uid="${e.uid}"] .unit-art`);
    const flyTo = isAttack ? (enemyEl(targetEnemy) || document.getElementById('b-enemies')) : document.getElementById('b-player-art');
    FR.HandInput.locked = true;
    FR.HandInput.clear();
    const cardEl = document.querySelector(`#hand .card[data-uid="${uid}"]`);
    FR.BattleView.flyCard(cardEl, flyTo);
    if (cardEl) cardEl.style.visibility = 'hidden';
    if (isAttack) FR.BattleView.lunge(document.getElementById('b-player-art'), 'right');
    setTimeout(() => {
      FR.Battle.play(b, uid, targetUid);
      App.refresh();
      setTimeout(() => {
        FR.HandInput.locked = false;
        if (b.over) App.afterBattle(); else FR.BattleView.render(b);
      }, T.afterPlay);
    }, T.fly);
  },

  // 収穫ボタン（エネルギーを使わない）
  harvestNow() {
    const b = App.battle;
    if (!b || b.over || FR.HandInput.locked || !FR.Battle.canHarvestNow(b)) return;
    FR.Battle.harvestButton(b);
    App.refresh();
    if (b.over) App.afterBattle();
  },

  // ターン終了：手札を捨てる → 「敵のターン」 → 敵が1体ずつ動く → 作物が育つ → 「あなたのターン」
  async endTurn() {
    const b = App.battle;
    if (!b || b.over || FR.HandInput.locked) return;
    const T = App.TEMPO;
    FR.HandInput.locked = true;
    FR.HandInput.clear();
    document.getElementById('b-end').disabled = true;
    document.getElementById('b-harvest').disabled = true;
    document.getElementById('hand').classList.add('discarding');
    await App.wait(T.discard);
    FR.Battle.endTurnBegin(b);
    document.getElementById('hand').classList.remove('discarding');
    FR.BattleView.render(b);
    FR.BattleView.banner('敵のターン', 'enemy');
    await App.wait(T.banner);
    for (const e of FR.Battle.aliveEnemies(b)) {
      if (b.over) break;
      FR.BattleView.lunge(document.querySelector(`.enemy-unit[data-uid="${e.uid}"] .unit-art`), 'left');
      await App.wait(T.enemyWindup);
      FR.Battle.enemyActOne(b, e);
      App.refresh();
      await App.wait(T.enemyGap);
    }
    if (!b.over) {
      FR.Battle.endTurnFinish(b);
      FR.HandInput.locked = false;
      App.refresh();
      if (!b.over) FR.BattleView.banner('あなたのターン');
    }
    FR.HandInput.locked = false;
    FR.BattleView.render(b);
    if (b.over) App.afterBattle();
  },

  afterBattle() {
    const b = App.battle;
    FR.HandInput.locked = true;
    FR.BattleView.render(b);
    FR.BattleView.banner(b.won ? '追い払った' : '力尽きた', b.won ? '' : 'enemy');
    setTimeout(() => {
      if (b.won) {
        const run = App.data.run;
        run.phase = 'reward';
        run.reward = FR.Reward.make(run);
        run.reward.autoHarvestGold = b.autoHarvestGold || 0;
        run.gold += run.reward.gold;
        run.stats.goldEarned += run.reward.gold;
        App.save();
        App.showReward();
      } else {
        App.endRun();
      }
    }, App.TEMPO.endBattle);
  },

  // 選んだ区画・畜舎だけを収穫／出荷する
  harvestOne(kind, i) {
    const b = App.battle;
    if (!b || b.over || FR.HandInput.locked) return;
    FR.Screens.closeModal();
    if (!FR.Battle.harvestOne(b, kind, i)) return;
    App.refresh();
    if (b.over) App.afterBattle();
  },

  // 説明の下に置く「収穫する」ボタン（押せないときは理由を出す）
  actionButton(kind, i, ok, label, why) {
    const can = ok && !FR.HandInput.locked;
    return `<div class="menu-actions"><button class="btn primary" id="act-one" data-kind="${kind}" data-i="${i}" ${can ? '' : 'disabled'}>${label}</button></div>
      ${!can ? `<p class="menu-note act-why">${FR.HandInput.locked ? '敵のターンが終わるまで待ってください' : why}</p>` : ''}`;
  },
  bindAction() {
    const btn = document.getElementById('act-one');
    if (btn) btn.onclick = () => App.harvestOne(btn.dataset.kind, +btn.dataset.i);
  },

  // 作物・木の説明と「収穫する」
  showCrop(i) {
    const b = App.battle;
    const p = b.plots[i];
    const E = FR.Util.escape;
    const c = FR.Crops[p.crop];
    const mature = p.growth >= p.stages;
    let rows, ok, label, why;
    if (p.tree) {
      const ripen = b.statuses.ripening || 0;
      const gold = c.fruitGold + ripen * 3;
      rows = `
        <div class="ai-row"><span>育ち</span><b>${p.growth} / ${p.stages}段</b><em>${mature ? '成木。毎ターン終わりに実が1つなる' : `あと${p.stages - p.growth}段で成木`}</em></div>
        <div class="ai-row"><span>実</span><b>${p.fruits} / ${p.maxFruits}</b><em>上限までなると、それ以上はならない</em></div>
        <div class="ai-row"><span>実1つで</span><b>銭 ${gold}</b><em>${E(c.harvestText)}${b.statuses.bigFruit ? '（摘果で効果2倍）' : ''}${ripen ? `・守り+${ripen * 2}` : ''}</em></div>
        <div class="ai-row"><span>いま摘むと</span><b>銭 ${gold * p.fruits}</b><em>木は残る</em></div>`;
      ok = p.fruits > 0; label = p.fruits ? `実を${p.fruits}つ摘む` : '実を摘む'; why = 'まだ実がなっていない';
    } else {
      rows = `
        <div class="ai-row"><span>育ち</span><b>${p.growth} / ${p.stages}段</b><em>${mature ? '実った' : `あと${p.stages - p.growth}段。ターンの終わりや水やり・肥料で育つ`}</em></div>
        <div class="ai-row"><span>収穫すると</span><b>銭 ${c.gold}</b><em>${E(c.harvestText)}。区画が空く</em></div>`;
      ok = mature; label = 'この作物を収穫する'; why = 'まだ実っていない';
    }
    FR.Screens.modal(p.tree && !mature ? c.name + 'の苗木' : c.name, `<div class="animal-info">${rows}</div>` + App.actionButton('plot', i, ok, label, why));
    App.bindAction();
  },

  // 家畜の説明：育ち・手入れ・格付け・出荷の見込みと、格付けの表、「出荷する」。採卵鶏は卵の説明
  showAnimal(i) {
    const b = App.battle;
    const a = b.barns[i];
    const E = FR.Util.escape;
    const def = FR.Animals[a.animal];
    const mature = a.growth >= a.stages;
    const value = FR.Battle.shipValue(b, a);
    const contractText = b.statuses.contract ? ` × 契約${1 + 0.5 * b.statuses.contract}` : '';
    const growRow = `<div class="ai-row"><span>育ち</span><b>${a.growth} / ${a.stages}段</b><em>${mature
      ? (def.layer ? '成鶏。卵を産んでいる' : '出荷できる')
      : `あと${a.stages - a.growth}段。給餌などで育つ（自然には育たない）`}</em></div>`;

    if (def.layer) {
      FR.Screens.modal(mature ? def.matureName : def.name, `
        <div class="animal-info">
          ${growRow}
          <div class="ai-row"><span>産卵</span><b>${mature ? 'あり' : 'まだ'}</b><em>成鶏になると、毎ターン始めに卵を1つ産む（${E(def.turnText.replace('毎ターン卵：', ''))}）</em></div>
          <div class="ai-row"><span>産んだ卵</span><b>${a.eggs || 0}個</b><em>この戦闘で</em></div>
          <div class="ai-row"><span>廃鶏で出荷</span><b>銭 ${value}</b><em>卵を産み終えた鶏として引き取ってもらう。${E(def.shipText)}。「まとめて出荷」では出荷されない</em></div>
        </div>
        <p class="menu-note">採卵鶏に格付けはありません。手入れをしても値段は変わらず、置いておくほど卵で稼げます。</p>`
        + App.actionButton('barn', i, mature, `廃鶏として出荷する（銭${value}）`, 'まだ成鶏になっていない'));
      App.bindAction();
      return;
    }

    const table = FR.Battle.gradeTable(a.animal);
    const g = FR.Battle.gradeOf(a.care, 0, a.animal);
    const nx = FR.Battle.nextGrade(a.care, a.animal);
    const kind = def.grading === 'pork' ? '豚の格付け' : '牛の格付け';
    FR.Screens.modal(mature ? def.matureName : def.name, `
      <div class="animal-info">
        ${growRow}
        <div class="ai-row"><span>手入れ</span><b>${a.care}</b><em>${nx ? `あと${nx.need}で「${nx.grade.label}」` : 'いちばん上の格付け'}</em></div>
        <div class="ai-row"><span>格付け</span><b>${g.label}</b><em>銭が ×${g.mult}</em></div>
        <div class="ai-row"><span>出荷すると</span><b>銭 ${value}</b><em>基本 ${def.gold} × ${g.mult}${contractText}。${E(def.shipText)}</em></div>
      </div>
      <table class="grade-table"><thead><tr><th>${kind}</th>${table.map(x => `<th class="${x.label === g.label ? 'now' : ''}">${x.label}</th>`).join('')}</tr></thead>
        <tbody><tr><td>手入れ</td>${table.map(x => `<td class="${x.label === g.label ? 'now' : ''}">${x.care}〜</td>`).join('')}</tr>
        <tr><td>銭</td>${table.map(x => `<td class="${x.label === g.label ? 'now' : ''}">×${x.mult}</td>`).join('')}</tr></tbody></table>
      <p class="menu-note">手入れは、給餌・良質な乾草・ブラッシング・ワクチンなどのカードで増えます。</p>`
      + App.actionButton('barn', i, mature, `「${g.label}」で出荷する（銭${value}）`, 'まだ出荷できるまで育っていない'));
    App.bindAction();
  },

  showMenu() {
    const deck = App.data.run.deck.map(FR.cardView);
    FR.Screens.modal('畑の帳面', `
      <p class="menu-note">デッキ ${deck.length}枚</p>
      <div class="card-list">${deck.map(v => FR.renderCard(v)).join('')}</div>
      <div class="menu-actions"><button class="btn danger" id="btn-giveup">この挑戦をあきらめる</button></div>`);
    document.getElementById('btn-giveup').onclick = () => {
      // 1回目は確認の表示、もう一度押すと終える（confirm() が使えない環境のため）
      const btn = document.getElementById('btn-giveup');
      if (btn.dataset.armed) { FR.Screens.closeModal(); App.endRun(); return; }
      btn.dataset.armed = '1';
      btn.textContent = 'もう一度押すと、経営評価に進みます';
    };
  },

  showPile(title, pile, sorted) {
    let list = pile.map(FR.cardView);
    // 山札は順番がばれないように名前順で見せる
    if (sorted) list = list.slice().sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    FR.Screens.modal(`${title}（${list.length}枚）`, list.length
      ? `<div class="card-list">${list.map(v => FR.renderCard(v)).join('')}</div>`
      : '<p class="menu-note">ありません</p>');
  },

  // ── 報酬 ─────────────────────────────────
  showReward() {
    const run = App.data.run;
    const rw = run.reward;
    App.rewardPick = null;
    document.getElementById('reward-gold').textContent =
      `銭 +${rw.gold}` + (rw.autoHarvestGold ? `（実っていた作物を半値で収穫 +${rw.autoHarvestGold}）` : '');
    document.getElementById('reward-cards').innerHTML = rw.cards.map(id => FR.renderCard(FR.cardView({ id, uid: 0 }))).join('');
    document.getElementById('reward-take').disabled = true;
    document.getElementById('reward-status').textContent = `健康度 ${run.hp} / ${run.maxHp} ・ 銭 ${run.gold} ・ デッキ ${run.deck.length}枚`;
    FR.Screens.show('reward');
  },

  takeReward(cardId) {
    const run = App.data.run;
    if (cardId) FR.Run.addCard(run, cardId, false);
    run.reward = null;
    run.battleIndex++;
    App.startBattle();
  },

  // ── 経営評価 ──────────────────────────────
  endRun() {
    const run = App.data.run;
    const sc = FR.Score.calc(run);
    const isBest = sc.total > App.data.meta.best;
    App.data.meta.best = Math.max(App.data.meta.best, sc.total);
    App.data.run = null;
    App.save();
    const E = FR.Util.escape;
    document.getElementById('result-rank').textContent = sc.rank;
    document.getElementById('result-title').textContent = sc.title;
    document.getElementById('result-total').textContent = sc.total + '点' + (isBest ? '（最高記録）' : '');
    document.getElementById('result-parts').innerHTML = sc.parts.map(p =>
      `<tr><th>${E(p.label)}</th><td>${p.value}</td><td class="${p.points < 0 ? 'minus' : ''}">${p.points >= 0 ? '+' : ''}${p.points}</td></tr>`).join('');
    document.getElementById('result-lead').textContent = run.hp <= 0
      ? `${run.stats.battlesWon}度、害獣を追い払ったが、農場は力尽きた。`
      : `${run.stats.battlesWon}度、害獣を追い払い、この挑戦を終えた。`;
    FR.Screens.show('result');
  }
};

window.addEventListener('DOMContentLoaded', App.init);
// 画面の向きや大きさが変わったら手札を並べ直す
window.addEventListener('resize', () => { if (App.battle) FR.BattleView.fitHand(); });
// 縦横が変わったら背景を選び直す
window.matchMedia('(orientation: portrait)').addEventListener('change', () => {
  const box = document.querySelector('.scene');
  const cur = document.querySelector('.screen.active');
  if (box && cur) { delete box.dataset.key; FR.Screens.setBackground(cur.id.replace('screen-', '')); }
});
