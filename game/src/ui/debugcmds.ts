// QA commands for the UI (window.__game.cmd.*).

import { registerDebug } from '../debug';
import { game } from '../engine/game';
import { ask, caption, choose, say } from './dialog';
import {
  choreCardShowing,
  completeChoreCard,
  deliveryCardShowing,
  hideChoreCard,
  hideDeliveryCard,
  notifyItem,
  setChoreCount,
  setDeliveryCount,
  showCallBubble,
  showChoreCard,
  showClock,
  showDeliveryCard,
  showPlaceName,
  skipItemCard,
  uiHud,
} from './hud';
import { openMenu } from './menu';
import { showTitle } from './title';
import { openShop } from './shop';
import { saveMenu } from './save';
import { runGameOver } from './gameover';
import { playEndingNotebook, playEndingNotebookCh2, playNightSkyCut } from './ending';
import { showGuide } from './guide';
import { showBubble } from './bubble';
import { addItem, setFlag, state } from '../game/state';
import { joinKanenari, newGameParty, setMemberLevel, syncProgressSkills } from '../data/battle';
import { field } from '../world/field';
import { allItems, getEnemy, getSkill, HANKO_CASE_ORDER, PR_ORDER } from '../data/battle';
import { fitWrap, phraseWrapInfo, textW } from './window';
import { FOLD, LP, RP, SP } from './menu/notebook';
import { BOOK2_ENEMIES, BOOK_ENEMIES, FUSHIGI2_BOOK, FUSHIGI_BOOK, fushigiPageFit, pressedText, pressedText2, TSUKKOMI2_ENEMIES, TSUKKOMI_ENEMIES } from './menu/book';
import { W } from '../engine/screen';
import type { Scene } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { drawVillageLit } from './cut_village_lit';
import { CALL_NAMES, callLine } from '../data/text/hoshi_npcs';
import { openSunriseCut, sunriseStill } from './cut_sunrise';
import { playChapterDoor } from './chapter_door';
import { playTsugaoRoom, setTsugaoAuto, tsugaoStill } from './cut_tsugao';

const SAMPLES: Record<string, () => Generator> = {
  normal: function* () {
    yield* say(['あ、起きた。{w=300}\nおつかい 行ってきて。', 'コロッケ 4つ。ソースは 別。{w=300}\n別よ？'], { name: '母', voice: 'mother' });
  },
  mujin: function* () {
    yield* say(['いらっしゃいませ。\nどれでも 100円。'], { voice: 'h_mujin' });
    yield* say(['（札で 話す 人、ほかにも いたんですね）'], { name: 'カネナリくん', voice: 'flip' });
  },
  flip: function* () {
    yield* say(['（コロッケは 食べられません。\n中が 暗いので）'], { name: 'カネナリくん', voice: 'flip' });
  },
  sys: function* () {
    yield* say('ラムネを 手に入れた！', { voice: 'sys' });
  },
  /** A system line with some names coloured by hand and one left to the auto-marking. */
  sysmix: function* () {
    yield* say('ハンコケースを 受けとった！\n{c=#E23B2E}みました{/c}と {c=#E23B2E}ペケ{/c}の ハンコが 入っている。', { voice: 'sys' });
    yield* say('{c=#E23B2E}ハンコケース{/c}を 受けとった！\n{c=#E23B2E}みました{/c}と {c=#E23B2E}ペケ{/c}の ハンコが 入っている。', { voice: 'sys' });
  },
  narr: function* () {
    yield* say('表紙が まぶしいほど 白い。', { voice: 'narr' });
  },
  inner: function* () {
    yield* say('（……チャイム、止まってない？）', { style: 'inner' });
  },
  fx: function* () {
    yield* say('{wave}ふしぎな 音が する……{/wave}{w=300}\n{shake}鐘が 鳴らない。{/shake}\n{c=#E23B2E}みました{/c}を 押しますか？', { name: 'おばあ', voice: 'obaa' });
  },
  chain: function* () {
    yield* say('揚げたては 五時の チャイムが\n鳴り終わってから だ。', { name: '丸山', voice: 'maruyama' });
    yield* say('オレの 信念じゃない。{w=300}\n油の 信念だ。', { name: '丸山', voice: 'maruyama' });
    yield* say('ひのやで 時間でも つぶしてきな。', { name: '丸山', voice: 'maruyama' });
    const i = yield* choose(['うなずく', '首を かしげる']);
    yield* say(i === 0 ? 'よし。' : '……わかんねえか。', { name: '丸山', voice: 'maruyama' });
  },
  ask: function* () {
    const i = yield* ask(['おかえり。{w=300}\nソースは？', 'ちゃんと 別に してもらった？'], ['べつ', 'いっしょ'], { name: '母', voice: 'mother' });
    yield* say(i === 0 ? 'えらい。' : '……今日だけよ。', { name: '母', voice: 'mother' });
  },
  mix: function* () {
    yield* say('いい においが します。', { name: 'カネナリくん', voice: 'flip' });
    yield* say('揚げたて コロッケを 受けとった！', { voice: 'sys' });
    yield* say('（たぶん）', { name: 'カネナリくん', voice: 'flip' });
  },
  long: function* () {
    yield* say('これは とても 長い 文章なので 自動的に 改ページ されるかどうかを 確認するための テストです。三行を 超えたら 次の ページに 送られる はず。ページの 送りの 印は 朱の 小さな ハンコ。', { name: '郵便屋さん', voice: 'postman' });
  },
  top: function* () {
    yield* say('迷子の お知らせです。', { name: '防災無線', voice: 'broadcast', pos: 'top' });
  },
  caption: function* () {
    yield* caption(['8月31日。', '夏休み、最後の日。']);
  },
};

