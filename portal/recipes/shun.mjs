// しゅんの夕暮れあぜ道戦記（Canvas2D のドット絵 RPG）
// ゲームに入っている QA 用の仕組みを使う：__game.pause() で止め、__game.advance(ms) でシミュレーションを1コマずつ進める
// タイトル（はじめる）を撮る → QA 用コマンド __game.cmd.battle() で最初の敵「ハト係長」との戦闘 →
// しゅんは「たたく」、グソっ君は「タックル」を選び、縮む輪で決定 → 結果まで
const STEP = 80; // 1コマ = 80ms（録画の 12.5fps と同じ）

export default {
  viewport: { width: 768, height: 432 },  // 384×216 のちょうど2倍
  async run(h) {
    const step = async (n = 1) => { for (let i = 0; i < n; i++) { await h.eval((ms) => window.__game.advance(ms), STEP); await h.frames(1); } };
    const tap = async (code) => { await h.down(code); await step(1); await h.up(code); };

    await h.until(() => window.__game !== undefined, 40000);
    await h.settle(1500);
    await h.key('Enter'); await h.settle(1500);
    await h.still('title');
    await h.ready();
    await h.eval(() => { window.__game.pause(); window.__game.cmd.battle(); });
    await step(18);                    // 「ハト係長が 名刺を さしだして 道を ふさいだ！」
    for (let i = 0; i < 4; i++) { await tap('KeyZ'); await step(5); } // しゅん：たたく→相手、グソっ君：タックル→相手
    await step(8);
    await tap('KeyZ'); await step(30);  // 縮む輪で決定 → 結果
  },
};
