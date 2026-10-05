#!/usr/bin/env python3
"""game/ の AI 作業環境の設定ファイルを検査する（追加の依存なし）。

使い方
  python3 .claude/hooks/check_setup.py --report   人が読む結果を出す（問題があれば終了コード 1）
  python3 .claude/hooks/check_setup.py            Stop Hook として動く（stdin の JSON を読む）

Stop Hook のとき
  - stop_hook_active が true なら、何もせずに終わる（もう一度止めない）。
  - 問題があれば {"decision": "block", "reason": "..."} を出す。問題が無ければ何も出さない。
  - ネットにつながない。ファイルを書きかえない。対象はこのファイルから見た game/ の決まったファイルだけ。
"""
import json
import os
import re
import select
import sys
import time
from pathlib import Path

BASE = Path(__file__).resolve().parents[2]  # game/

REQUIRED = [
    "AGENTS.md",
    "CLAUDE.md",
    "docs/ai/context.md",
    "docs/ai/checks.md",
    "docs/ai/setup-report.md",
    "tasks/active.md",
    "tasks/handoff.md",
    "docs/game/design.md",
    "docs/game/devices.md",
    "docs/game/bugs.md",
    "docs/video/specs.md",
    "video/03_assets/sources.md",
    "docs/note/style.md",
    ".claude/settings.json",
    ".claude/agents/project-reviewer.md",
]
SKILLS = ["project-work", "project-check", "game-dev", "video-produce", "note-write"]
RULES = ["game.md", "video.md", "note.md"]
SECRET_DENY = ["Read(**/.env)", "Edit(**/.env)"]
REVIEWER_TOOLS = {"Read", "Grep", "Glob"}
HOOK_SCRIPT = "check_setup.py"
MAX_IMPORT_HOPS = 4


def read_stdin(limit=2.0):
    """stdin の JSON を読む。来ない・閉じない・壊れているときは {} を返す。"""
    if sys.stdin is None or sys.stdin.isatty():
        return {}
    fd = sys.stdin.fileno()
    buf = b""
    deadline = time.monotonic() + limit
    while len(buf) < 1_000_000:
        left = deadline - time.monotonic()
        if left <= 0:
            break
        ready, _, _ = select.select([fd], [], [], left)
        if not ready:
            break
        chunk = os.read(fd, 65536)
        if not chunk:
            break
        buf += chunk
    try:
        data = json.loads(buf.decode("utf-8") or "{}")
        return data if isinstance(data, dict) else {}
    except (ValueError, UnicodeDecodeError):
        return {}


def frontmatter(path):
    """先頭が --- の YAML の、かんたんな key: value と key: のあとの - リストだけ読む。"""
    text = path.read_text(encoding="utf-8")
    lines = text.split("\n")
    if not lines or lines[0].strip() != "---":
        return None
    out, key = {}, None
    for line in lines[1:]:
        if line.strip() == "---":
            return out
        m = re.match(r"^([A-Za-z][\w-]*):\s*(.*)$", line)
        if m:
            key, val = m.group(1), m.group(2).strip()
            out[key] = val.strip("\"'") if val else []
        elif key and re.match(r"^\s+-\s+", line) and isinstance(out.get(key), list):
            out[key].append(re.sub(r"^\s+-\s+", "", line).strip().strip("\"'"))
    return None  # 閉じの --- が無い


def imports_of(path):
    """行全体が @path の import を返す（コードブロックの中は数えない）。"""
    found, fence = [], False
    for line in path.read_text(encoding="utf-8").split("\n"):
        if line.lstrip().startswith("```"):
            fence = not fence
            continue
        m = re.match(r"^@(\S+)\s*$", line)
        if m and not fence:
            found.append(m.group(1))
    return found


