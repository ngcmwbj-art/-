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

    root.append(
      h('div', { class: 'zukan-head' },
        h('div', { class: 'zukan-title' }, Msg.t('zukan.title')),
        h('div', { class: 'zukan-count' }, Msg.t('zukan.count', { found, total: cfg.vegetables.length }))
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
      vegs.filter((v) => v.guide.plantMonths.includes(month)).forEach((v) => list.append(monthCard(v)));
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
        h('button', { class: 'link-btn', type: 'button', onclick: () => HowTo.open(v) }, Msg.t('howto.open'))
      )
    );
  }

  // 季節のバッジ：その季節の基本の野菜をぜんぶ収穫したら色がつく。4つそろうと🏆
  function badges() {
    const done = cfg.seasons.map((s) => cfg.vegetables
      .filter((v) => v.seasons.includes(s.id) && !Missions.isChallenge(v))
      .every((v) => data.harvested[v.id]));
    const all = done.every(Boolean);
    return h('div', { class: 'badges' },
      h('span', { class: 'badges-label' }, Msg.t('zukan.badges')),
      cfg.seasons.map((s, i) => h('span', {
        class: 'badge-season' + (done[i] ? ' got' : ''),
        title: Msg.t(done[i] ? 'zukan.badgeGot' : 'zukan.badgeNot', { season: s.name }),
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
        g.planter ? h('div', { class: 'month-planter' }, Msg.t('zukan.planterFit', { fit: Msg.t('howto.fit.' + g.planter.fit) })) : null,
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
        v.unlock ? h('p', { class: 'zukan-locked-text' }, Msg.t('zukan.challengeText')) : null
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

  return { init, render, announce };
})();
