# Mac実機検証記録 — 2026-10-15

ユーザー実機での報告に基づく。macOS 26.7 / Apple Silicon、Xcode、JUCE 8.0.15、Debug Universal。

確認済み:
- Macビルドと ZASUVocalTrialProcessorTests 1/1。
- Standalone起動。Standalone・AUとも lipo で x86_64 arm64。
- ビルド内Standalone・AUに既存Developer ID Application証明書で署名。Standaloneにはaudio-input entitlement。
- 両方の codesign --verify --deep --strict が valid on disk / satisfies Designated Requirement。
- auval -v aufx ZV01 Zasu が AU VALIDATION SUCCEEDED。
- Logic Proの新規テストプロジェクトで体験UI表示。未認証時の原音再生にノイズなし。
- テストプロジェクト保存・再読込後も体験UI表示、原音再生正常。
- 有料版AUを退避・内容一致確認後に一時差替え。検証後に有料版を元のシステムComponentsへ復帰。
- 復帰後のLogic画面で無料体験ボタンがないことを画像確認。

未確認:
- 実アカウントの署名付きライセンス受取・検証・保存と認証後DSP。
- オフライン再起動、期限終了の実機動作、認証後のプロジェクト互換性。
- VST3のアーキテクチャとホスト動作、Intel Macでの実行。
- Releaseビルド、公証・Staple、DMG、Windows、他4製品。

有料版バックアップはユーザーのホーム内に保持。秘密鍵・署名証明書の秘密部分は取得していない。
本番公開・PRマージ・一般配布は実施していない。


追加確認: 実アカウントのOTPログインとブラウザ承認は成功。ステージングVOCAL grantは
2026-10-15 22:27:31.014479 JST開始、2026-10-22 22:27:31.014479 JST終了（168時間）。
APIは同時刻にHTTP200を返したが、Macキャッシュファイルは未作成。実認証完了とは扱わない。
詳細と今回の修正・次の読み取り診断は [認証障害調査](zasu-trial-auth-incident-2026-10-15.md) を参照。