def check():
    errors, notes = [], []

    for rel in REQUIRED:
        if not (BASE / rel).is_file():
            errors.append(f"必須ファイルが無い：{rel}")

    # settings.json
    settings = {}
    for name in ("settings.json", "settings.local.json"):
        p = BASE / ".claude" / name
        if not p.is_file():
            continue
        try:
            data = json.loads(p.read_text(encoding="utf-8"))
            if name == "settings.json":
                settings = data if isinstance(data, dict) else {}
        except ValueError as e:
            errors.append(f".claude/{name} の JSON が壊れている：{e}")
    if settings:
        dump = json.dumps(settings)
        perms = settings.get("permissions", {}) if isinstance(settings.get("permissions"), dict) else {}
        if "bypassPermissions" in dump or "dangerously" in dump:
            errors.append(".claude/settings.json に権限を外す設定がある（bypassPermissions など）")
        for rule in perms.get("allow", []) or []:
            if rule in ("Bash", "Bash(*)", "Bash(**)"):
                errors.append(f".claude/settings.json の allow に Bash 全許可がある：{rule}")
        deny = perms.get("deny", []) or []
        for rule in SECRET_DENY:
            if rule not in deny:
                errors.append(f".claude/settings.json の deny に {rule} が無い")
        if len(deny) != len(set(deny)):
            errors.append(".claude/settings.json の deny に重複がある")
        stops = (settings.get("hooks", {}) or {}).get("Stop", []) or []
        cmds = [h.get("command", "") for grp in stops for h in (grp.get("hooks", []) or [])]
        n = sum(HOOK_SCRIPT in c for c in cmds)
        if n == 0:
            errors.append("Stop Hook に check_setup.py が登録されていない")
        elif n > 1:
            errors.append(f"Stop Hook に check_setup.py が {n} 回登録されている（重複）")
        for grp in stops:
            for h in grp.get("hooks", []) or []:
                if HOOK_SCRIPT in h.get("command", "") and not h.get("timeout"):
                    errors.append("Stop Hook の check_setup.py に timeout が無い")

    # @import：行き先・重複・循環
    def walk(path, chain):
        if len(chain) > MAX_IMPORT_HOPS + 1:
            errors.append(f"@import が {MAX_IMPORT_HOPS} 段をこえている：{' → '.join(chain)}")
            return
        targets = imports_of(path)
        if len(targets) != len(set(targets)):
            errors.append(f"{path.relative_to(BASE)} に同じ @import が2回以上ある")
        for t in targets:
            tp = (path.parent / t).resolve()
            label = str(tp.relative_to(BASE)) if tp.is_relative_to(BASE) else str(tp)
            if not tp.is_file():
                errors.append(f"{path.relative_to(BASE)} の @{t} の行き先が無い")
            elif label in chain:
                errors.append(f"@import が循環している：{' → '.join(chain + [label])}")
            else:
                walk(tp, chain + [label])

    for top in ("CLAUDE.md", "AGENTS.md"):
        if (BASE / top).is_file():
            walk(BASE / top, [top])
    if (BASE / "CLAUDE.md").is_file() and "AGENTS.md" not in imports_of(BASE / "CLAUDE.md"):
        errors.append("CLAUDE.md が @AGENTS.md を読みこんでいない")
    if (BASE / "AGENTS.md").is_file():
        n = len((BASE / "AGENTS.md").read_text(encoding="utf-8").splitlines())
        notes.append(f"AGENTS.md は {n} 行（目安 60〜100 行）")

    # Skills
    seen = {}
    for name in SKILLS:
        p = BASE / ".claude" / "skills" / name / "SKILL.md"
        if not p.is_file():
            errors.append(f"Skill が無い：.claude/skills/{name}/SKILL.md")
            continue
        fm = frontmatter(p)
        if fm is None:
            errors.append(f"Skill {name} の frontmatter が無い・閉じていない")
            continue
        if fm.get("name") != name:
            errors.append(f"Skill {name} の name がフォルダ名と違う：{fm.get('name')}")
        if not fm.get("description"):
            errors.append(f"Skill {name} に description が無い")
        if str(fm.get("disable-model-invocation", "")).lower() not in ("true", "yes", "on", "1"):
            errors.append(f"Skill {name} が disable-model-invocation: true になっていない")
        if "allowed-tools" in fm:
            errors.append(f"Skill {name} に allowed-tools がある（承認を省略しない方針）")
        if fm.get("name") in seen:
            errors.append(f"Skill の name が重複：{fm.get('name')}")
        seen[fm.get("name")] = name

    # サブエージェント
    p = BASE / ".claude" / "agents" / "project-reviewer.md"
    if p.is_file():
        fm = frontmatter(p)
        if fm is None:
            errors.append("project-reviewer の frontmatter が無い・閉じていない")
        else:
            if fm.get("name") != "project-reviewer":
                errors.append("project-reviewer の name が違う")
            if not fm.get("description"):
                errors.append("project-reviewer に description が無い")
            tools = fm.get("tools")
            tools = set(tools) if isinstance(tools, list) else {t.strip() for t in str(tools or "").split(",") if t.strip()}
            if not tools:
                errors.append("project-reviewer に tools が無い（省略すると全部の道具を受け継ぐ）")
            elif not tools <= REVIEWER_TOOLS:
                errors.append(f"project-reviewer の tools に読むだけでない物がある：{sorted(tools - REVIEWER_TOOLS)}")

    # Rules
    for name in RULES:
        p = BASE / ".claude" / "rules" / name
        if not p.is_file():
            errors.append(f"ルールが無い：.claude/rules/{name}")
            continue
        fm = frontmatter(p)
        if not fm or not isinstance(fm.get("paths"), list) or not fm["paths"]:
            errors.append(f".claude/rules/{name} に paths が無い（常に読みこまれてしまう）")

    return errors, notes


def main():
    if "--report" in sys.argv:
        errors, notes = check()
        print(f"対象：{BASE}")
        for n in notes:
            print(f"  情報：{n}")
        if errors:
            for e in errors:
                print(f"  NG：{e}")
            print(f"結果：問題 {len(errors)} 件")
            return 1
        print("結果：問題なし")
        return 0

    data = read_stdin()
    if data.get("stop_hook_active") is True:
        return 0  # すでに Hook で続けている最中は、もう一度止めない
    errors, _ = check()
    if errors:
        shown = errors[:10]
        more = f"（ほか {len(errors) - 10} 件）" if len(errors) > 10 else ""
        reason = (
            "game/ の AI 作業環境の設定に問題があります。直してから終えてください"
            "（python3 .claude/hooks/check_setup.py --report で一覧）：\n- "
            + "\n- ".join(shown)
            + more
        )
        print(json.dumps({"decision": "block", "reason": reason}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
