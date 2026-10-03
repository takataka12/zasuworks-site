# ZASU DAW Windows 0.0.11 公開記録

公開日: 2026年10月4日（日本時間）

## 配布物

- Product: ZASU DAW
- Version: 0.0.11
- File Version: 0.0.11.11（Setup.exeのリソースで確認）
- Build Number: 0.0.11（リリース工程の設定。元のWindowsビルドログは未受領）
- 元ビルド日時: 未確認。公開日時とは区別する。
- Installer: ZASU-DAW-v0.0.11-Windows-Setup.exe
- インストールするアプリ: ZASU DAW.exe
- サイズ: 4,857,114 bytes
- SHA-256: `339f06b7420e958095347c3bf9cc8d0f436cf10ca22d1d0fa68bacffa64528f0`
- Code Signing: Unsigned（PEの署名テーブルなし）
- 配布対象: Windows x64。Setupの起動部分はPE32 / x86。
- 本体のアーキテクチャは今回のLinux配布作業では展開して再確認していない。
- 主な変更: 入力モニタリング、録音前の3秒カウント、Setup形式のインストーラー。

## 実機確認の出典

ユーザーが2026年10月4日に提供した上記Setup.exeについて、インストール後の起動を報告。
続いて録音・入力モニタリング・3秒カウント、保存・再起動・再読み込み、Auto MIX・
Auto Mastering・WAV書き出しを含む確認依頼に対し「ALL PASS」と報告した。
この報告を今回の実機確認完了として受領した。

確認環境: Parallels Desktop / Windows 11 ARM（x64エミュレーション）。
ネイティブx64 Windows実機での確認とは区別する。
Windows側で生成された詳細な RELEASE-WINDOWS.md / 自動検証ログは未受領。
本書はLinux上でWindowsアプリを実行したという記録ではない。

## 配布先・購入者導線

- 製品ページ: https://zasuworks.jp/zasu-daw/
- 受け取り・更新ページ: https://zasuworks.jp/zasu-daw/download/
- 共通Square購入リンク・価格・購入判定・購入復旧・保存キーは変更していない。
- Windows現在参照: private `zasu-daw-releases/0.0.11/ZASU-DAW-v0.0.11-Windows-Setup.exe`
- Mac現在参照: `0.0.11/ZASUDAW-0.0.11-macOS-Universal.dmg`（変更なし）
- 旧Windows: `0.0.10/ZASU-DAW-Beta-0.0.10-Windows-x64.zip`（非公開で保持）
- 購入確認後の一時URL期限: 600秒（変更なし）
- 本番購入確認Function: `zasu-daw-download` version 5

受け取りページのURLは維持した。ファイル形式がZIPからSetup.exeになったため、
実ファイルは新しいバージョン別パスに保存し、購入確認後のリンクを切り替えた。
旧ZIP版利用者はSetupを実行し、以後スタートメニューから新アプリを開く。

## 配布作業で実行した確認

- 新Setupを非公開Storageへ配置後、署名付きURLから実ダウンロード: HTTP 200。
  4,857,114 bytes、受領ファイルのSHA-256と一致。
- 旧Windows ZIPをダウンロードしてハッシュ一致:
  `8e413ec71ee100af68652088fe53592ff6212053b7fc71729fcf13b29e9ac712`
- Mac 0.0.11も変更されていないことをハッシュで確認:
  `4b7fd3e1fafbd545b87921374a42c8a39d6ca5823004af1b4cc6ff1bdedab7e4`
- 購入確認・復旧・再ダウンロード・新Setup/旧ZIP対応の自動テスト40件成功。
- フロント側が新Setupを受理する公開を先行し、HTTP 200とソース一致を確認後に
  サーバーのWindows行だけを切り替えた。Mac行・購入判定本体はバイト単位で不変。

有効な実購入IDを使った公開画面からの通し確認は、この公開作業では実行していない。
ファイル取得の検証は認証済み管理用経路で発行した署名付きURLを用いた。
購入判定にテスト用のバイパスは追加していない。

## ロールバック

本番FunctionのWindows行だけを以下へ戻す。Mac行と購入判定は変更しない。

```ts
{ os: 'windows', version: '0.0.10', filename: 'ZASU-DAW-Beta-0.0.10-Windows-x64.zip' }
```

フロントは旧Windows ZIPも許可している。必要ならWindows版の案内を旧ZIP形式に戻す。
古い配布ファイルやユーザーの購入情報を削除する必要はない。
