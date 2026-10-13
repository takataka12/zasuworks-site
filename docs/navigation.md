# Shared site navigation

The public site uses a dependency-free, statically rendered header. Main links,
activity/service links, support links, product links and the ACCOUNT destination
are defined once in `tools/navigation/config.cjs`. Page-specific purchase,
download and editorial shortcuts are in `tools/navigation/page-links.json`.

## Add or update a page

1. Add the public HTML page normally. Use absolute site paths for navigation.
2. Add contextual shortcuts to `page-links.json` when the page needs them.
3. Run `node tools/build-media.cjs` then `node tools/build-navigation.cjs`.
4. Review and commit the changed HTML along with navigation sources.

The generator discovers public HTML pages recursively and replaces the marked
`ZW_NAV_START` / `ZW_NAV_END` region. It appends the scoped shared stylesheet and
interaction script after page-specific styles without changing page content,
forms, purchase buttons, authentication scripts or download verification.
The MEDIA publisher also renders this same header for generated and future
review pages. GitHub Pages builds MEDIA before rebuilding shared navigation.

## Responsive and accessible behavior

- Desktop (1200px and above): main links, product/activity/support dropdowns,
  and a distinct ACCOUNT link. Dropdowns use native details/summary controls.
- Smaller screens: main links in one column, secondary links in grouped rows,
  and a separate ACCOUNT card. The menu scrolls within the available dynamic
  viewport height and respects safe-area padding.
- Open menus preserve body scroll position and inline styles, isolate background
  content with inert, trap keyboard focus, restore focus on Escape/close, and
  close on link activation or a desktop breakpoint change.
- Current page/location is marked consistently. Native HTML fallback menus are
  available without JavaScript. Reduced-motion settings remove animation.

## Coverage

42 public pages (37 tracked source HTML pages plus 5 generated MEDIA pages) use
the shared header, including legal, product, download, ACCOUNT, Client Portal,
and AvatarLive pages. Internal admin tools, the noindex AUDIO account-connection
bridge, visual QA fixtures and the noindex iframe QA page are intentionally
excluded; their specialized controls and integration behavior remain intact.

## Verify

Run `node tools/build-media.cjs --check`, `node --test tests/*.test.cjs
supabase/tests/*.test.mjs`, and `NAV_WEBKIT=1 node --test tests/navigation.test.cjs`
when the matching Playwright browsers and OS dependencies are installed.
`SITE_URL=https://zasuworks.jp` checks the published site. `CAPTURE_DIR` saves
screenshots. Navigation tests cover every public route and header anchor,
320/390/768/1024/1440px layouts, dropdown keyboard behavior, focus isolation,
menu scrolling and body scroll restoration. Other suites exercise unchanged
buyer, authentication, account, download and media flows with test fixtures;
no real payments are made by the tests.
