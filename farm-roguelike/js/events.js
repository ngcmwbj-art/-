'use strict';
/* =========================================================
   出来事マス「？」の仕組み（中身は data/events.js）
   - どの出来事が起きるか・カードや農具の中身は、シード付き乱数で決まる（開き直しても同じ）
   - run.event = { id, chosen, log }：選ぶ前は chosen が null。選んだら log に起きたことを残す
   ========================================================= */
FR.EventRun = {
  // 今の段で起きる出来事を決める（季節と農家タイプに合うもの。同じ年にもう起きたものは避ける）
  pick(run) {
    const rnd = FR.Map.rng(run, 77);
    const seen = run.eventsSeen || [];
    let pool = Object.keys(FR.Events).filter(id => {
      const ev = FR.Events[id];
      return (!ev.farmers || ev.farmers.includes(run.farmerId)) && (!ev.seasons || ev.seasons.includes(run.season));
    });
    if (pool.some(id => !seen.includes(id))) pool = pool.filter(id => !seen.includes(id));
    return pool[Math.floor(rnd() * pool.length)];
  },

  start(run) {
    const id = FR.EventRun.pick(run);
    run.event = { id, chosen: null, log: [] };
    run.eventsSeen = (run.eventsSeen || []).concat(id);
    return run.event;
  },

  // その選び方が選べるか（銭が足りるか）
  canChoose(run, opt) { return !opt.need || run.gold >= opt.need; },

  choose(run, k) {
    const ev = run.event;
    const opt = ev && FR.Events[ev.id].options[k];
    if (!opt || ev.chosen !== null || !FR.EventRun.canChoose(run, opt)) return false;
    ev.chosen = k;
    const rnd = FR.Map.rng(run, 78 + k);
    for (const e of opt.effects) {
      const fn = FR.EventRun.OPS[e.op];
      const line = fn ? fn(run, e, rnd) : null;
      if (line) ev.log.push(line);
    }
    if (!ev.log.length) ev.log.push('何も起きなかった');
    return true;
  },

  // 1年を通した状態にかかる効果。起きたことを1行の文で返す
  OPS: {
    gold(run, e) {
      run.gold = Math.max(0, run.gold + e.amount);
      if (e.amount > 0) run.stats.goldEarned += e.amount;
      return `銭 ${e.amount > 0 ? '+' : '−'}${Math.abs(e.amount)}`;
    },
    heal(run, e) {
      const before = run.hp;
      // 出来事で力尽きることはない（1は残る）
      run.hp = Math.max(1, Math.min(run.maxHp, run.hp + e.amount));
      const d = run.hp - before;
      return d >= 0 ? `健康度 +${d}` : `健康度 −${-d}`;
    },
    maxHp(run, e) {
      run.maxHp += e.amount;
      run.hp += e.amount;
      return `最大健康度 +${e.amount}`;
    },
    // id 指定、なければ rarity・type・pool に合うカードから1枚
    card(run, e, rnd) {
      let id = e.id;
      if (!id) {
        const pool = Object.keys(FR.Cards).filter(cid => {
          const c = FR.Cards[cid];
          if (c.retired || c.unplayable || c.rarity === 'basic') return false;
          if (!(c.pool.includes('common') || c.pool.includes(run.farmerId))) return false;
          if (e.pool && !c.pool.includes(e.pool)) return false;
          return (!e.rarity || c.rarity === e.rarity) && (!e.type || c.type === e.type);
        });
        if (!pool.length) return null;
        id = pool[Math.floor(rnd() * pool.length)];
      }
      FR.Run.addCard(run, id, false);
      return `カード「${FR.Cards[id].name}」をデッキに加えた`;
    },
    upgrade(run, e, rnd) {
      const list = FR.Map.upgradable(run);
      if (!list.length) return '強化できるカードがなかった';
      const c = list[Math.floor(rnd() * list.length)];
      FR.Map.upgrade(run, c.uid);
      return `「${FR.Cards[c.id].name}」を強化した`;
    },
    // 初めから持っている攻撃・守りのカード（rarity basic で、作物・家畜以外）を1枚手放す
    remove(run) {
      const k = run.deck.findIndex(c => { const d = FR.Cards[c.id]; return d.rarity === 'basic' && (d.type === 'attack' || d.type === 'skill'); });
      if (k < 0) return '手放せるカードがなかった';
      const [c] = run.deck.splice(k, 1);
      return `「${FR.Cards[c.id].name}」を1枚手放した`;
    },
    tool(run, e, rnd) {
      const left = FR.RelicPool.tools(run);
      if (!left.length) { run.gold += 45; return '良い農具がなかったので、銭を返してもらった'; }
      const id = left[Math.floor(rnd() * left.length)];
      run.relics.push(id);
      return `農具「${FR.Relics[id].name}」を手に入れた（${FR.Relics[id].text}）`;
    },
    nextBattle(run, e) {
      run.nextBattle = Object.assign({}, run.nextBattle, { [e.status]: ((run.nextBattle && run.nextBattle[e.status]) || 0) + e.amount });
      return `次の戦闘の始めに、${FR.Statuses[e.status].name} ${e.amount}`;
    }
  }
};
