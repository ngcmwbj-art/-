// 絵だけを 見る（改善会議 2026-10-28 の3）：会話の あいだに「メニュー」で 会話の 窓を 消している。
// 窓（ui/dialog.ts）が 立てて、HUD（world/hud.ts）・頭の上の 印（hd2d/index.ts）・ほかの Widget
// （吹き出し・知らせ。engine/game.ts）・寄り道の 札（ui/hud.ts）が 見て 消える。消している あいだは
// どこに タッチしても「戻す」（engine/touch.ts）。
export const viewOnly = { on: false };
