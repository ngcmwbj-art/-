// Scene registry + first scene selection. `?scene=<name>` jumps straight to
// a registered scene (QA). Modules register their scenes on import.

import type { Scene } from './engine/game';
import { EngineTestScene } from './scenes/engine-test';

type Factory = (params: URLSearchParams) => Scene | Promise<Scene>;
const registry = new Map<string, Factory>();

export function registerScene(name: string, f: Factory): void {
  registry.set(name, f);
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
