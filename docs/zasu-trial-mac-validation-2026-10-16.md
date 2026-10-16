# ZASU VOCAL TRIAL — Mac実機検証記録（2026-10-16 JST）

## 対象と証拠の扱い

対象ソースは `takataka12/zasu-daw` の `29253a4a04d19a08c807aa0377a86ba472b2d80c`（PR #6、draft）。
ユーザーのMacで実施した結果であり、当方がMacを直接操作したものではない。
コマンド出力・機密情報を除いたアプリ診断・Logic画面画像・ユーザーの聴取報告を区別して記録する。

環境はユーザー報告のmacOS 26.7 / Apple Silicon、JUCE 8.0.15、Debug。
ビルド設定はarm64;x86_64。今回の生成物についてlipo再照合・Intel Macでの実行は未実施。
前回ビルドでのUniversal確認と今回の実機結果を混同しない。

## 確認できた結果

| 時刻（JST） | 検証 | 結果・証拠 |
|---|---|---|
| 07:51 | ソース更新 | ff-only更新後のHEADが29253a4a04d1 |
| 07:53 | Macビルド | AU/VST3/Standalone用ビルドスクリプト完了、TrialProcessorTests 1/1、1.53秒 |
| 07:53 | Standalone署名 | 既存Developer ID Application・runtime・timestamp・audio-input entitlement。codesignのstrict検証成功 |
| 07:54 | 新バイナリーの公開鍵・環境照合 | localKeyValid/buildKeyMatches/binaryKeyMatches/stagingConfiguration/signerConfigured/serverKeyMatchesすべてtrue |
| 07:57 | 診断コピー | active=false、busy=false、cache_missing。診断ボタンが利用可能 |
| 08:03 | ブラウザー接続先 | ローカル検証ページの案内・ステージングURL・専用validation endpointの読み取り確認がすべてtrue |
| 08:05–08:06 | 実アカウント承認・権限受信 | アプリが「残り159時間」へ遷移。HTTP200、license_received、signature_verified、cache_saved、activated。active=true、busy=false |
| 08:09 | オフライン再起動 | ユーザーがWi-Fiを切断して再起動後に診断コピー。cache_restored、cache_saved、active=true、busy=false。HTTPイベントなし |
| 08:11–08:14 | AU署名・一時配置・AU検証 | ビルド内AUを署名・strict検証。有料版を退避後ユーザーComponentsへ一時配置し再検証。auval -v aufx ZV01 Zasu → AU VALIDATION SUCCEEDED |
| 08:16 | Logic Proロード | 新規検証プロジェクトのAU画面に「159 hours left in trial」。画面画像で確認 |
| 08:20 | Logic実音声・解析・補正 | ユーザー報告：音が聞こえる、ノイズ・途切れ・フリーズなし、解析・自動補正もOK |
| 08:25 | プロジェクト復元 | 補正65%で検証プロジェクトを保存する手順を案内し、ユーザーが設定・解析結果の復元を報告 |
| 08:27 | 有料版原本の復帰 | 体験AUを検証フォルダーへ保管し、有料版原本をシステムComponentsへ復元。diff -qrで直前バックアップと一致 |
| 08:29 | 体験版→有料版のプロジェクト互換性 | ユーザーが4点を確認：体験/ログインボタンなし、補正65%維持、解析結果復元、再生正常・ノイズ/途切れなし |

署名検証成功はApple公証・Staple・配布準備完了を意味しない。
音声を当方で収録・測定したものではないため、上記聴取結果を数値的な音質同一性や全パラメーターの保証には拡張しない。

## 実機診断の要点

オンライン認証後：

```json
{"schema":1,"build":"trial-diagnostic-1","active":true,"busy":false,"events":[{"stage":"license_received","http":0},{"stage":"signature_verified","http":0},{"stage":"cache_saved","http":0},{"stage":"activated","http":0}]}
```

オフライン再起動後：

```json
{"schema":1,"build":"trial-diagnostic-1","active":true,"busy":false,"events":[{"stage":"cache_restored","http":0},{"stage":"cache_saved","http":0}]}
```

前者は共有された32件の診断から最終段階のみを抜粋。待機中のHTTP200/pendingは省略した。
パスワード、コード、秘密鍵、アクセストークン、ライセンス本体は記録・取得していない。

## 認証経路と残るUX確認

アプリから新しく開いたブラウザータブは未ログインだった。
sessionStorageがタブ単位であり、また要求fragmentが読み込み後にURLから除去されることを既存コードで確認。
再ログイン・OTP再送は行わせず、サーバーの有効な既存要求を読み取り、その同じ要求URLをログイン済みの元のタブで開いて承認した。
新しい試用資格の初期化・秘密鍵再生成・無条件の認証データ削除は行っていない。

