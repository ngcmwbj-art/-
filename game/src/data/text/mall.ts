// 8.12 fushigi_12 回転焼き機 (evt_kaitenyaki), 10_narrative.md.

// QA rounds 2–3 (tempo): the exchange is kept to about half of the book's
// pages — the same beats, fewer windows.

/** One page: the three names come as the choice after the stamp. */
export const KAITENYAKI_SEEN = `@narr
回転焼き機が 回り続けている。{w=300}
鉄板の 上で、小さな カギも いっしょに。{w=500}
だれも 名前を 決めて くれなかったから。`;

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

/** The stamp's result and the key, one window (the key rolls off the plate just before it). */
export const KAITENYAKI_KEY = (count: number): string => `@sys
朱肉が 2 たまった。
みました帳に 書きこんだ。（ふしぎ ${count}/12）
迷子センターの鍵を 手に入れた！`;

/** グソっ君: one window (回転焼き派 — and whether しゅん picked the same name). */
export const KAITENYAKI_FLIP = (agree: boolean): string => `@npc_kanenari
${agree ? '回転焼き！{w=300}わいも そう 呼ぶで。' : 'わいは 回転焼き派や。{w=300}'}
……食うたこと、ないけどな。`;


/** The 『ふしぎな 深海生物展』 poster in M2's corner: グソっ君's word, once (it answers nothing). */
export const DEEPSEA_POSTER_KANENARI = `@npc_kanenari
…………。{w=500}
……なんか、なつかしい 気ぃ するわ。`;

export const KAITENYAKI_AGAIN = (name: string): string => `@narr
回転焼き機は 止まっている。{w=300}
焼き型に 小さく、
『${name}』と 刻まれている。`;

export const YAKINAMES = ['今川焼き', '大判焼き', '回転焼き'];
export const YAKINAMES_KANA = ['イマガワヤキ。', 'オオバンヤキ。', 'カイテンヤキ。'];
