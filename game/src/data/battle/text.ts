// Battle system text (10_narrative.md 9.1, 9.3, 9.8, 10.1). One entry = pages;
// '\n' is a line break inside a page (the message band shows 2 lines).
// Variables: $actor $target $enemy $n $item $skill $move $stat $part

export const SYS = {
  startGeneric: ['$enemyが 行く手を ふさいだ！'],
  startMulti: ['$enemyたちが 行く手を ふさいだ！'],
  initiative: ['$enemyは まだ こっちに\n気づいていない！'],
  ambush: ['うしろから $enemyに\n見つかった！'],
  tataku: ['ミナトは 虫とりアミで たたいた！'],
  tataku2: ['ミナトは アミを 往復させた！'],
  tackle: ['カネナリくんは 2歩 助走して\n体当たりした！'],
  miss: ['$targetは ひょいと よけた。'],
  miss2: ['アミは 空を 切った。'],
  zero: ['$targetには 効いていない！'],
  hankoReady: ['ミナトは『$skill』の\nハンコを かまえた！'],
  mimashita: ['$enemyは 見られて、\nちょっと 照れた。', '$enemyの まもりが 下がった！'],
  mimashitaAgain: ['$enemyは もう 見られている。\nまもりが 下がった！'],
  peke: ['巨大な ペケが 振りおろされた！'],
  hanamaru: ['$targetに はなまる！'],
  yarinaoshi: ['$enemyの『$move』を\nなかったことに した！'],
  yarinaoshiChime: ['チャイムが 1音 もどった！'],
  yarinaoshiNone: ['……やりなおす ことが\n見つからなかった。'],
  noInk: ['朱肉が 足りない！'],
  fuusen: ['カネナリくんは ふうせんを 配った！'],
  fuusenPop: ['……割れた。', '回復は、半分に なった。'],
  goaisatsu: ['カネナリくんは 深々と おじぎした。', '敵も つられて おじぎした！\nちからが 下がった！'],
  kane: ['カネナリくんは 鐘を 鳴らした！', '……鳴らなかった。', 'すべった 空気で、\nキレが たまった！'],
  itemSelf: ['$actorは $itemを 使った！'],
  // 10〔もちもの・相手へ〕 with the giver and the receiver filled in (the
  // narrative line is written for ミナト → カネナリくん only)
  itemGive: ['$actorは $targetに\n$itemを わたした。'],
  mamoruMinato: ['ミナトは 身がまえた。'],
  mamoruKanenari: ['カネナリくんは 着ぐるみの\n厚みで 身がまえた。'],
  nigeru: ['ミナトたちは 逃げだした！'],
  nigeruOk: ['うまく 逃げきった。'],
  nigeruFail1: ['逃げようと したら、\nビーサンが 脱げた。'],
  nigeruFail2: ['逃げ道を まちがえた。'],
  nigeruBoss: ['迷子センターの ドアは、\n内側から 開かない。'],
  nigeruKanenari: ['カネナリくんが ついてくる。\nPRは 終わらない。'],
  nigeruEvent: ['逃げられない！'],
  guarded: ['$targetは ツッコミで\nふみとどまった！'],
  // status
  konranOn: ['$targetは 右と 左が\nわからなくなった！'],
  konranAct: ['$targetは こんらんしている！'],
  konranOff: ['$targetは 我に かえった。'],
  nemuriOn: ['$targetは ねむってしまった……。'],
  nemuriAct: ['$targetは ねむっている。'],
  nemuriOff: ['$targetは 目を さました！'],
  tsukamareOn: ['$targetは つかまれた！'],
  tsukamareAct: ['$targetは つかまれて 動けない！'],
  tsukamareOff: ['$targetは ふりほどいた！'],
  toosenboOn: ['$targetは とおせんぼ された！'],
  toosenboAct: ['$targetは とおせんぼ されている。'],
  toosenboOff: ['$targetは 道を 見つけた。'],
  statUp: ['$targetの $statが 上がった！'],
  statUpBig: ['$targetの $statが\nぐーんと 上がった！'],
  statDown: ['$targetの $statが 下がった！'],
  statReset: ['$targetの $statが\nもとに もどった。'],
  hebatta: ['$targetは へばった……。'],
  revived: ['$targetは 元気を 取りもどした！'],
  // results
  exp: ['経験値を $n もらった。'],
  money: ['$n円 ひろった。'],
  drop: ['$itemを 手に入れた！'],
  dropFull: ['もちものが いっぱいで、\n$itemは 持って いけなかった。'],
  levelUp: ['$actorの レベルが $nに 上がった！'],
  lv3: ['カネナリくんは『ごあいさつ』を\n覚えた！'],
  lv4: ['ミナトの たたくが 2段に なった！'],
  lv5: ['ハンコの くっきりが\n出やすく なった！'],
  afterKo: ['$targetは なんとか\n起きあがった。'],
  wipe: ['ミナトたちは 力つきた……。'],
  kireFull: ['キレが 3つ たまった！\nふたりの 息が そろっている。'],
  kanenariNoMp: ['カネナリくんには 朱肉が ない。\n……鐘に 押しても しかたない。'],
  keyItemFallback: ['今は 使う ときじゃない。'],
  hankoLearn: ['『$skill』が 浮かびあがった！'],
  hankoLearn1: ['ハンコケースに 新しい ハンコが\n浮かびあがった。'],
  hankoLearn2: ['{c=#E23B2E}$skill{/c}が 使えるように なった！'],
};

