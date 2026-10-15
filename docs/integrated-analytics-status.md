# 統合解析：段階導入の状況（2026-10-15）

## 実装範囲

既存GA4 G-JPG8NNYWWTを維持。共通所有者を拡張し、Clarityの同意後読み込み、v2同意、全体テキストマスキング、公開URL許可リスト、未知クエリ・非公開流入元・未知フラグメントの拒否を追加。入力フォームのあるページは録画しない。GA4の既存同意はClarityの同意に流用しない。同意保存不能時は計測しない。撤回時はCookie削除後に再読み込みしてSDKを終了する。

Clarity project ID **yxzaksze7v** を発行し設定。所有者が初回利用規約への同意を完了後、ZASU WORKS / https://zasuworks.jp/ のプロジェクトを作成。サイト側の同意・全体マスキングに加え、プロジェクトの厳密マスキングを設定。実サービスでの受信・録画表示は別途確認し、表示待ちと未設定を区別する。

Search Console URLプレフィックス https://zasuworks.jp/ のHTML確認タグを取得しホームへ追加。本番公開後、所有権確認とサイトマップ送信に成功（当初17 URLを検出）。不足していたFINISH・VOCAL EDITOR・Supportを追加し20 URLへ拡張。DNS操作は不要。VOCALは検出済み・インデックス未登録。登録リクエストの最終受理は未確認。

## イベント

既存：page_view、view_item、click_purchase、click_square、click_booth、click_demo、click_download（受け取り入口であり実ファイル取得ではない）、contact_email_open、click_apply、click_service。
追加：view_price（#purchase表示、1ページ1回）、scroll_depth（25/50/75/90%、各1回）。価格到達は読了や購入成功を意味しない。
追加パラメータ：product_category、traffic_source、campaign。明示パラメータは当該ページの承認済みUTMのみ。内部遷移後の広告帰属はGA4標準のセッション流入元を使用する。unattributedは広告流入ゼロという意味ではない。

purchase・generate_lead・実ダウンロードのfile_downloadは未導入。クリックを成功と見なさない。Square webhookにはCOMPLETED確認があるが、現行の確定決済とGA client/session/consentを安全に結ぶ設計は未導入。BOOTHは外部購入完了をこのタグで確認できない。購入・返金・認証コードは変更していない。

## ファネルと取得元

|段階|取得元|状態|
|---|---|---|
|広告表示・クリック・費用|X Ads Manager|既存広告、設定変更なし|
|同意済みサイト訪問|GA4 page_view / sessions|既存基盤|
|製品閲覧|GA4 view_item|既存基盤|
|価格到達・スクロール|GA4 view_price / scroll_depth|今回追加|
|購入ボタン|GA4 click_purchase + 販売先別イベント|既存基盤|
|購入完了・売上・返金|Square/BOOTHの確定データ|GA4との広告帰属は未接続|

UTM例：https://zasuworks.jp/zasu-vocal/?utm_source=x&utm_medium=paid_social&utm_campaign=zasu_vocal_20261015&utm_content=vocal_demo
稼働中広告のURLは編集していない。現在の広告にこのUTMがあることは未確認。UTMなしの流入をこのキャンペーンの実測値に含めない。

## 保留と判断

- X Pixel：ads.x.comから広告案内ページへ遷移。広告管理アカウント/Pixelにアクセスできておらず、ID・イベント未取得。解析と別の広告同意を設ける前に有効化しない。予算・入札・ターゲットは未変更。
- GTM：導入しない。既存の直接タグ方式を拡張するほうが所有者・同意・重複制御を一元化できる。
- Sentry：未導入。既存バックエンド監視の十分性と無料枠/秘匿化を確認できていない。監視が十分という主張はしない。
- PageSpeed Insights：API測定はHTTP 429。スコア・CWV・改善前後差分は取得できていない。架空の測定結果は示さない。
- 統合ダッシュボード：未構築。既存GA4レポート設定は別GA4導入の成果を参照。X費用・確定売上は未接続でROASを出さない。
- SEO：robots.txtとsitemap.xml、製品canonicalが存在。Search Consoleのインデックス結果を確認する前にSEO成功は主張しない。「無料DAW」で有料製品を偽って案内する変更は行わない。

