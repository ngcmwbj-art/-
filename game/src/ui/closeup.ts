// 大写しの 遊びの 共通の 部品（改善会議 2026-10-25 の 1・4）。Widget.closeup = true の パネル
// （engine/game.ts）は、何も 書き足さなくても ここで 次の 2つが つく。
//
// ① はじめの カード 1枚（やりかた）：パネルが 開いて、はじめて 自分に 入力が 来た とき 1回だけ。
//    セーブに 残る flag `howto_<id>` で 2回目からは 出さない。カードの 間は ゲームが 止まる
//    （UILayer.hold：時間も 進まない。タイミングの 遊びの 時計も 止まる）。けってい で はじめる、
//    もどる なら そのまま やめる。字は Widget.howto.line の 短い 1行 ＋「もどる＝やめる」。
//    キーは {Z} {X} {←→} {↑↓} {十字} と 書くと、キーボードは Z・X・矢印、タッチは けってい・もどる・
//    十字キー の 札で 出る（events/stage.ts の deviceKeys / keycap、操作の 案内と 同じ 札）。
//    絵（Widget.howto.pic）は 指・ボタン・矢印の 1組（PICS）を 使い回す。
// ② もどるで やめる：パネルが 自分に 入力が 来ている（会話が 上に ない）とき、もどる は いつも
//    「やめる」。画面の 右下に いつも 同じ 札「[X] やめる」（タッチ「[もどる] やめる」）。
//    やめると 短い「ぱふ」se_closeup_yame（失敗の 音では ない）。やめ方は 2つ：
//    ・Widget.quit() が true を 返す：パネルが 自分の やめ方で やめる（もとから ある「やめる」道）。
//    ・それ以外：パネルを 出した 台本（Task）に CloseupQuit を 投げる。台本の finally（パネルを
//      閉じる・ポーズを 戻す）は ふつうに 走り、その あとの ごほうび・失敗の 文は 走らない。
//      台本ごとに 戻す 物が あれば catch (e) { if (isCloseupQuit(e)) … } で。話しかけ直せば 最初から。
//    最後に 共通の 片づけ（addQuitTidy：カメラ・会話の 窓の 位置・ポーズ・操作の 案内 ほか）。
//    Widget.quittable() が false の あいだ（結果の カード ほか）は もどる は パネルの 物。
//
// 新しい 大写しを 作るとき（使い方は $SP/handoff/kaizenF_progress.md の 最初にも）：
//   closeup = true;
//   howto = { id: 'tokoroten', line: '{Z}を 押さえて、はなす', pic: 'hold' };
// （id は flag の 名前、line は 1行 15字くらい まで。__game.cmd.howtoCheck() で 幅を 見る）

import { Task, type Co } from '../engine/co';
import { game, type Widget } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import type { Input } from '../engine/input';
import { PixelCanvas } from '../engine/pixel';
import { H, W } from '../engine/screen';
import { markText, uiBands } from '../engine/textzones';
import { buttonsTop } from '../engine/safezones';
import { ease } from '../engine/tween';
import { sfx } from '../audio';
import { flag, setFlag, state } from '../game/state';
import { registerDebug } from '../debug';
import { cinemaOff, clearKeyGuides, deviceKeys, forceBoxPos, keycap, type GuideKey } from '../events/stage';
import { setButtonHint } from '../engine/touch';
import { field } from '../world/field';
import { runMsg } from '../world/msg';
import { drawTape, drawWindow, textW, UI } from './window';
import { dialogVisible } from './dialog';
import { HOWTO } from '../data/text/howto';
import { YORIMICHI_START } from '../audio/yorimichi';

// （改善会議 10-26 の5：keep＝押しつづける〈はなすと おしまい〉、pick＝えらんで 置く〈ますを えらんで しるし〉を
//   足した。aim は 十字〈4つの 矢印〉で ねらって けってい）
export type HowtoPic = 'tap' | 'hold' | 'mash' | 'timing' | 'lr' | 'ud' | 'aim' | 'keep' | 'pick';
export interface Howto {
  /** flag howto_<id>（セーブに 残る：2回目からは 出さない）。 */
  id: string;
  /** 短い 1行。キーは {Z} {X} {←→} {↑↓} {十字}。 */
  line: string;
  /** 指・ボタン・矢印の 絵（なし = 字だけ の カード）。 */
  pic?: HowtoPic;
}

/** Thrown into a close-up game's script by もどる (quiet: an uncaught one just ends the task). */
export class CloseupQuit extends Error {
  readonly quiet = true;
  constructor() {
    super('closeup quit');
  }
}
export function isCloseupQuit(e: unknown): e is CloseupQuit {
  return e instanceof CloseupQuit;
}