export type SysKey = keyof typeof SYS;

/** Tutorial sticky notes (9.1). Two lines each. */
export const TUT = {
  tsukkomi: '『！』が 出たら 決定！\nツッコミで ダメージ 半分。',
  firstCommand: 'たたく を えらぼう',
  ring: 'いま！',
  rhythm: '『！』の すぐあとに。\nリズムで 押そう。',
  tsukkomiOk: 'ツッコまれた 相手は\n『ボケ負け』に なる。',
  bokemake: 'ボケ負けの 相手には\nダメージ 1.5倍！',
  hanko: '長おしで 朱肉が たまる。\n赤い ところで はなす！',
  kire: 'キレが たまった！\nノリツッコミが つかえる。',
  oshirase: '光っている 部位に\n『みました』！',
};

/** evt_gameover (5.21). */
export const GAMEOVER = {
  title: 'きょうは ここまで。',
  retry: '戦う前から やりなおす',
  load: 'セーブから',
  bossFlip: '（ベンチで 休んでから\n行きましょう）',
};

/** On-screen labels (9.0). */
export const LABEL = {
  iioto: 'いい音！',
  kukkiri: 'くっきり！',
  kasure: 'かすれ……',
  bokemake: 'ボケ負け',
  kimatta: 'キマった',
  kabuse: 'かぶせた……',
  miss: 'ミス',
  buhin: '部位破壊',
  crit: '100てん',
};

/** ノリツッコミ boke variants (9.3). */
export const NORI = [
  { boke: ['カネナリくんは 鐘を マイクにして\n歌いだした！'], line: 'それ 鐘だろ！', pose: 'sing' },
  { boke: ['カネナリくんは のぼり旗を ふって\nPRを はじめた！'], line: 'PRしてる 場合か！', pose: 'flag' },
  { boke: ['カネナリくんは フリップを かかげた。\n『（中の人より）』'], line: '中の人 いないんだろ！', pose: 'flip' },
];
export const NORI_COMMON = ['ミナトは 全力で ツッコんだ！', '敵は まとめて\nボケ負けした！'];

