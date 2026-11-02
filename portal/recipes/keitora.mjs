// 爆走！つがおのビバベジ便！
// タイトルを撮る → 出発 → 最初の穴の手前（27コマ目）で長押しジャンプ→空中で2段ジャンプ → 水たまりを越えて約5.6秒
// 乱数は h.ready() で固定されるので、穴の位置は毎回同じ
export default {
  viewport: { width: 800, height: 500 },
  async run(h) {
    await h.until(() => [...document.querySelectorAll('button')].some((b) => b.offsetParent && b.textContent.includes('出発')));
    await h.settle(800);
    await h.still('title');
    await h.ready();
    await h.click('出発');
    await h.frames(27);
    await h.down('Space'); await h.frames(4); await h.up('Space'); // 長押しで高く跳ぶ
    await h.frames(3);
    await h.key('Space');                                          // 空中でもう一度＝2段ジャンプ
    await h.frames(36);
  },
};
