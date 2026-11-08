// グソク（WebGL の深海水槽）
// はじめて遊ぶ状態から「誕生を見届ける」→ 母グソクの誕生の場面（字幕が1字ずつ出る）を録る
// 3D の描画が重いので、1コマに1回だけ描く（raf:'frame'）
export default {
  viewport: { width: 800, height: 500 }, webgl: true, raf: 'frame',
  readyAt: 30000, // 開いてから30秒（ゲーム内時刻）ちょうどで録り始める。水のゆらぎなど時間で動く表現を毎回そろえる
  async run(h) {
    await h.until(() => { const b = document.getElementById('start'); return b && !b.disabled; }, 40000);
    await h.settle(500);
    await h.still('title');
    await h.ready();
    await h.eval(() => document.getElementById('start').click()); // 誕生を見届ける（説明文が長いと画面外にあるので直接押す）
    await h.frames(80);                    // 海の底の場面と字幕
  },
};
