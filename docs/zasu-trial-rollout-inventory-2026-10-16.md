# 4製品への展開準備 — 2026-10-16

本格統合は未実施。VOCALのWindows保護/実機と残るMac品質ゲートが先。既存有料製品・販売用ブランチを変更していない。

| 製品 | 読み取り対象 | ID・保存形式の確認範囲 | 共通化と固有対応 |
|---|---|---|---|
| LOUD | takataka12/zasu-loud main a14e45b483c298b48b311d457871320539c9d954、CMakeLists.txt/Source/PluginProcessor.cpp | bundle jp.zasuworks.ZASULOUD、Zasu/ZL01。APVTS copyState→XML binary、復元時PARAM移行あり | Controller/署名/期限/フェードと専用パッケージを再利用可能。既存の状態移行とラウドネスDSPは変更せず専用期限試験が必要 |
| FINISH | zasu-daw feature/zasu-finish-rc5-native 03782611fa49f0079ffcba3cb9870c1cff8a94cc、SHA一致確認済みfinish_source_r4.tar.gz内部のCMake/Plugin.cpp/Finish.issとRC5パッチ | bundle jp.zasuworks.finish、Zasu/ZFn1、PLAYER jp.zasuworks.finish.player。APVTS XMLにcoreStateのParameters.serializeとprototypeVersion=1、manifest stateVersion=4、19パラメーター。Windows AppId {8C12749D-5A58-4D8D-9B03-D817B50E86AD}、Program Files/ZASU WORKS/ZASU FINISH | JUCE8.0.15指定の独立core+proof shell、RC5パッチ適用型。共通Controllerは試験版shellへ接続可能だがR5 DSP/coreState/復元epochは維持する。VST3 class ID実バイナリー照合・新規ビルドは未実施 |
| VOCAL EDITOR | zasu-daw feature/zasu-vocal-editor-release-prep 9b10dea59342a861f0c2c881cda09bc39260f154、plugins/vocal_editor/CMakeLists.txt/Source/EditorProcessor.cpp/StateCodec.h | bundle jp.zasuworks.ZASUVOCALEDITOR、Zasu/ZVE1、0.3.0。音声cacheはch/sample/start/rate/float32、最大6,000,000sample、8–192kHz。APVTS/編集文書を含む復元処理 | 共通認証は別Trialビルドへ。期限時にcapture/render新規処理を止め、保存済み編集/音声/曲線を失わない専用検証が必須 |
| DAW | zasu-daw main 46446e42f36aed58d2877f3306943893d60848c4、およびv2.1開発ブランチの存在を確認 | app bundle jp.zasu.audio.daw。既存Windows Inno/版番号/既存更新処理あり。GUIアプリでプラグインID適用外。プロジェクト全スキーマ/最新v2.1保存互換性は未監査 | Trial専用AppId/配置は共通化可能。録音停止・既存素材の再生/保存・export制限・プロジェクト救済をDAW固有仕様として決める。v2.1性能改善との並行変更を混ぜない |

共通化候補：168時間サーバー時刻、RS256検証、秘密を含まない診断、要求/セッション継続、オフラインキャッシュ、公開ゲート、SHA-256台帳、既存有料版拒否と所有ファイル単位の削除。

製品固有：AU/VST3 class IDs、パラメーターID/状態バージョン、音声/編集キャッシュ、キャプチャと非同期render、期限切れ時の音声経路、Standalone設定、既存インストーラーの所有範囲。VOCALのZV01を他製品へ流用しない。インストーラーAppIdとVST3 IDを混同しない。

残る調査は、各製品の販売中バイナリーに対応する正本コミット確定、最新DAW v2.1保存形式、各Windowsインストーラーの実際のreceipt/配置・状態移行、既存購入者経路と全プラットフォーム実機。表は販売中製品の全監査完了を意味しない。