export const howtoFlag = (id: string): string => `howto_${id}`;

// ---------------------------------------------------------------- 前置きを 短く（改善会議 2026-10-26 の 3）
//
// もどるで やめた 大写しは flag `yame_<howto.id>` を 1 に（下の quitCloseup）。その 大写しが もう一度 開くと 0 に
// （pushed）。＝ 最後まで すんだ・初めての 大写しには 残らない。寄り道の 台本は 前置きの 会話の 前で
//   if (yield* skipIntro('kyuri')) { …前置きを とばす… } else { …今の 前置き… }
// やめた ことが ある ときだけ「すぐ やる／はじめから 聞く」を 聞く（true＝すぐ やる）。表は INTRO_SKIP。

export const yameFlag = (id: string): string => `yame_${id}`;

/**
 * 大写しの ある 寄り道 1つずつ（10-26 に QA で やめて 話しかけ直し、前置きの ページを 数えた）。
 *   ask     前置きが 3ページ 以上：やめた あとは「すぐ やる／はじめから 聞く」（skipIntro）
 *   already 前置きが もとから 短い（2回目は 2ページ まで、または 大写しから）：聞かない
 *   goesOn  やめても 残りを 人が して 先へ 進む（話しかけ直す ことが ない）
 *   none    大写しに やめる 札が ない（見るだけ・選ぶだけ）
 * ids：その 寄り道の 大写しの howto.id。pages：やめた あとの 前置き（今 → すぐ やる）。
 */
export const INTRO_SKIP: Record<string, { ids: string[]; how: 'ask' | 'already' | 'goesOn' | 'none'; pages: string }> = {
  // ---- 第2章
  flag_an_start: { ids: ['akinasu'], how: 'already', pages: '0（株を 調べると すぐ）' },
  flag_as_start: { ids: ['asairo', 'asairo_kumo'], how: 'already', pages: '2〜3（その 露の 地の文。見る 物の 説明なので 残す）' },
  flag_ashiato_start: { ids: ['uribo'], how: 'ask', pages: '7〜8 → 0（親子が 出る 絵は 残す）' },
  flag_bm_start: { ids: ['busmaku'], how: 'already', pages: '1（続きから）' },
  flag_hg_start: { ids: ['hg_mizu', 'hg_hi'], how: 'ask', pages: '12 → 0（かまどを もう1回 見てから ペロへ、は 今の まま）' },
  flag_ky_start: { ids: ['kyuri'], how: 'already', pages: '0' },
  flag_rt_start: { ids: ['retasu'], how: 'already', pages: '0（光る 玉を 調べると すぐ。やめた 玉は flag が 立たず、もう 一度 はじめから）' },
  flag_hn_start: { ids: [], how: 'none', pages: '穂を 見て 選ぶ だけ' },
  flag_hm_start: { ids: ['himo'], how: 'already', pages: '1（待って！は 1回きり）' },
  flag_ku_start: { ids: ['kutsu'], how: 'already', pages: '0' },
  flag_mimi_start: { ids: ['mimi'], how: 'already', pages: '2' },
  flag_mg_start: { ids: ['mg_pump', 'mg_tarai', 'mg_kae'], how: 'already', pages: '2・2・2' },
  flag_nr_start: { ids: ['neru'], how: 'ask', pages: '3 → 0' },
  flag_saku_start: { ids: ['sakuzoi'], how: 'already', pages: '2（2回目からの 短い 文）' },
  flag_ub_start: { ids: ['ushibana'], how: 'already', pages: '0' },
  flag_shikishi_start: { ids: [], how: 'none', pages: '大写し なし' },
  flag_ss_start: { ids: ['shishito'], how: 'ask', pages: '3 → 0（はじめての 1回が すむ まで）' },
  flag_uz_start: { ids: ['uzu'], how: 'ask', pages: '8 → 0（前は やめると 始め直せなかった：直した）' },
  flag_yw_start: { ids: [], how: 'none', pages: 'とうもろこしは 見て 選ぶ だけ' },
  // ---- 第3章
  flag_ab_start: { ids: ['abura'], how: 'ask', pages: '8 → 0' },
  flag_im_start: { ids: ['imo'], how: 'ask', pages: '11 → 0' },
  flag_iso_start: { ids: ['iso'], how: 'already', pages: '0' },
  flag_kr_start: { ids: [], how: 'none', pages: '大写し なし' },
  flag_ag_start: { ids: ['amigoya'], how: 'already', pages: '1' },
  flag_mh_start: { ids: ['mahiru'], how: 'already', pages: '2' },
  flag_mk_start: { ids: ['mikan'], how: 'already', pages: '1' },
  flag_mz_start: { ids: ['mizukiri'], how: 'already', pages: '0' },
  flag_ng_start: { ids: [], how: 'none', pages: '大写し なし' },
  flag_sk_start: { ids: ['sakana'], how: 'already', pages: '1' },
  flag_tk_start: { ids: ['tokoro'], how: 'goesOn', pages: 'やめると 残りは ナミエが 突く' },
  flag_yd_start: { ids: ['yose'], how: 'ask', pages: '3 → 0' },
};

