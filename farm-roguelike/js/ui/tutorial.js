'use strict';
/* =========================================================
   遊び方の案内（はじめての戦闘で1回だけ。帳面の「遊び方を見る」でいつでも見直せる）
   - 画面の部品を1つずつ光らせ、その近くに説明の吹き出しを出す
   - 「次へ」で進み、「飛ばす」でやめる。案内の間はカードを使えない
   ========================================================= */
FR.Tutorial = {
  STEPS: [
    { sel: '#hand', text: '手札です。カードを1回タップすると大きく表示され、言葉の説明も出ます。もう一度タップで使います（上に引っぱって離しても使えます）' },
    { sel: '#b-energy', text: 'エネルギーです。カードの左上の数字だけ減ります。毎ターン3に戻ります' },
    { sel: '#b-enemies', text: '敵です。頭の上の印が「次にすること」。鎌の印の数字は、こちらが受ける被害です。下のバーは敵の体力（勢い）です' },
    { sel: '#b-player', text: 'あなたの農場の健康度です。0になると離農（挑戦の終わり）。「守り」のカードを使うと、先に被害を受け止めます。農家をタップすると、今の状態が見られます' },
    { sel: '.field-row', when: b => b.plots.length > 0, text: '畑です。種や苗を植えると、ターンの終わりごとに育ちます。実ったら区画をタップして収穫（右の「まとめて収穫」でも）。銭と、守りや攻撃などの効果が入ります' },
    { sel: '.field-row', when: b => b.plots.length === 0, text: '畜舎です。子牛などを入れ、給餌のカードで育てます（自然には育ちません）。手入れが多いほど格付けが上がり、高く出荷できます。畜舎をタップすると詳しく見られます' },
    { sel: '#b-end', text: 'できることを終えたら「ターン終了」。敵が動き、作物が育ち、次のターンに5枚引きます' },
    { sel: '.topbar', text: '左上は季節と進み具合です。1つの季節は6段で、最後の段は季節の大災害（ボス）。春・夏・秋・冬を越えればクリアです' }
  ],
  i: 0,
  steps: [],

  start() {
    const b = typeof App !== 'undefined' && App.battle;
    if (!b) return;
    FR.Tutorial.steps = FR.Tutorial.STEPS.filter(s => !s.when || s.when(b));
    FR.Tutorial.i = 0;
    FR.Tutorial.running = true;
    FR.HandInput.locked = true;
    FR.HandInput.clear();
    FR.Tutorial.show();
  },

  show() {
    const T = FR.Tutorial;
    document.querySelectorAll('.tut-focus').forEach(e => e.classList.remove('tut-focus'));
    const st = T.steps[T.i];
    const bub = document.getElementById('tut-bubble');
    if (!st || !bub) return T.end();
    const target = document.querySelector(st.sel);
    if (target) target.classList.add('tut-focus');
    const last = T.i === T.steps.length - 1;
    bub.innerHTML = `<p class="tut-count">遊び方 ${T.i + 1} / ${T.steps.length}</p><p class="tut-text">${FR.Util.escape(st.text)}</p>
      <div class="tut-actions"><button class="btn small" id="tut-skip">${last ? '' : '飛ばす'}</button><button class="btn primary small" id="tut-next">${last ? 'はじめる' : '次へ'}</button></div>`;
    bub.querySelector('#tut-skip').hidden = last;
    bub.hidden = false;
    // 吹き出しは、光らせた部品の上か下の空いているほうに置く
    const r = target ? target.getBoundingClientRect() : { top: innerHeight / 2, bottom: innerHeight / 2 };
    const h = bub.offsetHeight;
    const below = innerHeight - r.bottom > h + 16;
    bub.style.top = Math.max(8, Math.min(innerHeight - h - 8, below ? r.bottom + 10 : r.top - h - 10)) + 'px';
    bub.querySelector('#tut-next').onclick = () => { T.i++; T.show(); };
    bub.querySelector('#tut-skip').onclick = () => T.end();
  },

  end() {
    document.querySelectorAll('.tut-focus').forEach(e => e.classList.remove('tut-focus'));
    const bub = document.getElementById('tut-bubble');
    if (bub) bub.hidden = true;
    FR.Tutorial.running = false;
    FR.HandInput.locked = false;
    if (typeof App !== 'undefined') {
      App.data.meta.tutorialDone = true;
      App.save();
      if (App.battle) FR.BattleView.render(App.battle);
    }
  }
};
