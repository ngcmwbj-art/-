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

  // 保存して、上のバーとタブの表示を最新にする
  function persist() {
    SaveData.save(save);
    refreshHud();
  }

  function refreshHud() {
    const s = Farm.season();
    document.getElementById('hud-season').textContent = s.icon + s.name;
    document.getElementById('hud-water').textContent = save.resources.water;
    document.getElementById('hud-fertilizer').textContent = save.resources.fertilizer;
    document.getElementById('hud-coins').textContent = save.resources.coins;
    document.querySelector('.tab[data-screen="farm"]').classList.toggle('has-badge', Farm.hasAction());
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

  /* ---------- 各画面の準備 ---------- */
  Zukan.init({ data: save, config });

  Farm.init({
    data: save,
    config,
    onChange: persist,
    // 初めて収穫した野菜は図鑑に登録
    onHarvest: (veg, first) => {
      Zukan.render();
      if (first) Zukan.announce(veg, () => showScreen('zukan'));
    },
  });

  Puzzle.init({
    data: save,
    onSave: persist,
    // 列を消したら資源が貯まる
    onLinesCleared: (info) => Farm.gainFromLines(info),
    onGameOver: ({ score, isNewBest }) => {
      const s = Farm.advanceSeason();
      const lines = [Msg.t('puzzle.gameOverBody', { score })];
      if (isNewBest) lines.push(Msg.t('puzzle.newBest'));
      lines.push(Msg.t('puzzle.seasonChanged', { icon: s.icon, season: s.name }));
      Modal.open({
        title: Msg.t('puzzle.gameOverTitle'),
        body: lines.join('\n'),
        buttons: [
          { label: Msg.t('puzzle.toFarm'), onClick: () => { Puzzle.newGame(); showScreen('farm'); } },
          { label: Msg.t('puzzle.retry'), primary: true, onClick: () => Puzzle.newGame() },
        ],
      });
    },
  });

  refreshHud();
})();
