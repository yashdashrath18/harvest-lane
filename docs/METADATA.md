# Harvest Lane: developer and game metadata

## Game
- Title: Harvest Lane
- Genre: Simulation, farming and market tycoon (casual, single player)
- Orientation: Portrait (designed 540x960, scales to fit)
- Languages: English (UI text only; no dialogue)
- Players: 1
- Offline: Yes in standalone browser mode after first load
- Ads: None integrated. (A Playables rewarded-ad wrapper exists in
  code but no gameplay placement calls it.)
- In-app purchases: None
- User-generated content: None
- External links in game: None
- Accounts or sign-in: None in standalone mode. In YouTube
  Playables, progress uses the platform cloud save.

## Developer
- Developer name: Yash Dashrath (individual)
- Contact email: yashissocial@gmail.com
- Location: Pune, Maharashtra, India

## Content and age rating notes (self-assessment for the IARC /
platform questionnaire; final rating comes from the questionnaire
itself, not from this note)
- Violence: None. No combat, weapons, injury, or death.
- Sexual content: None.
- Profanity: None.
- Gambling: None. No real-money mechanics, no loot boxes, no
  randomised purchases. All purchases use in-game coins earned by
  playing, and every price is fixed and shown in advance.
- Substances: None.
- Frightening content: None.
- Social features: None. No chat, no messaging, no sharing.
- Data collected by the game: None beyond the save file (game
  progress and volume settings), stored locally or in the
  Playables cloud save.
- Expected outcome: suitable for everyone, including children,
  subject to the platform's own rating process.

## Package
- Release bundle: release/harvest-lane-playables.zip (359 KB)
  containing index.html and one JavaScript asset (1.55 MB raw,
  about 358 KB over the wire compressed).
- Source archive: release/harvest-lane-source.zip
- Entry point: index.html at the archive root.
- SDK: YouTube Playables SDK loaded from
  https://www.youtube.com/game_api/v1 in the document head, before
  the game bundle, per the integration requirements.
