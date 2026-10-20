'use strict';
/* =========================================================
   起動処理：データを読み込んで、各画面を準備する
   ========================================================= */
(async function main() {
  try {
    const messages = await loadJSON('data/messages.json');
    Msg.init(messages);
  } catch (e) {
    console.error(e);
    document.getElementById('load-error').hidden = false;
    return;
  }
  Msg.applyToDom();

  const save = SaveData.load();
  const persist = () => SaveData.save(save);

  Puzzle.init({
    data: save,
    onSave: persist,
    onGameOver: ({ score, isNewBest }) => {
      const body = Msg.t('puzzle.gameOverBody', { score }) + (isNewBest ? '\n' + Msg.t('puzzle.newBest') : '');
      Modal.open({
        title: Msg.t('puzzle.gameOverTitle'),
        body,
        buttons: [{ label: Msg.t('puzzle.retry'), primary: true, onClick: () => Puzzle.newGame() }],
      });
    },
  });
})();
