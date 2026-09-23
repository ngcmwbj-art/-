// Script registry (NPC talk, examine, triggers, cutscenes). Scenario code
// registers generator functions by id; map objects refer to them by id.
import type { Co } from '../engine/co';

export interface ScriptCtx {
  /** Id of the object / NPC / trigger that started the script. */
  source: string;
  /** Map id where it started. */
  map: string;
  /** The default text of the source (if any), for scripts that wrap it. */
  defaultText?: string;
  /** Run the default behaviour (placement text / fushigi flow) from inside a script. */
  runDefault(): Co;
}

export type ScriptFn = (ctx: ScriptCtx) => Co;

const scripts = new Map<string, ScriptFn>();

export function registerScript(id: string, fn: ScriptFn): void {
  scripts.set(id, fn);
}

export function hasScript(id: string): boolean {
  return scripts.has(id);
}

export function getScript(id: string): ScriptFn | undefined {
  return scripts.get(id);
}

export function scriptIds(): string[] {
  return [...scripts.keys()];
}
