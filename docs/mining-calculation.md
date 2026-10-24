# Private mining test: rules and validation

## Source of truth

Reward identities, quantities, prerequisite ratings, difficulty links, availability routes, and milestone thresholds come from KR game tables pinned in `scripts/build_mining_catalog.py`. Rebuild with:

```sh
python scripts/build_mining_catalog.py /path/to/kr/gamedata/excel
```

Account imports only supply player progress and reward receipt status. Private exports are never committed or sent to GitHub.

## Completion and missing records

The evidence engine keeps minimum and maximum completion ratings. A completed child proves precisely what its unlock gate requires: `PASS` proves a clear, not three stars; `COMPLETE` proves full completion. If a prerequisite cannot have met the required rating, an absent descendant is classified as not unlocked. Complete-list medals can prove full completion. Unknown absent records retain the user's incomplete assumption, visibly distinguished from prerequisite-backed conclusions.

Higher environment completion folds down along `diffGroupTable` and the explicit `sixStarStageId` link. Standard completion never grants Challenge Mode completion. Zero-OP prerequisites remain in the graph but never add to the reward total. Shared `ALL` story nodes and matching event/permanent IDs each count once.

## Simulation and milestones

A simulation first-clear reward is a distinct stage entitlement; additional star progression is not another repeatable stage OP reward. Stage `tagFinish` uses `NONE=0`, `FINISH_LEVEL1=1`, `FINISH_LEVEL2=2`, rather than a bit mask or clear count. The sum is checked against the region's stored `point`; a discrepancy is shown and the stored point takes precedence. Milestones are generated from game `nodePoint` and `rewardList`; only `4002` quantities enter mining totals. The nine OP milestones in episodes 15–17 are separate from stage first clears and H-stage rewards. H access labels include their point requirement.

The player milestone enum is `UNLOCK=0`, `FINISH=1`, `CONFIRMED=2`. Only 2 is accepted as received; unfamiliar enum values remain unknown. Threshold reached without receipt is shown as collectible. Unreached rewards remain part of the obtainable future pool, with additional-star progress required.

Client type references, extracted from game Assembly-CSharp.dll:

- https://github.com/AdoreJc/ArknightsDB/blob/95ce0f0823f233389fa97e0d7fc9d1759e58464e/source/dump/Torappu/PlayerSixStarTagFinishState.md
- https://github.com/AdoreJc/ArknightsDB/blob/95ce0f0823f233389fa97e0d7fc9d1759e58464e/source/dump/Torappu/PlayerSixStarMilestoneState.md
- https://github.com/AdoreJc/ArknightsDB/blob/95ce0f0823f233389fa97e0d7fc9d1759e58464e/source/dump/Torappu/PlayerSixStarMilestone.md

## Verification scope

Automated fixtures cover absent chains, PASS versus COMPLETE, downward completion links, separate challenge entitlements, shared rewards, milestone receipt, threshold crossing, repeated clear counts, progress mismatch, closed events, permanent routes and KR daily rotation. Private before/after fixtures verified HS-8 completing and HS-9 appearing unplayed; episode 17 data also illustrates automatic lower completion with zero direct clear count. Nonzero simulation tiers and receipt transitions use synthetic fixtures; the two supplied accounts have zero simulation points. Game tables remain a pinned snapshot, not a live server feed.
