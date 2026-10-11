# ZASU WORKS 2製品発売 — 本番実施記録

記録日：2026年10月12日（日本時間）。発売予定：10月13日。

製品ページ・トップ・Products・商品別販売条件を本番公開。4ファイルの非公開保存と期限付き取得を確認し、`assets/duo-release.js` の販売準備フラグを有効化。2026年10月13日0:00（日本時間）に購入ボタンが有効になる。

|製品|製品ページ|発売記念決済リンク|通常価格決済リンク|
|---|---|---|---|
|FINISH v1.0.0|https://zasuworks.jp/zasu-finish/|https://square.link/u/6lVT3H7M — 1,980円|https://square.link/u/HiOK48IW — 2,980円|
|VOCAL EDITOR v0.3.0|https://zasuworks.jp/zasu-vocal-editor/|https://square.link/u/dW2WRGpe — 2,980円|https://square.link/u/lTZrMI0R — 3,980円|

各税込・買い切り。セット・定期課金は追加していない。リンク自体は本番Squareに作成済みで購入可能なので、配布準備が完了する前に購入者向けに配布しないこと。

## ビルドと配布ファイル

|ファイル|バイト数|SHA-256|本番非公開保存|
|---|---:|---|---|
|ZASU-FINISH-v1.0.0-NOTARIZED.dmg|23829515|7f41519bee7e2ebbc69d55426ffa4557a364b996088265043519773bd772eaa9|済・保存後ハッシュ一致|
|ZASU_FINISH_v1.0.0_Setup.exe|3930784|0633fcecd7ca12f883f68b9a247d4f4dfc468cb7add7acef48b6c7b8ef9b4a21|済・保存後ハッシュ一致|
|ZASU-VOCAL-EDITOR-v0.3.0-NOTARIZED.dmg|23500829|dfa5dcf570f7349ff13d0a198e6e19ee3c32bf7a289e290558735209452a435a|済・保存後ハッシュ一致|
|ZASU-VOCAL-EDITOR-0.3.0-Setup.exe|4987280|cff0379414c711c379f6a60284a86f4189d2b1f378713fe5e1a80f4716b55988|済・保存後ハッシュ一致|

取得元：GitHub `takataka12/zasu-daw`。

- FINISH RC5 Windows：[成功run 38147831916](https://github.com/takataka12/zasu-daw/actions/runs/38147831916)、SHA `03782611fa49f0079ffcba3cb9870c1cff8a94cc`、artifact 11706600274。旧ライブラリのWindows ZIP内の別ハッシュのSetupは使わない。
- EDITOR Windows：[成功run 38148048171](https://github.com/takataka12/zasu-daw/actions/runs/38148048171)、SHA `9b10dea59342a861f0c2c881cda09bc39260f154`、artifact 11706148603。古いSetupなしのZIPは使わない。
- 両Mac：[署名・公証成功run 38161222025](https://github.com/takataka12/zasu-daw/actions/runs/38161222025)、SHA `2f30a2dbe779349137550014c68bbc13070faee6`、artifact 11709973738。取得したMac ZIP全体のSHA-256はActions artifact digest `8a0ecb3a1d55cacd970ac032f19641c37b97d5d47389dc5fc79065b8180d08fd` と一致。
- Mac：CI内のDeveloper ID署名検証、Notary Accepted、stapler validate、Gatekeeper評価acceptedを確認。DMG内のAU/VST3/Standaloneをコピーする形式。
- Windows：両SetupのPE証明書ディレクトリは `(0,0)`。未署名として表示。Setupのラッパーがx86でも配布対象のVST3/Standaloneはx64。

## 既存ACCOUNT連携

購入SKUと税込価格を厳密に照合し、`finish` / `vocal_editor` の独立権限を追加。既存Square検証、購入メールへのOTP、注文単位の原子的権限付与、返金再検証、600秒の期限付きダウンロード、再取得を再利用。

購入時のメールアドレスはSquareで入力必須と案内。決済完了後は製品別の受け取りページへ。購入者がACCOUNT購入管理から領収書URL・取引IDを追加し、購入メールへのコードで紐づける。自動紐づけ済みと誤案内しない。

同一注文の再処理で権限は増えない。サイトボタンはクリック直後に無効化。別注文での再購入を完全に防止する仕組みではないため、購入済みの場合は再ダウンロードを明示し、重複決済は個別対応とする。

保存先は両専用bucketとも `public=false`。storage.objectsへの一般ユーザーポリシーなし。匿名のpublic取得はファイルを返さない。仮の準備用Edge Functionは終了し、JWT必須の410応答に置換済み。

## 11月1日の価格変更

`zasu-duo-pricing` は既存内部recovery認証を使用。一般公開呼び出しは401。通常価格リンクを作成・金額照合済み。

cron `zasu-duo-regular-price-20261101` は2026年10月31日15:00 UTC（11月1日0:00 JST）以降、商品variationを2,980/3,980円へ変更し、発売記念リンクを削除。成功時にcron自身を停止。期限前のdispatchはNULLでSquare変更なし。日付到来後の実際の変更結果は現時点では未確認。販売開始の保留とは独立している。

## 確認結果と残件

- [本番公開CI 38164769181](https://github.com/takataka12/zasuworks-site/actions/runs/38164769181)：全373テスト成功、公開後38テスト成功。新製品・受け取り・規約・特商法ページは320/390/1440pxで横はみ出しなし。既存DAW/VOCAL/LOUD/セット購入導線を維持。
- サーバー単独295テスト成功。新両製品の価格、独立権限、両OSへの期限付きURL発行・再発行、他製品取得拒否を含む。外部Square/Storageはテストfixtureを使用する項目がある。
- 本番DBのロールバック付きfixtureで両製品の購入紐づけと同一注文再処理の一権限性を確認。実在購入者・売上データは作成しない。
- 両製品URLはHTTP200。Squareの実決済フォームで名前・注文合計1,980/2,980円を確認。実カード支払いは未実施。
- EDITOR Macはユーザーが添付したファイルを検証し、正式版のサイズ・SHA-256完全一致後に保存。保存後の全バイト再読込でも一致。
- **実決済E2E未確認**：決済完了→購入メール→ACCOUNT紐づけ→実ファイル取得・再取得の実購入テストが必要。
- **実機未確認**：Mac DMGインストール、Windows Setupインストール/アンインストール、AU/VST3/Standalone起動、DAWとの実用確認。
- 実製品の画面画像を各ページに掲載。FINISHはRC4時点の実画面と明記し、VOCAL EDITORはDAW内実機写真の全体・部分拡大を掲載。許諾済み音声Before/Afterデモは未掲載。
- 販売開始は10月13日0:00（日本時間）に自動有効化。日付到来後に、公開ボタンとSquare遷移を最終確認する。
