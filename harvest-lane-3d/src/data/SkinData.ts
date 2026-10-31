/**
 * Cosmetics catalogue: farmer outfits, weather themes and road
 * styles, sold in the shop's Skins tab. Pure data plus lookups;
 * the game applies the equipped entries to the farmer rig, the
 * scene lighting and the world materials. Prices are in coins
 * unless `gems` is set (premium skins cost gems).
 */
export interface SkinPrice {
  coins?: number;
  gems?: number;
}

export interface FarmerSkin {
  id: string;
  name: string;
  blurb: string;
  price: SkinPrice;
  shirt: number;
  denim: number;
  hat: number;
  hatDark: number;
  band: number;
}

export interface WeatherSkin {
  id: string;
  name: string;
  blurb: string;
  price: SkinPrice;
  /** Sky/background colour (shows past the farm's edges). */
  bg: number;
  sun: number;
  sunIntensity: number;
  hemi: number;
  hemiIntensity: number;
  /** Multiplier tint over the grass texture. */
  grassTint: number;
}

export interface RoadSkin {
  id: string;
  name: string;
  blurb: string;
  price: SkinPrice;
  /** Multiplier tint over the sand path texture. */
  tint: number;
}

export const FARMER_SKINS: FarmerSkin[] = [
  { id: 'classic', name: 'Classic Farmer', blurb: 'Red shirt, denim overalls, straw hat', price: {}, shirt: 0xd65347, denim: 0x46689c, hat: 0xf0d060, hatDark: 0xe3ba45, band: 0xb5502f },
  { id: 'ocean', name: 'Ocean Blue', blurb: 'Sea-blue shirt and a sky hat', price: { coins: 150 }, shirt: 0x3f7fbf, denim: 0x2c4a73, hat: 0x5ea9dd, hatDark: 0x3f7fbf, band: 0x274b73 },
  { id: 'sunset', name: 'Sunset Orange', blurb: 'Warm orange with a plum hat band', price: { coins: 200 }, shirt: 0xe8873a, denim: 0x5b4636, hat: 0xf2c14e, hatDark: 0xd9930d, band: 0x9b4a8f },
  { id: 'forest', name: 'Forest Green', blurb: 'Leaf green and a teal cap look', price: { coins: 250 }, shirt: 0x57a639, denim: 0x3d405b, hat: 0x2e9e8f, hatDark: 0x227a6d, band: 0xd65347 },
  { id: 'royal', name: 'Royal Purple', blurb: 'Premium violet, for farmers of taste', price: { gems: 4 }, shirt: 0x9b7ed9, denim: 0x4a3a6b, hat: 0x6c4fb0, hatDark: 0x543d8f, band: 0xf2c14e },
  { id: 'golden', name: 'Golden Harvest', blurb: 'Premium gold, shines at harvest time', price: { gems: 6 }, shirt: 0xf2c14e, denim: 0x7a5a1e, hat: 0xffe066, hatDark: 0xf2c14e, band: 0xb5502f },
];

export const WEATHER_SKINS: WeatherSkin[] = [
  { id: 'day', name: 'Bright Day', blurb: 'The classic sunny farm', price: {}, bg: 0x95d64e, sun: 0xffffff, sunIntensity: 1.1, hemi: 0xfff6de, hemiIntensity: 0.95, grassTint: 0xffffff },
  { id: 'mint', name: 'Mint Morning', blurb: 'Cool, fresh early light', price: { coins: 200 }, bg: 0xa8e6b0, sun: 0xeafff2, sunIntensity: 1.05, hemi: 0xeafff2, hemiIntensity: 1.0, grassTint: 0xe8fff0 },
  { id: 'golden-hour', name: 'Golden Hour', blurb: 'Warm late-afternoon glow', price: { coins: 250 }, bg: 0xf2b25c, sun: 0xffd9a0, sunIntensity: 1.15, hemi: 0xffe6c4, hemiIntensity: 0.9, grassTint: 0xffe9c9 },
  { id: 'dusk', name: 'Dusk Violet', blurb: 'Soft purple evening light', price: { coins: 350 }, bg: 0x8a7bd8, sun: 0xd9c8ff, sunIntensity: 0.8, hemi: 0xcfc4ff, hemiIntensity: 0.75, grassTint: 0xd8d2f2 },
  { id: 'frost', name: 'Winter Frost', blurb: 'Pale, crisp winter light', price: { gems: 5 }, bg: 0xdff2ff, sun: 0xf2faff, sunIntensity: 1.0, hemi: 0xf2faff, hemiIntensity: 1.05, grassTint: 0xe6f4ff },
];

export const ROAD_SKINS: RoadSkin[] = [
  { id: 'sand', name: 'Sand Path', blurb: 'The classic farm track', price: {}, tint: 0xffffff },
  { id: 'stone', name: 'Stone Grey', blurb: 'Cool stone-sett roads', price: { coins: 150 }, tint: 0xb8bcc2 },
  { id: 'terracotta', name: 'Terracotta', blurb: 'Warm clay-red paths', price: { coins: 200 }, tint: 0xe09a78 },
  { id: 'planks', name: 'Wooden Planks', blurb: 'Timber-toned walkways', price: { coins: 300 }, tint: 0xc79a68 },
  { id: 'brick', name: 'Brick Red', blurb: 'Premium brick lanes', price: { gems: 4 }, tint: 0xd88a7a },
];

export type SkinCategory = 'farmer' | 'weather' | 'road';

export interface CosmeticsState {
  owned: string[];
  farmer: string;
  weather: string;
  road: string;
}

export const DEFAULT_COSMETICS: CosmeticsState = {
  owned: ['classic', 'day', 'sand'],
  farmer: 'classic',
  weather: 'day',
  road: 'sand',
};

export function farmerSkin(id: string): FarmerSkin {
  return FARMER_SKINS.find((s) => s.id === id) ?? FARMER_SKINS[0];
}
export function weatherSkin(id: string): WeatherSkin {
  return WEATHER_SKINS.find((s) => s.id === id) ?? WEATHER_SKINS[0];
}
export function roadSkin(id: string): RoadSkin {
  return ROAD_SKINS.find((s) => s.id === id) ?? ROAD_SKINS[0];
}
export function skinPrice(category: SkinCategory, id: string): SkinPrice {
  if (category === 'farmer') return farmerSkin(id).price;
  if (category === 'weather') return weatherSkin(id).price;
  return roadSkin(id).price;
}
export function allSkinIds(): string[] {
  return [...FARMER_SKINS, ...WEATHER_SKINS, ...ROAD_SKINS].map((s) => s.id);
}
