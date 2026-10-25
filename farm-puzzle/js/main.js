'use strict';
/* =========================================================
   起動処理：データを読み込んで、各画面を準備する
   ========================================================= */
(async function main() {
  let config;
  try {
    const [messages, vegetables] = await Promise.all([
      loadJSON('data/messages.json'),
      loadJSON('data/vegetables.json'),
    ]);
    Msg.init(messages);
    config = vegetables;
  } catch (e) {
    console.error(e);
    document.getElementById('load-error').hidden = false;
    return;
  }
  Msg.applyToDom();

  const save = SaveData.load();
  Sound.init(save.settings);

  // 保存して、上のバーとタブの表示を最新にする
  function persist() {
    Missions.check();   // ミッションを満たしたチャレンジ野菜の種を渡す
    SaveData.save(save);
    refreshHud();
  }

  function refreshHud() {
    const s = Farm.season();
    const max = Farm.limits();
    const prog = Farm.seasonProgress();
    document.getElementById('hud-season').textContent = Msg.t('hud.season', { icon: s.icon, season: s.name, got: prog.got, total: prog.total });
    // ⑧ 季節ごとに背景と盤面のふちの色を変える（ブロックとマスの色はそのまま）
    document.documentElement.dataset.season = s.id;
    document.getElementById('hud-water').textContent = save.resources.water;
    document.getElementById('hud-fertilizer').textContent = save.resources.fertilizer;
    document.getElementById('hud-coins').textContent = save.resources.coins;
    // 水がめ・肥料袋のたまり具合をゲージで見せる
    setGauge('hud-water-box', save.resources.water / max.water);
    setGauge('hud-fertilizer-box', save.resources.fertilizer / max.fertilizer);
    document.querySelector('.tab[data-screen="farm"]').classList.toggle('has-badge', Farm.hasAction());
    // パズル画面の「次の目標」
    const goal = Farm.nextGoal();
    const goalEl = document.getElementById('goal');
    goalEl.textContent = goal.text + (goal.go ? Msg.t('goal.toFarm') : '');
    goalEl.classList.toggle('go', goal.go);
    // はじめの案内中は「はたけ」のタブを光らせる（2歩で終わり）
    document.querySelector('.tab[data-screen="farm"]').classList.toggle('glow', Farm.onboardStep() < 2);
  }

  function setGauge(id, rate) {
    const el = document.getElementById(id);
    el.style.setProperty('--fill', Math.round(Math.min(1, rate) * 100) + '%');
    el.classList.toggle('full', rate >= 1);
  }

  // 資源のアイコンも文言ファイルから
  document.getElementById('hud-water-icon').textContent = Msg.t('icons.water');
  document.getElementById('hud-fertilizer-icon').textContent = Msg.t('icons.fertilizer');
  document.getElementById('hud-coin-icon').textContent = Msg.t('icons.coin');

  /* ---------- 画面の切り替え ---------- */
  function showScreen(name) {
    document.querySelectorAll('.screen').forEach((el) => el.classList.toggle('active', el.id === 'screen-' + name));
    document.body.dataset.screen = name;   // 画面ごとの見た目の切りかえ用（お知らせの位置など）
    document.querySelectorAll('.tab').forEach((el) => el.classList.toggle('active', el.dataset.screen === name));
    if (name === 'puzzle') Puzzle.measure();
    if (name === 'farm') Farm.render();
    if (name === 'zukan') Zukan.render();
    window.scrollTo(0, 0);
  }
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => showScreen(tab.dataset.screen));
  });
  // 次の目標を押すと畑へ。畑ですぐできることなら、その場所を光らせる
  function goToGoal() {
    const goal = Farm.nextGoal();
    showScreen('farm');
    if (goal.go) Farm.flash(goal.plot);
  }
  document.getElementById('goal').addEventListener('click', goToGoal);

  /* ---------- 音・遊び方・設定（画面右上） ---------- */
  const soundBtn = document.getElementById('sound-btn');
  function refreshSoundBtn() {
    soundBtn.textContent = save.settings.sound ? '🔊' : '🔇';
    soundBtn.setAttribute('aria-label', Msg.t(save.settings.sound ? 'hud.soundOn' : 'hud.soundOff'));
  }
  soundBtn.addEventListener('click', () => {
    save.settings.sound = !save.settings.sound;
    Sound.setSound(save.settings.sound);
    toast(Msg.t(save.settings.sound ? 'hud.soundOn' : 'hud.soundOff'));
    refreshSoundBtn();
    persist();
  });
  refreshSoundBtn();

  document.getElementById('help-btn').addEventListener('click', openHelp);
  function openHelp() {
    Modal.open({
      title: Msg.t('help.title'),
      body: Msg.t('help.body'),
      buttons: [
        { label: Msg.t('help.guide'), primary: true, onClick: () => Guide.show() },
        {
          // 音：オフ → 小さめ → ふつう → オフ（右上の🔊とも同じ設定）
          label: Msg.t('help.sound.' + (!save.settings.sound ? 'off' : save.settings.volume === 'small' ? 'small' : 'normal')),
          onClick: () => {
            const s = save.settings;
            if (!s.sound) { s.sound = true; s.volume = 'small'; }
            else if (s.volume === 'small') s.volume = 'normal';
            else s.sound = false;
            Sound.setSound(s.sound);
            refreshSoundBtn();
            persist();
            openHelp();
          },
        },
        {
          label: Msg.t(save.showRuby ? 'help.rubyOn' : 'help.rubyOff'),
          onClick: () => {
            save.showRuby = !save.showRuby;
            Msg.setRuby(save.showRuby);
            persist();
            Farm.render();
            openHelp();
          },
        },
        {
          label: Msg.t(save.settings.bigText ? 'help.bigTextOn' : 'help.bigTextOff'),
          onClick: () => {
            save.settings.bigText = !save.settings.bigText;
            applyTextSize();
            persist();
            openHelp();
          },
        },
        {
          label: Msg.t(save.settings.vibrate ? 'help.vibrateOn' : 'help.vibrateOff'),
          onClick: () => {
            save.settings.vibrate = !save.settings.vibrate;
            Sound.setVibrate(save.settings.vibrate);
            persist();
            openHelp();
          },
        },
        { label: Msg.t('common.close') },
      ],
    });
  }

  // 文字の大きさ（大きめ＝文字が約1.1倍。小さい画面では盤面を少し小さくして収める）
  function applyTextSize() {
    document.documentElement.classList.toggle('big-text', !!save.settings.bigText);
  }

  /* ---------- 各画面の準備 ---------- */
  Msg.setRuby(save.showRuby);
  applyTextSize();
  Quiz.init({ config, data: save, onCorrect: () => { persist(); Zukan.render(); } });
  HowTo.init({ config });
  Missions.init({
    data: save,
    config,
    onUnlock: (vegs) => {
      toast(Msg.t('mission.unlocked', { list: vegs.map((v) => v.name).join('・') }), 5000, true);
      Sound.play('ripen');
      Farm.render();
    },
  });
  Zukan.init({ data: save, config });

  Farm.init({
    data: save,
    config,
    onChange: persist,
    // 畑で作業したら「一手もどす」はできなくなる
    onAction: () => Puzzle.clearUndo(),
    // 初めて収穫した野菜は図鑑に登録。旬をぜんぶそろえたらお祝い（図鑑のお知らせのあとに）
    onHarvest: (firsts, seasonDone) => {
      Zukan.render();
      // 初めての野菜を1つずつ知らせ、最後に季節のお祝い
      const queue = firsts.slice();
      const next = () => {
        const v = queue.shift();
        if (v) Zukan.announce(v, () => showScreen('zukan'), next);
        else if (seasonDone) celebrateSeason(seasonDone);
        else if (!save.seasonWorkShown) showSeasonWork();
      };
      next();
    },
  });

  function celebrateSeason({ done, next }) {
    // 賞状の中身を記録しておく（図鑑の季節バッジからいつでも見返せるように。回数は季節が進んだときだけ数える）
    const today = new Date();
    const prev = save.seasonClears[done.id];
    const rec = {
      count: (prev ? prev.count : 0) + 1,
      y: today.getFullYear(), m: today.getMonth() + 1, d: today.getDate(),
      total: Object.values(save.harvested).reduce((a, b) => a + b, 0),
      n: Object.keys(save.harvested).length, all: config.vegetables.length,
    };
    save.seasonClears[done.id] = rec;
    persist();
    // 収穫の音とぶつからないよう、少し待ってからお祝いのメロディ（音オンのときだけ）
    setTimeout(() => Sound.play('fanfare'), 300);
    Modal.open({
      title: Msg.t('season.completeTitle', { icon: done.icon, season: done.name }),
      body: h('div', { class: 'season-complete' },
        // 賞状：ふち飾りの中に、そろえた野菜・日付・これまでの収穫数・図鑑の登録数（スクショして見せたくなるように）
        Zukan.certificate(done, rec),
        h('p', {}, Msg.t('season.completeBody', { done: done.name, icon: next.icon, season: next.name }))
      ),
      buttons: [{ label: Msg.t('season.toNext', { icon: next.icon, season: next.name }), primary: true, onClick: () => welcomeSeason(next) }],
    });
  }

  // 新しい季節が来たことと、その季節の旬の野菜を知らせる
  function welcomeSeason(s) {
    save.seasonWorkShown = true;
    persist();
    const vegs = Farm.seasonalVegs();
    const pill = document.getElementById('hud-season');
    pill.classList.remove('pop');
    void pill.offsetWidth; // アニメーションをもう一度動かすため
    pill.classList.add('pop');
    Modal.open({
      title: Msg.t('season.welcomeTitle', { icon: s.icon, season: s.name }),
      body: h('div', { class: 'season-complete' },
        h('p', {}, Msg.t('season.welcomeBody', { season: s.name, n: vegs.length, m: Farm.seasonalChallenges().length })),
        h('div', { class: 'season-welcome-list' },
          vegs.map((v) => h('span', { class: 'season-welcome-item' }, vegIcon(v), h('span', {}, v.name)))),
        seasonWork(s)
      ),
      buttons: [{ label: Msg.t('season.toFarm'), primary: true, onClick: () => showScreen('farm') }],
    });
  }

  // 最初の収穫のあとに1回だけ、今の季節の畑しごと（あとは図鑑の季節バッジから読み返せる）
  function showSeasonWork() {
    save.seasonWorkShown = true;
    persist();
    const s = Farm.season();
    Modal.open({
      title: s.icon + ' ' + Msg.t('season.work', { season: s.name }),
      body: h('div', {}, seasonWork(s), h('p', { class: 'season-work-note' }, Msg.t('season.workNote'))),
      buttons: [{ label: Msg.t('common.close'), primary: true }],
    });
  }

  // その季節の畑しごと（2〜3行。図鑑の季節バッジからも読み返せる）
  function seasonWork(s) {
    return Zukan.seasonWork(s);
  }

  // 1プレイが終わったら次のプレイへ（季節は畑で旬の野菜をぜんぶ収穫すると進む）
  function finishGame(next) {
    Puzzle.newGame();
    if (next === 'farm') showScreen('farm');
  }

  Puzzle.init({
    data: save,
    onSave: persist,
    // 列を消したら資源が貯まり、畑の野菜が育つ
    onLinesCleared: (info) => {
      Missions.recordClear(info);
      return Farm.gainFromLines(info);
    },
    onUndo: () => Farm.render(),
    onGameOver: ({ score, isNewBest, water, fertilizer, marks }) => {
      // 点数より先に「畑に持ち帰ったもの」と、畑で次にできることを見せる（負けではなく前進に）
      const goal = Farm.nextGoal();
      // 1行目：持ち帰ったもの（大きく）、2行目：畑で次にできること、3行目：点数（小さく）
      let brought = null;
      if (water || fertilizer) {
        brought = Msg.t('puzzle.brought', { water: `${Msg.t('icons.water')}${water}`, fertilizer: `${Msg.t('icons.fertilizer')}${fertilizer}` });
      } else if (marks) {
        brought = Msg.t('puzzle.broughtFull');   // マークは消したが、水がめ・肥料袋がいっぱいだった
      }
      const body = h('div', { class: 'over' },
        brought ? h('div', { class: 'over-brought' }, brought) : null,
        brought ? h('div', { class: 'over-goal' }, goal.text) : null,
        h('div', { class: 'over-score' }, Msg.t('puzzle.gameOverBody', { score }) + (isNewBest ? '　' + Msg.t('puzzle.newBest') : '')));
      // 大きいボタン2つ（畑へ・もう一度）を先に。「一手もどす」「とりかえ」は小さく下に（消さずに残す）
      const buttons = [
        { label: Msg.t('puzzle.toFarm'), primary: goal.go, onClick: () => { finishGame('farm'); if (goal.go) Farm.flash(goal.plot); } },
        { label: Msg.t('puzzle.retry'), primary: !goal.go, onClick: () => finishGame() },
      ];
      // 置き間違えで終わったときのために、ここでも「一手もどす」を選べる
      if (Puzzle.canUndo()) buttons.push({ label: Msg.t('puzzle.undo'), small: true, onClick: () => Puzzle.undo() });
      if (Puzzle.canShuffle()) buttons.push({ label: Msg.t('puzzle.shuffleOver'), small: true, onClick: () => Puzzle.shuffle() });
      Modal.open({ title: Msg.t('puzzle.gameOverTitle'), body, buttons });
    },
  });

  // 起動したときにも、ミッションを満たしていれば種を渡して保存
  persist();
  // 保存データが読めなかったときは、黙って直さずに一言知らせる
  if (SaveData.recoveredFrom()) toast(Msg.t('save.' + SaveData.recoveredFrom()), 6000, true);

  // 初めて遊ぶ人には遊び方を案内
  if (!save.tutorialDone) {
    Guide.show(() => {
      save.tutorialDone = true;
      persist();
    });
  }
})();
