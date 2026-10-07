# ZASU WORKS Home Stage Two Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 本案件は同じHTML・CSSを段階的に変更するため、Native（executing-plans）を推奨する。実行方法はユーザーの承認時に確定する。

**Goal:** 写真、大きな真正実機UI、余白を中心に、VOCAL → LOUD → ¥5,980セットが伝わるトップページを仕上げる。

**Architecture:** 既存静的トップページとトップ専用CSSを変更する。商品ページ・購入後ページ・認証バックエンドは保持し、既存リンクへ誘導する。例外としてユーザー指定のセット決済URLへトップの参照を更新し、Square側の既存セット購入後リダイレクトだけを正本URLへ統一する。

**Tech Stack:** HTML / CSS / 既存vanilla JavaScript / WebP / Node.js node:test / Playwright（既存表示検証）/ GitHub Pages（本計画段階では公開しない）。

**Spec:** `docs/superpowers/specs/2026-10-07-zasuworks-home-stage-two-design.md`（設計版1.1、commit `8f1355666c7ce0a9c21236b2a1dbd6b6fe86ea93`）。2026-10-07の最新ユーザー指示により、セット決済URLは下記checkout.square.site URLを正本とする。設計版1.1の旧短縮URL保持条件に対して、この指定を優先する。

**Status:** 実装計画レビュー待ち。サイトコード・画像・テストはまだ変更しない。push・deployを行わない。Squareリダイレクト設定は実装開始前の必須前提。2026-10-07に管理画面で既に正本URL・有効状態であることを確認済み（設定変更なし／実購入遷移は未検証）。

## Global Constraints

- 順序：ZASU VOCAL → ZASU LOUD → 歌ってみた制作セット → ZASU DAW → ZASU AUDIO。
- Heroコピー：「歌を整えて、音圧を仕上げて、完成。」。黒基調、抑えたグリーン／ゴールド、大きな写真・UI・余白。
- VOCAL v1.0.0 ¥3,980、LOUD v2.0.0 ¥2,980、セット¥5,980、単品合計¥6,960、¥980お得、DAW v1.4 ¥1,980を維持。
- セット正式決済URL：`https://checkout.square.site/merchant/ML4WFCYYG84WZ/checkout/KCX5YJTJVCYOP6RC4AFYRQ5X`。
- セット購入後・再DL正本：`https://zasuworks.jp/vocal-loud-set/download/`。`/utatte-set/download/` は参照・移行先として使用しない。
- 単品Square、購入済み判定、4ファイルDL、再DL、未購入拒否、DMG／Setup.exe、Supabase、Storage、AUDIO backend、DSPは変更しない。
- 既存商品URL、再DL URL、ナビゲーションアンカー、`bundle-checkout`、`bundle-status`を維持する。
- Mobileは3〜4画面程度を目安にし、厳しいスクロール位置制限より写真・UIの判読性・余白を優先する。
- 対象幅320／375／390／768／1440px。補助文字11px以上、主要CTA実効高さ44px以上、横はみ出しなし。
- 新しい認証・購入後ページ・バックエンド・重いスクロール演出を作らない。画像は実機内容を描き替えない。
- Title／Description／canonical／OGP、商品詳細・FAQのWindows未署名案内、DAWの既存価格条件・特典を維持する。

## Review Focus

1. Square設定の保存後も旧404 URLへ遷移する条件：設定の読み戻しで正本URLとの完全一致を確認し、未確認なら実装開始を止める（Task 0）。
2. checkout.square.site URLが既存square.link用検証で拒否される条件：指定URLだけが有効化され、空・別URLは無効のままであることを確認する（Task 5）。
3. 320pxでUI表示範囲・価格・CTAが重なる条件：折り返しと画像判読性を実測・画面確認する（Task 6）。
4. 遅延画像、キーボード操作、reduced-motionで表示が欠ける条件：画像decode、フォーカス、メニュー、非アニメーション表示を確認する（Task 6）。
5. 共有CSSやリンクの変更で購入・再DLが影響を受ける条件：許可した差分の範囲、参照先、既存認証テストを確認する（Task 7）。

