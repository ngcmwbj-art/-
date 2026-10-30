'use strict';
/* =========================================================
   戦闘ごとの天気（季節のボスと、1年の最初の戦闘ではかからない）
   - statuses：戦闘の始め（1ターン目の前）にかかる状態（data/statuses.js）
   - farmers：出る農家タイプ（なければ全員）。weight：出やすさ
   - 「ふつうの日」は何も起きない。霧（敵の行動が見えない）は、被害の見込みとぶつかるので入れない
   ========================================================= */
FR.Weathers = {
  normal: { name: 'ふつうの日', icon: '☁', text: '特に何もない', statuses: {}, weight: 4 },
  sunny:  { name: '晴れ', icon: '☀', text: '作物と木がよく育つ（地力+1）', statuses: { soil: 1 }, farmers: ['vegetable', 'citrus'], weight: 2 },
  calm:   { name: '小春日和', icon: '☼', text: '1ターン目、エネルギー+1', statuses: { nextEnergy: 1 }, weight: 2 },
  rain:   { name: '雨', icon: '☂', text: '1ターン目は、鳥や獣が作物を奪えない（覆い）', statuses: { netted: 1 }, farmers: ['vegetable', 'citrus'], weight: 2 },
  cool:   { name: 'すずしい日', icon: '❄', text: '家畜が落ち着いて、病気にかからない（防疫）', statuses: { immune: 1 }, farmers: ['livestock'], weight: 2 },
  wind:   { name: '強風', icon: '≋', text: '最初の2ターン、疲労（与える勢いが少し減る）', statuses: { weak: 2 }, weight: 2 }
};
