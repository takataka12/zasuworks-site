# ZASU TRIAL SYSTEM — 導入・運用

現状は開発・ステージング段階です。全製品の無料体験制度が運用開始した状態ではありません。公開フラグを有効にしていません。

## 構成と安全な既定値

- 公開用コード: zasuworks-site の `supabase/functions/zasu-trial`、`supabase/migrations/2026101516*`、`native/trial`、`account/trials.mjs`、`trial/`。
- VOCALの統合コード: zasu-daw の VOCAL v1.0.0リリースブランチを基点とする `codex/zasu-trial-vocal`。`ZASU_TRIAL_BUILD` は既定OFF。
- 有料版にはTrialControllerも検証公開鍵もリンクされません。従来どおりログイン不要です。
- 開始はブラウザ承認後のデスクトップ側exchange成功時です。認証通信には応答の全体締切とキャンセルを設け、音声側は独立した単調時計の期限を毎ブロック確認します。ページ閲覧・ダウンロード・ブラウザ承認だけでは開始しません。
- 端末のハードウェア識別子は収集しません。複数の個人用端末は同じ製品・アカウントの終了時刻を共有します。
- オフラインは署名ライセンスの元の期限まで。ネットワーク障害で期限前のライセンスを無効化しません。
- 試用データ削除でサーバー上の体験は復活しません。ただしローカル時刻履歴も削除すると時刻巻き戻し検出は弱くなります。強固なDRMを追加する設計ではありません。

## 秘密鍵の準備（運営者のMacで実行）

Node.js 22以降を使用。新しい秘密ディレクトリを指定してください。

```sh
node tools/generate-trial-keys.mjs "$HOME/ZASU-TRIAL-PRIVATE"
supabase secrets set --env-file "$HOME/ZASU-TRIAL-PRIVATE/trial.env" --project-ref giljyqaohutxoxlpkfjf
```

`trial.env` は秘密鍵です。Git、配布物、チャット添付、Libraryに保存しないでください。`public-modulus.txt` と `public.jwk` は公開可能です。ステージングと本番の鍵は分け、本番公開鍵を組み込んだバイナリを最終検証してください。初期実装のkidは `zasu-trial-1` 固定です。鍵ローテーションでは旧ライセンスへの対応を設計してから変更してください。

本番の鍵設定は、本番移行段階で同じコマンドのproject-refを本番プロジェクトに置換して実施します。ここでは実施していません。

## ステージングと本番の分離

既存の `ZASU AUDIO v2 STAGING`（giljyqaohutxoxlpkfjf）に新規DB・zasu-trial関数を導入済み。既存本番（siwmzradvrtetotakkbi）には未導入です。既存アカウントの本番メール認証や購入処理を変更していません。

ローカルWeb検証でステージングを使う場合は、開発用のコピーにあるaccount/config.mjsのURLをステージングへ変更します。本番用ファイルへの混在を避けてください。ブラウザAPIのOrigin許可は正式ドメインのみで、ローカル試験はモックを使っています。ステージングで本物のログインを検証する際は、専用ステージングOriginを関数に追加し、そのOriginのみを許可してください。汎用ワイルドカード許可は使いません。

## VOCALビルド

JUCE 8.0.15固定。リポジトリルートから次を実行します。公開鍵ファイルは上記で生成した公開modulusだけを指定します。

```sh
cmake -S plugins/vocal -B build/vocal-trial -DCMAKE_BUILD_TYPE=Release -DZASU_TRIAL_BUILD=ON -DZASU_TRIAL_RSA_MODULUS="$(cat "$HOME/ZASU-TRIAL-PRIVATE/public-modulus.txt")" -DZASU_TRIAL_ENDPOINT=https://giljyqaohutxoxlpkfjf.supabase.co/functions/v1/zasu-trial
cmake --build build/vocal-trial --config Release --parallel 2
```

Mac Universalはconfigureに `-DCMAKE_OSX_ARCHITECTURES="arm64;x86_64"` を追加します。WindowsはVisual Studio x64 generatorを使用し、macOS専用オプションは付けません。

有料版は別buildディレクトリで `-DZASU_TRIAL_BUILD=OFF`。同じbuildディレクトリ・配布用ステージディレクトリを使い回さないでください。同名のAU/VST3・Bundle IDを維持しており、製品版で置換する運用です。

同梱の既存 `plugins/vocal` 内のパッケージ・署名手順を使用しますが、既存の有料版を上書きアップロードしないこと。まずtrial専用の候補ファイルを作成してください。本作業ではMac署名・公証、Windows Setupは作成していません。

## 公開前に必要な確認

1. 本番とステージングで別の署名鍵を安全に設定し、公開鍵とバイナリを一致させる。
2. Mac実機のUniversal・AU・VST3・Standalone、署名・公証・Staple・Logic読込を確認。
3. Windows x64のVST3・Standalone、Setupインストール／アンインストールとホスト確認。
4. 実アカウントでログイン→明示承認→ライセンス受取→オフライン再起動を試験。
5. 期限切れ、再インストール、Mac/Windows同一期限、DSPから原音への移行を聴感・測定する。
6. 体験版で保存したセッションを製品版で再開し、既存製品版セッションも復元する。
7. 有料版バイナリにTrialController、認証要求、秘密鍵が含まれないことを確認。
8. 候補ファイルのダウンロード・ハッシュ確認後、trial_productsにURLとSHA256を登録し、released=trueにする。5製品を統一制度として告知するのは各製品の検証完了後。

## アカウント／購入連携