/** Was one of these close-ups quit with もどる (and not opened since)? */
export function quitBefore(...ids: string[]): boolean {
  return ids.some((id) => flag(yameFlag(id)) > 0);
}

const SKIP_ASK = '@sys\nこの 話は、前に 聞いた。\n? すぐ やる | はじめから 聞く';
/** QA: the last asks (ids, the answer). */
const skipLog: { ids: string[]; skip: boolean; at: number }[] = [];

/**
 * Before a side errand's opening talk: if one of its close-ups was quit last time, ask
 * 「すぐ やる／はじめから 聞く」. true = skip the talk and go straight to the close-up.
 * (Not quit: nothing is asked, false.)
 */
export function* skipIntro(...ids: string[]): Co<boolean> {
  if (!quitBefore(...ids)) return false;
  const r = yield* runMsg(SKIP_ASK);
  const skip = r === 0;
  skipLog.push({ ids, skip, at: Math.round(game.time) });
  return skip;
}


// ---------------------------------------------------------------- state

const owner = new WeakMap<Widget, Task | null>();
const pushedAt = new WeakMap<Widget, number>();
const quitting = new WeakSet<Widget>();
/** Shown this session (a card already up once for this id, even before its flag: QA's skip). */
const shownNow = new Set<string>();
let qaSkip = false;
/** QA: the last quits (which widget class, how). */
const quitLog: { name: string; how: 'self' | 'raise' | 'none'; at: number }[] = [];
let tagK = 0;

const tidies: (() => void)[] = [];
/** A tidy-up run after every quit (after the script has unwound): the camera, the window's place, poses… */
export function addQuitTidy(fn: () => void): void {
  tidies.push(fn);
}

/** May もどる quit this close-up now? */
function canQuit(w: Widget): boolean {
  return !w.done && !quitting.has(w) && (w.quittable?.() ?? true);
}

/** The card is still to come for this close-up (the tag waits for it). */
function cardPending(w: Widget): boolean {
  const h = w.howto;
  if (!h || qaSkip || shownNow.has(h.id) || flag(howtoFlag(h.id)) > 0) return false;
  return !(w as { auto?: boolean }).auto;
}

function cardDue(w: Widget): boolean {
  if (!cardPending(w)) return false;
  // after the window has opened (its own `open`, else a moment)
  const age = game.time - (pushedAt.get(w) ?? game.time);
  const open = (w as { open?: number }).open;
  if (typeof open === 'number') return (open >= 1 && age >= 200) || age >= 1200;
  return age >= 400;
}

/** Quit this close-up game (もどる). */
export function quitCloseup(w: Widget): void {
  if (!canQuit(w)) return;
  sfx('se_closeup_yame');
  if (w.howto) setFlag(yameFlag(w.howto.id), 1);
  const name = w.constructor?.name ?? '?';
  if (w.quit?.()) {
    quitLog.push({ name, how: 'self', at: game.time });
    return;
  }
  const t = owner.get(w);
  if (!t || t.done) {
    quitLog.push({ name, how: 'none', at: game.time });
    return;
  }
  quitting.add(w);
  quitLog.push({ name, how: 'raise', at: game.time });
  t.raise(new CloseupQuit());
  game.scripts.run(afterQuit(w, t));
}

function* afterQuit(w: Widget, t: Task): Co {
  // (the script unwinds on its next step: its finally blocks may still close the window)
  yield () => t.done;
  if (!w.done) w.done = true;
  for (const fn of tidies) {
    try {
      fn();
    } catch (e) {
      console.warn('closeup tidy', e);
    }
  }
  if (game.fadeAlpha > 0) yield* game.fadeIn(250);
}

