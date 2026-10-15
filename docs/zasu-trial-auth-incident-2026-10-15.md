# ZASU TRIAL SYSTEM 認証障害調査 — 2026-10-15（JST）

## 結論と変更禁止事項

Macの実認証の再確認は未完了。後段の追加調査で署名検証中の解放後メモリー参照を再現・修正した（末尾の更新を優先）。
既存記録から推測できるのは、サーバーでの権限発行以降、クライアントが有効化される以前の区間で失敗したこと。
「鍵が違う」「署名検証が失敗した」を実機の確定原因として扱わない。

PR #9 / #6はdraft・未マージ。全5製品 released=false。実購入者の有料AUは復帰済み。
本番・広告・予算・購入導線・既存権利・秘密鍵・体験期間は変更しない。
認証コード再送、再ログイン、キャッシュ削除、権利初期化、鍵再生成は停止する。
今回のサーバー配備は既存ステージングのcatalog応答に公開鍵の指紋を追加する診断変更のみ。

## A. 確認した事実と処理別の状態

| 処理 | 状態 | 証拠・限界 |
|---|---|---|
| 接続先 | コード・配備確認済み、Macバイナリ照合は未確認 | ステージング giljyqaohutxoxlpkfjf と127.0.0.1:8765の固定組合わせ。Macの埋込み値を当方から読めない |
| ACCOUNTログイン | 過去の実操作で成功 | 画面に認証済みアカウント。再ログインは調査に不要 |
| Supabase Auth | 承認時の成功を確認、現在有効かは別 | adapterがgetUserとaccount_session_activeを検査し、承認・交換が成立した。現在のブラウザトークンは取得しない |
| ブラウザへの要求引渡し | 欠陥を再現し修正済み | JUCE URLがfragment内の = を %3D にする。ブラウザがtrial_requestを取得できなかった。ad85287で限定的に正規化し回帰テスト成功 |
| コールバック／リダイレクト | 設計を確認 | 独自URLコールバックは使わず、ブラウザは承認のみ。アプリがPKCE verifierを保持してexchangeをポーリング。アクセストークンをアプリへ渡さない |
| セッション期限・更新 | コードとブラウザ回帰確認、現Mac期限は未確認 | sessionStorageはタブ単位。新規タブで未ログインになるため既存タブのログイン有無だけで判断できない。refresh時の古い応答が新しいセッションを上書きしないテストも成功 |
| ユーザー承認 | 実サーバーで成功 | 2026-10-15 22:27:25.968857 JST |
| 利用権限発行 | 実サーバーで成功・保全 | 開始22:27:31.014479 JST、終了2026-10-22 22:27:31.014479 JST、active、ちょうど168時間。最終認証時刻も開始時と同じ |
| ライセンス発行API | サーバー処理の成功記録 | 22:27:31.032のzasu-trial HTTP 200。配備サービスはactive grantに署名してから200を返す。ただしHTTP 200だけでMacの受信・検証成功とはしない |
| Macのライセンス受信／検証 | 未確認 | 当時の処理段階ログがなく、保存ファイルなしという報告だけでは通信・鍵・claimsのどれかを判別できない |
| 状態更新・重複開始 | 欠陥を再現して修正 | begin()が実行中の次要求も予約していた。失敗直後に次要求が状態表示を上書きする。実記録でも初回発行直後に別要求が作成されているが、これだけで元の失敗原因までは確定しない |
| ローカル保存 | 実機では未完了 | ~/Library/ZASU WORKS/Trial/vocal.json が存在しないとの実行結果。保存失敗自体が原因か、検証前に停止した結果かは未確定 |
| 再起動復元／オフライン | 自動検証成功、Mac実機未確認 | 実Controller・署名検証・実ファイル保存を使い、HTTP境界のみ置換して検証 |
| フリーズ | サンプル上は認めない | 22:39のsampleではControllerが250ms待機。UIは通常runloop。これで全状況の非フリーズを保証はしない |

## B. 未確定の仮説と識別方法

1. Macビルドの公開鍵とサーバー署名鍵の公開部分の不一致。
   サーバーはimportしたRSA JWKの公開modulusだけから指紋を生成する。Macの公開ファイル・CMake設定・実バイナリと照合する。
