---
name: game-portal
description: 自作ブラウザゲームの一覧ポータル（portal/）を更新する。「ゲームを1本追加して」「ポータルを更新して」「プレビューを撮り直して」「ゲーム一覧を作り直して」などと言われたときに使う。games.json への追記 → 検証 → プレビュー録画 → 一覧ページ生成 → レビュー → QC までを順に回す。
---

# ゲーム一覧ポータルの更新

ポータルの仕組みは `portal/` にある。**題材データ（games.json）を差し替えるだけで、検証・プレビュー録画・ページ生成・QC が回る**ようになっている。

```
portal/
  games.json            ← 題材データ（ゲーム1本＝1件）。ここを直す
  link-registry.json    ← Claude の Artifact 一覧の写し（claude.ai/artifact の URL の実在確認に使う）
  recipes/<id>.mjs      ← プレビューの撮り方（ゲームごとの操作手順）
  scripts/validate.mjs  ← 3. 検証（NG なら終了コード1。描画に進まない）
  scripts/prepare.mjs   ← ゲームのソースを git から .work/ に取り出してビルド（ゲーム本体は書き換えない）
  scripts/capture.mjs   ← 4. プレビュー録画（時計を止めて1コマずつ撮る。乱数固定。--verify で再現性を確認）
  scripts/build.mjs     ← 5. 一覧ページ生成（dist/）
  scripts/review.mjs    ← 6. PC・タブレット・スマホ幅のスクリーンショットと、はみ出しの機械検査（review/）
  scripts/qc.mjs        ← 7. QC（リンク・再生・JSON と表示の一致・重さ・絞り込み）
  dist/                 ← できあがり（index.html 単体ページ、embed.html 組み込み用、previews/）
```

## 守ること

- **推測で書かない。** 題名・遊び方・ジャンル・URL は、README・画面の表示・メタ情報・作者の言葉など、確かめられたものだけ。確かめられないものは `unverified` に「未確認」と書く（validate.mjs が注意として出す）
- **ゲーム本体のコードを書き換えない。** 撮れないときも手順書（recipes/）の側で工夫する。どうしても本体の変更が必要なら、変更前に必ずユーザーに聞く
- **検証と QC を飛ばして「完成」と言わない。** `validate.mjs` と `qc.mjs` が両方 OK になるまで終わりにしない
- 返事は日本語で、専門用語を避けて分かりやすく。各ステップで「成果物のパス・登録ゲームの表（タイトル／状態／プレビュー有無）・確認結果」を短く報告する

## 前準備（新しいセッションのとき）

```sh
git fetch origin '+refs/heads/*:refs/remotes/origin/*'   # ゲームは別ブランチにもある
pip install fonttools brotli                              # しゅん（RPG）のビルドに要る
```

Playwright と Chromium は入っている（`require('playwright')`）。github.io と cdn.jsdelivr.net にはこの環境から繋がらない。
CDN の three.js などは capture.mjs が npm から同じ版を取ってきて差し替える（自動）。

## 「ゲームを1本追加して」の手順

1. **棚卸し**：そのゲームの場所（ブランチ・フォルダ）、題名、遊び方、ジャンル、起動方法を確かめる
   - `git ls-remote origin` でブランチを探し、`git show <ref>:<path>/README.md`、`index.html` の `<title>`・description を読む
   - 遊ぶ URL：GitHub Pages の公開元ブランチ（games.json の `site.pagesRef`）にあるか、Claude の Artifact（`Artifact` ツールの `action: "list"`）にあるか。
     Artifact にあれば `link-registry.json` の `artifacts` にその行を足す（URL・題名・更新日）
   - 確かめられないことは「未確認」として報告し、ユーザーに聞く
2. **games.json に追記**：
   ```json
   {
     "id": "半角英小文字とハイフン",
     "title": "題名", "tagline": "20字以内の一言", "genre": "ジャンル", "tags": ["…"],
     "url": "https://…", "themeColor": "#rrggbb（ゲームの theme-color などから）", "status": "公開中 または 開発中",
     "howToPlay": "遊び方を1文", "platform": ["スマホ", "PC"],
     "source": { "ref": "origin/<branch>", "path": "<フォルダ>", "build": ["必要ならビルドの命令"], "serve": "開く場所（フォルダからの相対。そのままなら .）", "entry": "index.html" },
     "preview": { "recipe": "recipes/<id>.mjs" },
     "unverified": ["確かめられなかったこと"]
   }
   ```
3. **手順書を書く**：`recipes/<id>.mjs`（下の「手順書の書き方」）
4. **検証**：`node portal/scripts/validate.mjs` — NG があれば直す。OK になるまで先に進まない
5. **取り出し**：`node portal/scripts/prepare.mjs <id>`
6. **録画**：`node portal/scripts/capture.mjs <id> --verify`
   - 撮れた映像を必ず目で見る：`.work/_capture/<id>/a/frames/` から数枚を並べた画像を作って Read で確認（死んで終わっていないか、何も起きていない映像になっていないか）
   - 「再現性 n/n コマ一致」が出る。一致しない場合は原因を調べる（乱数・時刻・入力のタイミング）
   - 録れなかったときは自動で静止画＋パララックスになる（記録の `mode: "still"` と `note`）。それで良いかユーザーに伝える