game.ui.closeupHooks = {
  pushed(w) {
    owner.set(w, Task.current);
    pushedAt.set(w, game.time);
    // (opened again: a quit before is done with — finished now, or quit again and set again)
    if (w.howto && flag(yameFlag(w.howto.id))) setFlag(yameFlag(w.howto.id), 0);
  },
  input(w: Widget, input: Input): boolean {
    if (quitting.has(w)) return true;
    if (cardDue(w)) {
      shownNow.add(w.howto!.id);
      HOWTO_SEEN.set(w.howto!.id, w.howto as Howto);
      game.ui.hold = new HowtoCard(w.howto as Howto, w);
      return true;
    }
    if (input.pressed('cancel') && canQuit(w)) {
      quitCloseup(w);
      return true;
    }
    return false;
  },
};

// the common tidy-up: the guides and the button's word, the window's place, the letterbox, the
// poses on Minato and the one with him, and the camera back on him
addQuitTidy(() => {
  clearKeyGuides();
  setButtonHint(null);
  forceBoxPos(null);
  cinemaOff();
  const f = field();
  if (!f) return;
  for (const a of [f.player, f.follower]) {
    if (!a) continue;
    a.tempPose = null;
    a.anim = null;
  }
  f.camOverride = null;
});

// ---------------------------------------------------------------- 「やめる」の 札（右下、どの 遊びでも 同じ）

/**
 * The tag's box (screen px): the bottom right corner (above the touch buttons fixed there on a
 * sideways iPad), moved up past any window or text box of the last frame that it would sit on
 * (a close-up's frame, its words: 10-25 の 報告「窓の ふちに かかる」). Kept per close-up once found.
 */
const tagAt = new WeakMap<Widget, [number, number, number, number]>();
let lastTag: [number, number, number, number] | null = null;
export function quitTagRect(w?: Widget | null): [number, number, number, number] {
  const hit = w ? tagAt.get(w) : undefined;
  if (hit) return hit;
  const cap = keycap(backKey());
  const tw = cap.width + 4 + textW(TAG_WORD) + 10;
  const th = cap.height + 2;
  const x = W - tw - 3;
  const y0 = Math.min(H - th - 3, buttonsTop(x, x + tw) - th - 3);
  const own = lastTag;
  const rects = uiBands().rects.filter((r) => !own || r.x !== own[0] || r.y !== own[1] || r.w !== own[2] || r.h !== own[3]);
  const free = (y: number) => !rects.some((r) => r.x < x + tw + 2 && r.x + r.w > x - 2 && r.y < y + th + 2 && r.y + r.h > y - 2);
  let y = y0;
  while (y > 0 && !free(y)) y -= 2;
  if (y <= 0) y = y0;
  const out: [number, number, number, number] = [x, y, tw, th];
  if (w) tagAt.set(w, out);
  return out;
}
const TAG_WORD = 'やめる';
function backKey(): GuideKey {
  return deviceKeys(['X'])[0];
}

/** The top modal widget, if it is a close-up game. */
function topCloseup(): Widget | null {
  const ws = game.ui.widgets;
  for (let i = ws.length - 1; i >= 0; i--) if (ws[i].modal && !ws[i].done) return ws[i].closeup ? ws[i] : null;
  return null;
}

/** Drawn over the widgets each frame (game.overlays): the tag while もどる would quit. */
function drawTag(g: Gfx): void {
  const w = game.ui.hold ? null : topCloseup();
  // (a conversation's window up — even one drawn over the close-up: no tag, at once; it would sit on the window)
  const talk = dialogVisible();
  // (a close-up whose window is closed for a moment — the stone flying over the field — no tag either)
  const shut = !!w && typeof (w as { open?: number }).open === 'number' && ((w as { open?: number }).open ?? 1) < 1;
  const on = !!w && !talk && !shut && canQuit(w) && !cardPending(w);
  tagK = talk ? 0 : on ? Math.min(1, tagK + 0.12) : Math.max(0, tagK - 0.2);
  if (tagK <= 0) return;
  const [x, y, tw, th] = quitTagRect(tagK > 0.05 ? w : null);
  lastTag = [x, y, tw, th];
  const a = ease.sineOut(tagK);
  markText(x, y, tw, th);
  g.alpha(a * 0.92, () => {
    g.rect(x + 1, y + 1, tw, th, UI.borderDark, 0.5);
    g.rect(x, y, tw, th, UI.bg);
    g.frame(x, y, tw, th, UI.border);
    const cap = keycap(backKey());
    g.img(cap, x + 2, y + 1 + (game.input.rawDown('cancel') ? 1 : 0));
    g.text(TAG_WORD, x + cap.width + 6, y + 2, { color: UI.pencil });
  });
}
game.overlays.push(drawTag);

// ---------------------------------------------------------------- 絵（指・ボタン・矢印、1組だけ）

