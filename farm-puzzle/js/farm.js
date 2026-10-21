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
  let hooks = {};     // { onChange, onAction, onHarvest(veg, first, seasonDone) }
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
  // 消した列数・コンボが多いほどたくさんもらえる。上限をこえた分はあふれる。表示用の文字を返す
  function gainFromLines({ lines, combo }) {
    const r = cfg.rules;
    const max = limits();
    const mul = 1 + r.multiLineBonus * (lines - 1) + r.comboBonus * (combo - 1);
    const before = { ...data.resources };
    data.resources.water = Math.min(max.water, before.water + Math.round(r.waterPerLine * lines * mul));
    data.resources.fertilizer = Math.min(max.fertilizer, before.fertilizer + Math.round(r.fertilizerPerLine * lines * mul));
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
    if (!water && !fertilizer) parts.push(Msg.t('farm.full'));
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

  function work(index) {
    const plot = data.plots[index];
    if (plot.stage === READY) {
      harvest(index);
      return;
    }
    const cost = costOf(plot);
    if (plot.stage === 2 || !canAfford(cost)) return;

    data.resources.water -= cost.water;
    data.resources.fertilizer -= cost.fertilizer;
    const v = veg(plot.vegId);
    if (plot.stage === 0) {
      tellStep(v, 'water');
    } else {
      // 追肥したら育ち時間スタート。いちばん最初だけ短く
      tellStep(v, 'fertilize');
      plot.growLeft = data.firstGrowDone ? (v.grow || cfg.rules.growLines) : cfg.rules.firstGrowLines;
      data.firstGrowDone = true;
    }
    plot.stage += 1;
    Sound.play('work');
    acted();
  }

  function harvest(index) {
    const v = veg(data.plots[index].vegId);
    const bonus = inSeason(v);
    const coins = Math.round(v.price * (bonus ? cfg.rules.seasonBonus : 1));
    data.resources.coins += coins;
    const first = !data.harvested[v.id];
    data.harvested[v.id] = (data.harvested[v.id] || 0) + 1;
    data.plots[index] = null;

    const done = season();
    const doneVegs = seasonalVegs();
    if (bonus && !data.seasonHarvested.includes(v.id)) data.seasonHarvested.push(v.id);
    const next = checkSeason();

    let text = Msg.t('farm.harvested', { name: v.name, coins, coin: Msg.t('icons.coin') });
    if (bonus) text += '\n' + Msg.t('farm.seasonBonus');
    if (next) text += '\n' + Msg.t('farm.seasonAdvanced', { done: done.name, icon: next.icon, season: next.name });
    else text += '\n' + v.steps.harvest;
    toast(text);
    Sound.play('harvest');
    acted();
    if (hooks.onHarvest) hooks.onHarvest(v, first, next ? { done, next, vegs: doneVegs } : null);
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

    return h('div', { class: 'plot' + (ready ? ' ready' : '') + (growing ? ' growing' : '') },
      h('div', { class: 'plot-soil' + (plot.stage >= 1 ? ' wet' : '') }, icon),
      h('div', { class: 'plot-name' }, v.name, inSeason(v) ? h('span', { class: 'shun' }, Msg.t('farm.shun')) : null),
      stepDots(Math.min(plot.stage, 2)),
      h('button', {
        class: 'btn' + (ready ? ' primary' : ''),
        disabled: growing || !enough ? '' : null,
        onclick: () => work(index),
      }, label),
      hint ? h('div', { class: 'plot-hint' }, hint) : null
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
    return (

        h('button', {
          class: 'seed',
          onclick: () => {
            Modal.close();
            sow(index, v.id);
          },
        },
          h('span', { class: 'seed-icon' }, vegIcon(v)),
          h('span', { class: 'seed-info' },
            h('span', { class: 'seed-name' }, v.name,
              inSeason(v) ? h('span', { class: 'shun' }, Msg.t('farm.shun')) : null,
              got ? h('span', { class: 'seed-got' }, Msg.t('farm.seedGot')) : null),
            h('span', { class: 'seed-cost' },
              `${Msg.t('icons.water')}${v.water}  ${Msg.t('icons.fertilizer')}${v.fertilizer}  ` +
              Msg.t('farm.seedGrow', { n: v.grow || cfg.rules.growLines }) +
              `  →  ${Msg.t('icons.coin')}${v.price}`),
            h('span', { class: 'seed-season' }, Msg.t('farm.seasonOf', { season: seasonNames(v) }))
          )
        )
    );
  }

  return { init, render, gainFromLines, hasAction, limits, season, seasonalVegs, seasonProgress, inSeason, seasonNames, veg };
})();
