# Economy: the S5 pass and the simulator

Master prompt Sections 5 and 7, applied 2026-11-01.

## What changed in the S5 pass

- All four upgrade tracks cost **1.4x the old base prices**, rounded
  to the nearest 5: Backpack 55/125/250, Swift Boots 50/110/225,
  Fertilizer 65/140/280, Market Charm 70/155/310. The South Field
  went 150 -> 210 the same way. Owned levels are untouched; only
  future purchases pay the new prices.
- Farm Helper: 300 -> **450**. Cheese Churn: 400 -> **600**. Both
  prices now live in `src/data/EconomyData.ts` instead of being
  hardcoded in the shop code.
- Corn-for-gems trade: 9 -> **12 corn per gem** (the old rate
  undercut gem earnings from levels, dailies and contracts).
- Offline earnings unchanged (12 + 3 per level per hour, 4h cap):
  the simulator showed they are a minor term, and the prompt's
  target bands did not require touching them. The formula now reads
  from EconomyData too.
- Sell prices unchanged (corn 6, carrot 8, egg 9, milk 14, cheese
  42): the seed loop already taxes corn by 2 coins a cycle.

## The simulator

`npm run sim` (scripts/simulate.mjs) drives the REAL data files
through a documented model of a casual player: 25 minutes of play a
day, a leisurely sell rate limited by customer waves, the replant
loop's time tax, one sensible purchase a day. It prints a
before/after milestone table (the "before" column replays the
pre-S5 price table through the same model) and asserts the prompt
5.1 target bands. `SIM_DAILY=1 npm run sim` dumps the day-by-day
wallet, level and gems.

Latest run (2026-11-01, after S5): **all 7 checks pass.**

| Milestone | Before S5 | After S5 | Target |
| --- | --- | --- | --- |
| Day 1 wallet | 68 | 68 | 40-120 |
| South Field day | 3 | 3 | 2-5 |
| Helper day | 5 | 5 | 3-6 |
| First land pack day | 9 | 8 | 4-8 |
| Level 10 day | 13 | 13 | 12-20 |
| Gems by day 30 | 59 | 59 | >= 15 |
| Coins by day 30 | 369 | 205 | growing |

Day-30 coins are lower after the pass because the model player
keeps buying: the money went into pricier upgrades and tiers, which
is the point of a harder economy. Net progression (levels, land,
animals) is unchanged or slightly faster; the wallet is tighter.

## Honesty note

The simulator is a model with stated assumptions, not a measurement
of real players. Its constants (25 min/day, ~55 sold items/hour
demand cap, the replant tax) are written down in the script header
so anyone can argue with them. Two modelling discoveries were real,
though: animal products must stay a minority of a casual player's
sales (pen trips are occasional), and the seed loop's replanting
time, not prices, is what paces mid-game XP.
