// 公園の練習の戦闘 (evt_kn_lesson; 10_narrative 5.12b, 20_systems_battle 10.6):
// right after グソっ君 joins, he teaches the inputs of chapter 1 on his
// cardboard 練習台, one at a time — 「海の 中では 敵なしやったんや。戦い方、
// 教えたるわ」. Each lesson waits until the player gets it (he only cheers
// them on). The last one is the other way round: he says 「とどめや！」, and
// しゅん shows him 『みました』 — 「……倒さんで ええんか？ 見たったら ええんか。
// ……おもろいな、それ」 (★2026-09-29 依頼主の指示で カネナリくん→グソっ君。
// フリップは やめて、関西弁で ふつうに 話す。04_gusokkun_plan 2章 5).
//
// In battle his lines go in the message band with his name tag (battle/
// gusokkun.ts): a page ≤ 2 lines, each ≤ 298px (the tag takes the band's left
// margin). `touch` variants replace a page on phones and tablets (the button
// is labelled けってい there).

/** Field: before the battle (after 「グソっ君が 仲間に なった！」 and the walk-in). */
export const LESSON_FIELD = {
  /** The first time: no choice, the lesson starts. */
  open: `@npc_kanenari
海の 中では 敵なしやったんや。{w=300}
戦い方、教えたるわ。
/
練習台も 作っといたで。{w=300}
ダンボールやけどな。`,
  /** On a device where chapter 1 has been cleared: the lesson can be skipped. */
  openAgain: `@npc_kanenari
海の 中では 敵なしやったんや。{w=300}
戦い方、教えたろか？
? 教わる | 知ってる`,
  ready: `@npc_kanenari
ほな、練習台で やってみよか。{w=300}
ダンボールやけどな。`,
  skip: `@npc_kanenari
なんや、知っとるんか。{w=300}
……ちょっと さみしいわ。`,
};

/** グソっ君's lines in the battle (his name tag on the band; each page waits for 決定). */
export const TALK = {
  intro: ['4つ、教えたるわ。\nすぐ 終わるで。'],
  // ① たたく — the ring
  tataku: ['まずは『たたく』や。\n輪が ちぢんで 重なったら 決定！'],
  tatakuOk: ['ええ音や！\nその 調子やで。'],
  tatakuEarly: ['ちょっと はやいな。\n輪が 重なるまで 待ってや。'],
  tatakuLate: ['おしい！\n輪が 重なった ときに 決定や。'],
  // ② ハンコ — hold and let go
  hanko: ['つぎは『ハンコ』や。\n『ペケ』を 押して みい。', '決定を 長押しして、\n赤い とこで はなすんや！'],
  hankoTouch: ['つぎは『ハンコ』や。\n『ペケ』を 押して みい。', 'けっていを 長押しして、\n赤い とこで はなすんや！'],
  hankoOk: ['くっきりや！ 大成功やな。\n朱肉は 使うと へるで。'],
  hankoNg: ['おしい！ 赤い とこで\nはなしたら くっきりや。'],
  // ③ ツッコミ — the "!"
  tsukkomi: ['つぎは『ツッコミ』や。\n練習台が ボケるで。', '『！』が 出たら すぐ 決定！\nダメージが 半分に なるんや。'],
  tsukkomiOk: ['ナイス ツッコミ！\nキレも たまるで。'],
  tsukkomiEarly: ['はやすぎや！\n『！』が 出てから 決定やで。'],
  tsukkomiLate: ['おしい！\n『！』が 出たら すぐ 決定や。'],
  /** From the third try the wind-up stops at the "!" until the press. */
  tsukkomiWait: ['こんどは『！』で 止めたるわ。\nゆっくりで ええで。'],
  // ④ みました — しゅん teaches him this one
  mimashita: ['ほな さいごは、とどめや！\n思いっきり いったれ！'],
  mimashitaOk: ['……HPも 弱点も 見えとる。\nまもりも 下がったな。', '……倒さんで ええんか？\n見たったら ええんか。', '……おもろいな、それ。'],
  // the end
  end: ['ごうかくや！\n練習台も よろこんどるで。'],
};

/** Narration in the band (no tag): しゅん answers 「とどめや！」 with the みました hanko. */
export const LESSON_NARR = {
  mimashita: ['しゅんは 首を ふって、\n『みました』の ハンコを 見せた。'],
};

/** The band while the command is chosen (2 lines, ≤ 336px). */
export const LESSON_HINT = {
  tataku: '『たたく』を えらんで 決定！',
  hanko: '『ハンコ』→『ペケ』を えらんで 決定！',
  mimashita: '『ハンコ』→『みました』を\nえらんで 決定！',
};

/** The band at the start and the end. */
export const LESSON_BAND = {
  end: ['練習は おしまい！'],
};

/** Widest line of a page he says in battle (the name tag takes the band's left margin). */
export const TALK_W = 298;

/**
 * The width check of every page (wrapCheck): the field's pages ≤ 3 lines ×
 * 336px; his lines in the band ≤ 2 × TALK_W; the band's own ≤ 2 × 336px.
 */
export function lessonTextIssues(width: (line: string) => number): { checked: number; issues: string[] } {
  const pages: { where: string; lines: string[]; max: number; w: number }[] = [];
  for (const [k, v] of Object.entries(LESSON_FIELD))
    for (const pg of v.split('\n/\n')) {
      const lines = pg.split('\n').filter((l) => !l.startsWith('@'));
      const choice = lines.filter((l) => l.startsWith('? '));
      pages.push({ where: `練習 フィールド ${k}`, lines: lines.filter((l) => !l.startsWith('? ')).map((l) => l.replace(/\{[^}]*\}/g, '')), max: 3, w: 336 });
      for (const c of choice) for (const opt of c.slice(2).split('|')) pages.push({ where: `練習 選択肢 ${k}`, lines: [opt.trim()], max: 1, w: 336 });
    }
  for (const [k, v] of Object.entries(TALK)) for (const pg of v) pages.push({ where: `練習 グソっ君 ${k}`, lines: pg.split('\n'), max: 2, w: TALK_W });
  for (const [k, v] of Object.entries(LESSON_NARR)) for (const pg of v) pages.push({ where: `練習 帯 ${k}`, lines: pg.split('\n'), max: 2, w: 336 });
  for (const [k, v] of Object.entries(LESSON_HINT)) pages.push({ where: `練習 帯 ${k}`, lines: v.split('\n'), max: 2, w: 336 });
  for (const [k, v] of Object.entries(LESSON_BAND)) for (const pg of v) pages.push({ where: `練習 帯 ${k}`, lines: pg.split('\n'), max: 2, w: 336 });
  const issues: string[] = [];
  for (const p of pages) {
    if (p.lines.length > p.max) issues.push(`${p.where}: ${p.lines.length}/${p.max} lines: ${p.lines.join('／')}`);
    for (const l of p.lines) if (width(l) > p.w) issues.push(`${p.where}: ${width(l)}px > ${p.w}: ${l}`);
  }
  return { checked: pages.length, issues };
}
