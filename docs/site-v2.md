# ZASU WORKS 公式サイト v2（2026-10-17）

ブランチ `redesign/site-v2`。本番（main）への反映は事業主の明示承認後のみ。

## デザインコンセプト

**「生の歌声の線が、正しいノートに収まる」**。歌ってみた制作の中心にある体験＝ピッチ補正を、そのままブランドの記号にした。

- ファーストビュー：見出し「歌声を、作品に。」の横に、アンバーの揺れる線（生の音程）が緑のノート（補正後）へ収まる図。ZASU DAW / VOCALの実画面と同じ意味の色（緑＝合っている、アンバー＝ずれている）。読み込み時に一度だけ動き、`prefers-reduced-motion` では静止。
- 色：製品UI（黒いパネル＋ミントグリーン）から取った。紙色 `#F3F4F2`、墨 `#1E2421`、シグナルグリーン `#0B7D55`（ボタン・リンク、白文字でWCAG AA）、フォスファー `#3DDC97`（暗い面のみ）、アンバー `#E8A33A`（ヒーロー図のみ）、コンソール `#141917`（実画面の額縁）。
- 書体：日本語はシステムフォント（Hiragino / Noto Sans JP。数MBのWebフォントを避ける）。製品名と価格だけ Archivo の幅広（ハードウェアのラベルのような字面）。Webフォントは非ブロッキング読み込み。
- 情報設計：製品カードの羅列ではなく「やりたいことから選ぶ」一覧。VOCAL / VOCAL EDITOR / DAW が重なって見える問題に、トップで「いまのDAWで使う か ひとつで完結させる か」の二択を置いた。
- 誠実さを設計に：「買う前に知っておいてほしいこと」と各製品の「対応環境と、確認済みの範囲」で、返金の対象外や未確認事項を先に書く。

## 構成

| ファイル | 役割 |
| --- | --- |
| `tools/site/catalog.cjs` | 製品データの唯一の源。販売ゲート・Square URL・価格スケジュールは既存ファイルから**読み取る**（`zasu-vocal/release-config.js`、`zasu-daw/site-config.js`、`assets/duo-release.js`、`assets/booth-config.js`）。 |
| `tools/site/layout.cjs` | ページ骨格、共通ヘッダー（`tools/navigation`）、フッター、購入ボタン、構造化データ。 |
| `tools/build-site.cjs` | 生成：`/`、`/products.html`、`/zasu-{vocal,loud,finish,vocal-editor,daw}/`、`/vocal-loud-set/`（新設）、`/support.html`、`/sales.html`、`/about.html`。 |
| `tools/site/partials/refund-guarantee-vocal-loud.fragment` | VOCAL / LOUDの返金保証・改定予告（本番から逐語コピー）。 |
| `tools/site/make-images.py` | 実画面のWebP派生とOG画像（1200×630 JPEG）。元画像は変更しない。 |
| `assets/site/zw.css` | 新サイト唯一のスタイルシート（約15KB）。 |

生成しないページ：受け取り・再ダウンロード、特商法・利用規約・プライバシー、ACCOUNT、admin、client、MEDIA、休止告知ページ。共通ヘッダーの配色のみ新デザインに合わせた（`assets/navigation.css`）。

## 購入の仕組み（変更なし・既存がそのまま権限を持つ）

- VOCAL / LOUD / セット：Squareリンク（URLは設定ファイル由来）。
- FINISH / VOCAL EDITOR：`assets/duo-release.js` が実行時に購入ボタンを有効化し、10/31までは発売記念リンク、11/1 0:00 JSTから通常価格リンクへ切替。価格表示は `assets/offer-display.js`。JavaScriptなしではボタンは無効のまま（既存の安全側設計）で、BOOTHへの案内を表示。
- DAW：`zasu-daw/site-config.js` + `marketing.js` が全CTA（`[data-checkout]`）をゲート。設定が不正なら購入不可にする。`marketing.js` は画像ダイアログ部分のみnullガードを追加（ゲートは無変更）。
- アクセス解析：既存の同意ゲート付きGA4 / Clarity。`click_purchase` 等はリンクURLで製品判定するため、URL不変で計測継続。
- 外部の既存アンカー（広告・メール・他ページ）はすべて維持：`/#contact`、`/#vocal-loud-set`、`/zasu-vocal/#purchase` 等。

## ビルドと検証

```sh
node tools/build-media.cjs && node tools/build-site.cjs && node tools/build-navigation.cjs && node tools/build-analytics.cjs
python3 tools/check-public-links.py
NODE_PATH=<playwright> node --test tests/*.test.cjs supabase/tests/*.test.mjs
```

GitHub Pagesのワークフローも同じ順序。旧 `build-shop` / `build-storefront` / `build-product-guide` は削除（Git履歴に残る）。

## 製品情報の更新

価格・説明・画像：`catalog.cjs` を編集 → ビルド。販売停止：既存の設定ファイル（`salesEnabled` 等）を変更 → ビルドで購入ボタンが「販売停止中」に変わる。新しい実画面：元画像を差し替え `python3 tools/site/make-images.py`。

## 戻し方

マージ後に問題があれば、v2マージコミットを `git revert -m 1 <sha>` して main へ。データベース・決済・配信の変更はないため、それ以外の復旧作業は不要。
