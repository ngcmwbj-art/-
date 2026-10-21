'use strict';
/* =========================================================
   育て方クイズ
   - 問題は育て方カードのデータ（植える月・収穫の月）から作るので、答えがずれない
   - まちがいの選択肢は「月が1つも重ならない、ほかの野菜の時期」から選ぶ
   - まちがえても何も減らない。カードを見てから何度でも挑戦できる
   ========================================================= */
const Quiz = (() => {
  let cfg = null;

  function init(options) {
    cfg = options.config;
  }

  // [11, 12, 1] → 「11〜1月」、[3, 8, 9] → 「3月・8〜9月」
  function formatMonths(months) {
    const sorted = [...new Set(months)].sort((a, b) => a - b);
    const runs = [];
    sorted.forEach((m) => {
      const last = runs[runs.length - 1];
      if (last && m === last[1] + 1) last[1] = m;
      else runs.push([m, m]);
    });
    // 12月と1月がつながっているときは、年をまたいだ1つの期間にする
    if (runs.length > 1 && runs[0][0] === 1 && runs[runs.length - 1][1] === 12) {
      const first = runs.shift();
      runs[runs.length - 1][1] = first[1];
    }
    return runs.map(([a, b]) => (a === b ? `${a}月` : `${a}〜${b}月`)).join('・');
  }

  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // 問題を1つ作る { question, answer, choices, explain }
  function makeQuestion(v) {
    const kind = Math.random() < 0.5 ? 'plant' : 'harvest';
    const key = kind === 'plant' ? 'plantMonths' : 'harvestMonths';
    const right = v.guide[key];
    const answer = formatMonths(right);
    const wrong = [];
    shuffle(cfg.vegetables).forEach((x) => {
      if (wrong.length >= 2 || x.id === v.id) return;
      const months = x.guide[key];
      if (months.some((m) => right.includes(m))) return;
      const label = formatMonths(months);
      if (label !== answer && !wrong.includes(label)) wrong.push(label);
    });
    return {
      question: Msg.t('quiz.' + kind, { name: v.name }),
      answer,
      choices: shuffle([answer, ...wrong]),
      explain: kind === 'plant' ? v.guide.plant : Msg.t('quiz.harvestExplain', { months: answer, tip: v.steps.harvest }),
    };
  }

  // onPass：正解したときにすること
  function open(v, onPass) {
    const q = makeQuestion(v);
    const choices = h('div', { class: 'quiz-choices' }, q.choices.map((c) =>
      h('button', { class: 'btn quiz-choice', type: 'button', onclick: () => answer(c) }, c)));
    Modal.open({
      title: Msg.t('quiz.title', { name: v.name }),
      body: h('div', { class: 'quiz' }, h('div', { class: 'quiz-icon' }, vegIcon(v)), h('p', { class: 'quiz-q' }, q.question), choices),
      buttons: [
        { label: Msg.t('howto.open'), onClick: () => HowTo.open(v, { actions: [{ label: Msg.t('quiz.try'), primary: true, onClick: () => open(v, onPass) }] }) },
        { label: Msg.t('common.cancel') },
      ],
    });

    function answer(choice) {
      if (choice === q.answer) {
        Sound.play('ripen');
        Modal.open({
          title: Msg.t('quiz.right'),
          body: h('div', { class: 'quiz' }, h('div', { class: 'quiz-icon' }, vegIcon(v)), h('p', {}, q.explain)),
          buttons: [{ label: Msg.t('common.close'), primary: true, onClick: () => { if (onPass) onPass(); } }],
        });
      } else {
        Modal.open({
          title: Msg.t('quiz.wrong'),
          body: Msg.t('quiz.wrongBody', { answer: q.answer, explain: q.explain }),
          buttons: [
            { label: Msg.t('howto.open'), onClick: () => HowTo.open(v, { actions: [{ label: Msg.t('quiz.try'), primary: true, onClick: () => open(v, onPass) }] }) },
            { label: Msg.t('quiz.again'), primary: true, onClick: () => open(v, onPass) },
          ],
        });
      }
    }
  }

  return { init, open, formatMonths };
})();
