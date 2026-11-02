// がんばれマサトくん！（three.js の 3D。描画が重いので 1コマに1回だけ描く・10fps）
// タイトルを撮る → ゲームスタート → 準備タイムに W で前へ歩き、ギター（左クリック）で音波を3回撃つ
export default {
  viewport: { width: 640, height: 400 }, webgl: true, raf: 'frame', fps: 10,
  readyAt: 45000, // 開いてから45秒（ゲーム内時刻）ちょうどで録り始める
  pointerLock: 'emulate', // クリックでマウスを固定してから攻撃する作り。本物の固定は許可の時刻が毎回ずれるので、撮影時は即時に固定された扱いにする
  async run(h) {
    await h.until(() => [...document.querySelectorAll('button')].some((b) => b.getClientRects().length && b.textContent.includes('ゲームスタート')), 40000);
    await h.still('title');
    await h.ready();
    await h.click('ゲームスタート');
    await h.settle(1500);                     // 畑の生成
    // マウスを録画の前に画面の中央へ置いておく（録画中にマウスが動くと、その動きでカメラが回り、毎回ずれる）
    await h.page.mouse.move(h.vp.width / 2, h.vp.height / 2);
    await h.settle(300);
    await h.frames(4);
    await h.down('w'); await h.frames(18); await h.up('w');
    for (let i = 0; i < 3; i++) {
      await h.page.mouse.click(h.vp.width / 2, h.vp.height / 2);
      await h.frames(7);
    }
    await h.frames(4);
  },
};
