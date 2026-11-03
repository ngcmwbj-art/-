// ゴキブリ大作戦 パプリカハウス（three.js の 3D）
// タイトル（温室を回る映像）を撮る → 画質を「中」・ヒントを「なし」にしてタイトル画面のメニューから選ぶ
// → 「ステージ1」で開始 → 葉の下から通路へ出て前へ進み、視点を回して温室を見わたす
// ゲームのコードは読むだけ。画質とヒントはタイトル画面の選択肢を操作して変える
export default {
  viewport: { width: 800, height: 500 },
  webgl: true,
  raf: 'frame',
  readyAt: 30000,
  async run(h) {
    await h.until(() => !!document.querySelector('[data-diff="s1"]') && !!window.__rh);
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
    await h.eval(() => document.querySelector('[data-diff="s1"]').click());
    await h.frames(6);
    await h.down('KeyD'); await h.frames(11); await h.up('KeyD');   // 葉の下から通路へ出る
    await h.down('KeyW'); await h.frames(26);                         // 通路を前へ
    await h.down('KeyE'); await h.frames(12); await h.up('KeyE');   // 視点を回して温室を見わたす
    await h.frames(12);
    await h.up('KeyW');
    await h.down('KeyQ'); await h.frames(10); await h.up('KeyQ');
    await h.frames(6);
  },
};