今回確認したのは、この同一要求の受け渡し経路での成功。
一般ユーザー向けの新規登録からの導線、新タブでのログイン継続、既存セッションを使う自然な承認導線は別途品質確認が必要。
手動の要求URL移動を、一般配布向け認証UXの完成と扱わない。

## 有料版保護と最終配置

有料版原本：
`/Library/Audio/Plug-Ins/Components/ZASU VOCAL.component`

今回の一致確認済みバックアップ：
`$HOME/ZASU-VOCAL-AU-BACKUP.n4KDPW/ZASU VOCAL.component`

検証した体験版AUの保管先：
`$HOME/ZASU-VOCAL-AU-BACKUP.n4KDPW/Logic-Test-Trial.component`

ユーザーComponentsから体験版AUを移動し、有料版原本を復帰済み。
Standalone体験版と署名付きライセンスはユーザーMacに保持。キーやキャッシュは削除していない。
今回の認証修正にDSP、プラグインID、プリセット・状態保存形式の変更なし。
有料版を新しい認証必須バイナリーへ置き換えていない。

## サーバーの読み取り再確認

2026-10-16 08:29以降のステージング読み取りで、5製品のreleased=falseを確認。
既存VOCAL grantはactive：

- 開始：2026-10-15 22:27:31.014479 JST
- 終了：2026-10-22 22:27:31.014479 JST
- 最終認証：2026-10-16 08:05:23.772645 JST

開始・終了は元の168時間から変更されていない。
最終認証日時は今回の正常なexchangeで更新されたもの。
当方のSQLはSELECTのみで、権限・認証状態の手動書き換えは行っていない。
利用不能時間の救済は、必要期間を集計して本人承認後に個別延長する案にとどめ、未実施。

## CIとの対応

