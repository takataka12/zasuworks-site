# Product selection guide

`tools/build-product-guide.cjs` owns the shared product roles, use cases,
environments, limitations, comparisons and related-product recommendations.
It renders static, JavaScript-independent guides into the homepage, product
catalogue and the DAW / VOCAL / VOCAL EDITOR / LOUD / FINISH landing pages.

Update the `products` array, run `node tools/build-product-guide.cjs`, and commit
the generator alongside generated HTML. Scoped responsive styles live in
`assets/product-guide.css`. Marked PRODUCT_GUIDE regions are replaced
idempotently; surrounding checkout, delivery, support and page content remain
unchanged. Price links use existing purchase sections so display prices and
commercial conditions remain managed by the existing product pages.

The homepage starts from six visitor tasks. The catalogue compares the same
products and explains the two easily confused pairs. Product pages show the
same use case, environment, current limitations and differences, followed by
price/purchase, download, comparison and support routes. AUDIO links to the
existing external Web service; it is not a desktop download.

PC uses a comparison table. Narrow screens show labelled product rows without
horizontal table scrolling. Keyboard access uses native links and visible
focus styles. Tests cover seven routes at 320 / 390 / 1440px, content, internal
links and existing buyer flows. GitHub Pages rebuilds the guides and runs the
product-guide suite both before and after deployment.
