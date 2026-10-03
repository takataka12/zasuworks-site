// 1回の購入でmacOS / Windowsの両方を利用できます（共通のSquare決済リンク）。
// 購入受付を有効化。決済後は購入確認付きの受け取りページへ戻ります。
window.ZASU_SALES = {
  salesEnabled: true,
  priceLabel: "1,980円（税込）",
  regularPriceLabel: "2,980円",
  purchaseNote: "買い切り。1回の購入でMac版・Windows版の両方をご利用いただけます。",
  checkoutUrls: {
    mac: "https://square.link/u/M3YGTWd8",
    windows: "https://square.link/u/M3YGTWd8"
  }
};
