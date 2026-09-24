// QA commands for the UI (window.__game.cmd.*).

import { registerDebug } from '../debug';
import { game } from '../engine/game';
import { ask, caption, choose, say } from './dialog';
import { notifyItem, showClock, showPlaceName, uiHud } from './hud';
import { openMenu } from './menu';
import { showTitle } from './title';
import { openShop } from './shop';
import { saveMenu } from './save';
import { runGameOver } from './gameover';
import { playEndingNotebook, playNightSkyCut } from './ending';
import { showGuide } from './guide';
import { showBubble } from './bubble';
import { setFlag, state } from '../game/state';
import { joinKanenari, newGameParty, setMemberLevel, syncProgressSkills } from '../data/battle';
import { field } from '../world/field';

const SAMPLES: Record<string, () => Generator> = {
  normal: function* () {
    yield* say(['あ、起きた。{w=300}\nおつかい 行ってきて。', 'コロッケ 4つ。ソースは 別。{w=300}\n別よ？'], { name: '母', voice: 'mother' });
  },
  flip: function* () {
    yield* say(['（コロッケは 食べられません。\n中が 暗いので）'], { name: 'カネナリくん', voice: 'flip' });
  },
  sys: function* () {
    yield* say('ラムネを 手に入れた！', { voice: 'sys' });
  },
  narr: function* () {
    yield* say('表紙が まぶしいほど 白い。', { voice: 'narr' });
  },
  inner: function* () {
    yield* say('（……チャイム、止まってない？）', { voice: 'minato' });
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
registerDebug('notebook', () => {
  game.scripts.run(playEndingNotebook());
  return 'notebook';
});
registerDebug('guide', (text = '移動：十字キー\n調べる・話す：Z') => showGuide(text));
registerDebug('hudState', () => {
  const h = uiHud as unknown as Record<string, unknown>;
  return { lastPlace: h.lastPlace, lastMap: h.lastMap, banner: h.banner, pending: h.pendingPlace, t: h.t };
});
registerDebug('bubble', (id = 'player', text = 'まいど！') => showBubble(id, text));
