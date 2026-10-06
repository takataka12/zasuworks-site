// 正式URLと署名状態を確認してから設定。配布導線が未設定の間は購入できません。
window.ZASU_VOCAL_RELEASE = Object.freeze({
  salesEnabled: false,
  checkoutUrl: "https://square.link/u/0CAFezE1", // ユーザー指定の正式決済URL
  purchaseDownloadUrl: null, // 購入者確認付きダウンロード案内ページ
  macDmgUrl: null,
  windowsSetupUrl: null,
  screenshotUrl: null,
  screenshotAlt: "ZASU VOCALのPitch / Note / Blob表示を含む実機画面",
  ogImageUrl: null, // OGPは公開前にindex.htmlのmetaへ静的に設定
  macNotarized: false,
  windowsUnsigned: true
});