---

## 変更ファイルと責務

| ファイル | 予定変更と責務 |
| --- | --- |
| `index.html` | Hero・VOCAL・LOUD・フロー・セット・DAW／AUDIOの表示、セット正式URLの参照 |
| `assets/home-visual.css` | トップに限定した写真・実機UI・余白・レスポンシブ配置 |
| `assets/studio-vocalist-hero.webp`（新規） | 承認済み歌唱写真の軽量Web素材 |
| `assets/zasu-loud-v200-live.webp`（新規） | 真正v2.0.0実機撮影写真の軽量Web素材 |
| `tests/home.test.cjs` | 既存のリンク・価格・構成・画像・レスポンシブ検証の更新 |
| `tests/home-checkout.test.cjs`（新規） | セット正式URLの有効化と誤URL拒否の検証 |

既存VOCAL JPG、旧LOUD PNG、セットWebP、DAW画像は保持する。共有 `assets/brand.css`・`assets/site.css`、商品・DLページ、`supabase/`、配布物、`.github/workflows/pages.yml` は変更しない。Square側はファイル変更ではなく既存セットリンクのリダイレクト設定1項目だけを対象とする。

### Task 0: 実装開始前にSquareリダイレクトを統一

**Files:** 変更なし。検証記録だけ残す。

**Interfaces:** 消費：指定の既存セットチェックアウト。出力：保存後のリダイレクトURLが `https://zasuworks.jp/vocal-loud-set/download/` と一致する証拠。

- [x] Squareに安全にログインし、既存セットリンクを商品名「ZASU 歌ってみた制作セット」、価格¥5,980、指定チェックアウトURLで照合する。別リンクや新商品を作らない。
- [x] 既存設定が正本URL・有効状態であることを確認済み。変更・保存は不要だった。金額、商品名、決済方式、その他設定は変更していない。
- [x] 既存の編集画面に表示された設定を読み取り、正本URLとの完全一致・リダイレクト有効を確認。確認画像を保存した。実決済は実行していない。
- [x] 直前の読み取りで本番正本ページHTTP 200と両製品の既存再DLリンクを確認済み。実装開始時には再確認する。設定確認を実購入遷移確認済みとは扱わない。
- [ ] ログイン・権限・設定確認が完了しない場合、前提は未達と報告し、Task 1以降の製品実装を開始しない。計画作成・レビューは続行できる。

### Task 1: 写真中心のHero

**Files:** 新規 `assets/studio-vocalist-hero.webp`。変更 `index.html`、`assets/home-visual.css`。検証 `tests/home.test.cjs`。

**Interfaces:** 消費：承認写真 `generated_images/exec-a16412c1-8f6b-43f5-baf3-5f703a856a0a.png`。出力：既存 `.hero-photo` と `.product-jump`、既存 `#vocal`／`#loud` へつながるHero。

- [ ] 基準HEAD・作業状態を記録し、Task 0完了と計画承認を確認する。実装は専用作業ブランチで行う。
- [ ] 既存画像を残して承認写真の軽量WebPを作る。生成し直さず人物・マイクの構図を維持する。
- [ ] 主コピーをテキストで置き、Hero説明を減らす。Mobileは人物・マイク、Desktopは左余白のコピーを優先する。
- [ ] 既存ナビ・公式ZW表記・スキップリンクを保持し、Heroの主導線をVOCAL／LOUDへ絞る。
- [ ] Hero画像decode成功、h1コピー、ページ内リンク解決を既存表示検証で確認する。検証後、対象ファイルだけをcommitする。

### Task 2: VOCAL実機UIを拡大

**Files:** 変更 `index.html`、`assets/home-visual.css`。検証 `tests/home.test.cjs`。既存JPGは変更なし。

