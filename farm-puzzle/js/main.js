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
    SaveData.save(save);
    refreshHud();
  }

  function refreshHud() {
    const s = Farm.season();
    const max = Farm.limits();
    document.getElementById('hud-season').textContent = s.icon + s.name;
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
  Zukan.init({ data: save, config });

  Farm.init({
    data: save,
    config,
    onChange: persist,
    // 畑で作業したら「一手もどす」はできなくなる
    onAction: () => Puzzle.clearUndo(),
    // 初めて収穫した野菜は図鑑に登録
    onHarvest: (veg, first) => {
      Zukan.render();
      if (first) Zukan.announce(veg, () => showScreen('zukan'));
    },
  });

  // 1プレイが終わったら季節を進めて、次のプレイへ
  function finishGame(next) {
    Farm.advanceSeason();
    Puzzle.newGame();
    if (next === 'farm') showScreen('farm');
  }

  Puzzle.init({
    data: save,
    onSave: persist,
    // 列を消したら資源が貯まり、畑の野菜が育つ
    onLinesCleared: (info) => Farm.gainFromLines(info),
    onUndo: () => Farm.render(),
    onStaleOver: () => Farm.advanceSeason(),
    onGameOver: ({ score, isNewBest }) => {
      const s = config.seasons[(save.seasonIndex + 1) % config.seasons.length];
      const lines = [Msg.t('puzzle.gameOverBody', { score })];
      if (isNewBest) lines.push(Msg.t('puzzle.newBest'));
      lines.push(Msg.t('puzzle.seasonChanged', { icon: s.icon, season: s.name }));
      const buttons = [];
      // 置き間違えで終わったときのために、ここでも「一手もどす」を選べる
      if (Puzzle.canUndo()) buttons.push({ label: Msg.t('puzzle.undo'), onClick: () => Puzzle.undo() });
      buttons.push({ label: Msg.t('puzzle.toFarm'), onClick: () => finishGame('farm') });
      buttons.push({ label: Msg.t('puzzle.retry'), primary: true, onClick: () => finishGame() });
      Modal.open({ title: Msg.t('puzzle.gameOverTitle'), body: lines.join('\n'), buttons });
    },
  });

  refreshHud();

  // 初めて遊ぶ人には遊び方を案内
  if (!save.tutorialDone) {
    Guide.show(() => {
      save.tutorialDone = true;
      persist();
    });
  }
})();
