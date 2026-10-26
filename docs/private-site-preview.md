# Public reward page and private preview

The mining page is published at `rewards.html`. Its HTML is canonical in the repository root. The reviewed UI and CSS sources remain in `workers/admin/public/preview-rewards.js` and `.css`; calculation modules and public game catalogs remain in the adjoining `mining/` and `orundum/` directories.

`scripts/build_rewards_site.mjs` exports `buildRewards(outputDirectory)`. Pages copies the normal site sources into `_site`, then runs this build to publish only the reward HTML, UI/CSS, calculation modules and static game catalogs. Account exports, admin application code, authentication routes and private account data are never copied into the public bundle. Relative imports and data URLs support the GitHub Pages repository path.

The admin Wrangler build runs `workers/admin/scripts/build-preview.mjs`: it copies the same root HTML/assets/data/research and calls the same reward build. The preview and public page therefore use identical HTML, CSS, data, navigation and guide definitions. Admin preview routes remain authenticated. The viewport controls use full width, 768px or 390px.

The page calculates only one-time stage, milestone, Paradox and first-clear Annihilation rewards. It uses the normal account import's `rewards` projection, stored in `arknightsOneTimeRewardsV1`. Account apply, rollback, undo and storage changes update reward progress. Older imports without progress need a fresh import. There is no JSON upload or recurring income in the reward page.

When embedded in admin, the preview can additionally receive its in-memory account snapshot through origin/source checked messages. Public hosting does not require an admin login; its normal email-based account import uses the existing account service.
