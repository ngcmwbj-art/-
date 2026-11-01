// Temporary engine smoke test: font rendering, PixelCanvas, particles, fx.

import type { Scene } from '../engine/game';
import { game } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { PixelCanvas } from '../engine/pixel';
import { Particles } from '../engine/particles';
import { sfx } from '../audio';
import { say, choose } from '../ui/dialog';

export class EngineTestScene implements Scene {
  private art: HTMLCanvasElement;
  private parts = new Particles();
  private t = 0;

  constructor() {
    const p = new PixelCanvas(24, 24);
    p.ellipse(12, 13, 9, 9, '#f2b33d');
    p.ellipse(10, 11, 5, 5, '#ffd873');
    p.rect(8, 11, 2, 3, '#2a1f3d');
    p.rect(14, 11, 2, 3, '#2a1f3d');
    p.outline('#2a1f3d');
    this.art = p.toCanvas();
  }

  update(dt: number): void {
    this.t += dt;
    if (game.input.pressed('menu')) {
      game.scripts.run((function* () {
        yield* say('夕方の五時になると、{c=#ffd35a}チャイム{/c}が鳴る。{w=400}\nでも今日は、{shake}なにかがおかしい。{/shake}', { name: 'ナレーション' });
        const i = yield* choose(['しらべる', 'やめておく']);
        yield* say(i === 0 ? '{wave}ふしぎな音がする……{/wave}これはとても長い文章なので自動的に改ページされるかどうかを確認するためのテストです。三行を超えたら次のページに送られるはず。' : 'やめておいた。');
      })());
    }
    this.parts.update(dt);
    if (game.input.pressed('confirm')) {
      sfx('se_confirm');
      game.shake(4, 300);
      game.flash('#ffffff', 90, 0.8);
      this.parts.burst(192, 120, { count: 40, speed: [60, 220], life: [300, 700], colors: ['#fff6c8', '#ffd35a', '#ff8a3d', '#c23b5a'], gravity: 300, drag: 2, shape: 'sq', size: [1, 3], sizeEnd: 1 });
    }
  }

  draw(g: Gfx): void {
    g.clear('#1b1830');
    g.text('ゆうぐれ町は、今日もふつう。', 16, 16, { color: '#f4ecd8', shadow: '#0b0a12' });
    g.text('ABCabc 0123 「かぎかっこ」…！？', 16, 36, { color: '#9fd4ff' });
    g.text('漢字テスト：自動販売機が鳴いた。', 16, 56, { color: '#ffd35a', outline: '#3a1d2a' });
    g.img(this.art, 180, 108 + Math.round(Math.sin(this.t / 200) * 2));
    this.parts.draw(g);
  }
}