2. API応答の受信・解析、ライセンス形式、署名、claimsのいずれかの拒否。
   今回の診断はHTTP状態、受信、形式／header／公開鍵／署名／claimsの各拒否を区別する。
3. 保存先の作成またはatomic replaceの失敗。
   保存失敗を記録し、認証中表示に戻さず「認証済み・保存失敗」を維持する。
4. 古い接続先または古いバイナリ。
   Mac側のCMakeのtrial ON・API・ACCOUNT URLと実バイナリの公開鍵埋込みを読み取りで検査する。

## C. 検証方法と証拠

重複開始の再現: 実ControllerのHTTP境界のみを固定応答に置換。最初のbeginを保持し、UIから追加beginを2回呼ぶ。
署名検証を失敗させた後、追加beginが送られず失敗表示が残ることを要求した。
修正前: `FAIL: duplicate begin overwrote the signature failure or issued a second request`。
修正後: 同テスト成功。署名拒否と不正なキャッシュを生成しないことも確認。

同じControllerで実WebCrypto署名fixtureを受信し、JUCE検証→有効化→atomic保存→ネットワークなしの新Controllerで復元を検証。
一度transport_errorを返した後、元の要求のまま復旧すること、保存先をファイルで塞ぐと保存失敗表示が残ることを検証。
これは制御したテスト環境の証拠であり、Mac実通信・Logic・Windowsの保証ではない。

再現コマンド（開発環境。Macの運用鍵を使わない）:

```sh
# vocalリポジトリ直下。秘密のテスト鍵は生成中のメモリー内だけ。
node scripts/trial-test-key.mjs
cmake -S modules/trial -B build/trial-core -DJUCE_PATH=/absolute/path/to/JUCE-8.0.15 -DZASU_TRIAL_TEST_FIXTURE="$PWD/trial-test-fixture.json"
cmake --build build/trial-core --parallel 2
ctest --test-dir build/trial-core --output-on-failure
```

実施環境の結果は末尾「検証結果」を参照。CIにはMac/Windowsで同じController検証を行う工程を追加するが、実行済み扱いにはしない。

## D. 原因の確定範囲

確定: fragmentエスケープを解釈できないブラウザ側の欠陥、重複開始がエラーを上書きするアプリ側の欠陥、保存失敗の黙殺、診断不足。
未確定: 今回のMacで最初にライセンスが有効化されなかった直接原因。
理由: 当時のMacでHTTP／ライセンス／検証／保存の段階が記録されず、当方にはMac内の鍵・バイナリへの直接アクセスがない。

## E. 修正内容と保護範囲

- 認証中のbeginをatomic guardで抑止。有効な体験中も新要求を作らない。UIも待機中の開始ボタンを無効化。
- 失敗表示を次の予約要求で消さない。通信障害は元要求のまま、最大600秒の範囲内で待機。未知／不正応答は停止し、無限再認証を起こさない。
- WebInputStreamを接続前からキャンセル対象にし、接続と本文読取を期限内に制限。HTTPコードと解析失敗を記録。
- 署名検証の形式／header／公開鍵／署名／claimsの拒否を分類。署名・期限の受入条件は緩和しない。
- 保存結果を確認し、失敗を画面と診断に残す。
- 「診断をコピー」は固定ラベル、公開鍵指紋、HTTP数値、active/busyだけを出力。
  メール、要求ID、パス、OTP、verifier、JWT、ライセンス本文、秘密鍵、HTTP本文や例外メッセージを出力しない。自動送信なし。
- paidビルドはtrial OFFのまま。DSP、Processor、AU/VST3識別子、state保存形式は今回変更しない。診断UIはtrial条件内のみ。

## F. 次に必要な操作と鍵照合の意味

以前の秘密鍵環境ファイル全体のSHA-256とSupabase CLI digestの照合案は撤回する。
これはファイル値の同一性を見るだけで、JWKの並び順や改行でも変化し、アプリの公開鍵との対応を直接証明しない。
今後は秘密鍵を読まず、RSA公開modulusを小文字hex化した512文字のSHA-256に統一する。
サーバー指紋は実署名用JWKの公開nだけから生成。指紋が一致してもMacの署名検証や保存成功まで保証しない。

