# 統合解析：段階導入の状況（2026-10-15）

## 実装範囲

既存GA4 G-JPG8NNYWWTを維持。共通所有者を拡張し、Clarityの同意後読み込み、v2同意、全体テキストマスキング、公開URL許可リスト、未知クエリ・非公開流入元・未知フラグメントの拒否を追加。入力フォームのあるページは録画しない。GA4の既存同意はClarityの同意に流用しない。同意保存不能時は計測しない。撤回時はCookie削除後に再読み込みしてSDKを終了する。

Clarity project IDは空欄であり、**まだ録画・ヒートマップは有効になっていない**。初回登録の利用規約同意が必要。Googleログインはtaka.ns00@gmail.comを選択済み。所有者が規約を確認した後にプロジェクト作成・ID設定・実SDKの録画確認を行う。

Search Console URLプレフィックス https://zasuworks.jp/ のHTML確認タグを取得しホームへ追加。公開後に所有権確認・サイトマップ送信を行う。DNS操作は不要な方式。

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
- Clarity：https://clarity.microsoft.com/ （初回規約同意待ち）
- Search Console：https://search.google.com/search-console （URLプレフィックス所有権確認）
- X広告：https://ads.x.com/ （本ブラウザでは管理画面に未到達）

広告効果はGA4でsession source/medium、session campaign、製品ID、click_purchaseを組み合わせて確認する。許可率・ブロッカーによる欠測がある。販売先で確定した購入数と比較し、測定可能範囲を明記する。

## 検証記録

変更前の解析テスト18件成功。追加テストでClarity未実装・旧同意流用・ストレージ失敗を再現し、修正後に成功。実サービスへの送信はスタブと明確なテスト用IDで抑止している。SDKスタブの成功と本物のClarityへの受信確認は別。
全体テスト結果と本番デプロイは最新コミット/Actionsを参照。今回のソース変更には追加費用なし。有料契約なし。

最終ローカル検証：`NODE_PATH=/tmp/zasu-home-check/node_modules node --test tests/*.test.cjs supabase/tests/*.test.mjs` → **490 passed / 0 failed / 0 skipped**。`git diff --check`成功。独立レビューの重要指摘2点（メール作成リンクへの入力流出、同意保存失敗後の古い許可の再利用）は対象ページの除外と保存不能時の計測禁止、回帰テストで対処。実Clarity SDKによる個人情報保護確認はプロジェクト作成後に残る。
