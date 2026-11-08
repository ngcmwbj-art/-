// はたけパズル（スマホ向けの縦画面）
// 遊び方の案内をとばす → 盤面とブロックの形を画面から読み、列がそろう場所を計算してドラッグで置いていく
// ゲームのコードは読むだけ。乱数は固定なので、出てくるブロックも置く場所も毎回同じ
const SIZE = 8;

/** 画面から盤面（埋まっているか）と手元のブロックの形を読む */
const readState = () => {
  const board = [...document.querySelectorAll('#board > .cell')].map((c) => c.classList.contains('filled'));
  const pieces = [...document.querySelectorAll('#tray .slot')].map((slot) => {
    const el = slot.querySelector('.piece');
    if (!el || el.classList.contains('no-fit')) return null;
    return [...el.children].map((c) => [parseInt(c.style.gridRow) - 1, parseInt(c.style.gridColumn) - 1]);
  });
  return { board, pieces };
};

/** いちばん良い置き方：消える列が多いほど、そろいかけの列を伸ばすほど高得点（下の段から積む） */
function plan({ board, pieces }) {
  const filled = (b, r, c) => b[r * SIZE + c];
  let best = null;
  pieces.forEach((cells, slot) => {
    if (!cells) return;
    for (let row = 0; row < SIZE; row++) for (let col = 0; col < SIZE; col++) {
      if (!cells.every(([dr, dc]) => row + dr < SIZE && col + dc < SIZE && !filled(board, row + dr, col + dc))) continue;
      const b = board.slice();
      cells.forEach(([dr, dc]) => { b[(row + dr) * SIZE + col + dc] = true; });
      let score = 0;
      for (let i = 0; i < SIZE; i++) {
        const rowN = [...Array(SIZE)].filter((_, c) => filled(b, i, c)).length;
        const colN = [...Array(SIZE)].filter((_, r) => filled(b, r, i)).length;
        score += rowN === SIZE ? 1000 : rowN * rowN;
        score += colN === SIZE ? 1000 : colN * colN * 0.3;
      }
      score += row * 2; // 下から
      if (!best || score > best.score) best = { slot, row, col, score };
    }
  });
  return best;
}

export default {
  viewport: { width: 420, height: 760 },
  fit: 'contain',
  async run(h) {
    await h.until(() => [...document.querySelectorAll('button')].some((b) => b.offsetParent && b.textContent.trim() === 'スキップ'));
    await h.click('スキップ');
    await h.settle(600);
    // 撮る範囲：見出しから手元のブロックまで
    h.clip = await h.eval(() => {
      const top = document.querySelector('.topbar').getBoundingClientRect();
      const tray = document.querySelector('#tray').getBoundingClientRect();
      return { x: 0, y: Math.max(0, top.top), width: innerWidth, height: Math.round(tray.bottom + 8 - Math.max(0, top.top)) };
    });
    await h.still('title');
    await h.ready();
    await h.frames(4);
    for (let move = 0; move < 7; move++) {
      const st = await h.eval(readState);
      const p = plan(st);
      if (!p) break;
      const from = await h.eval((i) => { const r = document.querySelectorAll('#tray .slot')[i].getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, p.slot);
      await h.page.mouse.move(from[0], from[1]);
      await h.page.mouse.down();
      await h.frames(1);
      // ブロックの左上を (row, col) に合わせるための指の位置（つかんだブロックの影の中心）
      const to = await h.eval(({ row, col }) => {
        const cells = document.querySelectorAll('#board > .cell');
        const a = cells[0].getBoundingClientRect(), b = cells[1].getBoundingClientRect();
        const pitch = b.left - a.left, g = document.querySelector('.ghost');
        return [a.left + col * pitch + g.offsetWidth / 2, a.top + row * pitch + g.offsetHeight / 2];
      }, p);
      for (let i = 1; i <= 6; i++) {
        await h.page.mouse.move(from[0] + (to[0] - from[0]) * i / 6, from[1] + (to[1] - from[1]) * i / 6);
        await h.frames(1);
      }
      await h.page.mouse.up();
      await h.frames(p.score >= 1000 ? 12 : 4); // 列が消えるときは余韻を長めに
    }
    await h.frames(6);
  },
};
