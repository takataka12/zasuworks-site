'use strict';
// Single source of product facts for the generated site.
// Sales gates, checkout URLs and the FINISH / VOCAL EDITOR price schedule are READ from the
// existing release/config files so the redesign can never disagree with checkout.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

function windowConfig(file, key) {
  const ctx = { window: {} };
  vm.runInNewContext(read(file), ctx);
  if (!ctx.window[key]) throw Error(`${file} did not define window.${key}`);
  return ctx.window[key];
}

// duo-release.js is an IIFE that touches the DOM, so extract its constants instead of running it.
function duoRelease() {
  const src = read('assets/duo-release.js');
  const one = re => { const m = src.match(re); if (!m) throw Error('duo-release.js: missing ' + re); return m[1]; };
  const obj = re => Object.fromEntries([...one(re).matchAll(/'?([a-z-]+)'?\s*:\s*'([^']+)'/g)].map(m => [m[1], m[2]]));
  return {
    ready: one(/const ready = (true|false);/) === 'true',
    launchAt: Date.parse(one(/const launchAt = Date\.parse\('([^']+)'\)/)),
    normalAt: Date.parse(one(/const normalAt = Date\.parse\('([^']+)'\)/)),
    launchLinks: obj(/const links = \{([^}]+)\}/),
    regularLinks: obj(/const regularLinks = \{([^}]+)\}/),
  };
}

const vocalGate = windowConfig('zasu-vocal/release-config.js', 'ZASU_VOCAL_RELEASE');
const dawGate = windowConfig('zasu-daw/site-config.js', 'ZASU_SALES');
const booth = windowConfig('assets/booth-config.js', 'ZASU_BOOTH');
const duo = duoRelease();

const BOOTH_SHOP = 'https://percymusic.booth.pm/';
const LINE_URL = 'https://line.me/R/ti/p/@860wogaj';
const EMAIL = 'zasuworks@gmail.com';
const boothItem = (key, id) => (booth.shopOpen && booth.products?.[key]) ? `${BOOTH_SHOP}items/${id}` : null;
const img = (name, widths, w, h, alt) => ({ name, widths, w, h, alt });

const MAC_SIGNED = 'Mac版：Developer ID署名・Apple公証済み';
const WIN_UNSIGNED = 'Windows版：未署名。初回起動時にSmartScreenの警告が出る場合があります';
const REFUND_7 = { guaranteed: true, text: 'Square購入は7日間返金保証の対象です。使ってみて合わなかった場合も、購入から7日以内なら返金します。', href: '/zasu-loud/terms.html#refund-guarantee' };
// Install steps shown before purchase on FINISH / VOCAL EDITOR (same facts as their download pages).
const install = (mac, win) => ({
  intro: '会員登録・ログインは不要です。製品別の受け取りページでSquareの領収書URLか取引IDを入力すると、購入確認後にMac版とWindows版の両方を取得できます。',
  mac: '公証済みDMGを開き、Standaloneの.appをアプリケーションへコピー。AUの.componentは ~/Library/Audio/Plug-Ins/Components/、VST3は ~/Library/Audio/Plug-Ins/VST3/ に置き、DAWを再起動して再スキャンします。隔離属性を解除するコマンドは不要です。',
  win: 'Setup.exeのファイル名と下のSHA-256を確認して実行し、VST3 / Standaloneを選んでインストールします。Windows版は未署名のため、SmartScreenの警告が出た場合は「詳細情報」から「実行」を選べます。セキュリティ機能を無効にする必要はありません。',
  hashes: [mac, win],
});
const REFUND_NONE = text => ({ guaranteed: false, text: text || 'デジタル商品のため、購入者都合の返金は原則お受けしていません。重複決済・配布不備など当方の責による場合は個別に対応します。' });

/**
 * FINISH / VOCAL EDITOR offer. At runtime /assets/duo-release.js (purchase button, exact Square link) and
 * /assets/offer-display.js (price text) stay authoritative; this only provides the initial static text,
 * written exactly as offer-display.js would write it at build time, so no-JS visitors see the same wording.
 */
function duoOffer(key, launch, regular, now) {
  const isRegular = now >= duo.normalAt;
  const yen = n => n.toLocaleString('ja-JP');
  return {
    duo: true, onSale: duo.ready, status: '発売前', launch, regularPrice: regular,
    price: isRegular ? regular : launch,
    label: isRegular ? `通常価格 ${yen(regular)}円` : `発売記念 ${yen(launch)}円`,
    period: isRegular ? '税込・買い切り / Square通常価格。BOOTHの価格は商品ページでご確認ください。'
      : `税込・買い切り / Square発売記念価格：10月31日まで。11月1日から通常価格 ${yen(regular)}円。BOOTHの価格は商品ページでご確認ください。`,
  };
}

function products(now = Date.now()) {
  const vocalOn = vocalGate.salesEnabled === true && vocalGate.protectedDeliveryReady === true;
  const dawOn = dawGate.salesEnabled === true;
  return [
    {
      og: '/assets/site/img/og-vocal.jpg', key: 'vocal', name: 'ZASU VOCAL', version: 'v1.0.0', kind: 'ボーカルプラグイン',
      task: '歌声の音程を直して、そのままMIXまで',
      lead: '歌声を解析し、キーに合わせて自然に補正。ノイズ低減、EQ・コンプ、リバーブまでひとつのプラグインで。',
      offer: vocalOn ? { onSale: true, price: 3980, checkout: vocalGate.checkoutUrl } : { onSale: false, status: '販売停止中', price: 3980 },
      booth: boothItem('vocal', '8978838'),
      hero: img('vocal-logic', [1536, 960, 640], 1536, 999, 'Logic Proで動作するZASU VOCAL v1.0.0。解析、補正、ミックスの3段の操作パネル'),
      caption: 'v1.0.0 / Logic Pro内の実画面',
      formats: [['Mac', 'AU / VST3 / Standalone（Apple Silicon・Intel Universal）'], ['Windows', 'VST3 / Standalone（x64）']],
      verified: ['Logic ProでAU動作を実機確認済み', 'VST3はホスト検証済み。Cubaseでの実機確認は未実施', MAC_SIGNED, WIN_UNSIGNED],
      limits: ['キーは自分で指定します（自動判定はv1.0.0では非対応）', '解析と補正済み音声の再生はDAW内で使用。StandaloneはリアルタイムFX向けです'],
      steps: [
        ['解析', '曲を再生するだけで、歌声の音程をノートとピッチ軌跡で表示します。'],
        ['補正', 'キーとスケール（メジャー / マイナー / クロマチック）を選び、補正の強さを決めて自動補正。標準は自然寄りの70%です。'],
        ['仕上げ', 'ノイズ低減（補正後の音声にも適用可）、EQ・コンプ、リバーブ・ダブラー・ディレイ・ハモリで歌を整えます。'],
      ],
      faq: [
        ['いま使っているDAWを変える必要はありますか？', 'ありません。対応DAWのボーカルトラックにプラグインとして挿して使います。'],
        ['補正すると機械的な声になりませんか？', '歌い方を残す補正が標準です（強さ70%）。強さは調整でき、聴きながら決められます。仕上がりは元の歌唱と設定によって変わります。'],
        ['MIXの知識がなくても使えますか？', '解析 → 補正 → 仕上げの順に上から操作する画面です。EQ・コンプ・空間系も同じ画面にまとまっています。'],
      ],
      refund: REFUND_7,
      legal: { tokushoho: '/zasu-loud/tokushoho.html', terms: '/zasu-loud/terms.html' },
      download: '/zasu-vocal/download/', anchors: ['purchase', 'steps', 'howto', 'compatibility', 'faq'],
      related: ['vocal-editor', 'loud'],
    },
    {
      og: '/assets/site/img/og-loud.jpg', key: 'loud', name: 'ZASU LOUD', version: 'v2.0.0', kind: '音圧プラグイン',
      task: '音圧を上げたい。でも音は潰したくない',
      lead: '低域とアタックを先に守ってから、クリッパーとリミッターの2段で音圧を上げる。MATCHで音量を揃えて、本当に良くなったかを耳で確かめられます。',
      offer: { onSale: true, price: 2980, checkout: 'https://square.link/u/pJNTXnu7' },
      booth: boothItem('loud', '8978866'),
      hero: img('loud-plugin', [1080, 720], 1080, 630, 'ZASU LOUD v2.0.0のプラグイン画面。PUNCH、TONE、OUTPUT、LINKのノブと中央のLOUDノブ、メーター'),
      caption: 'v2.0.0 / Windows実機の画面を撮影',
      formats: [['Mac', 'AU / VST3 / Standalone（Apple Silicon・Intel Universal）'], ['Windows', 'VST3 / Standalone（x64）']],
      verified: ['Logic Pro / Apple AU Validation確認済み', MAC_SIGNED, WIN_UNSIGNED],
      limits: ['仕上がりは元の音源と設定によって変わります'],
      points: [
        ['低域とアタックを守る', 'キックやベースの芯、スネアの立ち上がりを先に保護してから音圧を上げます。'],
        ['すでに大きい音源は押しすぎない', '十分にラウドな素材を検知すると、内部のドライブを自動で控えめにします。'],
        ['MATCHで公平に比べる', '処理後の音量を下げて揃え、音が大きいだけで良く聞こえる錯覚を減らします。'],
      ],
      specs: [['オーバーサンプリング', '4倍'], ['モード', 'NORMAL / LOUD / EXTREME'], ['プリセット', 'ZASU DEFAULT、MASTER、METAL、VOCAL、DRUM BUS、MAX LOUD']],
      demo: {
        note: '旧版で2026年10月1日に収録したMASTERプリセットの参考音源です。現行v2.0.0の録音ではありません。',
        tracks: [
          ['処理前と処理後をそのまま比較', '/zasu-loud/assets/ZASU_LOUD_CLEAR_RAW_AB.m4a', '処理前と処理後が、同じフレーズで交互に流れます。', 'demoRaw'],
          ['音量を揃えて比較', '/zasu-loud/assets/ZASU_LOUD_CLEAR_LEVEL_MATCHED_AB.m4a', '処理後を約5.18 dB下げ、平均レベルを揃えています。', 'demoMatched'],
        ],
      },
      faq: [
        ['普通のリミッターと何が違いますか？', '最終段だけで音圧を稼がず、低域保護・アタック保護・クリッパー・リミッターに仕事を分けています。'],
        ['どこに挿せばいいですか？', 'マスター、ドラムバス、ボーカルなど。プリセットから選び、LOUDノブで量を決めます。'],
        ['Intel Macでも使えますか？', 'はい。Mac版はApple Silicon / Intel対応のUniversalです。'],
      ],
      refund: REFUND_7,
      legal: { tokushoho: '/zasu-loud/tokushoho.html', terms: '/zasu-loud/terms.html' },
      download: '/zasu-loud/download/', anchors: ['buy', 'features', 'demo', 'system'],
      related: ['finish', 'vocal'],
    },
    {
      og: '/assets/site/img/og-finish.jpg', key: 'finish', name: 'ZASU FINISH', version: 'v1.0.0', kind: '仕上げプラグイン',
      task: '曲全体のバランスと質感を、最後に整える',
      lead: '3つの仕上げプリセットから選び、センター・ボーカル・低域・奥行き・空気感を調整。原音と音量を揃えて比べながら仕上げます。',
      offer: duoOffer('finish', 1980, 2980, now),
      booth: boothItem('finish', '8978988'),
      hero: img('finish-plugin', [1520, 960, 640], 1520, 1040, 'ZASU FINISHのプラグイン画面。MAX FINISHプリセット、原音と処理後の切り替え、音量合わせ'),
      caption: 'v1.0.0 RC4の実画面。販売版とは表示が一部異なる場合があります',
      gallery: [
        img('finish-player', [1440, 960], 1440, 1280, 'ZASU FINISH PLAYERの画面。WAV波形、プリセット、比較、書き出し'),
        img('finish-advanced', [1200, 760], 1200, 1200, 'ZASU FINISHの詳細設定。仕上がり量、センター、ボーカル、低域の安定、奥行き、空気感のスライダー'),
      ],
      formats: [['Mac', 'AU / VST3 / Standalone（Apple Silicon・Intel Universal、macOS 11以降）'], ['Windows', 'VST3 / Standalone（x64）']],
      verified: ['Mac / Windows実機でのインストール・起動確認は未実施です', MAC_SIGNED, WIN_UNSIGNED],
      limits: ['試聴音源は権利確認後に掲載予定です', 'PCM書き出しでは安全のため音量が下がる場合があります'],
      points: [
        ['プリセットから始める', 'MAX FINISH / ROCK BALANCE / NATURAL FINISHの3つから、音源に近いものを選びます。'],
        ['原音と公平に比べる', 'A/B切り替え、ラウドネスマッチ、バイパスで、変化だけを聴き比べられます。'],
        ['WAVを読んで、書き出す', 'StandaloneのPLAYERでWAVを読み込み、比較してFloat32 / PCM24で保存できます。'],
      ],
      faq: [
        ['LOUDとの違いは？', 'LOUDは音圧と密度、FINISHは全体のバランスと質感。目的が違う別製品です。'],
        ['返金はできますか？', '7日間返金保証の対象外です。重複決済・配布不備など当方の責による場合は個別に対応します。'],
      ],
      install: install(['ZASU-FINISH-v1.0.0-NOTARIZED.dmg', '7f41519bee7e2ebbc69d55426ffa4557a364b996088265043519773bd772eaa9'], ['ZASU_FINISH_v1.0.0_Setup.exe', '0633fcecd7ca12f883f68b9a247d4f4dfc468cb7add7acef48b6c7b8ef9b4a21']),
      refund: REFUND_NONE(),
      legal: { tokushoho: '/zasu-finish/tokushoho.html', terms: '/zasu-finish/terms.html' },
      download: '/zasu-finish/download/', anchors: ['pricing', 'interface', 'requirements'],
      related: ['loud', 'daw'],
    },
    {
      og: '/assets/site/img/og-vocal-editor.jpg', key: 'vocal-editor', name: 'ZASU VOCAL EDITOR', version: 'v0.3.0', kind: '音程編集プラグイン',
      task: '気になる音だけ、ノートを見ながら手で直す',
      lead: 'AUTO EDITでまとめて補正してから、ノートのドラッグや分割、ピッチカーブの編集で一音ずつ追い込めます。',
      offer: duoOffer('vocal-editor', 2980, 3980, now),
      booth: boothItem('vocal-editor', '8979001'),
      hero: { name: null, src: '/assets/ui/vocal-editor/editor-landscape.avif', w: 700, h: 525, alt: 'DAW内で動作するZASU VOCAL EDITOR。音程グリッド上のノートとAUTO FIXの操作欄' },
      caption: 'DAW内で使用した実画面',
      formats: [['Mac', 'AU / VST3（Apple Silicon・Intel Universal、macOS 11以降）'], ['Windows', 'VST3（x64）']],
      verified: ['Mac / Windows実機でのインストール・起動確認は未実施です', MAC_SIGNED, WIN_UNSIGNED],
      limits: ['単独ボーカルを最大120秒まで取り込み', 'ノートの長さ・タイミング変更、フォルマント独立編集は未搭載', '補正作業は対応DAW内で使用（Standaloneは同期再生に制約あり）', '試聴音源は権利確認後に掲載予定です'],
      points: [
        ['AUTO EDITでまとめて補正', 'NATURAL / STANDARD / STRONGから選択。AUTO REVIEWが確認したい箇所に印を付けます。'],
        ['一音ずつ手で直す', 'ノートの上下ドラッグと分割、ピッチカーブの制御点編集。Undo / Redoに対応します。'],
        ['原音と切り替えて聴く', '「A 原音」「B 補正後」を切り替えて確認し、DAWのプロジェクトに保存できます。'],
      ],
      faq: [
        ['VOCALとの違いは？', 'VOCALは補正からEQ・コンプ・空間系までまとめたもの。VOCAL EDITORはノート単位の音程編集が中心です。両方買う必要はありません。'],
        ['返金はできますか？', '7日間返金保証の対象外です。重複決済・配布不備など当方の責による場合は個別に対応します。'],
      ],
      install: install(['ZASU-VOCAL-EDITOR-v0.3.0-NOTARIZED.dmg', 'dfa5dcf570f7349ff13d0a198e6e19ee3c32bf7a289e290558735209452a435a'], ['ZASU-VOCAL-EDITOR-0.3.0-Setup.exe', 'cff0379414c711c379f6a60284a86f4189d2b1f378713fe5e1a80f4716b55988']),
      refund: REFUND_NONE(),
      legal: { tokushoho: '/zasu-vocal-editor/tokushoho.html', terms: '/zasu-vocal-editor/terms.html' },
      download: '/zasu-vocal-editor/download/', anchors: ['pricing', 'interface', 'requirements'],
      related: ['vocal', 'daw'],
    },
    {
      og: '/zasu-daw/assets/ogp-v14-founding.png', key: 'daw', name: 'ZASU DAW', version: 'v1.4', kind: '歌ってみた用DAW',
      task: '録音から完成WAVまで、ひとつのソフトで',
      lead: '録音、歌の整え、ノート単位の音程補正、ハモリ、自動MIX、自動マスタリング、WAV書き出し。歌ってみた制作に必要な工程を順番に並べたDAWです。',
      offer: dawOn ? { onSale: true, price: 1980, regular: 2980, regularPlanned: true, note: 'FOUNDING USER価格・先着10名。通常価格は¥2,980の予定です', checkout: dawGate.checkoutUrls.mac } : { onSale: false, status: '販売停止中', price: 1980 },
      booth: boothItem('daw', '8979043'),
      hero: img('daw-pitch', [1600, 960, 640], 1600, 1040, 'ZASU DAW v1.4のPitch Editor。解析したノートと、AUTO FIX・手動編集の操作欄'),
      caption: 'v1.4 / Mac実機のPitch Editor',
      gallery: [
        img('daw-tracks', [1600, 960], 1600, 1040, '最大32トラックのマルチトラック画面'),
        img('daw-vocal', [1600, 960], 1600, 1040, 'ブレス、リップノイズ、タイミングを整える画面'),
        img('daw-harmony', [1600, 960], 1600, 1040, 'キー確認とハーモニー生成の画面'),
        img('daw-mix', [1600, 960], 1600, 1040, 'リバーブ・ダブラー・ディレイと歌のバランスを整えるAuto Mix画面'),
        img('daw-master', [1600, 960], 1600, 1040, '標準・高音圧を選んで比較するAuto Mastering画面'),
      ],
      formats: [['Mac', 'Apple Silicon・Intel Universal。外部プラグインはAU / VST3'], ['Windows', 'x64。外部プラグインはVST3']],
      verified: ['1回の購入でMac版とWindows版の両方を使えます', 'Windows版はWindows 11 ARM上のx64エミュレーションで確認。ネイティブx64実機での確認とは異なります', WIN_UNSIGNED],
      limits: ['すべての外部プラグインの動作を保証するものではありません', '自動補正・自動MIXは素材によって手動調整が必要です'],
      steps: [
        ['録音', 'インストを読み込んで歌う。入力モニターと3秒カウント、最大32トラック。'],
        ['歌を整える', 'ブレス・リップノイズ・タイミングを調整します。'],
        ['音程を直す', 'ANALYZE VOCALでノートを表示し、AUTO FIX（自然20% / 標準50% / 強め70%）で補正。気になる音だけ手で直します。'],
        ['ハモリ', 'キーを確認して、歌声にハーモニーを重ねます。'],
        ['MIX・マスタリング', 'Auto Mixでバランス、Auto Masteringで音圧を仕上げます。MIX ONLYで書き出しも可。'],
        ['WAV書き出し', '完成した一曲をWAVで保存します。'],
      ],
      benefits: ['公式LINEでの優先サポート', '今後のZASU DAWアップデートは追加料金なし', '新機能の先行体験の機会（提供予定）'],
      video: 'https://youtu.be/yAD6oBCpNwU',
      faq: [
        ['MacとWindowsの両方で使えますか？', 'はい。1回の購入で両方のOS版をダウンロードできます。'],
        ['外部プラグインは必要ですか？', '必須ではありません。内蔵のボーカルFX・Auto Mix・Auto Masteringだけで完成まで進められます。'],
        ['マスタリングせずに書き出せますか？', 'はい。MIX ONLYを選ぶとAuto Masteringを通さずにWAVを書き出せます。'],
        ['返金はできますか？', '7日間返金保証の対象外です。重複決済・配布不備など当方の責による場合は個別に対応します。'],
      ],
      refund: REFUND_NONE(),
      legal: { tokushoho: '/zasu-daw/tokushoho.html', terms: '/zasu-daw/terms.html' },
      download: '/zasu-daw/download/', anchors: ['pricing', 'pitch-editor', 'features', 'benefits', 'screens', 'demo', 'requirements'],
      related: ['vocal', 'vocal-editor'],
    },
  ];
}

const set = {
  key: 'vocal-loud-set', name: '歌ってみた制作セット', includes: ['vocal', 'loud'],
  price: 5980, separate: 3980 + 2980,
  checkout: 'https://checkout.square.site/merchant/ML4WFCYYG84WZ/checkout/KCX5YJTJVCYOP6RC4AFYRQ5X',
  download: '/vocal-loud-set/download/', refund: REFUND_7,
  legal: { tokushoho: '/zasu-loud/tokushoho.html', terms: '/zasu-loud/terms.html' },
};

module.exports = { products, set, duo, BOOTH_SHOP, LINE_URL, EMAIL, MAC_SIGNED, WIN_UNSIGNED };
