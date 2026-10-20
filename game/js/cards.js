// 量子カード：台風一過ごとに 3 枚から 1 枚選ぶ強化（同じカードは 1 回だけ）
export const CARDS = [
  { id: 'reach', mark: '〜', name: '遠鳴り', text: 'ギターの音波が 4 割遠くまで届く' },
  { id: 'loud', mark: '♪', name: '轟音', text: 'ギターの音波の威力 +30%' },
  { id: 'thunder', mark: 'ϟ', name: '観測の雷', text: '観測すると、正体の見えた敵に雷が落ちる' },
  { id: 'replant', mark: '❀', name: '豊作の種', text: 'キャベツの植え直しが無料になる' },
  { id: 'amp', mark: '◎', name: '大音量アンプ', text: 'スピーカーの威力 +50%' },
  { id: 'warpwave', mark: '⇢', name: 'トンネル衝撃', text: 'テレポした先で衝撃波が出る' },
  { id: 'income', mark: 'Q', name: '量子のゆらぎ', text: 'Qビットが自然に増える速さ 2 倍' },
  { id: 'bind', mark: '◇', name: '強い結界', text: '結界が広く（24m）長く（4 秒）なる' },
  { id: 'solo', mark: '★', name: 'ソロの才能', text: 'ソロゲージが 5 割早くたまる' },
  { id: 'tough', mark: '▲', name: '根性キャベツ', text: 'キャベツが受ける被害 −20%' },
];

export function drawCards(owned, n = 3) {
  const pool = CARDS.filter((c) => !owned.has(c.id));
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, n);
}
