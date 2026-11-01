/**
 * Outfit catalogue (master prompt 6): five wearable categories.
 * Shirts are the original farmer skins in SkinData (they set the
 * shirt and denim colours). Hats, shoes, chains and glasses are
 * attachment items defined here, each with its own colours and a
 * build style the rig understands. Prices scale within a category;
 * a few prestige pieces cost gems or sit behind a level gate.
 */
export type OutfitCategory = 'hat' | 'shoes' | 'chain' | 'glasses';

export interface OutfitItem {
  id: string;
  category: OutfitCategory;
  name: string;
  blurb: string;
  coins?: number;
  gems?: number;
  /** Level gate, when the piece is a prestige unlock. */
  level?: number;
  /** Build key understood by the rig's attachment builders. */
  style: string;
  /** Primary colour (hat body, shoe body, chain metal, frame). */
  color: number;
  /** Secondary colour (band, sole, gem, lens tint). */
  accent: number;
}

export const OUTFIT_ITEMS: OutfitItem[] = [
  // Hats: the default straw hat uses the shirt's own palette.
  { id: 'hat-cap', category: 'hat', name: 'Field Cap', blurb: 'A sporty cap for fast laps', coins: 120, style: 'cap', color: 0x3f7fbf, accent: 0x274b73 },
  { id: 'hat-sun', category: 'hat', name: 'Sun Hat', blurb: 'Wide brim, zero sunburn', coins: 180, style: 'sun', color: 0xf6e3a1, accent: 0xe2574c },
  { id: 'hat-flower', category: 'hat', name: 'Flower Hat', blurb: 'A daisy for the market days', coins: 150, style: 'flower', color: 0xf0d060, accent: 0xffffff },
  { id: 'hat-party', category: 'hat', name: 'Party Cone', blurb: 'Every harvest is a party', coins: 220, style: 'cone', color: 0x9b4a8f, accent: 0xffd94d },
  { id: 'hat-crown', category: 'hat', name: 'Harvest Crown', blurb: 'Royalty of the wheat rows', gems: 5, level: 6, style: 'crown', color: 0xffc93c, accent: 0xe2574c },
  // Shoes.
  { id: 'shoe-wellies', category: 'shoes', name: 'Red Wellies', blurb: 'Splash-proof and proud', coins: 100, style: 'boots', color: 0xd64541, accent: 0x8e2f2b },
  { id: 'shoe-sneakers', category: 'shoes', name: 'Blue Sneakers', blurb: 'For farmers in a hurry', coins: 160, style: 'sneakers', color: 0x3f7fbf, accent: 0xffffff },
  { id: 'shoe-golden', category: 'shoes', name: 'Golden Boots', blurb: 'They sparkle at the stall', gems: 4, level: 5, style: 'boots', color: 0xf2c14e, accent: 0xb8860b },
  // Chains (worn at the neck, they sway as you walk).
  { id: 'chain-silver', category: 'chain', name: 'Silver Chain', blurb: 'A cool glint at the neck', coins: 200, style: 'chain', color: 0xd8dde3, accent: 0x9aa3ad },
  { id: 'chain-gold', category: 'chain', name: 'Gold Chain', blurb: 'Market-day bling', coins: 350, style: 'chain', color: 0xf2c14e, accent: 0xb8860b },
  { id: 'chain-gem', category: 'chain', name: 'Gem Pendant', blurb: 'One big ruby, no subtlety', gems: 6, level: 8, style: 'pendant', color: 0xf2c14e, accent: 0xe2574c },
  // Glasses.
  { id: 'glass-shades', category: 'glasses', name: 'Cool Shades', blurb: 'Too cool for cucumbers', coins: 140, style: 'shades', color: 0x22242a, accent: 0x3a3f4a },
  { id: 'glass-round', category: 'glasses', name: 'Round Specs', blurb: 'For reading seed packets', coins: 180, style: 'round', color: 0x8a5a2b, accent: 0xd9c9a8 },
  { id: 'glass-star', category: 'glasses', name: 'Star Shades', blurb: 'Famous at the farmers market', gems: 5, level: 7, style: 'star', color: 0xffc93c, accent: 0x22242a },
];

export const OUTFIT_CATEGORIES: { id: OutfitCategory; name: string; icon: string }[] = [
  { id: 'hat', name: 'Hats', icon: '🎩' },
  { id: 'shoes', name: 'Shoes', icon: '👢' },
  { id: 'chain', name: 'Chains', icon: '📿' },
  { id: 'glasses', name: 'Glasses', icon: '🕶️' },
];

/** Equipped defaults: the classic look (straw hat, brown boots, bare neck and eyes). */
export const DEFAULT_OUTFIT: Record<OutfitCategory, string> = {
  hat: 'hat-straw',
  shoes: 'shoe-brown',
  chain: 'chain-none',
  glasses: 'glass-none',
};

/** The built-in (free, always owned) piece in each category. */
export const BASE_ITEMS: Record<OutfitCategory, { name: string; blurb: string }> = {
  hat: { name: 'Straw Hat', blurb: 'The classic, coloured by your shirt' },
  shoes: { name: 'Brown Boots', blurb: 'Trusty mud-stompers' },
  chain: { name: 'No Chain', blurb: 'Bare neck, honest work' },
  glasses: { name: 'No Glasses', blurb: 'Eyes on the crops' },
};

export function outfitItem(id: string): OutfitItem | undefined {
  return OUTFIT_ITEMS.find((i) => i.id === id);
}

export function outfitItemsIn(category: OutfitCategory): OutfitItem[] {
  return OUTFIT_ITEMS.filter((i) => i.category === category);
}

export function allOutfitIds(): string[] {
  return [...Object.values(DEFAULT_OUTFIT), ...OUTFIT_ITEMS.map((i) => i.id)];
}
