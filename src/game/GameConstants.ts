// Design resolution: portrait 9:16, matching the casual mobile farm
// reference direction. Phaser Scale.FIT letterboxes this cleanly on desktop.
export const DESIGN_WIDTH = 540;
export const DESIGN_HEIGHT = 960;

// World is larger than one screen so the camera has somewhere to travel.
export const WORLD_WIDTH = 1080;
export const WORLD_HEIGHT = 1600;

export const PLAYER_SPEED = 230;
export const PLAYER_START_X = WORLD_WIDTH / 2;
// Spawn on the path crossroads in the middle of the farm.
export const PLAYER_START_Y = 910;

// Distance (in world pixels) at which tap-to-move is considered arrived.
export const MOVE_ARRIVE_DISTANCE = 6;
