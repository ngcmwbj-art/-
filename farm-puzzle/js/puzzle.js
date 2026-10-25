'use strict';
/* =========================================================
   パズル部分
   - 8×8 の盤面に、3つずつ出てくるブロックをドラッグで置く（回転なし）
   - 縦・横の一列がそろうと消える。複数列・連続で消すとボーナス
   - 手元のブロックがどこにも置けなくなったらゲームオーバー
   - 1プレイに1回だけ「一手もどす」と「手元のとりかえ」ができる
   - どのブロックにも、1マスに 💧（水）か 🍂（肥料）のマークが付く。
     マークは盤面に残り、そのマスを列ごと消すと、マークの数だけ水・肥料が手に入る
   ========================================================= */
const Puzzle = (() => {
  const SIZE = 8;
  const COLOR_COUNT = 7; // CSS の .c0〜.c6 に対応

  // ブロックの形（[行, 列] の並び）。weight が大きいほど出やすい
  const SHAPES = [
    { cells: [[0, 0]], weight: 2 },
    { cells: [[0, 0], [0, 1]], weight: 3 },
    { cells: [[0, 0], [1, 0]], weight: 3 },
    { cells: [[0, 0], [0, 1], [0, 2]], weight: 3 },
    { cells: [[0, 0], [1, 0], [2, 0]], weight: 3 },
    { cells: [[0, 0], [0, 1], [0, 2], [0, 3]], weight: 2 },
    { cells: [[0, 0], [1, 0], [2, 0], [3, 0]], weight: 2 },
    { cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]], weight: 1 },
    { cells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]], weight: 1 },
    // 四角
    { cells: [[0, 0], [0, 1], [1, 0], [1, 1]], weight: 3 },
    { cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]], weight: 1 },
    { cells: [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]], weight: 1 },
    { cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]], weight: 1 },
    // 小さいL（3マス）
    { cells: [[0, 0], [1, 0], [1, 1]], weight: 2 },
    { cells: [[0, 1], [1, 0], [1, 1]], weight: 2 },
    { cells: [[0, 0], [0, 1], [1, 0]], weight: 2 },
    { cells: [[0, 0], [0, 1], [1, 1]], weight: 2 },
    // L（4マス）
    { cells: [[0, 0], [1, 0], [2, 0], [2, 1]], weight: 2 },
    { cells: [[0, 1], [1, 1], [2, 1], [2, 0]], weight: 2 },
    { cells: [[0, 0], [0, 1], [1, 0], [2, 0]], weight: 2 },
    { cells: [[0, 0], [0, 1], [1, 1], [2, 1]], weight: 2 },
    { cells: [[0, 0], [0, 1], [0, 2], [1, 0]], weight: 2 },
    { cells: [[0, 0], [0, 1], [0, 2], [1, 2]], weight: 2 },
    { cells: [[0, 0], [1, 0], [1, 1], [1, 2]], weight: 2 },
    { cells: [[0, 2], [1, 0], [1, 1], [1, 2]], weight: 2 },
    // T
    { cells: [[0, 0], [0, 1], [0, 2], [1, 1]], weight: 2 },
    { cells: [[0, 1], [1, 0], [1, 1], [1, 2]], weight: 2 },
    { cells: [[0, 0], [1, 0], [1, 1], [2, 0]], weight: 2 },
    { cells: [[0, 1], [1, 0], [1, 1], [2, 1]], weight: 2 },
    // S・Z
    { cells: [[0, 1], [0, 2], [1, 0], [1, 1]], weight: 2 },
    { cells: [[0, 0], [0, 1], [1, 1], [1, 2]], weight: 2 },
    { cells: [[0, 0], [1, 0], [1, 1], [2, 1]], weight: 2 },
    { cells: [[0, 1], [1, 0], [1, 1], [2, 0]], weight: 2 },
  ];

  // 得点のルール
  const RULES = {
    pointPerCell: 1,     // 置いたマス1つあたり
    pointPerLine: 10,    // 消した列1本あたり
    comboKeepMoves: 3,   // この手数のあいだ消さないとコンボが切れる
    markChance: 1,       // ブロックにマークが付く割合（1 = すべてのブロック）
    pieceSetTries: 3,    // 3つのうちどれかが置けるまで引き直す回数（多いほどやさしい。1 = 引き直さない）
  };

  let st = null;       // 盤面の状態 { board, marks, pieces, score, combo, movesSinceClear, over, bestBefore, undoUsed, shuffleUsed }
  let data = null;     // 保存データ全体（highScore と puzzle を読み書きする）
  let hooks = {};      // 外からの呼び出し先 { onSave, onLinesCleared, onGameOver, onStaleOver, onUndo }
  let undoSnap = null; // 「一手もどす」用に、置く直前の様子を覚えておく（資源・畑も一緒に）
  const els = {};
  let cellEls = [];
  let pitch = 40;      // マス1つ分の間隔（px）
  let drag = null;     // ドラッグ中の情報

  /* ---------- 初期化 ---------- */
  function init(options) {
    data = options.data;
    hooks = options;
    els.board = document.getElementById('board');
    els.slots = [...document.querySelectorAll('#tray .slot')];
    els.score = document.getElementById('score');
    els.best = document.getElementById('best');
    els.combo = document.getElementById('combo');
    els.undo = document.getElementById('undo-btn');
    els.undo.addEventListener('click', undo);
    els.shuffle = document.getElementById('shuffle-btn');
    els.shuffle.addEventListener('click', shuffle);

    buildBoard();
    els.slots.forEach((slot, i) => {
      slot.addEventListener('pointerdown', (e) => startDrag(e, i));
    });
    window.addEventListener('pointermove', moveDrag, { passive: false });
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', cancelDrag);
    window.addEventListener('resize', measure);

    // 遊びかけのデータがあれば続きから
    if (data.puzzle && !data.puzzle.over) {
      st = data.puzzle;
      // マークができる前の遊びかけの盤面には、空のマーク表を足す
      if (!st.marks) st.marks = emptyMarks();
      render();
    } else {
      // ゲームオーバーの画面のまま閉じていた場合も、終わったものとして扱う
      if (data.puzzle && data.puzzle.over && hooks.onStaleOver) hooks.onStaleOver();
      newGame();
    }
    requestAnimationFrame(measure);
  }

  function buildBoard() {
    els.board.innerHTML = '';
    cellEls = [];
    for (let i = 0; i < SIZE * SIZE; i++) {
      const cell = h('div', { class: 'cell' });
      els.board.append(cell);
      cellEls.push(cell);
    }
  }

  // マスの大きさを測って CSS 変数に入れる（ドラッグ中のブロックの大きさに使う）
  function measure() {
    const a = cellEls[0].getBoundingClientRect();
    const b = cellEls[1].getBoundingClientRect();
    if (!a.width) return; // 画面が非表示のときは測れない
    pitch = b.left - a.left;
    const root = document.documentElement.style;
    root.setProperty('--cell', a.width + 'px');
    root.setProperty('--gap', (pitch - a.width) + 'px');
  }

  /* ---------- ゲームの進行 ---------- */
  function newGame() {
    st = {
      board: Array.from({ length: SIZE }, () => Array(SIZE).fill(-1)),
      marks: emptyMarks(),
      pieces: [],
      score: 0,
      combo: 0,
      movesSinceClear: 0,
      over: false,
      bestBefore: data.highScore,
      undoUsed: false,
      shuffleUsed: false,
      gameLines: 0,     // このプレイで消した列の合計（ミッション用）
      gameMarks: 0,     // このプレイで消したマークの合計（ミッション用）
      gotWater: 0,      // このプレイで畑に持ち帰った水
      gotFertilizer: 0, // このプレイで畑に持ち帰った肥料
    };
    undoSnap = null;
    st.pieces = makePieceSet();
    persist();
    render();
  }

  function persist() {
    data.puzzle = st;
    if (hooks.onSave) hooks.onSave();
  }

  function randomPiece() {
    const total = SHAPES.reduce((sum, s) => sum + s.weight, 0);
    let r = Math.random() * total;
    let shape = 0;
    for (; shape < SHAPES.length - 1; shape++) {
      r -= SHAPES[shape].weight;
      if (r < 0) break;
    }
    const piece = { shape, color: Math.floor(Math.random() * COLOR_COUNT) };
    if (Math.random() < RULES.markChance) {
      piece.mark = {
        cell: Math.floor(Math.random() * SHAPES[shape].cells.length),
        kind: Math.random() < 0.5 ? 'water' : 'fertilizer',
      };
    }
    return piece;
  }

  // マークの表（8×8。null か 'water' か 'fertilizer'）
  function emptyMarks() {
    return Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  }

  // ブロックの i 番目のマスのマーク
  function markOf(piece, i) {
    return piece.mark && piece.mark.cell === i ? piece.mark.kind : null;
  }

  function markIcon(kind) {
    return kind ? Msg.t('icons.' + kind) : '';
  }

  // マークのマスの見た目（💧は青い丸いふち、🍂は茶色の角ばったふち。色が分かりにくくても形で見分けられる）
  function markClass(kind) {
    return kind ? ' marked mark-' + kind : '';
  }

  // 3つのブロックを引く。pieceSetTries が 2 以上なら、どれかが置けるまで引き直す
  function makePieceSet() {
    let set = [];
    for (let tries = 0; tries < RULES.pieceSetTries; tries++) {
      set = [randomPiece(), randomPiece(), randomPiece()];
      if (set.some(fitsSomewhere)) break;
    }
    return set;
  }

  function cellsOf(piece) {
    return SHAPES[piece.shape].cells;
  }

  function canPlace(piece, row, col) {
    return cellsOf(piece).every(([dr, dc]) => {
      const r = row + dr;
      const c = col + dc;
      return r >= 0 && r < SIZE && c >= 0 && c < SIZE && st.board[r][c] < 0;
    });
  }

  function fitsSomewhere(piece) {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (canPlace(piece, r, c)) return true;
      }
    }
    return false;
  }

  // 置いたらそろう列を探す
  function findFullLines(board) {
    const rows = [];
    const cols = [];
    for (let i = 0; i < SIZE; i++) {
      if (board[i].every((v) => v >= 0)) rows.push(i);
      if (board.every((line) => line[i] >= 0)) cols.push(i);
    }
    return { rows, cols };
  }

  function lineCells({ rows, cols }) {
    const keys = new Set();
    rows.forEach((r) => { for (let c = 0; c < SIZE; c++) keys.add(r * SIZE + c); });
    cols.forEach((c) => { for (let r = 0; r < SIZE; r++) keys.add(r * SIZE + c); });
    return [...keys].map((k) => ({ r: Math.floor(k / SIZE), c: k % SIZE }));
  }

  // 列を消したときの得点：列数が多いほど・コンボが続くほど増える
  function lineScore(lines, combo) {
    const base = RULES.pointPerLine * lines * lines;
    return Math.round(base * (1 + 0.5 * (combo - 1)));
  }

  function place(slot, row, col) {
    // もどせるように、置く前の様子を覚えておく
    undoSnap = st.undoUsed ? null : JSON.stringify({
      puzzle: st,
      resources: data.resources,
      plots: data.plots,
      highScore: data.highScore,
      firstGrowDone: data.firstGrowDone,
    });

    const piece = st.pieces[slot];
    cellsOf(piece).forEach(([dr, dc], i) => {
      st.board[row + dr][col + dc] = piece.color;
      st.marks[row + dr][col + dc] = markOf(piece, i);
    });
    st.score += cellsOf(piece).length * RULES.pointPerCell;
    st.pieces[slot] = null;

    const full = findFullLines(st.board);
    const lines = full.rows.length + full.cols.length;
    let cleared = [];

    if (lines > 0) {
      st.combo += 1;
      st.movesSinceClear = 0;
      cleared = lineCells(full).map((p) => ({ ...p, color: st.board[p.r][p.c], mark: st.marks[p.r][p.c] }));
      const marks = { water: 0, fertilizer: 0 };
      cleared.forEach((p) => {
        if (p.mark) marks[p.mark] += 1;
        st.board[p.r][p.c] = -1;
        st.marks[p.r][p.c] = null;
      });
      const gained = lineScore(lines, st.combo);
      st.score += gained;

      // 農業側へ「何列消したか・マークをいくつ消したか」を知らせる（資源の文字が返ってくる）
      st.gameLines = (st.gameLines || 0) + lines;
      st.gameMarks = (st.gameMarks || 0) + marks.water + marks.fertilizer;
      const got = hooks.onLinesCleared
        ? hooks.onLinesCleared({ lines, combo: st.combo, marks, gameLines: st.gameLines, gameMarks: st.gameMarks }) || {}
        : {};
      st.gotWater = (st.gotWater || 0) + (got.water || 0);
      st.gotFertilizer = (st.gotFertilizer || 0) + (got.fertilizer || 0);
      const extra = got.text || '';
      showClearText(cleared, `+${gained}` + (extra ? `  ${extra}` : ''), lines);
      Sound.play('clear', lines + st.combo - 1);
      // マークを消したときだけ、多いほうの音を1回重ねる（水＝ぽちゃん、肥料＝カサッ）
      if (marks.water || marks.fertilizer) Sound.play(marks.water >= marks.fertilizer ? 'drop' : 'leaf');
    } else {
      Sound.play('place');
      st.movesSinceClear += 1;
      if (st.movesSinceClear >= RULES.comboKeepMoves) st.combo = 0;
    }

    if (st.score > data.highScore) data.highScore = st.score;
    if (st.pieces.every((p) => p === null)) st.pieces = makePieceSet();

    // どれも置けなければゲームオーバー
    if (!st.pieces.some((p) => p && fitsSomewhere(p))) st.over = true;

    persist();
    render(cleared);
    if (st.over) announceGameOver();
  }

  function announceGameOver() {
    setTimeout(() => {
      if (hooks.onGameOver) {
        hooks.onGameOver({ score: st.score, isNewBest: st.score > st.bestBefore && st.score > 0, water: st.gotWater || 0, fertilizer: st.gotFertilizer || 0, marks: st.gameMarks || 0 });
      }
    }, 800);
  }

  /* ---------- 手元のとりかえ ---------- */
  function canShuffle() {
    return !!st && !st.shuffleUsed;
  }

  // 手元の3つを新しい3つに引き直す（1プレイに1回）
  function shuffle() {
    if (!canShuffle() || drag) return;
    st.pieces = makePieceSet();
    st.shuffleUsed = true;
    st.over = !st.pieces.some((p) => p && fitsSomewhere(p));
    // とりかえたあとに「一手もどす」で前の手元に戻せないようにする
    undoSnap = null;
    persist();
    render();
    toast(Msg.t('puzzle.shuffled'));
    if (st.over) announceGameOver();
  }

  /* ---------- 一手もどす ---------- */
  function canUndo() {
    return !!undoSnap && !st.undoUsed;
  }

  function undo() {
    if (!canUndo() || drag) return;
    const snap = JSON.parse(undoSnap);
    st = snap.puzzle;
    st.over = false;
    st.undoUsed = true;
    data.resources = snap.resources;
    data.plots = snap.plots;
    data.highScore = snap.highScore;
    data.firstGrowDone = snap.firstGrowDone;
    undoSnap = null;
    persist();
    render();
    toast(Msg.t('puzzle.undone'));
    if (hooks.onUndo) hooks.onUndo();
  }

  // 畑で作業したら、もどせなくする（資源の使い方と食いちがわないように）
  function clearUndo() {
    undoSnap = null;
    if (st) render();
  }

  /* ---------- 表示 ---------- */
  function render(cleared = []) {
    renderBoard(cleared);
    renderTray();
    els.score.textContent = st.score;
    els.best.textContent = data.highScore;
    els.combo.textContent = st.combo >= 2 ? Msg.t('puzzle.combo', { n: st.combo }) : '';
    els.undo.hidden = !canUndo() || st.over;
    els.shuffle.hidden = !canShuffle() || st.over;
  }

  function renderBoard(cleared = []) {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const v = st.board[r][c];
        const mark = v >= 0 ? st.marks[r][c] : null;
        const el = cellEls[r * SIZE + c];
        el.className = 'cell' + (v >= 0 ? ` filled c${v}` : '') + markClass(mark);
        el.textContent = markIcon(mark);
      }
    }
    // 消えたマスは、元の色（とマーク）のままはじけるアニメーション
    cleared.forEach((p) => {
      const el = cellEls[p.r * SIZE + p.c];
      el.className = `cell filled c${p.color} clearing` + markClass(p.mark);
      el.textContent = markIcon(p.mark);
    });
    // アニメーションが終わったら空きマスの見た目に戻す
    if (cleared.length) {
      setTimeout(() => { if (!drag) renderBoard(); }, 460);
    }
  }

  function renderTray() {
    els.slots.forEach((slot, i) => {
      slot.innerHTML = '';
      const piece = st.pieces[i];
      slot.classList.remove('dragging');
      if (!piece) return;
      const el = buildPieceEl(piece, 'piece');
      if (!fitsSomewhere(piece)) el.classList.add('no-fit');
      slot.append(el);
    });
  }

  // ブロック1つ分の要素をつくる（手元用・ドラッグ用で共通）
  function buildPieceEl(piece, className) {
    const cells = cellsOf(piece);
    const rows = Math.max(...cells.map(([r]) => r)) + 1;
    const cols = Math.max(...cells.map(([, c]) => c)) + 1;
    const el = h('div', { class: className });
    el.style.gridTemplateRows = `repeat(${rows}, var(--size))`;
    el.style.gridTemplateColumns = `repeat(${cols}, var(--size))`;
    cells.forEach(([r, c], i) => {
      const mark = markOf(piece, i);
      el.append(h('div', {
        class: `cell filled c${piece.color}` + markClass(mark),
        style: `grid-row:${r + 1};grid-column:${c + 1}`,
      }, markIcon(mark)));
    });
    return el;
  }

  function showClearText(cleared, text, lines) {
    const avgR = cleared.reduce((s, p) => s + p.r, 0) / cleared.length;
    const avgC = cleared.reduce((s, p) => s + p.c, 0) / cleared.length;
    const x = (avgC + 0.5) * pitch;
    const y = (avgR + 0.5) * pitch;
    floatText(text, x, y, els.board);
    if (lines >= 2) floatText(Msg.t('puzzle.multiLine', { n: lines }), x, y - pitch, els.board);
  }

  /* ---------- ドラッグ操作（マウス・タッチ共通の Pointer Events） ---------- */
  function startDrag(e, slot) {
    if (drag || !st || st.over) return;
    const piece = st.pieces[slot];
    if (!piece) return;
    e.preventDefault();
    // どこにも置けないブロックは持ち上げず、小さく揺れて「置けない」を伝える（文字は出さない）
    if (!fitsSomewhere(piece)) {
      const el = els.slots[slot].firstElementChild;
      if (el) {
        el.classList.remove('shake');
        void el.offsetWidth;   // もう一度揺らすため
        el.classList.add('shake');
        setTimeout(() => el.classList.remove('shake'), 350);
      }
      return;
    }
    measure();

    const ghost = buildPieceEl(piece, 'ghost');
    document.body.append(ghost);
    drag = {
      slot,
      piece,
      ghost,
      pointerId: e.pointerId,
      // 指で操作するときは、ブロックが指に隠れないよう少し上に浮かせる
      lift: e.pointerType === 'mouse' ? 0 : pitch * 1.5,
      target: null,
    };
    els.slots[slot].classList.add('dragging');
    moveGhost(e.clientX, e.clientY);
  }

  function moveDrag(e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    e.preventDefault();
    moveGhost(e.clientX, e.clientY);
  }

  function moveGhost(x, y) {
    const g = drag.ghost;
    const left = x - g.offsetWidth / 2;
    const top = y - g.offsetHeight / 2 - drag.lift;
    g.style.transform = `translate(${left}px, ${top}px)`;

    // ブロックの左上がどのマスに近いかを計算
    const origin = cellEls[0].getBoundingClientRect();
    const col = Math.round((left - origin.left) / pitch);
    const row = Math.round((top - origin.top) / pitch);

    clearPreview();
    if (canPlace(drag.piece, row, col)) {
      drag.target = { row, col };
      showPreview(drag.piece, row, col);
    } else {
      drag.target = null;
    }
  }

  function endDrag(e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const { slot, target } = drag;
    finishDrag();
    if (target) place(slot, target.row, target.col);
    else render();
  }

  function cancelDrag() {
    if (!drag) return;
    finishDrag();
    render();
  }

  function finishDrag() {
    drag.ghost.remove();
    clearPreview();
    drag = null;
  }

  // 置く予定の場所と、そろって消える列をうっすら表示
  function showPreview(piece, row, col) {
    const temp = st.board.map((line) => line.slice());
    cellsOf(piece).forEach(([dr, dc], i) => {
      temp[row + dr][col + dc] = piece.color;
      const el = cellEls[(row + dr) * SIZE + col + dc];
      const mark = markOf(piece, i);
      el.classList.add('preview', `c${piece.color}`);
      if (mark) {
        el.classList.add('marked', 'mark-' + mark);
        el.textContent = markIcon(mark);
      }
    });
    lineCells(findFullLines(temp)).forEach((p) => {
      cellEls[p.r * SIZE + p.c].classList.add('will-clear');
    });
  }

  function clearPreview() {
    renderBoard();
  }

  return { init, newGame, measure, canUndo, undo, clearUndo, canShuffle, shuffle };
})();