let fingerImg: HTMLCanvasElement | null = null;
/** The finger (pointing down, the tip at the bottom-left column 3), 12×14, built once. */
function finger(): HTMLCanvasElement {
  if (fingerImg) return fingerImg;
  const rows = [
    '..########..',
    '.#cccccccc#.',
    '.#cccccccc#.',
    '.##########.',
    '#ssssssssss#',
    '#sssshshshs#',
    '#sssshshshs#',
    '.#sssd#####.',
    '.#sssd#.....',
    '.#sssd#.....',
    '.#sssd#.....',
    '.#sssd#.....',
    '.#ssdd#.....',
    '..####......',
  ];
  const p = new PixelCanvas(12, 14);
  const pal: Record<string, string> = { '#': UI.border, c: UI.cream, s: '#F2C9A0', d: '#D9A57A', h: '#B98560' };
  rows.forEach((r, y) => [...r].forEach((ch, x) => pal[ch] && p.set(x, y, pal[ch])));
  fingerImg = p.toCanvas();
  return fingerImg;
}

/** A key drawn 2× (the same keycaps as the guides: Z / けってい …), pressed = sunk 2 px and a little darker. */
function bigKey(g: Gfx, k: GuideKey, cx: number, top: number, pressed: boolean, lit = false): [number, number] {
  const cap = keycap(k);
  const w = cap.width * 2;
  const x = Math.round(cx - w / 2);
  g.img(cap, x, top + (pressed ? 2 : 0), { scale: 2 });
  if (pressed) g.rect(x + 2, top + 4, w - 4, cap.height * 2 - 10, UI.border, 0.12);
  if (lit) g.frame(x - 2, top - 2, w + 4, cap.height * 2 + 4, UI.accent);
  return [x, w];
}

/** Little lines round a press (a tap: 3 strokes; strong: 5). */
function burst(g: Gfx, cx: number, cy: number, k: number, n = 3): void {
  if (k <= 0) return;
  const r0 = 6 + Math.round(k * 4);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.55;
    const x = Math.round(cx + Math.cos(a) * r0);
    const y = Math.round(cy + Math.sin(a) * r0);
    g.rect(x, y, 2, 2, UI.accent, 1 - k * 0.6);
  }
}

/**
 * One of the shared pictures in a box (x, y, w, h), animated by t (ms).
 * The parts: the finger, the けってい key (the device's own name), arrows.
 */
