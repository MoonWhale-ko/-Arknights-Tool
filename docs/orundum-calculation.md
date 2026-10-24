# Private Orundum test

This phase covers owned-operator Paradox Simulation first-clear rewards, currently open Annihilation first-time kill milestones, and a separate weekly Annihilation balance. Additional sections cover current daily/weekly missions, fixed event check-ins, monthly check-ins where the game table contains Orundum, active subscription login days, and conditional certificate-shop exchanges. Mail, shard production and Originite conversion remain outside the confirmed balance.

`build_orundum_catalog.py` builds public inputs from KR handbook and campaign tables plus operator names. It reads no player export. The pinned source revision is in the generated catalog. Rebuild using the same excel directory as the mining catalog.

Paradox rewards use handbook `rewardItem` amounts for `4003`; unlock requirements use the actual AWAKE elite/level tuple. Advancing past the required elite phase satisfies a lower-phase level requirement. Completion is read from `troop.addon[charId].stage[stageId]`, not ordinary `dungeon.stages`. Missing owned records are considered incomplete. Unowned operators and future release dates are excluded; owned operators requiring further training remain in the future obtainable pool with a training label.

Annihilation first-clear rewards use `breakLadders[].rewards` and preserve the original ladder index when reading `campaignsV2.instances[stageId].rewardStatus`. Flag 1 is received, flag 0 is unreceived. An unrecognized or truncated receipt array is not silently treated as unreceived. Reaching the kill threshold without a receipt flag is distinguished from claiming the reward. A map is eligible only while a permanent, rotating, training, or all-open route is active. Overlapping routes do not duplicate reward identities. Training first-time rewards are independent of recurring weekly rewards.

Weekly remaining Orundum is `campaignTotalFee - campaignCurrentFee`, using the user's actual current cap. It is never included in the one-time balance. A snapshot from a previous KR week (Monday 04:00 KST boundary) cannot supply this week's remaining amount. Same-week snapshots retain their original query timestamp; subsequent game activity requires a new import.

The UI uses browser memory only; imports are not uploaded and no private export or player totals are committed. Tests cover operator ownership, elite/level ordering, first-clear completion, original receipt indices, reached-but-unclaimed milestones, overlapping route deduplication, closed maps, weekly freshness, invalid exports, filtering, the account bridge, and clearing.


## Additional content

Mission groups come from the active daily period/weekday and weekly validity windows. Reward periodicalPointCost is incremental: cumulative thresholds are built in display order; already spent costs are added back to the remaining point counter for progress display. Claimed flags prevent double counting. Previous-day and previous-week snapshots cannot supply current-period mission receipts.

Fixed event receipts use activity check-in history (0 confirmed, 1 claimable), while ordinary monthly check-in history uses 1 as received; these adapters are separate. Future fixed rewards are capped by remaining login opportunities before the event end. CHECKIN_ACCESS uses its explicit rewardsCount, currentStatus, game dayCount and rewardItemPerDay. Source: extracted client feature/activity/checkinaccess/CheckinAccessViewModel.lua and ActCheckinAccessMainDlg.lua. PRAY_ONLY, FLOAT_PARADE and BLESS_ONLY are random and are listed without adding forecast amounts. Only existing subscription validity is counted; no new purchases or infinite renewals are assumed.

Owner inspection optionally requests the official server's /shop/getLowGoodList and /shop/getExtraGoodList after sync with sequential session headers. It does not call purchase or claim endpoints. The public import flow is unchanged. Original syncData remains intact; shop results are exported under supplementary.shops. If a shop query fails, raw syncData still succeeds and later sequence-sensitive queries stop. No credentials leave the server.

Shop calculations require these server responses; old JSON files explicitly request reimport instead of guessing prices or inventory limits. Exchange stock and per-item affordability remain separate from free rewards. Infinite stock does not enter finite stock totals; locked later tiers cannot spend their unlimited stock. Certificate budgets are shown per item, never summed as if the same currency could fund all items. Monthly expiry and unknown currency balances are handled conservatively. Live KR shop compatibility requires a new owner import; a query failure is shown without discarding the snapshot.
