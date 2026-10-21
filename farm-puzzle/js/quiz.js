'use strict';
/* =========================================================
   育て方クイズ
   - 問題は育て方カードのデータ（植える月・収穫の月）から作るので、答えがずれない
   - まちがいの選択肢は「月が1つも重ならない、ほかの野菜の時期」から選ぶ
   - まちがえても何も減らない。カードを見てから何度でも挑戦できる
   - おさらいクイズ：図鑑に登録した野菜から1回5問。正解するたびにすぐ数えるので、途中でやめても残る
   ========================================================= */
const Quiz = (() => {
  const ROUND = 5;   // おさらいクイズ1回の問題数
  let cfg = null;
  let data = null;
  let hooks = {};    // { onCorrect }

  function init(options) {
    cfg = options.config;
    data = options.data;
    hooks = options;
  }

  // 正解した数の合計から称号を決める（data/messages.json の quiz.titles）
  function title() {
    const titles = Msg.get('quiz.titles') || [];
    let name = '';
    titles.forEach((t) => { if (data.quizCorrect >= t.n) name = t.name; });
    return name;
  }

  // おさらいクイズ（vegs：出題する野菜）
  function review(vegs) {
    let i = 0;
    let right = 0;
    const next = () => {
      if (i >= ROUND) {
        Modal.open({
          title: Msg.t('quiz.reviewDone'),
          body: Msg.t('quiz.reviewResult', { right, total: ROUND, sum: data.quizCorrect, title: title() }),
          buttons: [
            { label: Msg.t('common.close') },
            { label: Msg.t('quiz.reviewAgain'), primary: true, onClick: () => review(vegs) },
          ],
        });
        return;
      }
      i += 1;
      const v = vegs[Math.floor(Math.random() * vegs.length)];
      const q = makeQuestion(v);
      const choose = (c) => {
        const ok = c === q.answer;
        if (ok) {
          right += 1;
          data.quizCorrect += 1;
          Sound.play('ripen');
          if (hooks.onCorrect) hooks.onCorrect();
        }
        // 正解でもまちがいでも、野菜の絵と栽培カレンダーをいっしょに見せて覚えやすく
        Modal.open({
          title: ok ? Msg.t('quiz.right') : Msg.t('quiz.wrong'),
          body: h('div', { class: 'quiz' },
            h('div', { class: 'quiz-icon' }, vegIcon(v)),
            h('div', { class: 'quiz-name' }, v.name),
            ok ? null : h('p', { class: 'quiz-answer' }, Msg.t('quiz.answerWas', { answer: q.answer })),
            HowTo.calendar(v.guide),
            h('p', {}, q.explain)),
          buttons: [
            { label: Msg.t('quiz.stop') },
            { label: i >= ROUND ? Msg.t('quiz.seeResult') : Msg.t('guide.next'), primary: true, onClick: next },
          ],
        });
      };
      Modal.open({
        title: Msg.t('quiz.reviewTitle', { n: i, total: ROUND }),
        body: h('div', { class: 'quiz' },
          h('div', { class: 'quiz-icon' }, vegIcon(v)),
          h('p', { class: 'quiz-q' }, q.question),
          h('div', { class: 'quiz-choices' }, q.choices.map((c) =>
            h('button', { class: 'btn quiz-choice', type: 'button', onclick: () => choose(c) }, c)))),
        buttons: [{ label: Msg.t('quiz.stop') }],
      });
    };
    next();
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

  return { init, open, review, title, formatMonths };
})();