function drawPic(g: Gfx, pic: HowtoPic, x: number, y: number, w: number, h: number, t: number): void {
  const ok = deviceKeys(['Z'])[0];
  const cx = Math.round(x + w / 2);
  const fing = finger();
  const keyTop = y + h - 40;
  // where the finger is over the key (its tip at (tipX, tipY))
  const fingerAt = (tipX: number, down: number) => g.img(fing, tipX - 6, keyTop - 26 + down, { scale: 2 });
  let keyW = 0;
  const press = (kx: number, down: boolean, lit = false) => {
    keyW = bigKey(g, ok, kx, keyTop, down, lit)[1];
    fingerAt(kx, down ? 4 : -2);
  };
  /**
   * Two parts side by side (the arrows / the squares on the left, the けってい key on the right),
   * spaced by their real widths: the touch key 「けってい」 is wide, and with fixed spots it lay
   * over the arrows (改善会議 10-26 の5). Returns the centres [left, right].
   */
  const sides = (leftW: number): [number, number] => {
    const rightW = keycap(ok).width * 2;
    const total = leftW + 10 + rightW;
    const l = Math.round(cx - total / 2 + leftW / 2);
    return [l, Math.round(cx + total / 2 - rightW / 2)];
  };
  if (pic === 'tap') {
    const c = t % 1100;
    const down = c < 160;
    press(cx, down);
    burst(g, cx, keyTop - 2, down ? c / 160 : 0);
  } else if (pic === 'mash') {
    const c = t % 1500;
    const down = c < 1100 && c % 180 < 90;
    press(cx, down);
    if (c < 1100) burst(g, cx, keyTop - 2, (c % 180) / 180, 5);
  } else if (pic === 'hold') {
    // press … hold (the gauge fills) … let go (an arrow up)
    const c = t % 2600;
    const down = c >= 200 && c < 1700;
    press(cx, down, down);
    const gx = cx + Math.round(keyW / 2) + 8;
    const gh = 34;
    g.frame(gx, keyTop - 2, 6, gh, UI.border);
    const fill = down ? Math.round(((c - 200) / 1500) * (gh - 2)) : c >= 1700 ? gh - 2 : 0;
    if (fill > 0) g.rect(gx + 1, keyTop - 2 + gh - 1 - fill, 4, fill, c >= 1700 ? '#FFD23F' : UI.accent);
    if (c >= 1700 && c < 2300) {
      const k = (c - 1700) / 600;
      const ay = Math.round(keyTop - 34 - k * 6);
      for (let i = 0; i < 4; i++) g.rect(cx - 16 - i, ay + i, 1 + i * 2, 1, UI.accent);
      g.rect(cx - 17, ay + 4, 3, 5, UI.accent);
    }
  } else if (pic === 'timing') {
    // a mark running along a bar; pressed while it is in the red
    const bw = Math.min(w - 20, 96);
    const bx = Math.round(cx - bw / 2);
    const by = y + 2;
    g.rect(bx, by, bw, 7, UI.cream);
    g.rect(bx + Math.round(bw * 0.62), by, Math.round(bw * 0.16), 7, UI.accent, 0.8);
    g.frame(bx - 1, by - 1, bw + 2, 9, UI.border);
    const c = t % 1800;
    const k = Math.min(1, c / 1300);
    const mx = bx + Math.round(k * (bw - 3));
    g.rect(mx, by - 3, 3, 13, UI.border);
    const hit = c >= 1000 && c < 1180;
    press(cx, hit);
    burst(g, cx, keyTop - 2, hit ? (c - 1000) / 180 : 0, 5);
  } else if (pic === 'keep') {
    // 押しつづける: pressed and kept down — the key stays lit, the dots go on counting; only at
    // the end of the round does it come up (no "let go" arrow: letting go is the end, not the move)
    const c = t % 2800;
    const down = c >= 200 && c < 2600;
    press(cx, down, down);
    if (down) {
      const n = Math.min(5, Math.floor((c - 200) / 420) + 1);
      const dx = cx + Math.round(keyW / 2) + 8;
      for (let i = 0; i < 5; i++) g.rect(dx, keyTop + 30 - i * 7, 5, 4, i < n ? UI.accent : '#D8D2C4');
      // the finger's strain: two short strokes beside it, in turn
      const k = Math.floor(c / 220) % 2;
      g.rect(cx - Math.round(keyW / 2) - 7, keyTop - 10 + k * 3, 3, 1, UI.accent);
      g.rect(cx - Math.round(keyW / 2) - 6, keyTop - 5 - k * 3, 3, 1, UI.accent);
    }
  } else if (pic === 'pick') {
    // えらんで 置く: a cursor steps over the squares, けってい puts the mark in the one it is on
    const COLS = 3;
    const cw = 14;
    const ch = 12;
    const [lc, rc] = sides(COLS * cw);
    const gx = lc - Math.round((COLS * cw) / 2);
    const gy = y + 14;
    const c = t % 2800;
    const path = [0, 1, 4];
    const at = path[Math.min(path.length - 1, Math.floor(c / 480))];
    const marked = c >= 1560;
    for (let i = 0; i < 6; i++) {
      const x0 = gx + (i % COLS) * cw;
      const y0 = gy + Math.floor(i / COLS) * ch;
      g.rect(x0, y0, cw - 1, ch - 1, UI.cream);
      g.frame(x0 - 1, y0 - 1, cw + 1, ch + 1, '#B8AE98');
      if (marked && i === at) {
        g.rect(x0 + 4, y0 + 3, 5, 5, UI.accent);
        g.rect(x0 + 3, y0 + 4, 7, 3, UI.accent);
      }
    }
    const cx0 = gx + (at % COLS) * cw;
    const cy0 = gy + Math.floor(at / COLS) * ch;
    g.frame(cx0 - 2, cy0 - 2, cw + 3, ch + 3, c < 1500 ? UI.border : UI.accent);
    const down = c >= 1500 && c < 1680;
    press(rc, down);
    burst(g, rc, keyTop - 2, down ? (c - 1500) / 180 : 0);
  } else if (pic === 'aim') {
    // the cross (each arrow lit in turn), then the けってい key pressed
    const keys = deviceKeys(['up', 'down', 'left', 'right']);
    const c = t % 2400;
    const [ax, rc] = sides(keys.length < 4 ? keycap(keys[0]).width * 2 : keycap('up').width * 3 + 2);
    if (keys.length < 4) bigKey(g, keys[0], ax, keyTop, c < 1500 && c % 500 < 250);
    else {
      // the four arrow keys as a cross, at their own size (2× would not fit the picture)
      const turn = c < 1500 ? Math.floor(c / 375) : -1;
      const cap = keycap('up');
      const cw = cap.width;
      const chh = cap.height;
      const spots: [GuideKey, number, number][] = [
        ['up', ax - Math.round(cw / 2), y + 1],
        ['right', ax + Math.round(cw / 2) + 1, y + 2 + chh],
        ['down', ax - Math.round(cw / 2), y + 3 + chh * 2],
        ['left', ax - Math.round(cw / 2) - cw - 1, y + 2 + chh],
      ];
      spots.forEach(([k, kx, ky], i) => {
        const on = i === turn;
        g.img(keycap(k), kx, ky + (on ? 1 : 0));
        if (on) g.rect(kx + 1, ky + 2, cw - 2, chh - 5, UI.border, 0.12);
      });
    }
    const down = c >= 1700 && c < 1880;
    press(rc, down);
    burst(g, rc, keyTop - 2, down ? (c - 1700) / 180 : 0);
  } else if (pic === 'lr' || pic === 'ud') {
    // the arrows (lit in turn), then the けってい key pressed
    const arrows: GuideKey[] = pic === 'ud' ? ['up', 'down'] : ['left', 'right'];
    const keys = deviceKeys(arrows);
    const c = t % 2400;
    const capW = keycap(keys[0]).width * 2;
    const [ax, rc] = sides(keys.length === 1 ? capW : capW * 2 + 4);
    if (keys.length === 1) bigKey(g, keys[0], ax, keyTop, c < 1500 && c % 500 < 250);
    else {
      const cap = keycap(keys[0]);
      const gap = cap.width * 2 + 4;
      bigKey(g, keys[0], ax - gap / 2, keyTop, c < 1500 && c % 1000 < 400);
      bigKey(g, keys[1], ax + gap / 2, keyTop, c < 1500 && c % 1000 >= 500 && c % 1000 < 900);
    }
    const down = c >= 1700 && c < 1880;
    press(rc, down);
    burst(g, rc, keyTop - 2, down ? (c - 1700) / 180 : 0);
  }
}