registerDebug('say', (kind = 'normal') => {
  const f = SAMPLES[kind];
  if (!f) return Object.keys(SAMPLES);
  game.scripts.run(f() as Generator<never>);
  return kind;
});
registerDebug('notify', (id = 'item_ramune') => notifyItem(id));
registerDebug('place', (name = 'ひぐらし坂') => showPlaceName(name));
registerDebug('clock', (ms = 4000) => showClock(ms));
registerDebug('menu', (tab = 'items') => {
  openMenu(tab);
  return tab;
});

/** QA: a mid-game state for looking at the menu pages (stage 2, two members, a full bag). */
registerDebug('uiDemo', (level = 3) => {
  if (!state.party.length) newGameParty();
  const mi = state.party[0];
  setMemberLevel(mi, level);
  mi.exp += 12;
  mi.hp = Math.max(1, mi.maxHp - 17);
  mi.mp = Math.max(0, mi.maxMp - 5);
  setFlag('flag_opening_done', 1);
  setFlag('flag_errand', 1);
  setFlag('flag_met_maruyama', 1);
  setFlag('flag_chime_stopped', 1);
  setFlag('flag_got_hanko', 1);
  setFlag('flag_kanenari_joined', 1);
  setFlag('flag_broadcast', 1);
  const k = joinKanenari();
  setMemberLevel(k, level);
  k.hp = Math.max(1, k.maxHp - 30);
  syncProgressSkills();
  state.money = 380;
  state.inventory = ['item_otsukai_memo', 'item_gamaguchi', 'item_ramune', 'item_ramune', 'item_kinakobou', 'item_fugashi', 'item_hanko_case', 'item_mimashita_cho', 'item_hakka_ame', 'item_stamp_pad', 'item_capsule', 'item_hato_meishi', 'item_oden_can'];
  for (const n of [1, 3, 4, 5, 8]) setFlag(`flag_fushigi_${String(n).padStart(2, '0')}`, 1);
  for (const id of ['enemy_hato_kakaricho', 'enemy_semi_final', 'enemy_cone_vocal']) setFlag('flag_book_' + id, 1);
  for (const f of ['flag_tsukkomi_enemy_hato_kakaricho_1', 'flag_tsukkomi_enemy_semi_final_1', 'flag_tsukkomi_enemy_hato_kakaricho_2', 'flag_tsukkomi_enemy_cone_vocal_2']) setFlag(f, 1);
  field()?.syncFollower(true);
  return 'ok';
});
registerDebug('title', () => {
  showTitle();
  return 'title';
});
registerDebug('shop', (id = 'shop_hinoya') => {
  game.scripts.run(openShop(id));
  return id;
});
registerDebug('save', (kind: 'jizo' | 'bench' = 'jizo') => {
  game.scripts.run(saveMenu(kind));
  return kind;
});
registerDebug('gameover', (boss = false) => {
  game.scripts.run(
    (function* () {
      const c = yield* runGameOver({ boss });
      return c;
    })(),
  );
  return 'gameover';
});
registerDebug('ending', () => {
  game.scripts.run(
    (function* () {
      yield* playNightSkyCut();
      yield* playEndingNotebook();
    })(),
  );
  return 'ending';
});
registerDebug('notebook', (ch = 1) => {
  game.scripts.run(ch === 2 ? playEndingNotebookCh2({ toTitle: false }) : playEndingNotebook());
  return 'notebook';
});
registerDebug('guide', (text = '移動：十字キー\n調べる・話す：Z') => showGuide(text));
registerDebug('hudState', () => {
  const h = uiHud as unknown as Record<string, unknown>;
  return { lastPlace: h.lastPlace, lastMap: h.lastMap, banner: h.banner, pending: h.pendingPlace, t: h.t, cards: h.cards };
});
/** QA: pick an item up as the field would (`quiet`: the way an event that announces it does). */
registerDebug('give', (id = 'item_ramune', quiet = false) => {
  if (quiet) skipItemCard(id);
  return addItem(id);
});
registerDebug('bubble', (id = 'player', text = 'まいど！') => showBubble(id, text));

