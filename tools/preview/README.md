# Preview

A browser preview of real Better Form components with a stand-in Obsidian API and sample data (never your own data). It's a development tool for checking the layout and making README screenshots – it isn't part of the plugin.

```bash
npm run preview                         # build into tools/preview/dist
node tools/preview/shots.mjs            # screenshots of all views in English and Czech
node tools/preview/shots.mjs plan cs 420
```

- `entry.js` – sample data and the views (`?view=plan|records|onboarding&lang=en|cs`); add a view there when you need to check another component.
- `obsidian-stub.js` – the minimum of the Obsidian API the components use; add what a new component needs.
- `build.mjs` – esbuild with the plugin's Svelte setup; writes `index340/420/640/700.html` (panel widths).
- `shots.mjs` – headless Edge or Chrome (`PREVIEW_BROWSER` overrides the path); the window can't be narrower than about 500 px, so narrow pages get cropped on the right.

The base CSS only approximates Obsidian's theme – check spacing and buttons in Obsidian itself before relying on a screenshot.