// ---------------------------------------------------------------- the line, with its keys

interface Bit {
  text?: string;
  key?: GuideKey;
}
const TOKEN: Record<string, GuideKey[]> = {
  Z: ['Z'],
  X: ['X'],
  '←→': ['left', 'right'],
  '↑↓': ['up', 'down'],
  十字: ['up', 'down', 'left', 'right'],
  '→': ['right'],
  '←': ['left'],
  '↑': ['up'],
  '↓': ['down'],
};
function bits(line: string): Bit[] {
  const out: Bit[] = [];
  for (const part of line.split(/(\{[^}]+\})/)) {
    if (!part) continue;
    const m = part.match(/^\{(.+)\}$/);
    if (m && TOKEN[m[1]]) for (const k of deviceKeys(TOKEN[m[1]])) out.push({ key: k });
    else out.push({ text: part });
  }
  return out;
}
function bitsW(bs: Bit[]): number {
  return bs.reduce((a, b) => a + (b.key ? keycap(b.key).width + 2 : textW(b.text!)), 0);
}
function drawBits(g: Gfx, bs: Bit[], cx: number, y: number, color: string): void {
  let x = Math.round(cx - bitsW(bs) / 2);
  for (const b of bs) {
    if (b.key) {
      const cap = keycap(b.key);
      g.img(cap, x + 1, y - 2);
      x += cap.width + 2;
    } else {
      g.text(b.text!, x, y, { color });
      x += textW(b.text!);
    }
  }
}

// ---------------------------------------------------------------- the card

const CARD_W = 292;
const PIC_H = 66;
const TITLE = 'やりかた';
const YAME = '{X}＝やめる';
const HAJIME = '{Z}で はじめる';