/**
 * QA: run every text the UI wraps (items in the bag and the shop, ふしぎ,
 * あいて, ツッコミ, ハンコ) through phraseWrap at the width and line budget of
 * the place it is shown. Reports texts that need more lines than there are,
 * lines wider than the column, and breaks that fell between characters.
 */
registerDebug('wrap', (text: string, w = 144, glue = false) => phraseWrapInfo(text, w, { glue: !!glue }));
registerDebug('wrapCheck', () => {
  const issues: string[] = [];
  let n = 0;
  const check = (where: string, text: string, w: number, maxLines: number, glue = false) => {
    if (!text) return;
    n++;
    const { lines, forced } = phraseWrapInfo(text, w, { glue });
    const wide = lines.filter((l) => textW(l) > w + (/[、。]$/.test(l) ? 8 : /[！？」』）]$/.test(l) ? 16 : 0));
    if (lines.length > maxLines || forced || wide.length) issues.push(`${where}: ${lines.join('／')} (${lines.length}/${maxLines} lines${forced ? `, ${forced} forced` : ''}${wide.length ? ', too wide' : ''})`);
  };
  const shopW = W - 16 - 18 - 12;
  for (const it of allItems()) {
    const flavor = it.key ? it.desc[0] + (it.desc[1] ? '\n' + it.desc[1] : '') : it.desc[0];
    check(`もちもの ${it.name}`, flavor, RP.w - 2, 4, true);
    if (!it.key) check(`もちもの ${it.name} 効果`, it.desc[1], RP.w - 6, 3, true);
    if (!it.key) {
      const f = phraseWrapInfo(it.desc[0], shopW, { glue: true }).lines.length;
      const e = phraseWrapInfo(it.desc[1], shopW, { glue: true }).lines.length;
      if (f + e > 3) issues.push(`ショップ ${it.name}: ${f}+${e} lines > 3`);
      check(`ショップ ${it.name}`, it.desc[0], shopW, 2, true);
    }
  }
  const labelW = FOLD - 4 - (LP.x + 14);
  FUSHIGI_BOOK.forEach(([title], i) => {
    check(`ふしぎ${i + 1} 一覧`, title, labelW, 2);
    check(`ふしぎ${i + 1} 題`, title, RP.w, 2);
    // the page body may set a too-long word a little tighter instead of splitting it; what fits is
    // what the page has left under the title and the place (the page's own sums)
    const body = fitWrap(pressedText(i), RP.w);
    const fit = fushigiPageFit(title, FUSHIGI_BOOK[i][1], pressedText(i));
    n++;
    if (fit.body > fit.room) issues.push(`ふしぎ${i + 1} 本文: ${body.map((l) => l.text).join('／')} (${fit.body}/${fit.room} lines)`);
    if (phraseWrapInfo(pressedText(i), RP.w).forced && body.every((l) => !l.spacing)) issues.push(`ふしぎ${i + 1} 本文: forced break`);
  });
  for (const id of BOOK_ENEMIES) {
    const e = getEnemy(id);
    if (!e) continue;
    check(`あいて ${e.name} 一覧`, e.name, labelW, 2);
    check(`あいて ${e.name} 正体`, e.book.shotai, RP.w + 2, 3);
    check(`あいて ${e.name} ひとこと`, e.book.hitokoto, RP.w - 4, 3);
  }
  for (const id of TSUKKOMI_ENEMIES) for (const l of getEnemy(id)?.tsukkomi ?? []) check(`ツッコミ 一覧`, l, labelW, 2);
  // みました帳 ②
  FUSHIGI2_BOOK.forEach(([title], i) => {
    check(`②ふしぎ${i + 1} 一覧`, title, labelW, 2);
    check(`②ふしぎ${i + 1} 題`, title, RP.w, 2);
    const body = fitWrap(pressedText2(i), RP.w);
    const fit = fushigiPageFit(title, FUSHIGI2_BOOK[i][1], pressedText2(i));
    n++;
    if (fit.body > fit.room) issues.push(`②ふしぎ${i + 1} 本文: ${body.map((l) => l.text).join('／')} (${fit.body}/${fit.room} lines)`);
  });
  for (const id of BOOK2_ENEMIES) {
    const e = getEnemy(id);
    if (!e) continue;
    check(`②あいて ${e.name} 一覧`, e.name, labelW, 2);
    // (the page sets a long 正体／ひとこと a pixel tighter: six lines between them)
    const a = phraseWrapInfo(e.book.shotai, RP.w + 11).lines.length;
    const b = phraseWrapInfo(e.book.hitokoto, RP.w + 5).lines.length;
    n++;
    if (a + b > 6) issues.push(`②あいて ${e.name}: 正体 ${a} + ひとこと ${b} lines > 6`);
  }
  for (const id of TSUKKOMI2_ENEMIES) for (const l of getEnemy(id)?.tsukkomi ?? []) check(`②ツッコミ 一覧`, l, labelW, 2);
  const infoW = SP.x + SP.w - 14 - LP.x;
  for (const id of [...HANKO_CASE_ORDER, ...PR_ORDER]) {
    const s = getSkill(id);
    for (const l of s?.desc ?? []) check(`ハンコ ${s?.name}`, l, infoW, 1);
  }
  void getSkill;
  return { checked: n, issues };
});

