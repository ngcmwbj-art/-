'use strict';
/* =========================================================
   状態（プレイヤーにかかるもの）
   - 数字はスタック（重ねがけの数）
   - turnStart(b, n)：ターン開始時に起きること
   - clearAtTurnEnd：ターン終了でなくなる
   ========================================================= */
FR.Statuses = {
  soil:       { name: '地力', text: '作物と木が育つたびに、この数だけ多く育つ' },
  scarecrow:  { name: 'かかし', text: '毎ターン始めに勢いに4。残りターン数',
                turnStart(b) { b.fx.push({ kind: 'note', text: 'かかしが追い払う' }); FR.Battle.damageEnemy(b, 4); b.statuses.scarecrow--; } },
  netted:     { name: '覆い', text: 'このターン、作物と実を奪われない', clearAtTurnEnd: true },
  greenhouse: { name: 'ハウス', text: '毎ターン始めに、この数だけ守り',
                turnStart(b, n) { FR.Battle.gainBlock(b, n); } },
  dawnBlock:  { name: '備え', text: '次のターン始めに、この数だけ守り',
                turnStart(b, n) { FR.Battle.gainBlock(b, n); b.statuses.dawnBlock = 0; } },
  cover:      { name: '草生', text: '毎ターン始めに守り2＋木1本につき守り2（×この数）',
                turnStart(b, n) { FR.Battle.gainBlock(b, n * (2 + 2 * FR.Battle.treeCount(b))); } },
  rhythm:     { name: '段取り', text: '1ターンに3枚目・6枚目…のカードを使うたび、この数だけ引く' },
  contract:   { name: '契約', text: '出荷の銭が1.5倍（重ねるとさらに0.5倍ずつ）' },
  immune:     { name: '防疫', text: '家畜が病気にかからない' },
  bigFruit:   { name: '摘果', text: '次に実を収穫するとき、実1つごとの効果が2倍' },
  ripening:   { name: '完熟', text: '実1つごとの銭+3・守り+2（×この数）' }
};