購入済み判定は既存commerce_ordersとcommerce_entitlementsを使います。未紐付け購入・BOOTH購入を勝手に推測しません。既存製品版の利用に紐付け・ログインは要求しません。体験バイナリ自体を永続ライセンスに変換する機能はなく、購入後はDRMなし製品版へ置換します。

## 運営者集計

`ZASU_TRIAL_ADMIN_USER_IDS` に運営者のZASU ACCOUNTのUUIDをカンマ区切りで設定。ユーザーの編集可能なプロフィール値で権限を判定しません。アカウントの無料体験画面で許可された運営者にのみ集計ボタンを表示します。サーバーでもallowlistを再確認します。

開始・体験中・終了・体験後購入・開始から購入までの平均日数を製品別に表示。stats操作はtrial_admin_auditに記録。未連携購入は集計できません。延長やテストライセンスを配るAPIは今回追加していません。

## 計測

GA4で同意がある場合のみ `trial_page_view`、`trial_download`（ダウンロード要求クリック）、`trial_purchase_click` を計測する実装です。downloadはインストール完了を意味しません。アカウント画面は既存の解析除外を維持します。

`trial_started` の実数はDB grant作成で集計できます。GA4のtrial_signup/trial_started/trial_expiredは未接続です。デスクトップの同意・送信・重複排除が未整備のため、Web閲覧や承認を開始イベントに見せかけて送っていません。広告予算と設定は変更していません。

## 障害時

新しい開始を停止する場合は対象trial_products.released=false。すでに発行したオフラインライセンスは期限まで有効です。機能追加を戻す場合はWeb/関数を直前版へ戻し、新規trialテーブルは権限を閉じたまま保持します。既存のアカウント・購入テーブルを削除しないでください。

## 新製品

DBカタログ登録に加え、API製品IDの許可、Webモデルの製品ページ対応、ネイティブビルドでproduct IDを設定します。現在の実装は設定追加だけであらゆる製品へ自動統合されるものではありません。新規DSP・DAW制限・パッケージ検証は必要です。期間はDBのduration_seconds（新規grantのみ）で変更できます。既存grantの日時を通常運用で書き換えないでください。

## 公開フラグを変えないMac実機の非公開認証試験

`supabase/staging/` は既存の giljyqaohutxoxlpkfjf 専用です。本番へ適用しないでください。通常の migrations に入れていません。

- `trial-validation.sql`: RLSで閉じたメールallowlist（VOCALのみ・有効期限必須）と、既存trial RPCのステージング用制御。allowlistは空で作成され、許可済み本人だけが承認・権限取得できます。pendingリクエストだけで権限は発行しません。
- `account-validation.ts`: `zasu-trial-account-validation` としてデプロイ。既存account adapterのOTP・プロフィール・session proofを再利用し、メール送信はallowlist内だけ。送信ドメインは確認済みの alerts.zasumaster.com。Vaultのzasu_resend_api_keyをサーバー内部だけで参照。共通health通知のtransport設定・通常account関数・本番Authは変更しません。
- `trial-validation.ts`: ステージングのzasu-trialのみにデプロイ。通常と同じ署名・期限・PKCE・レート制限を使用。検証者メールを再確認し、Originは http://127.0.0.1:8765 のみ。
- `tools/serve-trial-staging.mjs`: 上記の固定Originにのみlisten。許可した静的ファイルだけを配信し、リポジトリ・秘密鍵フォルダは公開しません。configとCSPを応答時だけステージングに置換。本番configは保持します。

まずSQL/サービスの検証とデプロイを完了し、管理者が対象メールに一時的な検証許可を登録します。メール・有効期限はGitに保存しません。テーブルへの登録・削除はサービス権限の管理操作だけで行います。

```sh
node tools/serve-trial-staging.mjs
```

このターミナルを起動したまま、Macの別ターミナルでVOCALを再ビルドします。

```sh
ZASU_TRIAL_RSA_MODULUS_FILE="$HOME/ZASU-TRIAL-STAGING-PRIVATE/public-modulus.txt" \
ZASU_TRIAL_API="https://giljyqaohutxoxlpkfjf.supabase.co/functions/v1/zasu-trial" \
ZASU_TRIAL_ACCOUNT_URL="http://127.0.0.1:8765/account/" \
bash "$HOME/zasu-trial-vocal/Build-TRIAL-Mac.command"
```

通常のブラウザURLは https://zasuworks.jp/account/ のまま。上記のloopbackは固定ステージングAPIとの組合せだけCMakeが許可します。再ビルド後はコード署名を再実施します。検証はまずStandaloneで進め、有料版AUの復帰状態を保ちます。

このステージングには本番の会員データをコピーしません。初回は検証ページの説明・規約を確認して新規登録し、本人の既存ZASU ACCOUNTと同じメールアドレスを使えます。本番で重複登録されることはありません。OTP・トークン・秘密鍵はチャットに送らず本人の画面で入力します。

試験終了後はallowlistを削除し、検証account関数を停止・削除、trial関数/RPCを通常版へ復帰します。既発行の署名ライセンスは元の168時間の期限を維持し、期限を再発行しません。公開フラグは全製品falseのままです。

2026-10-15の追加準備: JSの認証/試用/プレビュー150件、ブラウザ8件、変更後VOCAL試用プロセッサ1件とnative clock/deadline 2件をLinuxで確認。検証account関数v1とステージングtrial関数v5をデプロイ済みで、固定loopbackのCORS 204、外部Originの403を実APIで確認。通常account関数・本番は変更していません。DB変更用APIの接続エラーによりステージングSQL適用と実DBテストは未完了。手元のMacからSQLを適用し、実DB検証後にのみ認証へ進みます。
