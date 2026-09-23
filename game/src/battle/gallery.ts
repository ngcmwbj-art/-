// QA gallery for enemy battle art: ?scene=enemies[&id=<enemy_id>][&zoom=2]

import type { Scene } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { enemyArt, enemyArtIds, type EnemyView } from '../art/enemies';
import { desaturate } from '../art/enemies/lib';

export class EnemyGalleryScene implements Scene {
  private t = 0;
  private ids: string[];
  private zoom: number;
  /** Skip the first N gallery poses (QA paging at high zoom). */
  private from: number;

  constructor(params: URLSearchParams) {
    const id = params.get('id');
    this.ids = id ? id.split(',') : enemyArtIds();
    this.zoom = Math.max(1, Number(params.get('zoom') ?? '1'));
    this.from = Math.max(0, Number(params.get('from') ?? '0'));
  }

  update(dt: number): void {
    this.t += dt;
  }

  draw(g: Gfx): void {
    // sunset-ish backdrop bands so contrast can be judged
    const bands = ['#F7C27A', '#F2894B', '#D9728A', '#7A5AA0', '#3A2B5C'];
    for (let i = 0; i < bands.length; i++) g.rect(0, Math.floor((i * 216) / bands.length), 384, Math.ceil(216 / bands.length), bands[i]);
    let x = 4;
    let y = 4;
    let rowH = 0;
    const z = this.zoom;
    for (const id of this.ids) {
      const art = enemyArt(id);
      if (!art) continue;
      const poses = [...art.gallery, { pose: 'idle', flags: { bokemake: 1 } }].slice(this.from);
      for (const gp of poses) {
        const v: EnemyView = { pose: gp.pose, t: gp.t ?? this.t % 1000, gt: this.t, skill: gp.skill, hpRate: 1, flags: gp.flags ?? {} };
        let c = art.frame(v);
        if (gp.flags?.bokemake) c = desaturate(c, 0.4);
        const w = c.width * z;
        const h = c.height * z;
        if (x + w > 384) {
          x = 4;
          y += rowH + 4;
          rowH = 0;
        }
        g.rect(x - 1, y - 1, w + 2, h + 2, '#00000022');
        art.under?.(g, x, y, v);
        g.ctx.drawImage(c, x, y, w, h);
        if (z === 1) art.over?.(g, x, y, v);
        x += w + 4;
        rowH = Math.max(rowH, h);
      }
      if (z === 1) {
        const r = art.restored();
        g.img(r, x, y + rowH - r.height);
        x += r.width + 8;
      }
    }
  }
}