同じソースheadの[製品統合CI 38815217566](https://github.com/takataka12/zasu-daw/actions/runs/38815217566)と[独立共通CI 38815217615](https://github.com/takataka12/zasu-daw/actions/runs/38815217615)はMac/Windows双方success。
根本原因・修正前後の再現は[認証障害記録](zasu-trial-auth-incident-2026-10-15.md)を参照。
CI成功、今回のMac実機成功、未実施の配布品質保証は別の検証ゲートとして扱う。

## 未完了・公開ゲート

- 実機での期限切れ、再生中の期限到達時の安全なバイパス、端境・通信中断の検証。
- VST3ホスト、Intel Mac実行、Windows実環境の認証・音声・インストール検証。
- パラメーターオートメーション、プリセット単体、複数サンプルレート等の追加回帰。
- Release配布候補の署名、公証、Staple、DMG/Windowsインストーラー、インストール/アンインストール検証。
- 一般利用者のブラウザー認証・ダウンロード導線の品質確認。
- 残り4製品への展開はVOCAL先行検証の残ゲートを踏まえて段階判断。

PR #9/#6はdraft・未マージ。一般公開・配布フラグ有効化・本番販売/決済・広告設定/予算変更は行わない。
「配布準備完了」「全製品完成」とは報告しない。


## 09:38 JST：期限到達の隔離製品処理テスト

ユーザーがhead `1e7cadf7d59e3a2580b0c2b0c51f91906afa5e8e`へff-only更新後、Apple Silicon Mac上でarm64/Debugのテスト専用ターゲットを別ディレクトリーへビルドした。

保存先：`/Users/taka/ZASU-VOCAL-EXPIRY-TEST.u276rk`。
テストはCI専用の一時RSA鍵で生成したfixtureを使用。運用署名鍵を読み取らず、専用一時キャッシュとモックHTTPで実Controller・署名検証・処理ゲート・Fade・状態保存を実行した。接続先はexample.invalidを指定し、通常版のビルド・インストール先・ユーザーのライセンスは変更しない。

共有された実行ログ：

```text
JUCE v8.0.15
PASS isolated unauthenticated dry passthrough, no capture/render, state roundtrip
PASS signed active-to-expired processor transition, bounded fade, exact dry bypass, no new capture/render, 65% parameter and state preserved
ZASUVocalTrialProcessorTests Passed 7.14 sec
100% tests passed out of 1
```

これはMac実機上で実行した数値的な製品処理テストの成功。Logic Pro内での期限到達・聴取、既存ボーカルの解析/render結果がある状態での期限切れ、Intel実機、全サンプルレートの保証へは拡張しない。実アカウントの2026-10-22 22:27:31 JSTという期限は試験に使用・変更しない。

## 09:45–10:02 JST：Release候補・公証済み検証用DMG

対象ソース：`1e7cadf7d59e3a2580b0c2b0c51f91906afa5e8e`。
ユーザーMacの専用ReleaseビルドディレクトリーでAU/VST3/Standaloneを生成。
設定はRelease、arm64;x86_64、deployment target 11.0、通常のステージング公開鍵、ステージングtrial endpoint、ブラウザーURLは http://127.0.0.1:8765/account/。
BUILD_TESTING=OFF。既存の有料版インストール先には配置していない。

ユーザーが共有したコマンド出力と起動結果：

- 3形式のlipo結果はそれぞれ `x86_64 arm64`。Intel Mac上での実行成功を意味しない。
- 3形式を既存Developer ID Applicationで署名。runtime/timestamp、Standaloneにaudio-input entitlement。strict署名検証成功。
- 既存KeychainプロファイルでStandalone ZIPをAppleへ提出。提出ID `de777f7b-fdbe-4938-9cc8-1e2cb21d51eb`、結果Accepted。
- Standaloneにstaple、validate成功。Gatekeeperはaccepted / source=Notarized Developer ID。
- このRelease Standaloneを起動し、既存ライセンスで無料体験残り時間が表示されたとユーザー報告。新しい認証・権限発行は行わせていない。
- 3形式とステージング用READMEのみを含むUDZO DMGを作成。自動インストーラーは含まない。
- DMGをDeveloper ID署名しstrict検証後Appleへ提出。提出ID `3acaecfb-ca61-4bc3-81b7-6a5faa86373c`、結果Accepted。
- DMGにstaple、validate成功。Gatekeeperはaccepted / source=Notarized Developer ID。
- 読み取り専用マウントしたDMG内の3形式すべてでstrict署名検証成功、lipo結果x86_64 arm64。収録Standaloneのstapler validate成功。
- 既存Standaloneを終了してからDMG内Standaloneを起動し、画面と無料体験残り時間が表示されたとユーザー報告。
- アプリ終了後DMG取り外し成功。staple後の最終DMGのSHA-256を保存。

配布候補（ユーザーMacにのみ保存、GitHubへのバイナリー公開なし）：

`ZASU-VOCAL-Trial-STAGING-Universal.dmg`

```text
6d34b3006c4101391e48c5c36f45df3b60b8374c4a8414f0f3f3243fbac237d7  ZASU-VOCAL-Trial-STAGING-Universal.dmg
```

公証済みの非公開ステージング候補であり、一般向け配布準備完了ではない。
本候補のRelease AUのLogic音声・保存復元、VST3ホスト、隔離したダウンロード/隔離属性経由の初回起動、インストール/アンインストール、Intel実機、Windows実環境とインストーラーは未検証。
以前のDebug AUの実機結果を、このRelease候補のホスト検証成功には代用しない。
元の体験期限・署名鍵・認証キャッシュ・有料版配置を変更せず、公開フラグや本番設定にも変更なし。

## 10:05–10:15 JST：Release AUのLogic検証と有料版復帰

上記Release候補のAUを使用。Logic終了後、有料版AUを新規バックアップへコピーしてdiff一致を確認し、原本を退避した。Release AUをユーザーComponentsへ一時配置してstrict署名検証成功。auval -v aufx ZV01 ZasuはAU VALIDATION SUCCEEDED。

ユーザー報告による実機結果：

- Logic Proで既存検証プロジェクトをロード。体験残り時間・補正65%・解析結果が復元。
- 再生正常、ノイズ・途切れ・フリーズなし。補正ON/OFFによる音の変化を確認。
- 補正ON・65%で検証プロジェクトを保存して閉じ、開き直した後も65%・解析結果が復元され、再生正常。
- Logic終了後、Release AUをバックアップ先へ保管し有料版原本を元のシステムComponentsへ復元。復元前後とも原本とバックアップのdiff一致。
- 有料版で同じ検証プロジェクトを再ロード。無料体験/ログインボタンなし、65%・解析結果復元、再生正常・ノイズ/途切れなし。

バックアップ：`$HOME/ZASU-VOCAL-RELEASE-AU-BACKUP.Cna1H8/ZASU VOCAL.component`。
検証済みRelease AU保管：同ディレクトリーの `Logic-Test-Release-Trial.component`。
最終配置は有料版原本が `/Library/Audio/Plug-Ins/Components/ZASU VOCAL.component`、ユーザーComponentsの体験AUは撤去済み。

本節は共有されたコマンド出力・ユーザーの画面内容/聴取報告に基づく。添付画像のローカル読み取りには失敗しており、画像を直接確認した証拠として扱わない。音声を当方で測定・収録したものではない。
今回のRelease AUの読み込み・音声処理・保存復元・有料版移行互換性は確認できたが、全プリセット/オートメーション/複数レートや期限到達中のLogic聴取は未検証。VST3/Intel/Windows実機およびインストーラー検証も未完了。
実アカウントの体験期限変更、再認証、ライセンス再発行、公開/マージは行っていない。
