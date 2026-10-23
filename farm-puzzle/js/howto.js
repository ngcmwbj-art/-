'use strict';
/* =========================================================
   育て方カード
   - 野菜ごとの「育てやすさ・栽培カレンダー・日当たり・植える時期・
     気をつけたい病気や虫・いちばんのコツ・作業の流れ・ミニ知識」を1枚で見せる
   - 中身は data/vegetables.json の guide・steps・tips
   - 種えらび・畑の区画・図鑑から開ける
   - カードの文に出てくるむずかしい言葉は、下の「ことばの説明」に読みがなと説明をのせる（data/vegetables.json の glossary）
   ========================================================= */
const HowTo = (() => {
  const STEPS = ['sow', 'water', 'fertilize', 'harvest'];
  const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  let glossary = [];
  let allVegs = [];

  function init(options) {
    glossary = options.config.glossary || [];
    allVegs = options.config.vegetables || [];
  }

  // options.actions：カードの下に足すボタン [{ label, primary, onClick }]
  // options.onClose：「とじる」を押したあとにすること
  // options.now：畑のその区画で今の作業（sow・water・fertilize・harvest）。作業の流れの行を目立たせる
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
        // コツの2行は、むずかしい言葉に読みがな（設定で消せる）
        row(Msg.t('howto.point'), Msg.richText(g.point)),
        v.mistake ? row(Msg.t('howto.mistake'), Msg.richText(v.mistake)) : null,
        v.family ? row(Msg.t('howto.family'), familyText(v)) : null,
        v.eat ? row(Msg.t('howto.eat'), v.eat) : null
      ),
      planter(g.planter),
      h('div', { class: 'howto-sub' }, Msg.t('howto.steps')),
      h('ol', { class: 'howto-steps' },
        STEPS.map((step) => h('li', { class: step === options.now ? 'now' : null },
          h('b', {}, Msg.t('farm.stepNames.' + step)),
          step === options.now ? h('span', { class: 'now-tag' }, Msg.t('howto.now')) : null,
          h('span', {}, v.steps[step])))),
      h('div', { class: 'howto-sub' }, Msg.t('howto.tips')),
      h('ul', { class: 'howto-tips' }, v.tips.map((tip) => h('li', {}, tip))),
      words(v),
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

  // プランターで育てるなら（3行まで：向き・深さと株数・ひとこと）
  function planter(p) {
    if (!p) return null;
    return h('div', { class: 'howto-planter fit-' + p.fit },
      h('div', { class: 'howto-sub' }, Msg.t('howto.planter'), h('span', { class: 'planter-fit' }, Msg.t('howto.fit.' + p.fit))),
      h('div', { class: 'planter-line' }, `🪴 ${p.depth}　/　${p.count}`),
      h('div', { class: 'planter-note' }, p.note));
  }

  // カードの文に出てくる言葉だけを説明する
  function words(v) {
    const g = v.guide;
    const text = [g.sun, g.plant, g.pests, g.point, g.planter ? g.planter.note : '', ...Object.values(v.steps), ...v.tips,
      Msg.t('farm.stepNames.fertilize')].join(' ');
    const found = glossary.filter((w) => text.includes(w.term));
    if (!found.length) return null;
    return h('div', { class: 'howto-words' },
      h('div', { class: 'howto-sub' }, Msg.t('howto.words')),
      h('dl', {}, found.map((w) => h('div', { class: 'word' },
        h('dt', {}, w.term, w.reading !== w.term ? h('span', { class: 'reading' }, `（${w.reading}）`) : null),
        h('dd', {}, w.text)))));
  }

  // なかま：「ナスのなかま（ナス科）：トマト・なす・ピーマン」のように、同じなかまの野菜も並べる
  function familyText(v) {
    const others = allVegs.filter((x) => x.family === v.family && x.id !== v.id).map((x) => x.name);
    return Msg.t('howto.familyText', { family: v.family }) + (others.length ? `：${others.join('・')}` : Msg.t('howto.familyOnly'));
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

  return { init, open, calendar, familyText };
})();
