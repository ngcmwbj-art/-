// 8.12 fushigi_12 回転焼き機 (evt_kaitenyaki), 10_narrative.md.

// QA round 2 (tempo): the exchange is kept to about two thirds of the
// book's pages — the same beats, fewer windows.

export const KAITENYAKI_SEEN = `@narr
回転焼き機が 回り続けている。{w=300}
鉄板の 上で、小さな カギも
いっしょに 回っている。
/
今川焼きか、大判焼きか、回転焼きか。{w=300}
だれも 名前を 決めて くれなかった。{w=600}
だから ずっと、回っている。`;

/** The plate stops and waits for a name: the choice comes under this page. */
export const KAITENYAKI_PRESSED = `@narr
回転焼き機は、ようやく 止まった。{w=300}
焼き型が、こっちを 見ている。{w=300}
……名前を、待っている。`;

/** Its answer, one window: the name said back, then the rest. */
export const KAITENYAKI_ANSWER = (kana: string): string => `@回転焼き機:vending
${kana}{w=500}
……ソウ 呼ンデ モラエルナラ、
ナンデモ ヨカッタ。`;

export const KAITENYAKI_KEY = `@sys
迷子センターの鍵を 手に入れた！`;

/** カネナリくん's board: one window (大判焼き派 — and whether they agree). */
export const KAITENYAKI_FLIP = (agree: boolean): string => `@flip
ぼくは 大判焼き派です。
${agree ? '（気が 合いますね）' : '（でも、いい 名前です）'}`;

export const KAITENYAKI_DONE = (count: number): string => `@sys
朱肉が 2 たまった。
みました帳に 書きこんだ。（ふしぎ ${count}/12）`;

export const KAITENYAKI_AGAIN = (name: string): string => `@narr
回転焼き機は 止まっている。{w=300}
焼き型に 小さく、
『${name}』と 刻まれている。`;

export const YAKINAMES = ['今川焼き', '大判焼き', '回転焼き'];
export const YAKINAMES_KANA = ['イマガワヤキ。', 'オオバンヤキ。', 'カイテンヤキ。'];