/** 通知表 (9.8). */
export const REPORT = {
  title: 'つうちひょう',
  /** Cover of the card: school, class and the owner's name in pencil. */
  school: '夕鳴小学校',
  coverClass: '5年 2組',
  coverName: '潮見 ミナト',
  nameLine1: { minato: '夕鳴小学校 5年2組', kanenari: '夕鳴町PR大使' } as Record<string, string>,
  nameLine2: { minato: '潮見 ミナト', kanenari: 'カネナリくん' } as Record<string, string>,
  stats: ['HP', '朱肉', 'ちから', 'まもり', 'すばやさ', 'うん'],
  kanenariMp: '（記入なし）',
  fromTeacher: 'せんせいより',
  teacher: {
    minato: ['', '', 'ツッコミが 板について きました。', '人の話を、目で 聞けて います。', '夕方に 強い子です。', 'はなまる。もう 言うことは ありません。'],
    kanenari: ['', '', '笑顔が たえません。（顔は 鐘です）', 'おじぎが ていねいです。', 'すべっても めげません。', 'そこに いてくれる だけで 助かります。'],
  } as Record<string, string[]>,
};

/** Item use texts (10.1). */
export const ITEM_TEXT: Record<string, { self: string[]; kanenari?: string[]; extra?: Record<string, string[]> }> = {
  item_ramune: { self: ['$actorは ラムネを 飲んだ。\nビー玉が からん と 鳴った。'], kanenari: ['ラムネは、背中の ファスナーに\n消えていった。'] },
  item_kinakobou: {
    self: ['$actorは きなこぼうを 食べた。'],
    kanenari: ['きなこぼうは、背中の ファスナーに\n消えていった。'],
    extra: {
      atari: ['棒の 先が 赤い。\n……あたり！ もう1本 もらえた。'],
      atariFull: ['棒の 先が 赤い。……あたり！\n……でも、もう 持てない。'],
      atariKanenari: ['ファスナーの 中から、\nあたりの 棒だけ 出てきた。'],
    },
  },
  item_fugashi: { self: ['$actorは ふがしを かじった。\n口の 中が、ぜんぶ ふがしに なった。'] },
  item_hakka_ame: { self: ['$actorは ハッカあめを なめた。\nすーっと した！'], extra: { none: ['すーっと した。\n……特に なにも 起きなかった。'] } },
  item_stamp_pad: { self: ['ミナトは ハンコに\n朱肉を たっぷり つけた。'], kanenari: ['カネナリくんには 朱肉が ない。\n……鐘に 押しても しかたない。'] },
  item_oden_can: { self: ['八月の おでん缶を あけた。', 'あつい。\n夏なのに、あつい。'] },
  item_shippu: { self: ['$actorは ひえひえシップを はった。\nひやっ。背すじが のびた！'], kanenari: ['はる 場所を さがした。\n……着ぐるみの 上から はった。'] },
  item_capsule: {
    self: ['$actorは カプセルを 開けた。'],
    extra: { content: ['中身は $itemだった！'], empty: ['……からっぽだった。\nカプセルだけ、きれいだ。'] },
  },
};

/** Field hanko texts (11). */
export const FIELD_TEXT = {
  hanamaru: ['ミナトは『はなまる』を 押した。', '$targetの HPが $n 回復した。'],
  noFushigi: ['近くに、見るべき ものが ない。'],
  noTarget: ['いまは、押す 相手が いない。'],
  noInk: ['朱肉が 足りない。'],
  healed: ['$targetの HPが $n 回復した。'],
  mpHealed: ['朱肉が $n 回復した。'],
  full: ['$targetの HPは もう いっぱいだ。'],
  cured: ['$targetは すっきりした。'],
};

/** Replace $variables in a page. */
export function fill(page: string, v: Record<string, string | number | undefined>): string {
  return page.replace(/\$(actor|target|enemy|n|item|skill|move|stat|part|yakiname)/g, (_m, k: string) =>
    v[k] === undefined ? '' : String(v[k]),
  );
}

export function fillAll(pages: string[], v: Record<string, string | number | undefined>): string[] {
  return pages.map((p) => fill(p, v));
}
