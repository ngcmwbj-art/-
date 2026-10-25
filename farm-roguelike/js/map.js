'use strict';
/* =========================================================
   1年の進み方（季節・行き先の分かれ道・休憩所）
   - 1季節は FR.Seasons[i].steps 段。0段目は必ず戦い、最後の段は季節のボス
   - 1〜(最後-1)段目は、行き先を3つの中から選ぶ（戦い・市場・休憩所）。ボスの手前には必ず休憩所がある
   - 選択肢と戦いの顔ぶれはシード付き乱数で決まるので、閉じて開き直しても同じ
   ========================================================= */
FR.Map = {
  season(run) { return FR.Seasons[run.season]; },
  isBossStep(run) { return run.step >= FR.Map.season(run).steps - 1; },

  // 敵の強さの目安（春の最初が 0）
  level(run) { return run.season * 3 + Math.floor(run.step / 2); },

  bossId(run) {
    const s = FR.Map.season(run);
    return (s.bossBy && s.bossBy[run.farmerId]) || s.boss;
  },

  // この段の乱数（季節と段で決まる）
  rng(run, salt) {
    return FR.Util.rng(run.seed + run.season * 7907 + run.step * 613 + (salt || 0) * 31337);
  },

  // 季節に合う顔ぶれを1つ選ぶ（first：季節の1戦目なので弱いものだけ）
  pickEncounter(run, rnd, first, avoid) {
    let pool = FR.Encounters.filter(en => en.seasons.includes(run.season) && (!first || en.first));
    if (avoid && pool.length > 1) pool = pool.filter(en => !avoid.includes(en.id)) ;
    if (!pool.length) pool = FR.Encounters;
    return FR.Util.weighted(rnd, pool.map(en => ({ value: en.id, weight: en.weight * ((en.bias && en.bias[run.farmerId]) || 1) })));
  },

  // 今の段の選択肢をつくる
  makeChoices(run) {
    const rnd = FR.Map.rng(run, 1);
    if (FR.Map.isBossStep(run)) return [{ type: 'boss', boss: FR.Map.bossId(run) }];
    if (run.step === 0) return [{ type: 'battle', enc: FR.Map.pickEncounter(run, rnd, true) }];
    const last = run.step === FR.Map.season(run).steps - 2;
    const out = [{ type: 'battle', enc: FR.Map.pickEncounter(run, rnd, false) }];
    const rest = [];
    // 2つ目・3つ目：戦い／市場／休憩所から（同じ店や休憩所は並べない）
    while (out.length < 3) {
      const t = FR.Util.weighted(rnd, [{ value: 'battle', weight: 4 }, { value: 'market', weight: 3 }, { value: 'rest', weight: 3 }]);
      if (t === 'battle') {
        if (out.filter(o => o.type === 'battle').length >= 2) continue;
        out.push({ type: 'battle', enc: FR.Map.pickEncounter(run, rnd, false, out.map(o => o.enc)) });
      } else if (!out.some(o => o.type === t)) out.push({ type: t });
      if (++rest.length > 30) break;
    }
    // ボスの手前には必ず休憩所
    if (last && !out.some(o => o.type === 'rest')) out[2] = { type: 'rest' };
    return out;
  },

  // ── 休憩所 ─────────────────────────────────
  REST_HEAL: 0.3,
  // 3つ目の選択肢（農家タイプごと）：次の戦闘の始めにかかる状態
  REST_EXTRA: {
    vegetable: { name: '堆肥を積む', text: '次の戦闘の始めに、地力+1（作物がよく育つ）', status: 'soil', amount: 1 },
    citrus:    { name: '堆肥を積む', text: '次の戦闘の始めに、地力+1（木がよく育ち、実がよくなる）', status: 'soil', amount: 1 },
    livestock: { name: '畜舎を消毒する', text: '次の戦闘の間、家畜が病気にかからない', status: 'immune', amount: 1 }
  },
  restHealAmount(run) { return Math.max(1, Math.round(run.maxHp * FR.Map.REST_HEAL)); },
  restHeal(run) {
    const before = run.hp;
    run.hp = Math.min(run.maxHp, run.hp + FR.Map.restHealAmount(run));
    return run.hp - before;
  },
  upgradable(run) { return run.deck.filter(c => !c.upgraded && FR.Cards[c.id].upgrade); },
  upgrade(run, uid) {
    const c = run.deck.find(x => x.uid === uid);
    if (!c || c.upgraded || !FR.Cards[c.id].upgrade) return false;
    c.upgraded = true;
    return true;
  },
  restExtra(run) {
    const ex = FR.Map.REST_EXTRA[run.farmerId] || FR.Map.REST_EXTRA.vegetable;
    run.nextBattle = Object.assign({}, run.nextBattle, { [ex.status]: (run.nextBattle && run.nextBattle[ex.status] || 0) + ex.amount });
    return ex;
  },

  // ── 季節の終わり ──────────────────────────────
  // 季節を越えたときの回復。冬を越えたら true（クリア）
  endSeason(run) {
    const s = FR.Map.season(run);
    const heal = Math.round(run.maxHp * (s.heal || 0));
    run.hp = Math.min(run.maxHp, run.hp + heal);
    run.stats.seasonsCleared = (run.stats.seasonsCleared || 0) + 1;
    return { heal, clear: run.season >= FR.Seasons.length - 1 };
  },
  nextSeason(run) {
    run.season++;
    run.step = 0;
    run.choices = null;
  }
};
