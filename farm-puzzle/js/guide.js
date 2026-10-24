'use strict';
/* =========================================================
   初回ガイド（4ページ）
   - 中身は data/messages.json の guide.pages
   - スキップでき、上のバーの「？」からいつでも見直せる
   ========================================================= */
const Guide = (() => {
  function show(onDone) {
    const pages = Msg.get('guide.pages') || [];
    let i = 0;

    function open() {
      const page = pages[i];
      const last = i === pages.length - 1;
      const buttons = [];
      if (!last) buttons.push({ label: Msg.t('guide.skip'), onClick: finish });
      buttons.push({
        label: last ? Msg.t('guide.start') : Msg.t('guide.next'),
        primary: true,
        onClick: last ? finish : () => { i += 1; open(); },
      });
      Modal.open({
        title: Msg.t('guide.title', { n: i + 1, total: pages.length }),
        body: h('div', { class: 'guide' },
          h('div', { class: 'guide-icon' }, page.icon),
          h('p', { class: 'guide-text' }, page.text)
        ),
        buttons,
      });
    }

    function finish() {
      if (onDone) onDone();
    }

    if (pages.length) open();
  }

  return { show };
})();
