# ZASU MEDIA — 記事の追加と運用

## 今回の構成

`media/index.html` は既存トップ。`media/media.css` は既存デザイン、`media/editorial.css` はメディア拡張部分です。`media/media.js` はメール本文作成だけを行い、送信・保存・分析APIは呼びません。

`tools/build-media.cjs` は公開情報だけの `media/reviews.json` から以下を生成します。

- `/media/reviews/`：実試用記事の一覧。初期は0件。記事が入ると種類・目的・キーワードで絞り込みできます。
- `/media/reviews/{slug}/`：実際の試用記事。環境、版、提供関係、結果、制限、未確認範囲、証拠、任意の作者補足・再試用履歴。
- `/media/sample/`：結果を捏造しない書式見本。`noindex,follow`。レビュー件数には入りません。
- `/media/how-we-review/`：レビューの約束・編集方針。
- `/media/stories/hello/`：創刊のことば。レビューではない編集記事。

トップの `MEDIA_LATEST_START` / `MEDIA_LATEST_END` の間に、新しい実レビューを最大3件表示します。初期は空の状態を正直に表示します。生成ページを直接編集しても次のビルドで上書きされるため、共通構成はビルダーで編集してください。

## 実レビューを追加する

1. ザス本人が試用し、作者と返却・公開範囲を合意する。非公開メモや未確認の原稿は、この公開リポジトリへ置かない。
2. 公開可能な画像・動画・観察記録を用意する。外部リンクを使う場合も読者が閲覧できるものに限る。試用ライセンスや関係性を正確に記す。
3. `media/reviews.json` の `reviews` に、次の項目を持つオブジェクトを追加する。

|項目|内容|
|---|---|
|slug|英小文字・数字・ハイフンのみの固定ID。重複不可|
|title / summary|用途中心の見出しと短い紹介|
|product / maker / officialUrl|作品名・作者の公開名・公式HTTP(S) URL|
|category|`web` / `ios` / `pc` / `creative` のいずれか|
|topic|`create` / `organize` / `record` / `play` のいずれか|
|testedAt / publishedAt|実際の試用日・公開日。`YYYY-MM-DD`|
|version / environment|実際に使った版・端末・OS等|
|disclosure|自費・試用提供等の関係を正確に記載|
|task / result / good / limits / unknown|実施課題・結果・良かった点・制限や迷い・未確認範囲。該当しない項目も事実に即して記載|
|evidence|`[{"caption":"公開可能な記録の説明","url":"https://…"}]`。1件以上|
|approved / actualUseConfirmed|本人の実試用と公開原稿確認後に両方 `true`。これらのフラグだけで実試用を証明できるわけではない|
|creatorNote|任意。公開を確認した作者の補足|
|updates|任意。`[{"date":"YYYY-MM-DD","version":"…","change":"作者による変更内容","checked":"実際に再試用した記録"}]`|

4. `node tools/build-media.cjs` を実行し、`node --test tests/media-build.test.cjs` で確認する。実試用のないダミー作品を掲載して表示確認しない。UI試験はテスト内の一時データを利用する。
5. 公開原稿を確認してGitHubへ反映する。既存Pagesワークフローが生成→全体テスト→公開→公開後の表示・操作テストを実行する。

## 制約

応募受領と引き受け確定は別。高評価・拡散・全件掲載・固定日数での再試用は約束しない。2026年11月始動の告知は残し、実際の運用開始後に事実に合わせて更新する。

この基盤は静的な記事生成であり、管理画面やCMSではありません。メール送信、SNS投稿、料金契約、アクセス解析、会員登録は今回追加していません。一般のフォーム入力もサーバーへ送信しません。

自社記事・広告・情報だけの紹介を実試用レビューとしてこのmanifestに混ぜない。新たな形式が必要になった時に、表示と件数定義を分けて拡張する。

## 確認環境

Node 22、既存のPlaywright設定（CI: playwright 1.56.1）。テスト用環境がHTTP接続を許可しない場合は、HTML/CSSをメモリ内で描画する補助チェックと、GitHub Actionsの通常HTTPテストを区別する。オフライン描画だけで公開動作を確認済みにしない。

## 紹介スタイルの参考動画を差し替える

`media/index.html` の `REVIEW_STYLE_VIDEO_START`〜`REVIEW_STYLE_VIDEO_END` が動画セクションです。ビルダーの自動生成領域外なので再ビルドでも維持されます。

- 動画ID：iframe の `youtube-nocookie.com/embed/` の末尾と、YouTubeボタンの `watch?v=` を同じIDに変更。
- タイトル：`figcaption` 内の `h3` と iframe の `title` を更新。
- 紹介文：`.review-style-copy` 内の段落を更新。
- 位置づけ・注記：`.section-id`、`.review-style-label`、各動画の `.review-style-disclosure` を実際の掲載内容に合わせて一緒に更新。

正式な第三者レビューに差し替える際は、実試用と公開合意を確認し、製品名・提供関係・対応するレビュー記事へのリンクを記載してください。現在の参考動画はレビュー実績やレビュー件数には含めません。自社実演を残す場合は、正式レビューと別の枠で参考映像の表示・注記を維持します。APIや追加のJavaScriptは不要です。

現在はZASU MASTER（`8jn3pmVkuL4`）とZASU DAW（`yAD6oBCpNwU`）の2本を掲載。PCでは2列、760px以下では1列です。各 `figure` 単位でタイトル・URL・注記を差し替え、注記IDの重複を避けてください。
