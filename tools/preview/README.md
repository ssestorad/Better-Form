# Preview

A browser preview of real Better Form components with a stand-in Obsidian API and sample data (never your own data). It's a development tool for checking the layout and making README screenshots – it isn't part of the plugin.

```bash
npm run preview                         # build into tools/preview/dist
node tools/preview/shots.mjs            # screenshots of all views in English and Czech
node tools/preview/shots.mjs plan cs 420
```

- `entry.js` – sample data and the views (`?view=plan|records|onboarding|tabs|forms|library|browser&lang=en|cs`); add a view there when you need to check another component.
- `obsidian-stub.js` – the minimum of the Obsidian API the components use; add what a new component needs.
- `build.mjs` – esbuild with the plugin's Svelte setup; writes `index340/420/640/700.html` (panel widths).
- `check.mjs` (`npm run check:ui`, runs in CI) – opens every tab of the real plugin (real services over the sample notes), all forms (also with collapsed sections open) and the exercise library in both languages at 340 and 700 px; fails when a tab crashes or stays empty, anything in a tab or form overlaps or overflows (compared line by line, so wrapped text isn't a false alarm), or a tapped exercise's detail isn't visible.
- `shots.mjs [view] [lang] [width]` – `"tabs&tab=today"` shows one real view; headless Chrome or Edge (`PREVIEW_BROWSER` overrides the path); the window can't be narrower than about 500 px, so narrow pages get cropped on the right.

The base CSS only approximates Obsidian's theme – check spacing and buttons in Obsidian itself before relying on a screenshot.