// ---- chapter 2 (50_ch2_story 1.4, 52_ch2_level_art 12–13) -------------------------------------

/**
 * QA: put the title into one of chapter 2's states and show it —
 *   'fresh'    nothing on this device
 *   'ch1'      a chapter 1 game in the slot, no clear yet (3 tapes)
 *   'ch1clear' chapter 1 finished: the clear data in the slot (4 tapes)
 *   'ch2'      the slot is in the middle of chapter 2 (sticky 「第2章」, the light on the hill)
 *   'ch2clear' chapter 2 finished (the morning over 星見台, the ①② card)
 */
registerDebug('titleState', (kind = 'ch2') => {
  const slot = (flags: Record<string, number>, map: string, x: number, y: number) =>
    JSON.stringify({ party: [{ id: 'minato', name: 'シュン', level: 5, exp: 150, hp: 72, maxHp: 72, mp: 22, maxMp: 22, atk: 17, def: 14, spd: 12, luck: 9, skills: [], status: {}, equip: {} }], inventory: [], money: 300, flags, map, x, y, dir: 'down', playTimeMs: 1234000, taken: {}, steps: 0 });
  try {
    for (const k of ['yugure-rpg-save-v1', 'hanamaru-clear-v1', 'hanamaru-clear-ch2-v1', 'hanamaru-ch2-start-v1']) localStorage.removeItem(k);
    const rec1 = JSON.stringify({ fushigi: 9, aite: 6, tsukkomi: 15, tsukkomiTotal: 19 });
    const rec2 = JSON.stringify({ fushigi: 7, aite: 5, tsukkomi: 12, tsukkomiTotal: 17 });
    if (kind === 'ch1') localStorage.setItem('yugure-rpg-save-v1', slot({ flag_stage: 1 }, 'map_town', 30, 20));
    if (kind === 'ch1clear' || kind === 'ch2' || kind === 'ch2clear') localStorage.setItem('hanamaru-clear-v1', rec1);
    if (kind === 'ch1clear') localStorage.setItem('yugure-rpg-save-v1', slot({ flag_clear: 1, flag_stage: 3 }, 'map_town', 56, 22));
    if (kind === 'ch2') localStorage.setItem('yugure-rpg-save-v1', slot({ flag_clear: 1, flag_ch2_started: 1, flag_ch2_stage: 1, flag_fushigi_ch2_01: 1, flag_fushigi_ch2_03: 1 }, 'map_hoshimidai', 30, 30));
    if (kind === 'ch2clear') {
      localStorage.setItem('hanamaru-clear-ch2-v1', rec2);
      localStorage.setItem('yugure-rpg-save-v1', slot({ flag_clear: 1, flag_ch2_started: 1, flag_ch2_clear: 1, flag_ch2_stage: 3 }, 'map_home_2f', 5, 3));
    }
  } catch {
    return 'no storage';
  }
  showTitle();
  return kind;
});