## 管理画面

- GA4：https://analytics.google.com/ （ZASU WORKS、測定ID G-JPG8NNYWWT）
- Clarity：https://clarity.microsoft.com/ （プロジェクト yxzaksze7v 作成済み）
- Search Console：https://search.google.com/search-console （URLプレフィックス所有権確認）
- X広告：https://ads.x.com/ （本ブラウザでは管理画面に未到達）

広告効果はGA4でsession source/medium、session campaign、製品ID、click_purchaseを組み合わせて確認する。許可率・ブロッカーによる欠測がある。販売先で確定した購入数と比較し、測定可能範囲を明記する。

## 検証記録

変更前の解析テスト18件成功。追加テストでClarity未実装・旧同意流用・ストレージ失敗を再現し、修正後に成功。実サービスへの送信はスタブと明確なテスト用IDで抑止している。SDKスタブの成功と本物のClarityへの受信確認は別。
全体テスト結果と本番デプロイは最新コミット/Actionsを参照。今回のソース変更には追加費用なし。有料契約なし。

最終ローカル検証：`NODE_PATH=/tmp/zasu-home-check/node_modules node --test tests/*.test.cjs supabase/tests/*.test.mjs` → **490 passed / 0 failed / 0 skipped**。`git diff --check`成功。独立レビューの重要指摘2点（メール作成リンクへの入力流出、同意保存失敗後の古い許可の再利用）は対象ページの除外と保存不能時の計測禁止、回帰テストで対処。実Clarity SDKによる個人情報保護確認はプロジェクト作成後に残る。

## 有効化確認
Clarity有効化設定後の解析回帰テスト24件成功。GA4管理画面は前段の実受信記録がある一方、この作業セッションでは権限エラーを表示し、追加イベントの実受信は未確認。本番タグはG-JPG8NNYWWTが1つのみで、同意前の未読み込み・同意後の表示・価格導線を確認した。広告設定は未変更。

## Clarity本番受信の実測（2026-10-15 15:46 JST以降）

- 公開コミット：`69765d819ffb9bebe314fc2a267a707f8bf9c136`。Actions `38694154652` は成功。
- 正式プロジェクトID `yxzaksze7v` のタグと、実SDK `https://scripts.clarity.ms/0.8.75-beta/clarity.js` の読み込みを本番DOMで確認。
- bodyの `data-clarity-mask=true` を確認。Clarity側でも検証用UTM付きVOCAL訪問がライブ録画に出現し、再生画面の文字がマスクされていることを目視確認。これは実装検証の訪問であり、顧客獲得数には数えない。
- `/account/` のClarity script数は0。購入・認証・返金の処理に変更なし。
- プロジェクト設定のマスクモードは「厳密」。GA4連携は未接続。統計ダッシュボード・ヒートマップは処理待ちで、まだ利用可能になったことを確認していない。
- 計測ID変更に追随して設定JSのURLも変わる仕組みを追加。旧設定がキャッシュに残る問題の回帰テストを先に失敗させてから修正。最終全体テストは491 passed / 0 failed / 0 skipped。
- PageSpeedのブラウザー測定も試行。実ユーザー欄は「データがありません」、ラボ測定は読み込み中のままで数値未取得。改善効果を捏造しない。
- X広告管理のリンクはXログイン画面に到達。安全な入力機能が画面の対象を検証できなかったため、ログインのみ所有者へ引き継ぐ。Pixel IDの発行はこの後。予算・ターゲット・入札は未変更。

管理画面： https://clarity.microsoft.com/projects/view/yxzaksze7v/impressions?date=Last%203%20days