class HowtoCard implements Widget {
  modal = true;
  done = false;
  private t = 0;
  private out = -1;
  private next: 'play' | 'quit' = 'play';
  constructor(
    readonly howto: Howto,
    readonly game_: Widget | null,
  ) {
    sfx('se_howto');
  }
  update(dt: number, input: Input): void {
    this.t += dt;
    if (this.out >= 0) {
      this.out += dt;
      if (this.out >= 160) {
        this.done = true;
        setFlag(howtoFlag(this.howto.id));
        if (this.next === 'quit' && this.game_) quitCloseup(this.game_);
      }
      return;
    }
    // (a press held from the last page doesn't close it at once)
    if (this.t < 350) return;
    if (input.rawPressed('confirm')) {
      sfx('se_confirm');
      this.out = 0;
    } else if (input.rawPressed('cancel')) {
      this.next = 'quit';
      this.out = 0;
    }
  }
  draw(g: Gfx): void {
    const inK = ease.cubicOut(Math.min(1, this.t / 180));
    const k = this.out >= 0 ? inK * (1 - Math.min(1, this.out / 160)) : inK;
    const pic = this.howto.pic;
    const h = (pic ? PIC_H + 8 : 0) + 84;
    const x = Math.round((W - CARD_W) / 2);
    const y = Math.round((H - h) / 2) + Math.round((1 - k) * 8);
    g.rect(0, 0, W, H, '#0B0B14', 0.45 * k);
    markText(x, y, CARD_W, h);
    drawWindow(g, x, y, CARD_W, h, UI, k, { curl: false });
    g.alpha(k, () => {
      const tw = textW(TITLE) + 16;
      drawTape(g, x + 10, y - 6, tw, 16, TITLE, { seed: 7 });
      let yy = y + 14;
      if (pic) {
        g.rect(x + 12, yy, CARD_W - 24, PIC_H, UI.cream);
        g.clip(x + 12, yy, CARD_W - 24, PIC_H, () => drawPic(g, pic, x + 12, yy + 4, CARD_W - 24, PIC_H - 6, this.t));
        yy += PIC_H + 8;
      }
      drawBits(g, bits(this.howto.line), W / 2, yy + 2, UI.text);
      drawBits(g, bits(YAME), W / 2, yy + 26, UI.pencil);
      // 「けってい で はじめる」 blinks bottom right
      if (Math.floor(this.t / 500) % 2 === 0 || this.t < 350) {
        const bs = bits(HAJIME);
        const bw = bitsW(bs);
        drawBits(g, bs, x + CARD_W - 12 - bw / 2, yy + 50, UI.accent);
      }
    });
  }
}

// ---------------------------------------------------------------- QA

/** QA: show a card now (its widget: the top close-up, if any). */
function showCard(h: Howto): void {
  game.ui.hold = new HowtoCard(h, topCloseup());
}

registerDebug('howtoSkip', (on?: unknown) => {
  qaSkip = on === undefined ? true : !!on;
  return qaSkip;
});
registerDebug('howtoReset', () => {
  shownNow.clear();
  for (const k of Object.keys(state.flags)) if (k.startsWith('howto_')) setFlag(k, 0);
  return true;
});
registerDebug('howtoShow', (line?: unknown, pic?: unknown) => {
  showCard({ id: 'qa', line: String(line ?? '{Z}を 押さえて、はなす'), pic: (pic as HowtoPic) ?? 'hold' });
  return true;
});
/** QA: every close-up's line width (widest bits ≤ the card's inside). */
registerDebug('howtoCheck', () => {
  const max = CARD_W - 28;
  const out: { id: string; w: number; ok: boolean }[] = [];
  for (const h of [...Object.values(HOWTO), ...HOWTO_SEEN.values()]) {
    const w = bitsW(bits(h.line));
    out.push({ id: h.id, w, ok: w <= max });
  }
  return { max, bad: out.filter((o) => !o.ok), n: out.length, all: out };
});
registerDebug('closeupInfo', () => {
  const w = topCloseup();
  return {
    top: w ? w.constructor?.name : null,
    howto: w?.howto ?? null,
    card: !!game.ui.hold,
    canQuit: w ? canQuit(w) : false,
    tag: tagK,
    quits: quitLog.slice(-5),
  };
});
registerDebug('closeupFlags', () => ({ ...state.flags }));
/** QA：前置きを 短く（10-26 の 3）。今 立っている yame_、聞いた 記録、表。 */
registerDebug('yameInfo', () => ({
  yame: Object.keys(state.flags).filter((k) => k.startsWith('yame_') && state.flags[k] > 0),
  asks: skipLog.slice(-8),
  table: INTRO_SKIP,
}));
/** QA：寄り道の 表（audio/yorimichi.ts）と この 表の 食いちがい。 */
registerDebug('introCheck', () => {
  return {
    missing: Object.keys(YORIMICHI_START).filter((k) => !(k in INTRO_SKIP)),
    extra: Object.keys(INTRO_SKIP).filter((k) => !(k in YORIMICHI_START)),
    ask: Object.keys(INTRO_SKIP).filter((k) => INTRO_SKIP[k].how === 'ask'),
  };
});
/** QA：この 大写しを やめた 形に（`on` = 0 で 戻す）。 */
registerDebug('yameSet', (id?: unknown, on: unknown = 1) => {
  setFlag(yameFlag(String(id)), Number(on));
  return quitBefore(String(id));
});
registerDebug('closeupQuit', () => {
  const w = topCloseup();
  if (w) quitCloseup(w);
  return !!w;
});

/** The cards seen this session (howtoCheck looks at these too: a new close-up's own line). */
const HOWTO_SEEN = new Map<string, Howto>();
