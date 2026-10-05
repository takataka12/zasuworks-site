// 1回の購入でmacOS / Windowsの両方を利用できます（共通のSquare決済リンク）。
// 購入受付を有効化。決済後は購入確認付きの受け取りページへ戻ります。
window.ZASU_SALES = {
  salesEnabled: true,
  priceLabel: "1,980円（税込）",
  regularPriceLabel: "2,980円（税込）予定",
  purchaseNote: "FOUNDING USER価格・先着10名。買い切りでMac版・Windows版の両方を利用可能。今後のアップデート追加料金なし。",
  checkoutUrls: {
    mac: "https://square.link/u/M3YGTWd8",
    windows: "https://square.link/u/M3YGTWd8"
  }
};
