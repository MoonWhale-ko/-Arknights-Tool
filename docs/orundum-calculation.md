# Private Orundum test

This phase covers owned-operator Paradox Simulation first-clear rewards, currently open Annihilation first-time kill milestones, and a separate weekly Annihilation balance. It does not include missions, events, shop purchases, mail, shard production, or Originite conversion.

`build_orundum_catalog.py` builds public inputs from KR handbook and campaign tables plus operator names. It reads no player export. The pinned source revision is in the generated catalog. Rebuild using the same excel directory as the mining catalog.

Paradox rewards use handbook `rewardItem` amounts for `4003`; unlock requirements use the actual AWAKE elite/level tuple. Advancing past the required elite phase satisfies a lower-phase level requirement. Completion is read from `troop.addon[charId].stage[stageId]`, not ordinary `dungeon.stages`. Missing owned records are considered incomplete. Unowned operators and future release dates are excluded; owned operators requiring further training remain in the future obtainable pool with a training label.

Annihilation first-clear rewards use `breakLadders[].rewards` and preserve the original ladder index when reading `campaignsV2.instances[stageId].rewardStatus`. Flag 1 is received, flag 0 is unreceived. An unrecognized or truncated receipt array is not silently treated as unreceived. Reaching the kill threshold without a receipt flag is distinguished from claiming the reward. A map is eligible only while a permanent, rotating, training, or all-open route is active. Overlapping routes do not duplicate reward identities. Training first-time rewards are independent of recurring weekly rewards.

Weekly remaining Orundum is `campaignTotalFee - campaignCurrentFee`, using the user's actual current cap. It is never included in the one-time balance. A snapshot from a previous KR week (Monday 04:00 KST boundary) cannot supply this week's remaining amount. Same-week snapshots retain their original query timestamp; subsequent game activity requires a new import.

The UI uses browser memory only; imports are not uploaded and no private export or player totals are committed. Tests cover operator ownership, elite/level ordering, first-clear completion, original receipt indices, reached-but-unclaimed milestones, overlapping route deduplication, closed maps, weekly freshness, invalid exports, filtering, the account bridge, and clearing.
