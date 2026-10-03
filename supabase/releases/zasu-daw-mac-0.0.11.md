# ZASU DAW Mac 0.0.11 公開記録

公開確認日時: 2026-10-04T04:04:02+09:00

## 公開した配布物

- 製品名: ZASU DAW
- Version / Build Number: 0.0.11 / 0.0.11（DMG内Info.plistで確認）
- Bundle Identifier: jp.zasu.audio.daw（変更なし）
- 最低macOS: 12.0
- アーキテクチャ: arm64 + x86_64（DMG内Mach-Oで確認）
- ファイル: ZASUDAW-0.0.11-macOS-Universal.dmg
- サイズ: 7,451,400 bytes
- SHA-256: `4b7fd3e1fafbd545b87921374a42c8a39d6ca5823004af1b4cc6ff1bdedab7e4`
- 入手元: ユーザーが署名・公証・StapleとMac実機確認を完了して提供したDMG
- 主な変更: 録音モニタリング、モニター音量、録音前の3秒カウントダウン

## 配布設定

購入リンク、購入確認、再ダウンロードページ、保存済み購入情報のキーは維持した。

- 製品ページ: https://zasuworks.jp/zasu-daw/
- 受け取り・更新ページ: https://zasuworks.jp/zasu-daw/download/
- 配布バケット: `zasu-daw-releases`（privateを維持）
- Macの現在参照: `0.0.11/ZASUDAW-0.0.11-macOS-Universal.dmg`
- 旧Mac版: `0.0.10/ZASUDAW-0.0.10-macOS-Universal.dmg`（削除せず非公開で保持）
- Windows: `0.0.10/ZASU-DAW-Beta-0.0.10-Windows-x64.zip`（変更なし）
- 一時ダウンロードURLの期限: 従来どおり600秒
- 本番Edge Function: `zasu-daw-download` version 4
- サイト変更commit: `ff9823dbf187b2a9fe290f24f6bde1dc774bdf2d`
- GitHub Pages: https://github.com/takataka12/zasuworks-site/actions/runs/37146283383 — success

利用者が開くURLは変えていない。配布ファイルはバージョン別に保持し、購入確認後の一時URLだけが最新版を指す。

## 実行した確認

- 公開の製品ページ、受け取りページ、download.js: HTTP 200。更新したソースとバイト一致。
- 公開後、認証済みの管理用検証経路で発行した署名付き配布URLから新DMGを実ダウンロード: HTTP 200、SHA-256とサイズが受領DMGと一致。
- DMG/APFSの読み取り・展開・整合性テスト: 7-Zipで正常終了。アプリ、Info.plist、実行ファイル、Applicationsリンク、インストール説明書を確認。
- 旧Mac版も取得し、元のSHA-256と一致: `cd278dce5801f49f0339c207f3acfd7b8cca979fe24f65269432509582e8fa43`
- Windows版も取得し、元のSHA-256と一致: `8e413ec71ee100af68652088fe53592ff6212053b7fc71729fcf13b29e9ac712`
- 購入確認と再ダウンロードの自動テスト: 28 + 11 = 39件成功。
- 本番CORS preflight: 204。購入情報なし: 400。異なるOrigin: 403。存在しない購入: 403。いずれもダウンロードURLを返さない。
- 新Mac・旧Mac・Windowsの公開Storage URL: いずれも400で直接取得不可。
- 作業用転送機能: 停止済み。JWT必須、実装は410のみ。認証なしの本番呼び出しは401。
- 本番Edge Functionを読み戻し、配置したソースと一致。

## 検証範囲の区別

Macでの起動と更新内容の確認は、2026年10月4日のユーザー報告を実機確認完了として扱った。
署名・Apple Notarization Accepted・Stapleは、提供されたDMGについてユーザーが完了と報告した内容である。
今回の配布作業環境はLinuxのため、codesign / stapler / spctl、macOSでのマウント、Applicationsへの上書きインストール、公開後のMac初回起動はここでは再実行していない。

既存の実購入を使った公開ページの通し確認は未実施。以前の領収書から決済履歴を検索する操作は自動承認レビューで拒否されたため、検索は実行せず、検索用処理も転送機能とともに無効化した。購入確認処理に検証用バイパスは追加していない。実購入経路の追加確認には、所有者が指定するテスト購入のSquare領収書URLまたは取引IDを使用する。

## ロールバック

`supabase/functions/zasu-daw-download/index.ts` のMac行だけをversion `0.0.10`、filename `ZASUDAW-0.0.10-macOS-Universal.dmg`へ戻して、同じFunctionへデプロイする。
必要に応じて応答のversionとMacの画面表示も戻す。Windows行、購入判定、Square設定は変更しない。
フロントエンドはロールバック用の旧Macパスも許可している。旧DMGを公開バケットへ移動したり、購入判定を外したりする必要はない。