**Interfaces:** 消費：`zasu-vocal/assets/logic-pro-v1.0.0.jpg`。出力：`#vocal[data-product="vocal"]`、既存商品・再DLリンク。

- [ ] 「DAWは変えなくていい。歌だけZASUにする。」と実機画面を主役にする。CSSでホスト外周の表示範囲を調整し、Pitch／Note／Blob／Key／Scaleが見える配置にする。
- [ ] 機能は「解析 / 自動補正 / ノイズ低減 / ミックス」へ短縮。v1.0.0、¥3,980、税込・買い切り、Universal・Windows x64、商品CTA・再DLを保持する。
- [ ] 表示検証は価格・版・OS・既存リンクを保持し、AU／VST3／Standaloneの詳細がトップに必須という期待だけを外す。形式の正本は未変更の商品詳細に残る。
- [ ] MobileでUIがコピーと購入導線の間、DesktopでコピーとUIが2列になることを確認する。検証後、対象ファイルだけをcommitする。

### Task 3: LOUD v2.0.0真正実機写真

**Files:** 新規 `assets/zasu-loud-v200-live.webp`。変更 `index.html`、`assets/home-visual.css`。検証 `tests/home.test.cjs`。

**Interfaces:** 消費：`IMG_C716282D-6D04-4638-9BD7-DFF10BEC6670.jpeg`（原本 `libfile_1a85b113f2788191b05f8d207d7ba2c5`）。出力：`#loud[data-product="loud"]` とフローに再利用する実機写真。

- [ ] 原本を保持してWebPを作り、CSSでプラグイン部分を大きく見せる。画面内の「ENGINE v2.0.0」、ノブ、メーターを描き替えない。
- [ ] コピー「音圧を上げる。迷わず、仕上げる。」、短いLoudness／True Peak／密度ラベルと、抑えたスタジオ背景を配置する。
- [ ] キャプションを「ZASU LOUD v2.0.0 / Windows実機撮影」とする。実機写真を直接スクリーンショットとは呼ばない。旧画像へ戻す必要がある場合だけ旧版参考表記を付ける。
- [ ] v2.0.0、¥2,980、OS、商品・再DLを確認し、画面の判読性をMobile／Desktopで確認する。検証後、対象ファイルだけをcommitする。

### Task 4: VOCAL → LOUD制作フロー

**Files:** 変更 `index.html`、`assets/home-visual.css`。検証 `tests/home.test.cjs`。

**Interfaces:** 消費：Task 2／3の画像。出力：`.bundle-flow` に1回だけ表示するVOCAL TRACK → ZASU VOCAL → MASTER BUS → ZASU LOUD → 完成。

- [ ] LOUDからセットへつながる位置に2実機画面・矢印・短いラベルを配置する。セット商品画像のイラストUIをこの実機フローの代わりに使わない。
- [ ] 狭い幅は縦、十分な幅は横へ配置し、DOMの読み順・スクリーンリーダーの順序を維持する。
- [ ] `#vocal-loud-set` がLOUDとDAWの間にあり、フローが重複しないこと、画像が読み込めることを確認する。検証後、対象ファイルだけをcommitする。

### Task 5: ¥5,980セットと正式決済URL

**Files:** 変更 `index.html`、`assets/home-visual.css`、`tests/home.test.cjs`。新規 `tests/home-checkout.test.cjs`。

**Interfaces:** 消費：既存 `assets/vocal-loud-set.webp` とTask 4フロー。出力：`#bundle-checkout`、`#bundle-status`、`.product-redownload`。`bundleCheckoutUrl` はGlobal Constraintsの正式URLとの完全一致だけを有効条件にする。

