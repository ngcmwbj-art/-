'use strict';
/* =========================================================
   育て方カード
   - 野菜ごとの「育てやすさ・栽培カレンダー・日当たり・植える時期・
     気をつけたい病気や虫・いちばんのコツ・作業の流れ・ミニ知識」を1枚で見せる
   - 中身は data/vegetables.json の guide・steps・tips
   - 種えらび・畑の区画・図鑑から開ける
   ========================================================= */
const HowTo = (() => {
  const STEPS = ['sow', 'water', 'fertilize', 'harvest'];
  const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  // options.actions：カードの下に足すボタン [{ label, primary, onClick }]
  // options.onClose：「とじる」を押したあとにすること
  function open(v, options = {}) {
    const g = v.guide;
    const body = h('div', { class: 'howto' },
      h('div', { class: 'howto-head' },
        h('div', { class: 'howto-icon' }, vegIcon(v)),
        h('div', { class: 'howto-head-text' },
          h('div', { class: 'howto-level' },
            Msg.t('howto.level'), ' ',
            h('span', { class: 'stars', 'aria-label': Msg.get('howto.levelText')[g.level - 1] },
              '★'.repeat(g.level) + '☆'.repeat(3 - g.level)),
            ' ', Msg.get('howto.levelText')[g.level - 1]),
          h('div', { class: 'howto-season' }, Msg.t('zukan.season', { text: v.seasonText }))
        )
      ),
      calendar(g),
      h('dl', { class: 'howto-list' },
        row(Msg.t('howto.sun'), g.sun),
        row(Msg.t('howto.plant'), g.plant),
        row(Msg.t('howto.pests'), g.pests),
        row(Msg.t('howto.point'), g.point)
      ),
      h('div', { class: 'howto-sub' }, Msg.t('howto.steps')),
      h('ol', { class: 'howto-steps' },
        STEPS.map((step) => h('li', {}, h('b', {}, Msg.t('farm.stepNames.' + step)), h('span', {}, v.steps[step])))),
      h('div', { class: 'howto-sub' }, Msg.t('howto.tips')),
      h('ul', { class: 'howto-tips' }, v.tips.map((tip) => h('li', {}, tip))),
      h('p', { class: 'howto-note' }, Msg.t('howto.region'))
    );

    Modal.open({
      title: Msg.t('howto.title', { name: v.name }),
      body,
      buttons: [...(options.actions || []), { label: Msg.t('common.close'), onClick: options.onClose }],
    });
    // 長いカードは上から読めるように
    document.querySelector('#modal .modal').scrollTop = 0;
  }

  function row(label, text) {
    return h('div', { class: 'howto-row' }, h('dt', {}, label), h('dd', {}, text));
  }

  // 12か月の栽培カレンダー（植える月・収穫の月に色）
  function calendar(g) {
    return h('div', { class: 'howto-cal' },
      h('div', { class: 'howto-sub' }, Msg.t('howto.calendar')),
      h('div', { class: 'cal-row' }, MONTHS.map((m) => {
        const plant = g.plantMonths.includes(m);
        const harvest = g.harvestMonths.includes(m);
        const cls = 'cal-cell' + (plant ? ' plant' : '') + (harvest ? ' harvest' : '');
        return h('span', { class: cls }, String(m));
      })),
      h('div', { class: 'cal-legend' },
        h('span', { class: 'cal-key plant' }, Msg.t('howto.legendPlant')),
        h('span', { class: 'cal-key harvest' }, Msg.t('howto.legendHarvest')))
    );
  }

  return { open };
})();