必要なMac操作は `tools/check-trial-staging-key.mjs` の読み取り診断1回。
公開ファイル、CMakeCache、既存ビルドのバイナリだけを読み、固定ステージングcatalogへ1回問い合わせる。
OTP、ログイン、begin、approve、exchangeを呼ばず、ファイルや利用権限を変更しない。trial.envも読まない。
正常: 6項目すべてtrueと公開鍵指紋。
不一致: serverKeyMatches=falseならサーバーとMac公開鍵の対応がない。buildKeyMatches/binaryKeyMatches=falseならビルド不整合。
stagingConfiguration=falseなら接続設定不整合。signerConfigured=falseなら署名設定の問題か旧API配備を確認する。
ファイル・ネットワークエラーは原因別に調べ、同じ操作を機械的に繰り返さない。

この確認が必要な理由: サーバー公開鍵指紋は当方で取得できたが、Mac固有の公開ファイル・ビルド設定・実バイナリに対応する情報は既存記録にないため。
一致後も原因が残る場合にのみ診断付きバイナリへの更新を案内し、再認証の可否・必要性を先に説明する。

## G. 完了条件と公開までの残課題

1. コードレビューと自動テスト: 失敗再現→修正後成功、paid回帰、診断への機密混入なし。
2. ローカル・ステージング: 環境と公開鍵対応、期限168時間・冪等性・RLS・private allowlistを確認。実利用権限を変更しない。
3. 署名付きライセンス: 受信→署名→claims→保存の成功を同一の診断で確認。
4. Mac実機: Standaloneで有効化、終了・再起動・オフライン復元が成功。現在ここが未完了。
5. Logic: 有料AUの保全・復旧手順を維持し、新規テストprojectでtrial AU読込と実DSPを確認。
6. 期限・オフライン: 制御したテスト用fixtureで期限直前後・時刻変更・通信断・安全なバイパス。実ユーザー権利やOS時刻を無断変更しない。
7. 有料版互換: 保存済みproject/preset、automation、DSP、ログイン不要、AU/VST3 IDs維持を実機で確認。
8. Windows x64: ビルド・署名／installer・host・uninstall・offline。VM/ARM上x64の場合は明示。
9. Release署名、公証、Staple、配布物、download、承認を経て初めて公開。ほか4製品はVOCAL合格後。

救済案（未実施・承認待ちの提案）: 開始時刻・同一grant ID・購入権を保持し、この検証アカウントのVOCALに限り障害で失った時間を終了時刻に加える。
正常化時刻と救済量を提示し、承認後にold/new期限と理由を監査記録に残す別トランザクションを設計・検証する。
現行trial_admin_auditはstatsのみ許可するため、既存監査表へ不適切に書き込まない。期間は現時点で一切変更しない。

## 検証結果（この変更）

- Node: `node --test site/supabase/tests/*.test.mjs site/tests/*test.mjs` 325/325成功。
- ブラウザ・analytics・staging: 対象10/10成功。実ChromeのACCOUNT画面、JUCEエスケープ引渡し、明示承認を検証。API応答はテスト用であり実アカウント認証ではない。
- JUCE共通: CTest 4/4成功（Core、RequestDeadline、WebCrypto署名、Controller）。Controllerは24.47秒で成功。
- Linux VOCAL: Standalone / VST3 / trial processorのビルド成功、trial processor CTest 1/1成功。
- Linux paid: 今回のソースでpaid processorを再ビルド、CTest 1/1成功（12.57秒）。Macの有料AU再確認の代替にはしない。
- ステージングv6: catalog HTTP200、実署名公開鍵の指紋取得、全5製品released=false。grant開始・終了時刻は変更しない。
- Mac/Windowsの今回の変更後ビルド・実認証・Logic・署名公証は未実施。CI工程を追加したが、その結果は別途確認する。