- [ ] 新テストで、実際のセット有効化処理に正式URLを渡すとhrefが完全一致・aria-disabledが解除・「制作セットを購入」となることを固定する。空文字、旧短縮URL、別merchant／checkout、HTTP、javascript URLは無効のまま・hrefなしを期待する。node:vmと最小DOMスタブで実際の処理を検証し、購入・認証コードは呼ばない。
- [ ] `node --test tests/home-checkout.test.cjs` を実行し、現行square.link専用条件では正式URLが拒否されてFAILとなることを確認する。
- [ ] `bundleCheckoutUrl` を正式URLへ更新し、現行のURL判定を指定URLとの完全一致へ限定する。ホスト全体を無条件許可しない。ボタン・状態の既存識別子と有効化方式は維持する。
- [ ] セットをDesktop横長・Mobile縦配置へ整える。5980／6960／980、商品イメージの区別、既存 `/vocal-loud-set/download/` リンクを維持する。
- [ ] 新テストPASSと既存表示テストの正式URL一致を確認する。ブラウザーでチェックアウトの商品名・¥5,980を確認し、決済は実行しない。検証後、対象ファイルだけをcommitする。

### Task 6: Mobile／Desktop・DAW／AUDIO・アクセシビリティ

**Files:** 変更 `index.html`、`assets/home-visual.css`、`tests/home.test.cjs`。

**Interfaces:** 消費：Task 1〜5の表示。出力：全幅で読みやすいトップと既存下段導線。

- [ ] DAW／AUDIOを一段低い視覚優先度へ整理し、既存価格・特典・商品・再DL・Webサービス・More／Support／フッターリンクを保持する。
- [ ] 説明文を短縮し、同じ対象の前後文字数を比較する。30〜40%は方向目標として扱い、重要情報を削らない。
- [ ] 表示テストに320pxを追加。2画面以内のLOUD価格／3画面以内のセット画像という旧位置制限を外し、価格・CTAの非重複、実効高さ44px、横はみ出しなしを確認する。
- [ ] 320／375／390／768／1440pxで写真・UIを目視確認し、390×844pxでは3〜4画面程度を目安に余白を調整する。補助文字11px以上、画像decode、メニューの開閉、Tab／Enter操作、reduced-motionを確認する。
- [ ] 使用可能な検証環境で `CAPTURE_DIR=/tmp/zasu-stage-two-shots node --test tests/home.test.cjs tests/home-checkout.test.cjs` を実行し、全件PASSとスクリーンショットを確認する。Playwright依存は既存ワークフローと同じ1.56.1を使う。実行環境制約があれば未実行と報告し、検証を飛ばして公開しない。
- [ ] スマホHero・VOCAL・LOUD・セット、Desktop全体をレビュー用に記録する。対象ファイルだけをcommitする。

### Task 7: 購入・DL・再DL・認証の非破壊確認と引き渡し

**Files:** 追加の製品変更なし。必要なら表示だけを前の担当Taskへ戻して修正する。

**Interfaces:** 消費：完成差分と正本ルート。出力：公開前の確認報告。実購入E2Eと設定確認・回帰テストを区別する。

- [ ] `git diff --name-only 8f1355666c7ce0a9c21236b2a1dbd6b6fe86ea93` で許可ファイル以外に差分がないことを確認する。商品・購入後・再DLページ、共有CSS、supabase、配布物、workflowが変わっていれば理由を調べて止める。
- [ ] `node --test supabase/tests/*.test.mjs` を実行し既存認証回帰を確認する。購入者・未購入者・他製品・セット権限のテスト期待を変更しない。これは本番実購入の代用とは扱わない。
- [ ] 商品・再DLリンクの到達、セット正本URL、Square設定の保存結果、4配布物の設定が未変更であること、Storage内部URLを追加していないことを確認する。
- [ ] 検証結果・写真の出所・変更ファイル・スクリーンショット・残る未確認事項を提示する。現時点のユーザー指示にはpush／deployの許可がないため、公開操作を行わず引き渡す。

## 承認と実行方法

本計画は設計版1.1と最新の正式決済URL指定に基づく。計画レビューと実行方法の承認を待つ。Nativeで順に実装する方式を推奨する。Square設定が正本へ統一されたことを確認するまで実装開始しない。本計画作成だけを理由に、サイトコード変更・push・deployを開始しない。
