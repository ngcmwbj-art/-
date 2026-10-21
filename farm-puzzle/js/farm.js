'use strict';
/* =========================================================
   畑部分
   - パズルで列を消すと資源（水・肥料）が貯まる。上限あり
   - 区画ごとに 種まき → 水やり → 追肥 → （列を消して育つのを待つ）→ 収穫
   - 収穫するとコインが入り、コインで区画を増やせる
   - 今の季節の旬の野菜をぜんぶ収穫すると、次の季節に進む
   ========================================================= */
const Farm = (() => {
  // 栽培のステップ（表示用）
  const STEPS = ['sow', 'water', 'fertilize', 'harvest'];
  // plot.stage の意味
  //   0：種まき済み（次は水やり） 1：水やり済み（次は追肥）
  //   2：育ち中（パズルで列を growLeft 本消すと実る） 3：収穫どき
  const READY = 3;
  // 育っている途中の見た目（収穫どきは野菜そのものの絵になる）
  const GROWING_ICONS = ['🌱', '🌿', '🌼'];

  let data = null;    // 保存データ全体
  let cfg = null;     // data/vegetables.json の中身
  let hooks = {};     // { onChange, onAction, onHarvest(初めて収穫した野菜の一覧, seasonDone) }
  let root = null;

  function init(options) {
    data = options.data;
    cfg = options.config;
    hooks = options;
    root = document.getElementById('farm');
    // はじめは startPlots 区画
    while (data.plots.length < cfg.rules.startPlots) data.plots.push(null);
    render();
  }

  /* ---------- データの取り出し ---------- */
  function veg(id) {
    return cfg.vegetables.find((v) => v.id === id);
  }

  function season() {
    return cfg.seasons[data.seasonIndex % cfg.seasons.length];
  }

  function inSeason(v) {
    return v.seasons.includes(season().id);
  }

  function seasonNames(v) {
    return v.seasons.map((id) => cfg.seasons.find((s) => s.id === id).name).join('・');
  }

  function maxPlots() {
    return cfg.rules.startPlots + cfg.rules.plotPrices.length;
  }

  function nextPlotPrice() {
    return cfg.rules.plotPrices[data.plots.length - cfg.rules.startPlots];
  }

  // 資源の上限 { water, fertilizer }
  function limits() {
    return { water: cfg.rules.waterMax, fertilizer: cfg.rules.fertilizerMax };
  }

  // 次の作業に必要な資源 { water, fertilizer }
  function costOf(plot) {
    const v = veg(plot.vegId);
    if (plot.stage === 0) return { water: v.water, fertilizer: 0 };
    if (plot.stage === 1) return { water: 0, fertilizer: v.fertilizer };
    return { water: 0, fertilizer: 0 };
  }

  function canAfford(cost) {
    return data.resources.water >= cost.water && data.resources.fertilizer >= cost.fertilizer;
  }

  // 今できる作業があるか（タブの目印に使う）。育ち中は待つだけなので数えない
  function hasAction() {
    return data.plots.some((p) => !p || (p.stage !== 2 && canAfford(costOf(p))));
  }

  /* ---------- パズルから資源を受け取る ---------- */
  // 消したマーク（💧・🍂）の数だけ水・肥料が手に入る。同時に消した列が多いほど、コンボが続くほど増える。
  // 上限をこえた分はあふれる。表示用の文字を返す
  function gainFromLines({ lines, combo, marks = { water: 0, fertilizer: 0 } }) {
    const r = cfg.rules;
    const max = limits();
    const mul = 1 + r.multiLineBonus * (lines - 1) + r.comboBonus * (combo - 1);
    const before = { ...data.resources };
    const addWater = (r.waterPerLine * lines + r.waterPerMark * marks.water) * mul;
    const addFert = (r.fertilizerPerLine * lines + r.fertilizerPerMark * marks.fertilizer) * mul;
    data.resources.water = Math.min(max.water, before.water + Math.round(addWater));
    data.resources.fertilizer = Math.min(max.fertilizer, before.fertilizer + Math.round(addFert));
    const water = data.resources.water - before.water;
    const fertilizer = data.resources.fertilizer - before.fertilizer;

    // 育ち中の野菜は、消した列の数だけ育つ
    const ripened = [];
    data.plots.forEach((p) => {
      if (!p || p.stage !== 2) return;
      p.growLeft = Math.max(0, p.growLeft - lines);
      if (p.growLeft === 0) {
        p.stage = READY;
        ripened.push(veg(p.vegId).name);
      }
    });

    // お知らせ（実った > あふれそう の順に大事）
    if (ripened.length) {
      toast(Msg.t('farm.ripened', { list: ripened.join('・') }));
      Sound.play('ripen');
    } else if (crossedNearFull(before, max)) {
      toast(Msg.t('farm.nearFull'));
    }

    changed();
    const parts = [];
    if (water) parts.push(`${Msg.t('icons.water')}+${water}`);
    if (fertilizer) parts.push(`${Msg.t('icons.fertilizer')}+${fertilizer}`);
    if (!water && !fertilizer && (marks.water || marks.fertilizer)) parts.push(Msg.t('farm.full'));
    return parts.join(' ');
  }

  // 今回の追加で「もうすぐいっぱい」を初めてこえたか
  function crossedNearFull(before, max) {
    const rate = cfg.rules.nearFullRate;
    return ['water', 'fertilizer'].some((k) => before[k] < max[k] * rate && data.resources[k] >= max[k] * rate);
  }

  /* ---------- 季節 ---------- */
  function seasonalVegs() {
    return cfg.vegetables.filter(inSeason);
  }

  // 今の季節の旬の野菜を、まだ収穫していないもの
  function seasonLeft() {
    return seasonalVegs().filter((v) => !data.seasonHarvested.includes(v.id));
  }

  // 今の季節の進み具合 { got: 収穫した旬の数, total: 旬の数 }
  function seasonProgress() {
    const all = seasonalVegs();
    return { got: all.length - seasonLeft().length, total: all.length };
  }

  // 旬の野菜をぜんぶ収穫したら季節を1つ進める。進んだら新しい季節を返す
  function checkSeason() {
    if (seasonalVegs().length === 0 || seasonLeft().length > 0) return null;
    data.seasonIndex = (data.seasonIndex + 1) % cfg.seasons.length;
    data.seasonHarvested = [];
    return season();
  }

  /* ---------- 作業 ---------- */
  function sow(index, vegId) {
    data.plots[index] = { vegId, stage: 0, growLeft: 0 };
    tellStep(veg(vegId), 'sow');
    acted();
  }

  // 水やり・追肥を1区画ぶん行う。行った作業の名前を返す（できなければ null）
  function doWork(plot) {
    const cost = costOf(plot);
    if (plot.stage > 1 || !canAfford(cost)) return null;
    data.resources.water -= cost.water;
    data.resources.fertilizer -= cost.fertilizer;
    const step = plot.stage === 0 ? 'water' : 'fertilize';
    if (step === 'fertilize') {
      // 追肥したら育ち時間スタート。いちばん最初だけ短く
      plot.growLeft = data.firstGrowDone ? (veg(plot.vegId).grow || cfg.rules.growLines) : cfg.rules.firstGrowLines;
      data.firstGrowDone = true;
    }
    plot.stage += 1;
    return step;
  }

  function work(index) {
    const plot = data.plots[index];
    if (plot.stage === READY) {
      harvestPlots([index]);
      return;
    }
    const step = doWork(plot);
    if (!step) return;
    tellStep(veg(plot.vegId), step);
    Sound.play('work');
    acted();
  }

  // まとめて作業（step：'water' | 'fertilize' | 'harvest'）。お知らせは1件にまとめる
  function workAll(step) {
    if (step === 'harvest') {
      harvestPlots(indicesAt(READY));
      return;
    }
    const stage = step === 'water' ? 0 : 1;
    let count = 0;
    let last = null;
    data.plots.forEach((p) => {
      if (p && p.stage === stage && doWork(p)) {
        count += 1;
        last = p;
      }
    });
    if (!count) return;
    toast(Msg.t('farm.bulkDone', { step: Msg.t('farm.stepNames.' + step), n: count }) +
      `\n${Msg.t('farm.stepNames.' + step)}：${veg(last.vegId).steps[step]}`);
    Sound.play('work');
    acted();
  }

  function indicesAt(stage) {
    return data.plots.map((p, i) => (p && p.stage === stage ? i : -1)).filter((i) => i >= 0);
  }

  // 収穫（1区画でもまとめてでも）。旬かどうかは収穫を始めたときの季節で決める
  function harvestPlots(indices) {
    if (!indices.length) return;
    const done = season();
    const doneVegs = seasonalVegs();
    const firsts = [];
    const names = indices.map((i) => data.plots[i].vegId);
    let coins = 0;
    let bonusAny = false;
    indices.forEach((i) => {
      const v = veg(data.plots[i].vegId);
      const bonus = v.seasons.includes(done.id);
      coins += Math.round(v.price * (bonus ? cfg.rules.seasonBonus : 1));
      if (bonus) {
        bonusAny = true;
        if (!data.seasonHarvested.includes(v.id)) data.seasonHarvested.push(v.id);
      }
      if (!data.harvested[v.id]) firsts.push(v);
      data.harvested[v.id] = (data.harvested[v.id] || 0) + 1;
      data.plots[i] = null;
    });
    data.resources.coins += coins;
    const next = checkSeason();

    const coin = Msg.t('icons.coin');
    const single = indices.length === 1 ? veg(names[0]) : null;
    let text = single
      ? Msg.t('farm.harvested', { name: single.name, coins, coin })
      : Msg.t('farm.harvestedMany', { n: indices.length, coins, coin });
    if (bonusAny) text += '\n' + Msg.t('farm.seasonBonus');
    if (next) text += '\n' + Msg.t('farm.seasonAdvanced', { done: done.name, icon: next.icon, season: next.name });
    else if (single) text += '\n' + single.steps.harvest;
    toast(text);
    Sound.play('harvest');
    acted();
    if (hooks.onHarvest) hooks.onHarvest(firsts, next ? { done, next, vegs: doneVegs } : null);
  }

  function buyPlot() {
    const price = nextPlotPrice();
    if (price == null || data.resources.coins < price) return;
    data.resources.coins -= price;
    data.plots.push(null);
    toast(Msg.t('farm.plotAdded'));
    Sound.play('work');
    acted();
  }

  // 作業のたびに、その作業のコツを表示（遊びながら覚えられるように）
  function tellStep(v, step) {
    toast(`${Msg.t('farm.stepNames.' + step)}：${v.steps[step]}`);
  }

  // プレイヤーが畑で作業したとき
  function acted() {
    changed();
    if (hooks.onAction) hooks.onAction();
  }

  function changed() {
    render();
    if (hooks.onChange) hooks.onChange();
  }

  /* ---------- 表示 ---------- */
  function render() {
    if (!root) return;
    root.innerHTML = '';

    // 季節の案内：旬の野菜と、この季節にもう収穫したか
    const s = season();
    root.append(
      h('div', { class: 'season-banner' },
        h('div', { class: 'season-now' },
          `${s.icon} ${Msg.t('farm.seasonNow', { season: s.name })}`,
          h('span', { class: 'season-count' }, Msg.t('farm.seasonCount', seasonProgress()))),
        h('div', { class: 'season-veg' },
          Msg.t('farm.seasonVegLabel'),
          seasonalVegs().map((v) => {
            const got = data.seasonHarvested.includes(v.id);
            return h('span', { class: 'season-chip' + (got ? ' got' : '') },
              (got ? '✓ ' : '') + v.name);
          })
        ),
        h('div', { class: 'season-note' }, Msg.t('farm.seasonNote'))
      )
    );

    // 区画
    const grid = h('div', { class: 'plots' });
    data.plots.forEach((plot, i) => grid.append(plotCard(plot, i)));
    root.append(grid);

    root.append(bulkBar());

    // 区画を増やす
    const price = nextPlotPrice();
    if (data.plots.length < maxPlots()) {
      root.append(
        h('button', {
          class: 'btn expand-btn',
          disabled: data.resources.coins < price ? '' : null,
          onclick: buyPlot,
        }, Msg.t('farm.addPlot', { price, coin: Msg.t('icons.coin') }))
      );
    } else {
      root.append(h('p', { class: 'farm-note' }, Msg.t('farm.maxPlots')));
    }
  }

  // 前から順に作業したとき、資源が足りて実際にできる区画（workAll と同じ順・同じ数え方）
  function doableInOrder(targets) {
    const left = { ...data.resources };
    return targets.filter((p) => {
      const cost = costOf(p);
      if (left.water < cost.water || left.fertilizer < cost.fertilizer) return false;
      left.water -= cost.water;
      left.fertilizer -= cost.fertilizer;
      return true;
    });
  }

  // まとめて作業のボタン。できないときはうすく表示して理由を出す
  function bulkBar() {
    const items = [
      { step: 'water', stage: 0, short: 'farm.bulkShortWater' },
      { step: 'fertilize', stage: 1, short: 'farm.bulkShortFert' },
      { step: 'harvest', stage: READY, short: null },
    ];
    return h('div', { class: 'bulk-bar' }, items.map(({ step, stage, short }) => {
      const targets = data.plots.filter((p) => p && p.stage === stage);
      const affordable = step === 'harvest' ? targets : doableInOrder(targets);
      let reason = null;
      if (!targets.length) reason = Msg.t('farm.bulkNone');
      else if (!affordable.length) reason = Msg.t(short);
      return h('div', { class: 'bulk-item' },
        h('button', {
          class: 'btn' + (step === 'harvest' && affordable.length ? ' primary' : ''),
          type: 'button',
          disabled: reason ? '' : null,
          onclick: () => workAll(step),
        }, Msg.t('farm.bulk.' + step, { n: affordable.length })),
        h('span', { class: 'bulk-reason' }, reason || '\u00a0'));
    }));
  }

  function plotCard(plot, index) {
    if (!plot) {
      return h('div', { class: 'plot empty' },
        h('div', { class: 'plot-soil' }, h('span', { class: 'plot-icon dim' }, '・・・')),
        h('div', { class: 'plot-name' }, Msg.t('farm.emptyPlot')),
        stepDots(-1),
        h('button', { class: 'btn primary', onclick: () => openSeedPicker(index) }, Msg.t('farm.sowButton'))
      );
    }

    const v = veg(plot.vegId);
    const ready = plot.stage === READY;
    const growing = plot.stage === 2;
    const icon = ready ? vegIcon(v) : h('span', { class: 'plot-icon' }, GROWING_ICONS[plot.stage]);
    const cost = costOf(plot);
    let label;
    if (plot.stage === 0) label = Msg.t('farm.waterButton', { n: cost.water, icon: Msg.t('icons.water') });
    else if (plot.stage === 1) label = Msg.t('farm.fertilizeButton', { n: cost.fertilizer, icon: Msg.t('icons.fertilizer') });
    else if (growing) label = Msg.t('farm.growingButton', { n: plot.growLeft });
    else label = Msg.t('farm.harvestButton');

    const enough = canAfford(cost);
    let hint = null;
    if (growing) hint = Msg.t('farm.growingHint');
    else if (!enough) hint = Msg.t('farm.needMore');
    // 次の作業のコツをいつも見せておく（育ち中・収穫どきは収穫のコツ）
    const nextStep = ['water', 'fertilize', 'harvest', 'harvest'][plot.stage];

    return h('div', { class: 'plot' + (ready ? ' ready' : '') + (growing ? ' growing' : '') },
      h('div', { class: 'plot-soil' + (plot.stage >= 1 ? ' wet' : '') }, icon),
      h('div', { class: 'plot-name' }, v.name, inSeason(v) ? h('span', { class: 'shun' }, Msg.t('farm.shun')) : null),
      stepDots(Math.min(plot.stage, 2)),
      h('button', {
        class: 'btn' + (ready ? ' primary' : ''),
        disabled: growing || !enough ? '' : null,
        onclick: () => work(index),
      }, label),
      hint ? h('div', { class: 'plot-hint' }, hint) : null,
      h('div', { class: 'plot-tip' },
        h('b', {}, Msg.t('farm.nextTip', { step: Msg.t('farm.stepNames.' + nextStep) })), v.steps[nextStep]),
      h('button', { class: 'link-btn', type: 'button', onclick: () => HowTo.open(v) }, Msg.t('howto.open'))
    );
  }

  // 種まき・水やり・追肥・収穫 のどこまで進んだかを表示
  function stepDots(doneUpTo) {
    return h('ol', { class: 'steps' },
      STEPS.map((step, i) => h('li', { class: i <= doneUpTo ? 'done' : (i === doneUpTo + 1 ? 'next' : '') },
        Msg.t('farm.stepNames.' + step)))
    );
  }

  // 種を選ぶダイアログ（いまが旬の野菜を先に）
  function openSeedPicker(index) {
    const list = h('div', { class: 'seed-list' });
    const now = cfg.vegetables.filter(inSeason);
    const others = cfg.vegetables.filter((v) => !inSeason(v));
    list.append(h('div', { class: 'seed-heading' }, Msg.t('farm.seedNow', { season: season().name })));
    now.forEach((v) => list.append(seedButton(v, index)));
    list.append(h('div', { class: 'seed-heading' }, Msg.t('farm.seedOthers')));
    others.forEach((v) => list.append(seedButton(v, index)));
    Modal.open({
      title: Msg.t('farm.pickSeed'),
      body: list,
      buttons: [{ label: Msg.t('common.cancel') }],
    });
  }

  function seedButton(v, index) {
    const got = data.seasonHarvested.includes(v.id);
    const plant = () => {
      Modal.close();
      sow(index, v.id);
    };
    const guide = () => HowTo.open(v, {
      actions: [
        { label: Msg.t('howto.back'), onClick: () => openSeedPicker(index) },
        { label: Msg.t('howto.plantThis'), primary: true, onClick: plant },
      ],
    });
    return h('div', { class: 'seed-row' },
      h('button', { class: 'seed', type: 'button', onclick: plant },
          h('span', { class: 'seed-icon' }, vegIcon(v)),
          h('span', { class: 'seed-info' },
            h('span', { class: 'seed-name' }, v.name,
              inSeason(v) ? h('span', { class: 'shun' }, Msg.t('farm.shun')) : null,
              got ? h('span', { class: 'seed-got' }, Msg.t('farm.seedGot')) : null),
            h('span', { class: 'seed-cost' },
              `${Msg.t('icons.water')}${v.water}  ${Msg.t('icons.fertilizer')}${v.fertilizer}  ` +
              Msg.t('farm.seedGrow', { n: v.grow || cfg.rules.growLines }) +
              `  →  ${Msg.t('icons.coin')}${v.price}`),
            h('span', { class: 'seed-season' },
              Msg.t('farm.seasonOf', { season: seasonNames(v) }) + '　' +
              Msg.t('howto.level') + ' ' + '★'.repeat(v.guide.level) + '☆'.repeat(3 - v.guide.level))
          )
      ),
      h('button', { class: 'seed-guide', type: 'button', onclick: guide }, Msg.t('howto.short'))
    );
  }

  return { init, render, gainFromLines, hasAction, limits, season, seasonalVegs, seasonProgress, inSeason, seasonNames, veg };
})();