7. **ページ生成**：`node portal/scripts/build.mjs`
8. **レビュー**：`node portal/scripts/review.mjs` → `portal/review/pc.png`・`sp.png`・`cards-*.png` を Read で見て、崩れ・はみ出し・プレビューの中身を確かめる。直したら 7 からやり直す
9. **QC**：`node portal/scripts/qc.mjs` — 全項目 ✓ になるまで直す
10. **報告**：成果物のパス、登録ゲームの表、検証・QC の結果、「この環境では確かめられないこと」

全部まとめて回すとき：`cd portal && npm run all`（ただし録画は重いので、変えたゲームだけ `capture.mjs <id>` で撮るのがふつう）

## 手順書（recipes/<id>.mjs）の書き方

```js
export default {
  viewport: { width: 800, height: 500 }, // 16:10 にすると切り抜きなしでカードに収まる
  // fps: 12.5,          // 既定。1コマ80ms＝描画周期16msのちょうど5倍（割り切れない値だとコマごとに時刻がずれる）
  // fit: 'contain',     // 縦長の画面（スマホ向けのゲーム）は、ぼかした背景の上に全体を収める
  // webgl: true,        // WebGL（three.js など）を使うゲーム。ソフトウェア描画のブラウザで撮る（遅い）
  // raf: 'frame',       // 重い 3D：1コマに1回だけ描く（待ち時間中は300msに1回）
  // seed: 20261101,     // Math.random の種
  // readyAt: 30000,     // 3D：開いてから何 ms（ゲーム内時刻）で録り始めるかを固定
  // pointerLock: 'emulate', // クリックでマウスを固定するゲーム：撮影時は即時に固定された扱いに（'off' で固定させない）
  // block: [/example\.com/], // 外部への送信を止める
  async run(h) {
    await h.until(() => /* 読み込み完了の条件（ページ内で評価） */ true);
    await h.still('title');   // 最初の静止画がポスター（動画の前に出る絵）になる
    await h.ready();          // ここから先を毎回同じにする（乱数を戻し、ゲーム内時刻を1秒ちょうどに揃える）
    await h.click('はじめる'); // 文字列ならその文字のある要素、#/. で始まればセレクタ
    await h.frames(30);       // 30コマ録る（12.5fps で 2.4秒）
    await h.key('Space');     // h.down / h.up で長押し、h.page.mouse でドラッグ
    await h.frames(40);
  },
};
```

- 合計 5〜7 秒（60〜90 コマ）を目安。最後は「死んで終わり」にしない
- `h.eval(fn, arg)` でページの状態を読める（盤面を読んで置き場所を計算する、など）。ゲームの変数を書き換えることはしない
- ゲームに QA 用の仕組み（デモモード、シード指定、1コマずつ進める API）があれば使う（例：しゅんの `__game.pause()`／`__game.advance(ms)`）
- `h.clip = {x, y, width, height}` で撮る範囲を絞れる
- 撮影時は localStorage を空にしてから開く（毎回「はじめて遊ぶ人」の状態）。ゲームのデータは消えない（撮影用のブラウザの中だけ）

## よくある詰まり

| 症状 | 原因と対処 |
|---|---|
| 再現性が 0/n | 準備完了前に `h.ready()` を呼んでいない／`fps` が 80ms で割り切れない |
| スクショが 30 秒で止まる | 重い WebGL。`webgl: true, raf: 'frame'` にし、画面を小さく（640×400） |
| ボタンが押せない（Timeout） | 画面外・重なり。`h.eval(() => document.getElementById('…').click())` で直接押す |
| CDN の読み込み失敗 | jsdelivr / unpkg の `npm/<pkg>@<ver>/…` 形式なら自動で差し替わる。それ以外の CDN は `capture.mjs` の `cdnFile` に足す |
| 外部への送信（ランキングなど） | 手順書の `block: [/正規表現/]` で止める（keitora の script.google.com は既定で止めている） |
| 3D で画面全体に細かな差（PSNR 30〜40dB） | 読み込みの速さで「開いてからの経過時間」が変わり、水のゆらぎ等がずれる。`readyAt: 30000` で録り始めの時刻を固定 |
| クリックの後から視点がずれる | クリックでマウスを固定（ポインターロック）する作り。`pointerLock: 'emulate'`（固定中のクリックで攻撃する作りでも動く）。録画前にマウスを中央に置いておく |
| カードなどが飛ぶ CSS の動きが少しずれる | 見つけた CSS アニメーションは 0 から進めているが、出始めのコマが1つ前後することがある（ダメージ数字など小さな部分）。目で見て同じなら可 |

## 公開について

ポータルの `dist/` は単体で開ける。GitHub Pages に載せるなら、公開元ブランチ（`site.pagesRef`）に `games/` などのフォルダとして置く。
**公開元ブランチへの push は外に出る操作なので、必ずユーザーに確認してから行う。**