サイト全体の初回一括実行はリポジトリ外のcwdから行ったため530件中10件失敗した。
失敗名: build output is current and matches the public manifest / editorial routes fit 320px・390px・768px・1440px / empty archive has honest state; sample is not a review / no-JS pages keep reading and direct contact / all public pages share navigation and every header route/anchor resolves / BOOTH buyers can choose their receipt route on every desktop download page / all six catalogue products have real screen links and charging information。
後2件は相対パスENOENT。ほかは生成済み静的ページ・ナビの検証を含むため、独立コピーをリポジトリ直下としてCIと同じ5つのbuildツールを実行して再検証する。これらの生成変更を認証修正に混ぜない。

再検証結果: 独立コピーでCIと同じ生成手順を実行し、正しいリポジトリcwdで全テストを実行。530/530成功、47.88秒、失敗・skipなし。
生成前のナビ不足と実行cwdが初回10件失敗の要因。認証修正と無関係な生成HTMLの変更は今回のコミットに含めない。

```sh
node tools/build-media.cjs
node tools/build-navigation.cjs
node tools/build-product-guide.cjs
node tools/build-storefront.cjs
node tools/build-analytics.cjs
NODE_PATH=/tmp/zasu-home-check/node_modules node --test tests/*.test.cjs tests/*.test.mjs supabase/tests/*.test.mjs
```


## 追加調査：署名検証のメモリー寿命不具合を再現・修正

ユーザー実行の読み取り検査は全6項目true。公開ファイル・ビルド設定・実バイナリの鍵と実サーバーの公開鍵指紋が一致した。
指紋は27fec33eb59362eaa51bcb7c0d178a1264d60a4a35e90f151f1a9a178c124b8d。
鍵の再設定・再生成は不要。

GitHub Actions実行38749656712のMac runnerで、通信もログインも使わないWebCrypto署名fixtureがJUCEで拒否された。
Mac trial processorとpaid processorは成功していたが、追加したLicenseTestsとControllerTestsが失敗。
したがって、APIやブラウザに依存しない検証経路で不具合を再現できた。

原因コード:

```cpp
auto message=(parts[0]+"."+parts[1]).toUTF8();
auto digest=juce::SHA256(message.getAddress(),message.sizeInBytes()-1).getRawData();
```

JUCE String::toUTF8()は所有権を持つコピーではなく、Stringの内部データを指す。
一時Stringは最初の文の終わりで破棄され、次の文のmessageは解放済み領域を参照する。
Linuxの通常実行で通ったことは安全性の証拠ではなかった。

同じ検証コードとWebCrypto fixtureをAddressSanitizerで実行した結果:

```text
ERROR: AddressSanitizer: heap-use-after-free
zasu::trial::verify ... TrialLicense.cpp:27
freed by ... zasu::trial::verify ... TrialLicense.cpp:27
SUMMARY: AddressSanitizer ... in strlen
```

修正: `const auto signedText=parts[0]+"."+parts[1];` を保持し、その所有者が生存する間にtoUTF8とSHA-256を実行。
公開鍵指紋のtoLowerCase().toUTF8()にも同じ寿命パターンがあったため所有Stringを保持。
修正後の同じASan実行はexit 0で、WebCrypto RS256検証・改ざん拒否・別製品拒否・誤鍵拒否が成功。
受入条件、秘密鍵、DSP、保存形式は変更しない。

Windows runnerは別にTrialController.cpp:45のstd::maxでC2059を報告。
Windowsヘッダーのmaxマクロとの衝突を避けるため `(std::max)(...)` に修正。Windows再ビルドが必要。

再発防止: 共通CMakeに開発用AddressSanitizerオプション、Mac CIで有効化、共通モジュールだけを早く検証するMac/Windows workflowを追加。
ASanの修正前失敗→修正後成功は確認済み。修正後Mac/Windows CIとユーザー実機の認証完了は別途結果を確認する。

一時的に準備した「認証を行わない署名プローブ」は、CIとASanで再現できたためMacへの操作案内を省略した。
ステージングcatalogに一時追加したdiagnosticProofも除去し、v8でv6と同じbundleへ復帰（SHA256 02b51805784a4e282317e4f34e6a3f560c1f4948127c91d0416f30c123ce91b0）。
プローブは利用権限RPCを呼ばず、実利用権限・開始終了日時を変更していない。公開鍵指紋の既存診断は維持。

次のMac操作は、CI結果を確認した修正版ソースの取得とビルド。新しい診断コマンド・再ログインを先に依頼しない。
