# Private site preview

The admin's 배포 전 미리보기 tab serves an authenticated `/preview/` build. Wrangler's build command runs `workers/admin/scripts/build-preview.mjs` on every deploy and local dev build. It copies public HTML, assets, game data and research directly from the same repository revision used by Pages. Generated output is ignored by Git.

The proposed rewards page is generated from the existing admin reward section markup and uses the same calculation modules, plus the public site's `zoot.css` and `zoot.js`. It is not added to the public Pages output yet. Future public publication should promote this generated page and its module dependencies together.

Only `/preview/` allows same-origin framing, after owner authentication. Other admin pages retain frame denial. The toolbar supports full width, 768px, 390px, reload, and a separate window. Width selection is a viewport preview, not browser/device emulation.

Account transfer is explicit, origin checked and limited to the selected preview iframe. Data stays in browser memory; it is not bundled into preview assets or sent to GitHub. Separate windows can import JSON themselves. Clearing the admin account clears reward results in its preview frame too.
