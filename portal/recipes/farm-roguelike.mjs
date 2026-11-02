// 追い返せ！ボクらの防農作戦！
// タイトルを撮る → はじめから → 畜産農家 → 最初の戦い（群れ鴉）
// 録画：案内を閉じ、子牛導入 → 追い払う → 柵 の順にカードを上へ引っぱって使い、ターン終了して敵の番まで
// 乱数は固定なので、手札と敵は毎回同じ

/** 手札から名前でカードを探し、上へ引っぱって離して使う（ゲームの説明にある操作） */
async function play(h, name) {
  const card = h.page.locator('#hand .card.playable', { hasText: name }).first();
  if (!(await card.count())) return false;
  const box = await card.boundingBox();
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await h.page.mouse.move(x, y);
  await h.page.mouse.down();
  for (let i = 1; i <= 6; i++) { await h.page.mouse.move(x, y - 45 * i); await h.frames(1); }
  await h.page.mouse.up();
  await h.frames(10);
  return true;
}

export default {
  viewport: { width: 960, height: 600 },
  async run(h) {
    await h.until(() => [...document.querySelectorAll('button')].some((b) => b.offsetParent && b.textContent.includes('はじめから')));
    await h.settle(500);
    await h.still('title');
    await h.ready();
    await h.click('はじめから'); await h.settle(800);
    await h.click('畜産農家'); await h.settle(800);
    await h.click('.map-choice'); await h.settle(1500);
    await h.frames(4);
    await h.click('飛ばす');                // はじめての戦闘の案内を閉じる
    await h.frames(6);
    await play(h, '子牛導入');
    await play(h, '追い払う');
    await play(h, '柵');
    await h.click('ターン終了');
    await h.frames(24);                     // 敵（鴉）の番
  },
};
