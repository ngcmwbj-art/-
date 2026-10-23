'use strict';
/* =========================================================
   カードの一覧
   - キー（weeding など）がカードID。保存データで使うので後から変えない
   - type：attack 攻撃 / skill 守り / crop 作物 / growth 成長 / power 常時（使うとこの戦闘の間ずっと効く）
   - rarity：basic 初期 / common / uncommon / rare（報酬の出やすさ）
   - pool：出てくる農家タイプ（'common' は全員）
   - needs：使う条件。emptyPlot 空いた区画がある / ripeCrop 実った作物がある
   - effects：効果。op の種類は js/core/effects.js を参照
   - upgrade：強化したときに上書きする項目（休憩所で強化。②以降）
   - exhaust：true なら使うとこの戦闘から消える
   ========================================================= */
FR.Cards = {
  // ── 初期デッキ ──────────────────────────────
  weeding: {
    name: '除草', type: 'attack', cost: 1, rarity: 'basic', pool: ['common'], art: 'weeding',
    text: '勢いに6',
    effects: [{ op: 'damage', amount: 6 }],
    upgrade: { name: '除草+', text: '勢いに9', effects: [{ op: 'damage', amount: 9 }] }
  },
  mulch: {
    name: 'マルチ', type: 'skill', cost: 1, rarity: 'basic', pool: ['common'], art: 'mulch',
    text: '守り5',
    effects: [{ op: 'block', amount: 5 }],
    upgrade: { name: 'マルチ+', text: '守り8', effects: [{ op: 'block', amount: 8 }] }
  },
  sowKomatsuna: {
    name: '種まき', type: 'crop', cost: 1, rarity: 'basic', pool: ['vegetable'], art: 'seeds',
    text: '小松菜を植える（2段で実り、収穫で守り4・銭4）',
    needs: 'emptyPlot',
    effects: [{ op: 'plant', crop: 'komatsuna' }],
    upgrade: { name: '種まき+', cost: 0 }
  },
  harvest: {
    name: '収穫', type: 'crop', cost: 0, rarity: 'basic', pool: ['common'], art: 'basket',
    text: '実った作物をすべて収穫する',
    needs: 'ripeCrop',
    effects: [{ op: 'harvest' }],
    upgrade: { name: '収穫+', text: '実った作物をすべて収穫し、1枚引く', effects: [{ op: 'harvest' }, { op: 'draw', amount: 1 }] }
  },

  // ── 報酬で手に入るカード ─────────────────────────
  water: {
    name: '水やり', type: 'growth', cost: 1, rarity: 'common', pool: ['common'], art: 'water',
    text: '作物をすべて1段育て、1枚引く',
    effects: [{ op: 'grow', amount: 1 }, { op: 'draw', amount: 1 }],
    upgrade: { name: '水やり+', text: '作物をすべて1段育て、2枚引く', effects: [{ op: 'grow', amount: 1 }, { op: 'draw', amount: 2 }] }
  },
  birdNet: {
    name: '防鳥ネット', type: 'skill', cost: 1, rarity: 'common', pool: ['common'], art: 'net',
    text: '守り7。このターン、作物を奪われない',
    effects: [{ op: 'block', amount: 7 }, { op: 'status', target: 'self', id: 'netted', amount: 1 }],
    upgrade: { name: '防鳥ネット+', text: '守り10。このターン、作物を奪われない', effects: [{ op: 'block', amount: 10 }, { op: 'status', target: 'self', id: 'netted', amount: 1 }] }
  },
  fertilizer: {
    name: '肥料', type: 'growth', cost: 1, rarity: 'common', pool: ['vegetable', 'fruit'], art: 'fertilizer',
    text: '作物をすべて2段育てる',
    effects: [{ op: 'grow', amount: 2 }],
    upgrade: { name: '肥料+', cost: 0 }
  },
  plantTomato: {
    name: '苗の植え付け', type: 'crop', cost: 2, rarity: 'uncommon', pool: ['vegetable'], art: 'tomato',
    text: 'トマトを植える（3段で実り、収穫で勢いに10・銭10）',
    needs: 'emptyPlot',
    effects: [{ op: 'plant', crop: 'tomato' }],
    upgrade: { name: '苗の植え付け+', cost: 1 }
  },
  scarecrow: {
    name: 'かかし', type: 'attack', cost: 2, rarity: 'uncommon', pool: ['common'], art: 'scarecrow',
    text: '勢いに4。この先3ターン、毎ターン始めに勢いに4',
    effects: [{ op: 'damage', amount: 4 }, { op: 'status', target: 'self', id: 'scarecrow', amount: 3 }],
    upgrade: { name: 'かかし+', text: '勢いに6。この先4ターン、毎ターン始めに勢いに4', effects: [{ op: 'damage', amount: 6 }, { op: 'status', target: 'self', id: 'scarecrow', amount: 4 }] }
  },
  compost: {
    name: '堆肥づくり', type: 'power', cost: 1, rarity: 'rare', pool: ['vegetable', 'fruit'], art: 'compost',
    text: '地力+1（この戦闘の間、作物が育つたびに1段多く育つ）',
    effects: [{ op: 'status', target: 'self', id: 'soil', amount: 1 }],
    upgrade: { name: '堆肥づくり+', cost: 0 }
  }
};

// 種類の表示名
FR.CardTypes = {
  attack: '攻撃', skill: '守り', crop: '作物', growth: '成長', power: '常時'
};
