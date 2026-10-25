# Private site preview

The admin's 배포 전 미리보기 tab serves an authenticated `/preview/` build. Wrangler's build command runs `workers/admin/scripts/build-preview.mjs` on every deploy and local dev build. Public pages, assets, data and research come from the same repository revision as Pages; only proposed home navigation/layout and the new rewards page are preview additions. Generated output is ignored by Git.

`preview-rewards.html`, `.js` and `.css` form one 광산 page. It displays both Originite Prime and Orundum and uses the existing mining/Orundum engines. Only one-time stage, milestone, Paradox and first-clear Annihilation rewards contribute. Daily/weekly farming, attendance, subscriptions, shops and random rewards are omitted. There is no JSON file input or currency-page switch.

The normal account service returns a dedicated `rewards` progress projection without account identity or authentication fields. Applying an import saves it in `arknightsOneTimeRewardsV1`, alongside the existing account state in browser storage. Import rollback and undo cover this key too. The page calculates automatically on load and on import/undo/storage updates. Older imports without reward progress require a fresh account import. The ordinary account importer also works in the authenticated admin preview origin, which is an explicit allowed origin on the account service.

Admin full-account inspection can additionally supply its in-memory snapshot to the selected preview iframe, using origin/source checked messages, on initial request or a new admin sync. No account records are bundled into preview files or sent to GitHub. Clearing admin inspection clears the frame result. A separate preview window can use the normal importer.

Only `/preview/` assets permit same-origin framing after owner authentication. Other admin pages retain framing denial. The toolbar supports full width, 768px, 390px, reload and a separate window. This is viewport sizing, not device emulation.
