// ゴキブリ大作戦 パプリカハウス（three.js の 3D）
// タイトル（温室を回る映像）を撮る → 画質を「中」・ヒントを「なし」にしてタイトル画面のメニューから選ぶ
// → 「ふつう」で開始 → 畝の葉の下を前へ進み、視点を回して温室を見わたす
// ゲームのコードは読むだけ。画質とヒントはタイトル画面の選択肢を操作して変える
export default {
  viewport: { width: 800, height: 500 },
  webgl: true,
  raf: 'frame',
  readyAt: 30000,
  async run(h) {
    await h.until(() => !!document.querySelector('[data-diff="normal"]') && !!window.__rh);
    await h.eval(() => {
      const q = document.getElementById('optQuality');
      q.value = 'medium';
      q.dispatchEvent(new Event('change'));
      const hint = document.getElementById('optHints');
      if (hint.checked) hint.click();
    });
    await h.settle(500);
    await h.still('title');
    await h.ready();
    await h.eval(() => document.querySelector('[data-diff="normal"]').click());
    await h.frames(6);
    await h.down('KeyW'); await h.frames(28);
    await h.down('KeyE'); await h.frames(14); await h.up('KeyE');
    await h.frames(14);
    await h.up('KeyW');
    await h.down('KeyQ'); await h.frames(12); await h.up('KeyQ');
    await h.frames(8);
  },
};
