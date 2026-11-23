// Scene registry + first scene selection. `?scene=<name>` jumps straight to
// a registered scene (QA). Modules register their scenes on import.

import type { Scene } from './engine/game';
import { EngineTestScene } from './scenes/engine-test';

type Factory = (params: URLSearchParams) => Scene | Promise<Scene>;
const registry = new Map<string, Factory>();

export function registerScene(name: string, f: Factory): void {
  registry.set(name, f);
}

/** Build a registered scene by name (null if nothing is registered under it). */
export async function createScene(name: string, params: URLSearchParams = new URLSearchParams()): Promise<Scene | null> {
  const f = registry.get(name);
  return f ? f(params) : null;
}

export function sceneNames(): string[] {
  return [...registry.keys()];
}

registerScene('engine-test', () => new EngineTestScene());

export async function firstScene(): Promise<Scene> {
  const params = new URLSearchParams(location.search);
  const name = params.get('scene') ?? 'title';
  const f = registry.get(name) ?? registry.get('title') ?? registry.get('engine-test')!;
  return f(params);
}