/**
 * QA: show one of chapter 2's pictures full screen. `cue` steps the lines
 * the picture follows (cut_h_village_lit: 0–5); `ms` holds it that long.
 */
class CutPreview implements Scene {
  transparent = false;
  t = 0;
  constructor(
    private readonly draw0: (g: Gfx, t: number, cue: number) => void,
    public cue = 0,
  ) {}
  update(dt: number): void {
    this.t += dt;
    if (game.input.pressed('confirm')) {
      this.cue++;
    }
    if (game.input.pressed('cancel')) game.pop();
  }
  draw(g: Gfx): void {
    this.draw0(g, this.t, this.cue);
  }
}
registerDebug('cut', (id = 'village', cue = 0) => {
  if (id.startsWith('sunrise')) {
    game.push(sunriseStill(Number(id.slice(7)) as 0 | 1 | 2));
    return id;
  }
  if (id === 'sunriseplay') return id;
  if (id.startsWith('tsugao')) {
    game.push(tsugaoStill(Math.max(0, Math.min(8, Number(id.slice(6)) || 0))));
    return id;
  }
  const f = id === 'village' ? drawVillageLit : null;
  if (!f) return ['village', 'sunrise0', 'sunrise1', 'sunrise2', 'dawn', 'tsugao0', 'tsugao1', 'tsugao2', 'tsugao3', 'tsugao4', 'tsugao5', 'tsugao6', 'tsugao7', 'tsugao8'];
  game.push(new CutPreview(f, cue));
  return id;
});
/** QA: the sunrise cut played through (the chime replaced by a 3 s wait). */
registerDebug('dawn', () => {
  game.scripts.run(
    (function* () {
      const cut = yield* openSunriseCut();
      yield 3000;
      yield* cut.rise();
      yield* say('夕焼けを ためこんだ トマトが、\n朝焼けに なった。', { voice: 'narr' });
      yield* cut.close();
    })(),
  );
  return 'dawn';
});

