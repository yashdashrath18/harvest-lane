# Competition upgrade: the full list and what shipped

Source: the 2026-10-31 competition study (deep research report in
~/workspace/research_notes/playables-farm-game-competition-20261030-2120/,
presented as the "Farm Game Competition Study" page). Rivals studied:
My Perfect Farm (three builds), Farm Land, My Mini Mart, Idle Farm
Tycoon, Hay Day. Yash's instruction: implement everything, no
per-item approval.

## Shipped in the competition update (2026-10-31)

1. **No forced ads, ever** (P0). Already the game's policy; kept and
   now stated in the README. Rewarded ads remain opt-in only.
2. **Save integrity + visible Saved indicator** (P0). Saves were
   already guarded (an untouched session can never overwrite a
   stored save); the HUD now flashes "Saved ✓" on every write.
3. **Customer waves with calm breaks** (P0). Customers arrive in
   waves of 3, then a 7-second calm; clearing a full wave pays a
   +5 coin calm bonus onto the cash pile.
4. **Capped offline earnings + welcome-back panel** (P1). Rate
   12 + 3 per farm level coins per hour, 4-hour cap, minimum
   15 minutes away; the panel states the cap honestly.
5. **Daily missions that always refill** (P1). Three per day from a
   pool of six, deterministic by date, gem-heavy rewards, reset at
   local midnight; shown at the top of the missions panel.
6. **Hireable helper** (P1). 300 coins, session-1 affordable after
   the first upgrades: harvests ripe crops (routing through field
   gates), stocks the stall, capacity 8, deliberately slower than
   the player.
7. **XP and farm levels** (P1). XP from harvest (1), collect (2)
   and serve (5); each level pays 2 gems and +1 backpack capacity
   (cap +10), with a level badge and XP bar under the avatar.
8. **Processing chain: cheese churn** (P1). 400 coins; stand at it
   to turn 1 milk (14) into 1 cheese (42); customers order cheese
   once it exists.
9. **Animal feeding** (from the feature matrix: every serious rival
   gates production on feed). Troughs in both pens hold up to 20
   corn; each egg/milk consumes 1; an empty trough stops production
   and raises a "!" with a hint float.
10. **Physical cash pile** (genre signature, from the farm-clone
    reference study). Sale money stacks by the stall in three size
    tiers; walk over it to collect.
11. **Sneakers boost pad** (from the reference study). Step on the
    pad on the main path for 1.5x speed for 2 minutes.
12. **Corn-for-gems trade** (P1, the toucan sink). Trade 9 corn for
    1 gem in the Earn Gems panel: a gem source that never needs an ad.
13. **Juice pass**. Particle bursts on harvest (green/orange), cash
    collection (gold) and level-up (gold fanfare), on top of the
    existing floating text and sounds.
14. **Endless contracts** (P1/P2 bridge, shipped earlier the same
    day): the answer to the content cliff; see PHASE_REPORTS.md.

## Queued for the next batch (not yet built)

15. **Decorations / farm customisation** (P2). SHIPPED 2026-10-31
    as the shop's Skins tab (Yash asked for it directly): 6 farmer
    outfits, 5 weather/light themes and 5 road styles, bought with
    coins or gems, saved in the save's cosmetics block. Fence and
    awning skins can join the same tab later.
16. **Prestige-lite "New Season"** (P2). Voluntary reset to a fresh
    plot layout keeping a permanent earnings bonus and cosmetics.
17. **Timed Instant Orders** (P2). A 60-second packing challenge
    for bonus gems, for players whose helper runs the base loop.
18. **Wheat + flour mill** (P1 content depth). A third crop needs a
    new field; the current farm plan has no free fenced land, so
    this rides along with the New Season plot or a farm expansion.
19. **Goats (third animal)** (P2). Needs a model (procedural) and a
    pen; pairs naturally with the expansion above.
20. **sendScore (lifetime coins)** (P2, platform). Only meaningful
    inside the Playables programme; wire it when access lands.

## Deliberately not copied

- Forced interstitial ads and "No Ads" packs that do not stop ads
  (the genre's #1 complaint).
- Mid-game advertisement breaks and FREE ad pads on the field
  (from the earlier reference-game study).
- Days-long grind walls and upgrades gated behind ads instead of
  earned currency.
