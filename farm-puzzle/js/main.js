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
    document.getElementById('hud-season').textContent = `${s.icon}${s.name} ${prog.got}/${prog.total}`;
    // ⑧ 季節ごとに背景と盤面のふちの色を変える（ブロックとマスの色はそのまま）
    document.documentElement.dataset.season = s.id;
    document.getElementById('hud-water').textContent = save.resources.water;
    document.getElementById('hud-fertilizer').textContent = save.resources.fertilizer;
    document.getElementById('hud-coins').textContent = save.resources.coins;
    // 水がめ・肥料袋のたまり具合をゲージで見せる
    setGauge('hud-water-box', save.resources.water / max.water);
    setGauge('hud-fertilizer-box', save.resources.fertilizer / max.fertilizer);
    document.querySelector('.tab[data-screen="farm"]').classList.toggle('has-badge', Farm.hasAction());
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
    document.querySelectorAll('.tab').forEach((el) => el.classList.toggle('active', el.dataset.screen === name));
    if (name === 'puzzle') Puzzle.measure();
    if (name === 'farm') Farm.render();
    if (name === 'zukan') Zukan.render();
    window.scrollTo(0, 0);
  }
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => showScreen(tab.dataset.screen));
  });

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

  /* ---------- 各画面の準備 ---------- */
  Quiz.init({ config });
  HowTo.init({ config });
  Missions.init({
    data: save,
    config,
    onUnlock: (vegs) => {
      toast(Msg.t('mission.unlocked', { list: vegs.map((v) => v.name).join('・') }));
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
      };
      next();
    },
  });

  function celebrateSeason({ done, next, vegs }) {
    Sound.play('harvest', 5);
    Modal.open({
      title: Msg.t('season.completeTitle', { icon: done.icon, season: done.name }),
      body: h('div', { class: 'season-complete' },
        h('div', { class: 'season-complete-vegs' }, vegs.map((v) => vegIcon(v))),
        h('p', {}, Msg.t('season.completeBody', { done: done.name, icon: next.icon, season: next.name }))
      ),
      buttons: [{ label: Msg.t('season.toNext', { icon: next.icon, season: next.name }), primary: true, onClick: () => welcomeSeason(next) }],
    });
  }

  // 新しい季節が来たことと、その季節の旬の野菜を知らせる
  function welcomeSeason(s) {
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
          vegs.map((v) => h('span', { class: 'season-welcome-item' }, vegIcon(v), h('span', {}, v.name))))
      ),
      buttons: [{ label: Msg.t('season.toFarm'), primary: true, onClick: () => showScreen('farm') }],
    });
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
    onGameOver: ({ score, isNewBest }) => {
      const lines = [Msg.t('puzzle.gameOverBody', { score })];
      if (isNewBest) lines.push(Msg.t('puzzle.newBest'));
      const buttons = [];
      // 置き間違えで終わったときのために、ここでも「一手もどす」を選べる
      if (Puzzle.canUndo()) buttons.push({ label: Msg.t('puzzle.undo'), onClick: () => Puzzle.undo() });
      if (Puzzle.canShuffle()) buttons.push({ label: Msg.t('puzzle.shuffleOver'), onClick: () => Puzzle.shuffle() });
      buttons.push({ label: Msg.t('puzzle.toFarm'), onClick: () => finishGame('farm') });
      buttons.push({ label: Msg.t('puzzle.retry'), primary: true, onClick: () => finishGame() });
      Modal.open({ title: Msg.t('puzzle.gameOverTitle'), body: lines.join('\n'), buttons });
    },
  });

  // 起動したときにも、ミッションを満たしていれば種を渡して保存
  persist();

  // 初めて遊ぶ人には遊び方を案内
  if (!save.tutorialDone) {
    Guide.show(() => {
      save.tutorialDone = true;
      persist();
    });
  }
})();
