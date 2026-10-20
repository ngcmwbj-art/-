'use strict';
/* =========================================================
   畑部分
   - パズルで列を消すと資源（水・肥料）が貯まる
   - 区画ごとに 種まき → 水やり → 追肥 → 収穫 の順に育てる
   - 収穫するとコインが入り、コインで区画を増やせる
   ========================================================= */
const Farm = (() => {
  // 栽培のステップ（plot.stage の番号と対応）
  //   空き区画 → 種まき → stage 0 → 水やり → stage 1 → 追肥 → stage 2 → 収穫 → 空き区画
  const STEPS = ['sow', 'water', 'fertilize', 'harvest'];
  // 育っている途中の見た目（最後は野菜そのものの絵になる）
  const GROWING_ICONS = ['🌱', '🌿'];

  let data = null;    // 保存データ全体
  let cfg = null;     // data/vegetables.json の中身
  let hooks = {};     // { onChange, onHarvest }
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

  // 何かできる作業があるか（タブの目印に使う）
  function hasAction() {
    return data.plots.some((p) => !p || canAfford(costOf(p)));
  }

  /* ---------- パズルから資源を受け取る ---------- */
  // 消した列数・コンボが多いほどたくさんもらえる。表示用の文字を返す
  function gainFromLines({ lines, combo }) {
    const r = cfg.rules;
    const mul = 1 + r.multiLineBonus * (lines - 1) + r.comboBonus * (combo - 1);
    const water = Math.round(r.waterPerLine * lines * mul);
    const fertilizer = Math.round(r.fertilizerPerLine * lines * mul);
    data.resources.water += water;
    data.resources.fertilizer += fertilizer;
    changed();
    return `${Msg.t('icons.water')}+${water} ${Msg.t('icons.fertilizer')}+${fertilizer}`;
  }

  // ゲームオーバーごとに季節を1つ進める
  function advanceSeason() {
    data.seasonIndex = (data.seasonIndex + 1) % cfg.seasons.length;
    changed();
    return season();
  }

  /* ---------- 作業 ---------- */
  function sow(index, vegId) {
    data.plots[index] = { vegId, stage: 0 };
    tellStep(veg(vegId), 'sow');
    changed();
  }

  function work(index) {
    const plot = data.plots[index];
    const v = veg(plot.vegId);
    const cost = costOf(plot);
    if (!canAfford(cost)) return;

    if (plot.stage < 2) {
      data.resources.water -= cost.water;
      data.resources.fertilizer -= cost.fertilizer;
      tellStep(v, STEPS[plot.stage + 1]);
      plot.stage += 1;
    } else {
      harvest(index);
      return;
    }
    changed();
  }

  function harvest(index) {
    const v = veg(data.plots[index].vegId);
    const bonus = inSeason(v);
    const coins = Math.round(v.price * (bonus ? cfg.rules.seasonBonus : 1));
    data.resources.coins += coins;
    const first = !data.harvested[v.id];
    data.harvested[v.id] = (data.harvested[v.id] || 0) + 1;
    data.plots[index] = null;

    let text = Msg.t('farm.harvested', { name: v.name, coins, coin: Msg.t('icons.coin') });
    if (bonus) text += '\n' + Msg.t('farm.seasonBonus');
    text += '\n' + v.steps.harvest;
    toast(text);
    changed();
    if (hooks.onHarvest) hooks.onHarvest(v, first);
  }

  function buyPlot() {
    const price = nextPlotPrice();
    if (price == null || data.resources.coins < price) return;
    data.resources.coins -= price;
    data.plots.push(null);
    toast(Msg.t('farm.plotAdded'));
    changed();
  }

  // 作業のたびに、その作業のコツを表示（遊びながら覚えられるように）
  function tellStep(v, step) {
    toast(`${Msg.t('farm.stepNames.' + step)}：${v.steps[step]}`);
  }

  function changed() {
    render();
    if (hooks.onChange) hooks.onChange();
  }

  /* ---------- 表示 ---------- */
  function render() {
    if (!root) return;
    root.innerHTML = '';

    // 季節の案内
    const s = season();
    const seasonal = cfg.vegetables.filter(inSeason).map((v) => v.name).join('・');
    root.append(
      h('div', { class: 'season-banner' },
        h('div', { class: 'season-now' }, `${s.icon} ${Msg.t('farm.seasonNow', { season: s.name })}`),
        h('div', { class: 'season-veg' }, Msg.t('farm.seasonVeg', { list: seasonal || '―' })),
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
    const ready = plot.stage === 2;
    const icon = ready ? vegIcon(v) : h('span', { class: 'plot-icon' }, GROWING_ICONS[plot.stage]);
    const cost = costOf(plot);
    let label;
    if (plot.stage === 0) label = Msg.t('farm.waterButton', { n: cost.water, icon: Msg.t('icons.water') });
    else if (plot.stage === 1) label = Msg.t('farm.fertilizeButton', { n: cost.fertilizer, icon: Msg.t('icons.fertilizer') });
    else label = Msg.t('farm.harvestButton');

    const enough = canAfford(cost);
    return h('div', { class: 'plot' + (ready ? ' ready' : '') },
      h('div', { class: 'plot-soil' + (plot.stage >= 1 ? ' wet' : '') }, icon),
      h('div', { class: 'plot-name' }, v.name, inSeason(v) ? h('span', { class: 'shun' }, Msg.t('farm.shun')) : null),
      stepDots(plot.stage),
      h('button', {
        class: 'btn' + (ready ? ' primary' : ''),
        disabled: enough ? null : '',
        onclick: () => work(index),
      }, label),
      enough ? null : h('div', { class: 'plot-hint' }, Msg.t('farm.needMore'))
    );
  }

  // 種まき・水やり・追肥・収穫 のどこまで進んだかを表示
  function stepDots(stage) {
    return h('ol', { class: 'steps' },
      STEPS.map((step, i) => h('li', { class: i <= stage ? 'done' : (i === stage + 1 ? 'next' : '') },
        Msg.t('farm.stepNames.' + step)))
    );
  }

  // 種を選ぶダイアログ
  function openSeedPicker(index) {
    const list = h('div', { class: 'seed-list' });
    cfg.vegetables.forEach((v) => {
      list.append(
        h('button', {
          class: 'seed',
          onclick: () => {
            Modal.close();
            sow(index, v.id);
          },
        },
          h('span', { class: 'seed-icon' }, vegIcon(v)),
          h('span', { class: 'seed-info' },
            h('span', { class: 'seed-name' }, v.name, inSeason(v) ? h('span', { class: 'shun' }, Msg.t('farm.shun')) : null),
            h('span', { class: 'seed-cost' },
              `${Msg.t('icons.water')}${v.water}  ${Msg.t('icons.fertilizer')}${v.fertilizer}  →  ${Msg.t('icons.coin')}${v.price}`),
            h('span', { class: 'seed-season' }, Msg.t('farm.seasonOf', { season: seasonNames(v) }))
          )
        )
      );
    });
    Modal.open({
      title: Msg.t('farm.pickSeed'),
      body: list,
      buttons: [{ label: Msg.t('common.cancel') }],
    });
  }

  return { init, render, gainFromLines, advanceSeason, hasAction, season, inSeason, seasonNames, veg };
})();