/** QA: the loudspeaker's call bubble (fx_h_call_bubble) with its voice. */
registerDebug('callBubble', (text = callLine(CALL_NAMES[0])) => {
  showCallBubble(text, { voice: 'broadcast' });
  return text;
});

/** QA: a chapter 2 party on 星見台 at stage `s` (the clock, the place names, the book ②). */
registerDebug('ch2Demo', (s = 1) => {
  if (!state.party.length || state.party.length < 2) {
    state.party = [];
    newGameParty();
    joinKanenari();
  }
  setFlag('flag_clear', 1);
  setFlag('flag_ch2_started', 1);
  setFlag('flag_ch2_stage', s);
  setFlag('flag_ch2_yoriai', 1);
  if (s >= 1) setFlag('flag_ch2_got_tomato', 1);
  for (const id of ['item_kairan_map', 'item_hanamaru_tomato', 'item_seiriken', 'item_kyuri_zuke', 'item_umeboshi', 'item_toumorokoshi', 'item_kairan_shuniku', 'item_mimashita_cho', 'item_hanko_case'])
    if (!state.inventory.includes(id)) state.inventory.push(id);
  for (const n of [1, 2, 3, 6, 8]) setFlag(`flag_fushigi_ch2_${String(n).padStart(2, '0')}`, 1);
  for (const id of ['enemy_sune_tomato', 'enemy_henoheno_kacho', 'enemy_chototsu']) setFlag('flag_book_' + id, 1);
  for (const f of ['flag_tsukkomi_enemy_sune_tomato_1', 'flag_tsukkomi_enemy_henoheno_kacho_2', 'flag_tsukkomi_enemy_chototsu_1']) setFlag(f, 1);
  syncProgressSkills();
  return 'ok';
});

/** QA: the おてつだい strip — `n` jobs done (0–9: the first 6 are エサ寄せ), 'done' presses 「済」. */
registerDebug('chore', (n: number | 'done' | 'hide' = 0) => {
  if (n === 'hide') {
    hideChoreCard();
    return 'hide';
  }
  if (!choreCardShowing()) showChoreCard();
  if (n === 'done') {
    game.scripts.run(completeChoreCard());
    return 'done';
  }
  setChoreCount(0, Math.min(6, n));
  setChoreCount(1, Math.max(0, n - 6));
  return n;
});

/** QA: the おとどけ strip — `n` parcels delivered (5: 軽トラへ and 「済」), 'close' as 〔しめ〕 closes it, 'hide'. */
const DELI_STOPS = ['タケじい', 'エー区長', 'スギばあ', '集会所', 'トマじい'];
registerDebug('deli', (n: number | 'close' | 'hide' = 0) => {
  if (n === 'hide') {
    hideDeliveryCard();
    return 'hide';
  }
  if (n === 'close') {
    setFlag('flag_ch2_delivery', 1);
    return 'close';
  }
  setFlag('flag_ch2_delivery', 0);
  if (!deliveryCardShowing()) showDeliveryCard({ total: 5, next: DELI_STOPS[0] });
  setDeliveryCount(n, DELI_STOPS[n] ?? '');
  return n;
});

/** QA: 章の扉 (52 12.3) on a black screen. */
registerDebug('door', () => {
  game.scripts.run(
    (function* () {
      game.fadeColor = '#0B0B14';
      game.fadeAlpha = 1;
      yield* playChapterDoor();
      game.fadeAlpha = 0;
    })(),
  );
  return 'door';
});

/** QA: カット7 ツガオの部屋 played through (`skip`: as the second time, X leaves it). */
registerDebug('tsugao', (skip = false, auto = 0) => {
  game.scripts.run(playTsugaoRoom({ skippable: !!skip, auto }));
  return 'tsugao';
});

/** QA: chapter 2's ending from カット6 on — the notebook, 「つづく」, markClearCh2, カット7, the title. */
registerDebug('ending2', (auto = 0) => {
  setTsugaoAuto(auto);
  game.scripts.run(playEndingNotebookCh2());
  return 'ending2';
});
