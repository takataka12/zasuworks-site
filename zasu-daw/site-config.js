// 1回の購入でmacOS / Windowsの両方を利用できます（共通のSquare決済リンク）。
// 配布導線の確認が完了してからsalesEnabledをtrueにします。
window.ZASU_SALES = {
  salesEnabled: false,
  priceLabel: "1,980円（税込）",
  regularPriceLabel: "2,980円",
  purchaseNote: "",
  checkoutUrls: {
    mac: "https://square.link/u/M3YGTWd8",
    windows: "https://square.link/u/M3YGTWd8"
  }
};
