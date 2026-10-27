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
  let tipClosed = false;   // ひとことを ✕ で閉じたか（開き直すまで）
  let seasonOpen = false;  // 季節の帯を開いているか（ふだんは1行にたたむ）
  let othersOpen = false;  // 種えらびで「ほかの季節の野菜」を開いているか

  function init(options) {
    data = options.data;
    cfg = options.config;
    hooks = options;
    root = document.getElementById('farm');
    // はじめは startPlots 区画
    while (data.plots.length < cfg.rules.startPlots) data.plots.push(null);
    // はじめの案内：前から遊んでいる人（何か植えた・収穫した）には出さない
    if (data.onboardStep == null) {
      const played = data.plots.some(Boolean) || Object.keys(data.harvested).length > 0;
      data.onboardStep = played ? 2 : 0;
    }
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
      toast(Msg.t('farm.ripened', { list: ripened.join('・') }), 4000, true);   // 大事なお知らせ（ほかのお知らせで消さない）
      Sound.play('ripen');
    } else if (crossedNearFull(before, max)) {
      toast(Msg.t('farm.nearFull'));
    }

    changed();
    const parts = [];
    if (water) parts.push(`${Msg.t('icons.water')}+${water}`);
    if (fertilizer) parts.push(`${Msg.t('icons.fertilizer')}+${fertilizer}`);
    if (!water && !fertilizer && (marks.water || marks.fertilizer)) parts.push(Msg.t('farm.full'));
    // text：盤面に出す文字、water・fertilizer：実際にたまった量（ゲームオーバーで「持ち帰ったもの」に使う）
    return { text: parts.join(' '), water, fertilizer };
  }

  // 今回の追加で「もうすぐいっぱい」を初めてこえたか
  function crossedNearFull(before, max) {
    const rate = cfg.rules.nearFullRate;
    return ['water', 'fertilizer'].some((k) => before[k] < max[k] * rate && data.resources[k] >= max[k] * rate);
  }

  /* ---------- 季節 ---------- */
  // 季節を進めるのに収穫が必要な「基本の旬の野菜」（チャレンジ野菜はふくめない）
  function seasonalVegs() {
    return cfg.vegetables.filter((v) => inSeason(v) && !Missions.isChallenge(v));
  }

  // 今の季節のチャレンジ野菜（ミッションで種が手に入る）
  function seasonalChallenges() {
    return cfg.vegetables.filter((v) => inSeason(v) && Missions.isChallenge(v));
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
    const v = veg(vegId);
    // 前にこの区画で同じなかまを育てていたら「連作」のひとこと（罰はなし。本物の畑の知識として）
    const rotation = v.family && !v.perennial && data.lastFamily[index] === v.family;
    data.lastFamily[index] = null;   // ひとことは1回だけ
    data.plots[index] = { vegId, stage: 0, growLeft: 0 };
    if (data.onboardStep === 0) data.onboardStep = 1;   // 案内：次は水やり
    if (rotation) tellRotation(v);
    else tellStep(v, 'sow');
    acted();
  }

  // 水やり・追肥を1区画ぶん行う。行った作業の名前を返す（できなければ null）
  function doWork(plot) {
    const cost = costOf(plot);
    if (plot.stage > 1 || !canAfford(cost)) return null;
    data.resources.water -= cost.water;
    data.resources.fertilizer -= cost.fertilizer;
    const step = plot.stage === 0 ? 'water' : 'fertilize';
    if (step === 'water' && data.onboardStep === 1) data.onboardStep = 2;   // 案内はここでおわり
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
      `\n${veg(last.vegId).name}の${Msg.t('farm.stepNames.' + step)}：${Msg.plain(veg(last.vegId).steps[step])}`);
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
    const leftBefore = seasonLeft().length;
    const firsts = [];
    const names = indices.map((i) => data.plots[i].vegId);
    harvestPop(indices);
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
      data.lastFamily[i] = v.family;   // この区画で前に育てたなかま（次の種まきで連作のひとことに使う）
      data.plots[i] = null;
    });
    data.resources.coins += coins;
    const next = checkSeason();

    const coin = Msg.t('icons.coin');
    const single = indices.length === 1 ? veg(names[0]) : null;
    let text = single
      ? Msg.t('farm.harvested', { name: single.name, coins, coin })
      : Msg.t('farm.harvestedMany', { n: indices.length, coins, coin });
    // 初めての野菜があれば、同じ行に図鑑の登録数（集める目標が見えるように）
    if (firsts.length) text += Msg.t('farm.zukanCount', { n: Object.keys(data.harvested).length, total: cfg.vegetables.length });
    if (bonusAny) text += '\n' + Msg.t('farm.seasonBonus');
    if (next) text += '\n' + Msg.t('farm.seasonAdvanced', { done: done.name, icon: next.icon, season: next.name });
    // 旬の残りが1種になったら、ゴールが近いことを知らせる（その野菜の名前も）
    else if (leftBefore > 1 && seasonLeft().length === 1) text += '\n' + Msg.t('farm.oneLeft', { name: seasonLeft()[0].name, icon: done.icon });
    else if (single) text += '\n' + (nextSowTip(single) || (single.eat ? Msg.t('farm.eat', { text: single.eat }) : Msg.plain(single.steps.harvest)));
    toast(text);
    Sound.play('harvest');
    acted();
    // 図鑑や季節のお知らせは、ぴょこっと演出が見えてから（0.5秒あと）
    if (hooks.onHarvest) setTimeout(() => hooks.onHarvest(firsts, next ? { done, next, vegs: doneVegs } : null), 500);
  }

  // 収穫したあと「次にここへまくなら、ちがうなかまの○○」（連作をよける輪作を、失敗する前に知らせる）
  // 食べ方のひとことと1回おきに出す（初めての収穫はこちら）。今の季節にまけて種が手に入っている野菜から選ぶ
  function nextSowTip(v) {
    if (!v.family || v.perennial || data.harvested[v.id] % 2 === 0) return null;
    const list = cfg.vegetables.filter((x) => inSeason(x) && !Missions.isLocked(x) && !x.perennial && x.family && x.family !== v.family);
    if (!list.length) return null;
    const pick = list[(data.harvested[v.id] + v.id.length) % list.length];
    return Msg.t('farm.nextSow', { family: v.family, name: pick.name });
  }

  // 収穫のぴょこっと演出：区画から野菜が跳ねて消える（0.6秒・まとめて収穫しても1回だけ）
  // 区画はすぐ描き直されるので、絵は画面の上に浮かせて出す。初めての野菜は少し大きく
  function harvestPop(indices) {
    indices.forEach((i) => {
      const soil = root.querySelector(`[data-plot="${i}"]`);
      if (!soil) return;
      const v = veg(data.plots[i].vegId);
      const r = soil.getBoundingClientRect();
      const el = h('div', { class: 'harvest-pop' + (data.harvested[v.id] ? '' : ' first') }, vegIcon(v));
      el.style.left = r.left + r.width / 2 + 'px';
      el.style.top = r.top + r.height / 2 + 'px';
      document.body.append(el);
      setTimeout(() => el.remove(), 700);
    });
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
  // 作業のお知らせ。文にむずかしい言葉があれば、1つだけ「ことば」の説明を添える
  // 作業のお知らせで説明しない、よく出てくる言葉（ボタンや読みがなで分かるもの）
  const EASY_WORDS = ['追肥', '苗', '株', '乾燥', '植えつけ'];

  // 種まきのときは、育てる前に知っておきたい「失敗しないコツ」も1行（data の mistake。ある野菜だけ）
  function tellStep(v, step) {
    const text = Msg.plain(v.steps[step]);
    const tip = step === 'sow' && v.mistake ? Msg.plain(v.mistake) : '';
    const word = (cfg.glossary || []).find((w) => !EASY_WORDS.includes(w.term) && (text + tip).includes(w.term));
    let msg = `${Msg.t('farm.stepNames.' + step)}：${text}`;
    if (tip) msg += '\n' + Msg.t('farm.mistake', { text: tip });
    if (word) msg += '\n' + Msg.t('farm.word', { term: word.term, reading: word.reading, text: word.text });
    toast(msg, tip && word ? 8000 : tip || word ? 6000 : undefined);
  }

  // 連作のひとこと（2行まで。何年あけるかの目安も）
  function tellRotation(v) {
    const years = v.rotationYears || (Msg.get('farm.rotationYears') || {})[v.family] || Msg.t('farm.rotationYearsOther');
    toast(Msg.t('farm.rotation', { family: v.family, years }), 7000);
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

    // 季節の案内：ふだんは1行（進み具合はいつも見える）。押すと旬の野菜の一覧が開く
    const s = season();
    const challengeGot = seasonalChallenges().filter((v) => !Missions.isLocked(v)).length;
    const detail = seasonOpen ? [
      h('div', { class: 'season-veg' },
        Msg.t('farm.seasonVegLabel'),
        seasonalVegs().map((v) => {
          const got = data.seasonHarvested.includes(v.id);
          return h('span', { class: 'season-chip' + (got ? ' got' : '') }, (got ? '✓ ' : '') + v.name);
        })),
      h('div', { class: 'season-veg' },
        Msg.t('farm.seasonChallengeLabel'),
        seasonalChallenges().map((v) => {
          const locked = Missions.isLocked(v);
          const got = data.seasonHarvested.includes(v.id);
          return h('button', {
            class: 'season-chip challenge' + (got ? ' got' : '') + (locked ? ' locked' : ''),
            type: 'button',
            onclick: openMissionList,
          }, (locked ? '🔒 ' : got ? '✓ ' : '') + v.name);
        }),
        h('button', { class: 'link-btn', type: 'button', onclick: openMissionList }, Msg.t('mission.listOpen'))),
      h('div', { class: 'season-note' }, Msg.rich('farm.seasonNote')),
    ] : [];
    root.append(
      h('div', { class: 'season-banner' + (seasonOpen ? ' open' : '') },
        h('button', {
          class: 'season-now', type: 'button', 'aria-expanded': String(seasonOpen),
          onclick: () => { seasonOpen = !seasonOpen; render(); },
        },
          h('span', {}, `${s.icon} ${Msg.t('farm.seasonNow', { season: s.name })}`),
          h('span', { class: 'season-count' }, Msg.t('farm.seasonCount', seasonProgress())),
          h('span', { class: 'season-challenge-count' }, Msg.t('farm.challengeCount', { got: challengeGot, total: seasonalChallenges().length })),
          h('span', { class: 'season-toggle' }, seasonOpen ? '▲' : '▼')),
        detail)
    );

    const tip = dailyTip();
    if (tip) root.append(tip);

    // 区画
    const grid = h('div', { class: 'plots' });
    data.plots.forEach((plot, i) => grid.append(plotCard(plot, i)));
    root.append(grid);

    // まとめて作業は、対象の区画があるときだけ出す
    if (data.plots.some((p) => p && p.stage !== 2)) root.append(bulkBar());

    // 区画を増やす
    const price = nextPlotPrice();
    if (data.plots.length < maxPlots()) {
      root.append(
        h('button', {
          class: 'btn expand-btn',
          disabled: data.resources.coins < price ? '' : null,
          onclick: buyPlot,
        }, Msg.rich('farm.addPlot', { price, coin: Msg.t('icons.coin') }))
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
        }, Msg.rich('farm.bulk.' + step, { n: affordable.length })),
        h('span', { class: 'bulk-reason' }, reason || '\u00a0'));
    }));
  }

  function plotCard(plot, index) {
    if (!plot) {
      return h('div', { class: 'plot empty', 'data-index': index },
        h('div', { class: 'plot-soil' }, h('span', { class: 'plot-icon dim' }, '・・・')),
        h('div', { class: 'plot-name' }, Msg.rich('farm.emptyPlot')),
        h('button', {
          // 案内中は、最初の空き区画の「種をまく」を光らせる
          class: 'btn primary sow-btn plot-action' + (data.onboardStep === 0 && index === data.plots.indexOf(null) ? ' glow' : ''),
          onclick: () => openSeedPicker(index),
        }, Msg.t('farm.sowButton'))
      );
    }

    const v = veg(plot.vegId);
    const ready = plot.stage === READY;
    const growing = plot.stage === 2;
    const icon = ready ? vegIcon(v) : h('span', { class: 'plot-icon' }, GROWING_ICONS[plot.stage]);
    const cost = costOf(plot);
    let label;
    if (plot.stage === 0) label = Msg.rich('farm.waterButton', { n: cost.water, icon: Msg.t('icons.water') });
    else if (plot.stage === 1) label = Msg.rich('farm.fertilizeButton', { n: cost.fertilizer, icon: Msg.t('icons.fertilizer') });
    else if (growing) label = Msg.rich('farm.growingButton', { n: plot.growLeft });
    else label = Msg.rich('farm.harvestButton');

    const enough = canAfford(cost);
    let hint = null;
    if (growing) hint = Msg.t('farm.growingHint');
    else if (!enough) hint = Msg.t('farm.needMore');
    // 次の作業のコツをいつも見せておく（育ち中・収穫どきは収穫のコツ）
    const nextStep = ['water', 'fertilize', 'harvest', 'harvest'][plot.stage];

    return h('div', { class: 'plot' + (ready ? ' ready' : '') + (growing ? ' growing' : ''), 'data-index': index },
      h('div', { class: 'plot-soil' + (plot.stage >= 1 ? ' wet' : ''), 'data-plot': index }, icon),
      h('div', { class: 'plot-name' }, v.name, inSeason(v) ? h('span', { class: 'shun' }, Msg.t('farm.shun')) : null,
        h('button', { class: 'book-btn', type: 'button', 'aria-label': Msg.t('howto.open'), onclick: () => HowTo.open(v, { now: nextStep }) }, '📖')),
      stepDots(Math.min(plot.stage, 2)),
      h('button', {
        // 案内中は、最初の水やりボタンを光らせる
        class: 'btn plot-action' + (ready ? ' primary' : '') + (data.onboardStep === 1 && plot.stage === 0 && enough ? ' glow' : ''),
        disabled: growing || !enough ? '' : null,
        onclick: () => work(index),
      }, label),
      hint ? h('div', { class: 'plot-hint' }, hint) : null,
      h('div', { class: 'plot-tip' },
        h('b', {}, Msg.t('farm.nextTip', { step: Msg.t('farm.stepNames.' + nextStep) })), Msg.richText(v.steps[nextStep]))
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
    list.append(h('div', { class: 'seed-heading' }, Msg.rich('farm.seedNow', { season: season().name })));
    now.filter((v) => !Missions.isChallenge(v)).forEach((v) => list.append(seedButton(v, index)));
    list.append(h('div', { class: 'seed-heading' }, Msg.t('farm.seedChallenge', { season: season().name })));
    now.filter((v) => Missions.isChallenge(v)).forEach((v) => list.append(seedButton(v, index)));
    // ほかの季節の野菜はふだんたたんでおく（一覧が長くて迷わないように）
    list.append(h('button', {
      class: 'seed-heading seed-fold', type: 'button',
      onclick: () => { othersOpen = !othersOpen; openSeedPicker(index); },
    }, Msg.t('farm.seedOthers') + ` (${others.length}) ` + (othersOpen ? '▲' : '▼')));
    if (othersOpen) others.forEach((v) => list.append(seedButton(v, index)));
    Modal.open({
      title: Msg.t('farm.pickSeed'),
      body: list,
      buttons: [{ label: Msg.t('common.cancel') }],
    });
  }

  function seedButton(v, index) {
    const got = data.seasonHarvested.includes(v.id);
    const locked = Missions.isLocked(v);
    const plant = () => {
      if (Missions.isLocked(v)) {
        openMission(v, index);
        return;
      }
      Modal.close();
      sow(index, v.id);
    };
    const guide = () => HowTo.open(v, {
      actions: [
        { label: Msg.t('howto.back'), onClick: () => openSeedPicker(index) },
        locked
          ? { label: Msg.t('mission.see'), primary: true, onClick: () => openMission(v, index) }
          : { label: Msg.t('howto.plantThis'), primary: true, onClick: plant },
      ],
    });
    return h('div', { class: 'seed-row' + (locked ? ' locked' : '') },
      h('button', { class: 'seed', type: 'button', onclick: plant },
          h('span', { class: 'seed-icon' }, vegIcon(v)),
          h('span', { class: 'seed-info' },
            h('span', { class: 'seed-name' }, (locked ? '🔒 ' : '') + v.name,
              inSeason(v) ? h('span', { class: 'shun' }, Msg.t('farm.shun')) : null,
              isRecommended(v) ? h('span', { class: 'seed-osusume' }, Msg.t('farm.osusume')) : null,
              Missions.isChallenge(v) ? h('span', { class: 'seed-challenge' }, Msg.t('mission.challenge')) : null,
              got ? h('span', { class: 'seed-got' }, Msg.t('farm.seedGot')) : null),
            locked ? h('span', { class: 'seed-mission' }, Msg.t('mission.label') + Missions.text(v) + '　' + Missions.progressText(v)) : null,
            h('span', { class: 'seed-cost' },
              `${Msg.t('icons.water')}${v.water}  ${Msg.t('icons.fertilizer')}${v.fertilizer}  ` +
              Msg.t('farm.seedGrow', { n: v.grow || cfg.rules.growLines }) +
              `  →  ${Msg.t('icons.coin')}${v.price}`),
            h('span', { class: 'seed-season' },
              Msg.t('farm.seasonOf', { season: seasonNames(v) }) + '　' +
              Msg.t('howto.level') + ' ' + '★'.repeat(v.guide.level) + '☆'.repeat(3 - v.guide.level))
          )
      ),
      // 「📖 育て方」を絵と文字の2行に分けて表示
      h('button', { class: 'seed-guide', type: 'button', onclick: guide },
        Msg.t('howto.short').split(' ').map((part) => h('span', {}, part)))
    );
  }

  // 今日のひとこと：いまが旬の野菜の豆知識を、日付で決めて1つ（同じ日は同じひとこと）
  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  function dailyTip() {
    // はじめの案内のあいだは出さない（見るところを少なく）
    if (tipClosed || data.onboardStep < 2 || data.tipHiddenDay === todayKey()) return null;
    const vegs = cfg.vegetables.filter(inSeason);
    if (!vegs.length) return null;
    const pool = [];
    vegs.forEach((v) => {
      v.tips.forEach((t) => pool.push({ v, t }));
      pool.push({ v, t: v.guide.point });
      if (v.mistake) pool.push({ v, t: Msg.get('farm.mistake').replace('{text}', v.mistake) });
      if (v.eat) pool.push({ v, t: Msg.t('farm.eat', { text: v.eat }) });
    });
    const d = new Date();
    const n = (d.getFullYear() * 400 + (d.getMonth() + 1) * 32 + d.getDate() + data.seasonIndex * 7) % pool.length;
    const { v, t } = pool[n];
    return h('div', { class: 'daily-tip', role: 'note' },
      h('span', { class: 'daily-icon' }, vegIcon(v)),
      h('div', { class: 'daily-body' },
        h('div', { class: 'daily-title' }, Msg.t('daily.title', { name: v.name })),
        h('div', { class: 'daily-text' }, Msg.richText(t)),
        h('div', { class: 'daily-actions' },
          h('button', { class: 'link-btn', type: 'button', onclick: () => HowTo.open(v) }, Msg.t('howto.open')),
          h('button', { class: 'link-btn sub', type: 'button', onclick: () => { data.tipHiddenDay = todayKey(); changed(); } }, Msg.t('daily.hideToday')))),
      h('button', { class: 'daily-close', type: 'button', 'aria-label': Msg.t('common.close'), onclick: () => { tipClosed = true; render(); } }, '✕'));
  }

  // パズル画面に出す「次の目標」を1つ決める { text, go }（go：押すと畑へ行く）
  // 次の目標 { text, go：畑へ行けばできるか, plot：光らせる区画の番号（区画をふやすときは 'expand'）}
  function nextGoal() {
    const plots = data.plots.filter(Boolean);
    const at = (p) => data.plots.indexOf(p);
    const ready = plots.find((p) => p.stage === READY);
    if (ready) return { text: Msg.t('goal.harvest'), go: true, plot: at(ready) };
    const doable = plots.find((p) => p.stage < 2 && canAfford(costOf(p)));
    if (doable) return { text: Msg.t(doable.stage === 0 ? 'goal.canWater' : 'goal.canFert'), go: true, plot: at(doable) };
    // コインが足りて、まだ広げられるなら区画をふやそう（今まで最後にあって出なかった）
    const price = nextPlotPrice();
    if (price != null && data.plots.length < maxPlots() && data.resources.coins >= price) return { text: Msg.t('goal.plot'), go: true, plot: 'expand' };
    // まだ何も植えていないときは種まきから（種まきに水や肥料はいらない）。図鑑をそろえた人には2周目の言葉で
    if (!plots.length) return { text: Msg.t(data.zukanComplete ? 'goal.sowAgain' : 'goal.firstSow'), go: true, plot: data.plots.indexOf(null) };
    // 空いている区画があれば種まき（水も肥料もいらない）。はじめの案内中は、まいた野菜の水やりを先に
    if (data.onboardStep >= 2 && data.plots.some((p) => !p)) return { text: Msg.t(data.zukanComplete ? 'goal.sowAgain' : 'goal.sow'), go: true, plot: data.plots.indexOf(null) };
    // 資源が足りない作業のうち、いちばん近いもの
    let best = null;
    plots.filter((p) => p.stage < 2).forEach((p) => {
      const key = p.stage === 0 ? 'water' : 'fertilizer';
      const left = costOf(p)[key] - data.resources[key];
      if (!best || left < best.left) best = { left, key, v: veg(p.vegId) };
    });
    if (best) return { text: Msg.t('goal.need.' + best.key, { icon: Msg.t('icons.' + best.key), n: best.left, name: best.v.name }), go: false };
    if (data.plots.some((p) => !p)) return { text: Msg.t(data.zukanComplete ? 'goal.sowAgain' : 'goal.sow'), go: true, plot: data.plots.indexOf(null) };
    const growing = plots.filter((p) => p.stage === 2).sort((a, b) => a.growLeft - b.growLeft)[0];
    if (growing) return { text: Msg.t('goal.grow', { name: veg(growing.vegId).name, n: growing.growLeft }), go: false };
    return { text: Msg.t(data.zukanComplete ? 'goal.sowAgain' : 'goal.sow'), go: true };
  }

  // 次の目標の場所を、はじめの案内と同じ光り方で2秒だけ光らせる（1回きり。せかさない）
  function flash(plot) {
    if (plot == null) return;
    const el = plot === 'expand'
      ? root.querySelector('.expand-btn')
      : root.querySelector(`.plot[data-index="${plot}"] .plot-action`);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 2000);
  }

  // はじめてさんにおすすめ：育てやすさ★1で、いまが旬の基本の野菜（ほかの印は増やさない）
  function isRecommended(v) {
    return v.guide.level === 1 && inSeason(v) && !Missions.isChallenge(v);
  }

  // 今の季節のチャレンジ野菜5種のミッションと進み具合（ほかの季節は見せない）
  function openMissionList() {
    const list = h('div', { class: 'mission-list' }, seasonalChallenges().map((v) => {
      const locked = Missions.isLocked(v);
      const { now, goal } = Missions.progress(v);
      const quiz = v.unlock.type === 'quiz';
      let status;
      if (!locked) status = h('span', { class: 'mission-done' }, Msg.t('mission.got'));
      else if (quiz) status = h('button', { class: 'btn quiz-small', type: 'button', onclick: () => Quiz.open(v, () => { Missions.passQuiz(v); changed(); openMissionList(); }) }, Msg.t('quiz.try'));
      else status = h('span', { class: 'mission-left' }, Msg.t('mission.left', { n: Math.max(0, goal - now) }));
      return h('div', { class: 'mission-item' + (locked ? '' : ' unlocked') },
        h('span', { class: 'mission-icon' }, vegIcon(v)),
        h('div', { class: 'mission-info' },
          h('div', { class: 'mission-name' }, (locked ? '🔒 ' : '🔓 ') + v.name),
          h('div', { class: 'mission-text' }, Missions.text(v)),
          locked && !quiz ? h('div', { class: 'mission-bar' }, h('span', { style: `width:${Math.round(Math.min(1, now / goal) * 100)}%` })) : null),
        status);
    }));
    Modal.open({
      title: Msg.t('mission.listTitle', { icon: season().icon, season: season().name }),
      body: list,
      buttons: [{ label: Msg.t('common.close'), primary: true }],
    });
  }

  // チャレンジ野菜のミッションを見せる（クイズならそのまま挑戦できる）
  function openMission(v, index) {
    const quiz = v.unlock.type === 'quiz';
    const back = () => openSeedPicker(index);
    Modal.open({
      title: Msg.t('mission.title', { name: v.name }),
      body: h('div', { class: 'mission' },
        h('div', { class: 'quiz-icon' }, vegIcon(v)),
        h('p', {}, Msg.t('mission.body')),
        h('div', { class: 'mission-goal' }, Missions.text(v)),
        quiz ? null : h('div', { class: 'mission-progress' }, Missions.progressText(v))
      ),
      buttons: [
        { label: Msg.t('howto.back'), onClick: back },
        quiz
          ? { label: Msg.t('quiz.try'), primary: true, onClick: () => Quiz.open(v, () => { Missions.passQuiz(v); changed(); back(); }) }
          : { label: Msg.t('howto.short'), primary: true, onClick: () => HowTo.open(v, { actions: [{ label: Msg.t('howto.back'), onClick: back }] }) },
      ],
    });
  }

  function onboardStep() {
    return data.onboardStep;
  }

  return { init, render, gainFromLines, hasAction, nextGoal, flash, onboardStep, limits, season, seasonalVegs, seasonalChallenges, seasonProgress, inSeason, seasonNames, veg };
})();
