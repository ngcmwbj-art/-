// Kanenari's flip board (hand-written white board).
import { PixelCanvas } from '../../engine/pixel';

let board: HTMLCanvasElement | null = null;
export function flipBoard(): HTMLCanvasElement {
  if (board) return board;
  const p = new PixelCanvas(24, 16);
  p.rect(0, 0, 24, 16, '#F4F1E8');
  board = p.toCanvas();
  return board;
}
export function flipBoardPanel(w: number, h: number): HTMLCanvasElement {
  const p = new PixelCanvas(w, h);
  p.rect(0, 0, w, h, '#F4F1E8');
  return p.toCanvas();
}
export function flipIcon(): HTMLCanvasElement {
  const p = new PixelCanvas(10, 8);
  p.rect(0, 0, 10, 8, '#F4F1E8');
  return p.toCanvas();
}
