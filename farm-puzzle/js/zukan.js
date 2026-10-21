'use strict';
/* =========================================================
   図鑑
   - 収穫した野菜が登録され、旬と育て方のコツが読める
   - 中身は data/vegetables.json（seasonText・tips・steps）
   ========================================================= */
const Zukan = (() => {
  const STEPS = ['sow', 'water', 'fertilize', 'harvest'];

  let data = null;   // 保存データ全体
  let cfg = null;    // data/vegetables.json の中身
  let root = null;
  let filter = 'all';  // 図鑑のしぼりこみ（all か 季節のID）

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

    // 季節でしぼりこむボタン
    const chips = h('div', { class: 'zukan-filter' });
    [{ id: 'all', name: Msg.t('zukan.all') }, ...cfg.seasons].forEach((s) => {
      chips.append(h('button', {
        class: 'filter-chip' + (filter === s.id ? ' active' : ''),
        type: 'button',
        onclick: () => { filter = s.id; render(); },
      }, (s.icon ? s.icon + ' ' : '') + s.name));
    });
    root.append(chips);

    const list = h('div', { class: 'zukan-list' });
    cfg.vegetables
      .filter((v) => filter === 'all' || v.seasons.includes(filter))
      .forEach((v) => list.append(data.harvested[v.id] ? card(v) : lockedCard(v)));
    root.append(list);
  }

  // 登録ずみの野菜
  function card(v) {
    return h('article', { class: 'zukan-card' },
      h('div', { class: 'zukan-icon' }, vegIcon(v)),
      h('div', { class: 'zukan-body' },
        h('h3', { class: 'zukan-name' }, v.name),
        h('div', { class: 'zukan-meta' },
          h('span', { class: 'zukan-season' }, Msg.t('zukan.season', { text: v.seasonText })),
          h('span', { class: 'zukan-times' }, Msg.t('zukan.times', { n: data.harvested[v.id] }))
        ),
        h('ul', { class: 'zukan-tips' }, v.tips.map((tip) => h('li', {}, tip))),
        h('details', { class: 'zukan-steps' },
          h('summary', {}, Msg.t('zukan.howTo')),
          h('ol', {}, STEPS.map((step) =>
            h('li', {}, h('b', {}, Msg.t('farm.stepNames.' + step)), '　', v.steps[step])))
        )
      )
    );
  }

  // まだ収穫していない野菜（名前はかくし、旬の季節だけ見せる）
  function lockedCard(v) {
    const seasons = v.seasons.map((id) => cfg.seasons.find((s) => s.id === id).name).join('・');
    return h('article', { class: 'zukan-card locked' },
      h('div', { class: 'zukan-icon' }, '？'),
      h('div', { class: 'zukan-body' },
        h('h3', { class: 'zukan-name' }, Msg.t('zukan.unknownName')),
        h('p', { class: 'zukan-locked-text' }, Msg.t('zukan.unknownText', { season: seasons }))
      )
    );
  }

  // 初めて収穫したときのお知らせ
  function announce(v, onOpen) {
    Modal.open({
      title: Msg.t('zukan.newEntryTitle'),
      body: h('div', { class: 'new-entry' },
        h('div', { class: 'new-entry-icon' }, vegIcon(v)),
        h('div', { class: 'new-entry-name' }, v.name),
        h('p', {}, v.tips[0])
      ),
      buttons: [
        { label: Msg.t('common.close') },
        { label: Msg.t('zukan.open'), primary: true, onClick: onOpen },
      ],
    });
  }

  return { init, render, announce };
})();
