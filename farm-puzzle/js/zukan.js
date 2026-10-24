'use strict';
/* =========================================================
   図鑑
   - 収穫した野菜が登録され、旬と育て方のコツが読める
   - 中身は data/vegetables.json（seasonText・tips）。くわしい育て方は育て方カード（js/howto.js）
   ========================================================= */
const Zukan = (() => {
  let data = null;   // 保存データ全体
  let cfg = null;    // data/vegetables.json の中身
  let root = null;
  let filter = 'all';  // 図鑑のしぼりこみ（all・季節のID・month＝現実の今月まける野菜）
  let easyFirst = false;  // 育てやすい順に並べるか

  function init(options) {
    data = options.data;
    cfg = options.config;
    root = document.getElementById('zukan');
    render();
  }

  function render() {
    if (!root) return;
    root.innerHTML = '';
    const found = cfg.vegetables.filter((v) => data.harvested[v.id]).length;

    // 今の季節の数：基本の旬と、種が手に入ったチャレンジ野菜だけを数える（届かない数を分母に入れない）
    const s = cfg.seasons[data.seasonIndex % cfg.seasons.length];
    const now = cfg.vegetables.filter((v) => v.seasons.includes(s.id) && !Missions.isLocked(v));
    const nowFound = now.filter((v) => data.harvested[v.id]).length;
    root.append(
      h('div', { class: 'zukan-head' },
        h('div', { class: 'zukan-title' }, Msg.t('zukan.title')),
        h('div', { class: 'zukan-count' },
          h('div', { class: 'zukan-count-now' }, Msg.t('zukan.countNow', { icon: s.icon, season: s.name, n: nowFound, total: now.length })),
          h('div', { class: 'zukan-count-all' }, Msg.t('zukan.count', { found, total: cfg.vegetables.length })))
      )
    );

    root.append(badges());

    // おさらいクイズの入口（図鑑の上に1つだけ）
    const known = cfg.vegetables.filter((v) => data.harvested[v.id]);
    root.append(h('div', { class: 'review-box' },
      h('div', { class: 'review-info' },
        h('div', { class: 'review-title' }, Msg.t('quiz.reviewEntry')),
        h('div', { class: 'review-sub' }, known.length
          ? Msg.t('quiz.reviewStatus', { title: Quiz.title(), sum: data.quizCorrect })
          : Msg.t('quiz.reviewEmpty'))),
      h('button', {
        class: 'btn primary', type: 'button',
        disabled: known.length ? null : '',
        onclick: () => Quiz.review(known),
      }, Msg.t('quiz.reviewStart'))));

    // 季節でしぼりこむボタン
    const chips = h('div', { class: 'zukan-filter' });
    const month = new Date().getMonth() + 1;
    [{ id: 'month', name: Msg.t('zukan.monthChip', { m: month }) }, { id: 'all', name: Msg.t('zukan.all') }, ...cfg.seasons].forEach((s) => {
      chips.append(h('button', {
        class: 'filter-chip' + (filter === s.id ? ' active' : '') + (s.id === 'month' ? ' month' : ''),
        type: 'button',
        onclick: () => { filter = s.id; render(); },
      }, (s.icon ? s.icon + ' ' : '') + s.name));
    });
    chips.append(h('button', {
      class: 'filter-chip month' + (filter === 'planter' ? ' active' : ''),
      type: 'button',
      onclick: () => { filter = 'planter'; render(); },
    }, Msg.t('zukan.planterChip')));
    chips.append(h('button', {
      class: 'filter-chip sort' + (easyFirst ? ' active' : ''),
      type: 'button',
      onclick: () => { easyFirst = !easyFirst; render(); },
    }, Msg.t('zukan.easyFirst')));
    root.append(chips);

    let vegs = cfg.vegetables.slice();
    if (easyFirst) vegs.sort((a, b) => a.guide.level - b.guide.level);   // 同じ★の中は元の順のまま
    const list = h('div', { class: 'zukan-list' });
    if (filter === 'month') {
      // 現実のカレンダーで、今月植えられる野菜（実際の家庭菜園の参考に。名前もそのまま見せる）
      root.append(h('p', { class: 'month-note' }, Msg.t('zukan.monthNote', { m: month })));
      list.append(h('h3', { class: 'month-heading' }, Msg.t('zukan.monthSow', { m: month })));
      vegs.filter((v) => v.guide.plantMonths.includes(month)).forEach((v) => list.append(monthCard(v)));
      // 今月とれる野菜（収穫の月）と食べ方。新しいチップは増やさず、同じ画面の下に並べる
      list.append(h('h3', { class: 'month-heading' }, Msg.t('zukan.monthHarvest', { m: month })),
        h('p', { class: 'month-note' }, Msg.t('zukan.monthHarvestNote')));
      vegs.filter((v) => v.guide.harvestMonths.includes(month)).forEach((v) => list.append(harvestCard(v)));
    } else if (filter === 'planter') {
      // ベランダのプランターで育てられる野菜（向いている → ひと工夫で の順）。実際の家庭菜園の参考に、名前も見せる
      root.append(h('p', { class: 'month-note' }, Msg.t('zukan.planterNote')));
      const rank = { ok: 0, kufuu: 1 };
      vegs.filter((v) => v.guide.planter && v.guide.planter.fit in rank)
        .sort((a, b) => rank[a.guide.planter.fit] - rank[b.guide.planter.fit])
        .forEach((v) => list.append(monthCard(v)));
    } else {
      vegs.filter((v) => filter === 'all' || v.seasons.includes(filter))
        .forEach((v) => list.append(data.harvested[v.id] ? card(v) : lockedCard(v)));
    }
    root.append(list);
  }

  // 登録ずみの野菜
  function card(v) {
    return h('article', { class: 'zukan-card' },
      h('div', { class: 'zukan-icon' }, vegIcon(v)),
      h('div', { class: 'zukan-body' },
        h('h3', { class: 'zukan-name' }, v.name),
        h('div', { class: 'zukan-meta' },
          seasonBand(v),
          h('span', { class: 'zukan-season' }, Msg.t('zukan.season', { text: v.seasonText })),
          h('span', { class: 'zukan-times' }, Msg.t('zukan.times', { n: data.harvested[v.id] }))
        ),
        h('ul', { class: 'zukan-tips' }, v.tips.map((tip) => h('li', {}, tip))),
        v.eat ? h('div', { class: 'zukan-eat' }, Msg.t('farm.eat', { text: v.eat })) : null,
        v.family ? h('div', { class: 'zukan-family' }, '🌿 ' + HowTo.familyText(v)) : null,
        h('button', { class: 'link-btn', type: 'button', onclick: () => HowTo.open(v) }, Msg.t('howto.open'))
      )
    );
  }

  // 賞状（季節をそろえたときと、図鑑のバッジから見返すときの共通の部品）
  function certificate(s, rec) {
    const vegs = cfg.vegetables.filter((v) => v.seasons.includes(s.id) && !Missions.isChallenge(v));
    return h('div', { class: 'certificate' },
      h('div', { class: 'cert-title' }, Msg.t('season.certTitle')),
      rec.count > 1 ? h('div', { class: 'cert-count' }, Msg.t('season.certCount', { icon: s.icon, season: s.name, n: rec.count })) : null,
      h('div', { class: 'cert-text' }, Msg.t('season.certText', { icon: s.icon, season: s.name })),
      // 絵だけでは何の野菜か分からないので、名前も小さく
      h('div', { class: 'cert-vegs' }, vegs.map((v) => h('span', { class: 'cert-veg' }, vegIcon(v), h('small', {}, v.name)))),
      h('div', { class: 'cert-stats' }, Msg.t('season.certStats', { total: rec.total, n: rec.n, all: rec.all })),
      h('div', { class: 'cert-date' }, Msg.t('season.certDate', { y: rec.y, m: rec.m, d: rec.d })));
  }

  // 季節の畑しごと（3行）と、その季節の献立（料理名だけ。押すとその野菜の育て方カード＝食べ方へ）
  function seasonWork(s) {
    if (!s.work) return null;
    // 収穫したことのある野菜の料理を先に（とれた野菜で作れる、が分かるように）
    const dishes = (s.dishes || []).slice().sort((a, b) => (data.harvested[b.veg] ? 1 : 0) - (data.harvested[a.veg] ? 1 : 0));
    return h('div', { class: 'season-work' },
      h('div', { class: 'season-work-title' }, Msg.t('season.work', { season: s.name })),
      h('ul', {}, s.work.map((w) => h('li', {}, w))),
      dishes.length ? h('div', { class: 'season-dishes' },
        h('div', { class: 'season-work-title' }, Msg.t('season.dishes', { season: s.name })),
        h('div', { class: 'dish-list' }, dishes.map((x) => {
          const v = cfg.vegetables.find((y) => y.id === x.veg);
          return h('button', { class: 'dish-chip' + (data.harvested[x.veg] ? ' got' : ''), type: 'button', onclick: () => HowTo.open(v) }, '🍳 ' + x.name);
        }))) : null);
  }

  // 季節のバッジ：その季節の基本の野菜をぜんぶ収穫したら色がつく。4つそろうと🏆
  function badges() {
    const done = cfg.seasons.map((s) => cfg.vegetables
      .filter((v) => v.seasons.includes(s.id) && !Missions.isChallenge(v))
      .every((v) => data.harvested[v.id]));
    const all = done.every(Boolean);
    return h('div', { class: 'badges' },
      h('span', { class: 'badges-label' }, Msg.t('zukan.badges')),
      // バッジを押すと、その季節の畑しごとを読み返せる
      cfg.seasons.map((s, i) => h('button', {
        class: 'badge-season' + (done[i] ? ' got' : ''),
        type: 'button',
        title: Msg.t(done[i] ? 'zukan.badgeGot' : 'zukan.badgeNot', { season: s.name }),
        // そろえた記録があれば賞状を見返せる。前から遊んでいて記録がない季節は、畑しごとだけ
        onclick: () => {
          const rec = (data.seasonClears || {})[s.id];
          Modal.open({
            title: s.icon + ' ' + s.name,
            body: h('div', { class: 'season-complete' },
              rec ? certificate(s, rec) : h('p', { class: 'badge-note' }, Msg.t(done[i] ? 'zukan.badgeGot' : 'zukan.badgeNot', { season: s.name })),
              seasonWork(s)),
            buttons: [{ label: Msg.t('common.close'), primary: true }],
          });
        },
      }, s.icon)),
      h('span', { class: 'badge-season trophy' + (all ? ' got' : ''), title: Msg.t('zukan.badgeAll') }, '🏆'));
  }

  // 今月まける野菜のカード（植える時期・育てやすさ・プランターの向き・育て方カードへ）
  function monthCard(v) {
    const g = v.guide;
    return h('article', { class: 'zukan-card month-card' },
      h('div', { class: 'zukan-icon' }, vegIcon(v)),
      h('div', { class: 'zukan-body' },
        h('h3', { class: 'zukan-name' }, v.name,
          h('span', { class: 'stars' }, ' ' + '★'.repeat(g.level) + '☆'.repeat(3 - g.level))),
        h('div', { class: 'month-plant' }, g.plant),
        g.planter ? h('div', { class: 'month-planter' }, Msg.t('zukan.planterFit', { fit: Msg.t('howto.fit.' + g.planter.fit) })
          + (filter === 'planter' ? `　${g.planter.depth} / ${g.planter.count}` : '')) : null,
        h('button', { class: 'link-btn', type: 'button', onclick: () => HowTo.open(v) }, Msg.t('howto.open'))));
  }

  // 今月とれる野菜のカード（収穫の月・おいしい食べ方・育て方カードへ）
  function harvestCard(v) {
    return h('article', { class: 'zukan-card month-card' },
      h('div', { class: 'zukan-icon' }, vegIcon(v)),
      h('div', { class: 'zukan-body' },
        h('h3', { class: 'zukan-name' }, v.name),
        h('div', { class: 'month-plant' }, Msg.t('zukan.harvestMonths', { months: Quiz.formatMonths(v.guide.harvestMonths) })),
        v.eat ? h('div', { class: 'zukan-eat' }, Msg.t('farm.eat', { text: v.eat })) : null,
        h('button', { class: 'link-btn', type: 'button', onclick: () => HowTo.open(v) }, Msg.t('howto.open'))));
  }

  // 春夏秋冬の4つのます。旬の季節に色がつく
  function seasonBand(v) {
    return h('span', { class: 'season-band', 'aria-label': Msg.t('zukan.season', { text: v.seasonText }) },
      cfg.seasons.map((s) => h('span', { class: `band-cell ${s.id}` + (v.seasons.includes(s.id) ? ' on' : '') }, s.name)));
  }

  // まだ収穫していない野菜（名前はかくし、旬の季節だけ見せる）
  function lockedCard(v) {
    const seasons = v.seasons.map((id) => cfg.seasons.find((s) => s.id === id).name).join('・');
    return h('article', { class: 'zukan-card locked' },
      h('div', { class: 'zukan-icon' }, '？'),
      h('div', { class: 'zukan-body' },
        h('h3', { class: 'zukan-name' }, Msg.t('zukan.unknownName')),
        h('div', { class: 'zukan-meta' }, seasonBand(v)),
        h('p', { class: 'zukan-locked-text' }, Msg.t('zukan.unknownText', { season: seasons })),
        Missions.isLocked(v) ? h('p', { class: 'zukan-locked-text' }, Msg.t('zukan.challengeText')) : null
      )
    );
  }

  // 初めて収穫したときのお知らせ
  // onOpen：「図鑑を見る」を押したとき、onAfter：どちらのボタンでも閉じたあと
  function announce(v, onOpen, onAfter) {
    Modal.open({
      title: Msg.t('zukan.newEntryTitle'),
      body: h('div', { class: 'new-entry' },
        h('div', { class: 'new-entry-icon' }, vegIcon(v)),
        h('div', { class: 'new-entry-name' }, v.name),
        h('p', {}, v.tips[0]),
        h('button', { class: 'link-btn', type: 'button', onclick: () => HowTo.open(v, { onClose: onAfter }) }, Msg.t('howto.open'))
      ),
      buttons: [
        { label: Msg.t('common.close'), onClick: () => { if (onAfter) onAfter(); } },
        { label: Msg.t('zukan.open'), primary: true, onClick: () => { if (onOpen) onOpen(); if (onAfter) onAfter(); } },
      ],
    });
  }

  return { init, render, announce, certificate, seasonWork };
})();
