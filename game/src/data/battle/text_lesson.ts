// 公園の練習の戦闘 (evt_kn_lesson; 10_narrative 5.12b, 20_systems_battle 10.6):
// right after Kanenari-kun joins, he teaches the four inputs of chapter 1 on
// his cardboard 練習台, one at a time, with his flip board. Each lesson waits
// until the player gets it (the flip only cheers them on).
//
// One entry of FLIP = pages; '\n' breaks a line on the board (≤ 336px, ≤ 3
// lines — 10 1.1). `touch` variants replace a page on phones and tablets
// (the button is labelled けってい there).

/** Field: before the battle (after 「カネナリくんが 仲間に なった！」 and the walk-in). */
export const LESSON_FIELD = {
  /** The first time: no choice, the lesson starts. */
  open: `@flip
PR大使の 戦いかた 講座を
ひらきます！
/
@flip
練習台を 用意しました。
（ダンボール です）`,
  /** On a device where chapter 1 has been cleared: the lesson can be skipped. */
  openAgain: `@flip
PR大使の 戦いかた 講座を
ひらきます！
? 教わる | 知ってる`,
  ready: `@flip
練習台を 用意しました。
（ダンボール です）`,
  skip: `@flip
さすが です。
（ちょっと さみしい）`,
};

/** The flip board in the battle. */
export const FLIP = {
  intro: ['戦いかたを 4つ 教えます。\n（1分で 終わります）'],
  // ① たたく — the ring
  tataku: ['まずは『たたく』。\n輪が ちぢんで 重なったら\n決定！'],
  tatakuOk: ['いい音！\nその 調子 です。'],
  tatakuEarly: ['ちょっと はやい！\n輪が 重なるまで 待って。'],
  tatakuLate: ['おしい！\n輪が 重なった ときに 決定。'],
  // ② ハンコ — hold and let go
  hanko: ['つぎは『ハンコ』。\n『ペケ』を 押して みましょう。', '決定を 長押しして、\n赤い ところで はなす！'],
  hankoTouch: ['つぎは『ハンコ』。\n『ペケ』を 押して みましょう。', 'けっていを 長押しして、\n赤い ところで はなす！'],
  hankoOk: ['くっきり！ 大成功 です。\n（朱肉は 使うと へります）'],
  hankoNg: ['おしい！ 赤い ところで\nはなすと くっきり です。'],
  // ③ ツッコミ — the "!"
  tsukkomi: ['つぎは『ツッコミ』。\n練習台が ボケます。', '『！』が 出たら すぐ 決定！\nダメージが 半分に なります。'],
  tsukkomiOk: ['ナイス ツッコミ！\n（キレも たまります）'],
  tsukkomiEarly: ['はやすぎ！\n『！』が 出てから 決定 です。'],
  tsukkomiLate: ['おしい！\n『！』が 出たら すぐに 決定。'],
  /** From the third try the wind-up stops at the "!" until the press. */
  tsukkomiWait: ['こんどは『！』で 止めます。\n（ゆっくり どうぞ）'],
  // ④ みました
  mimashita: ['さいごは『みました』。\n相手を よく 見る ハンコ です。'],
  mimashitaOk: ['HPや 弱点が 見えて、\nまもりも 下がります。', 'こまったら『みました』。\n（見て もらえると うれしい）'],
  // the end
  end: ['ごうかく です！\n（練習台も よろこんでいます）'],
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

/**
 * The width check of every page (wrapCheck): ≤ 336px a line; the field's
 * pages and the board ≤ 3 lines, the band ≤ 2. `width` measures one line.
 */
export function lessonTextIssues(width: (line: string) => number): { checked: number; issues: string[] } {
  const pages: { where: string; lines: string[]; max: number }[] = [];
  for (const [k, v] of Object.entries(LESSON_FIELD))
    for (const pg of v.split('\n/\n')) {
      const lines = pg.split('\n').filter((l) => !l.startsWith('@'));
      const choice = lines.filter((l) => l.startsWith('? '));
      pages.push({ where: `練習 フィールド ${k}`, lines: lines.filter((l) => !l.startsWith('? ')), max: 3 });
      for (const c of choice) for (const opt of c.slice(2).split('|')) pages.push({ where: `練習 選択肢 ${k}`, lines: [opt.trim()], max: 1 });
    }
  for (const [k, v] of Object.entries(FLIP)) for (const pg of v) pages.push({ where: `練習 フリップ ${k}`, lines: pg.split('\n'), max: 3 });
  for (const [k, v] of Object.entries(LESSON_HINT)) pages.push({ where: `練習 帯 ${k}`, lines: v.split('\n'), max: 2 });
  for (const [k, v] of Object.entries(LESSON_BAND)) for (const pg of v) pages.push({ where: `練習 帯 ${k}`, lines: pg.split('\n'), max: 2 });
  const issues: string[] = [];
  for (const p of pages) {
    if (p.lines.length > p.max) issues.push(`${p.where}: ${p.lines.length}/${p.max} lines: ${p.lines.join('／')}`);
    for (const l of p.lines) if (width(l) > 336) issues.push(`${p.where}: ${width(l)}px: ${l}`);
  }
  return { checked: pages.length, issues };
}
