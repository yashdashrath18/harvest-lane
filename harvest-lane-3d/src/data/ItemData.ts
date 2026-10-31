import { CROPS } from './CropData';

/**
 * Sell prices for everything the stall can stock. Crop prices come
 * from CropData so each product has one source of truth; animal
 * products are defined here.
 */
export const ITEM_PRICES: Record<string, number> = {
  corn: CROPS.corn.sellPrice,
  carrot: CROPS.carrot.sellPrice,
  egg: 9,
  milk: 14,
  /** Cheese is churned from one milk: processing more than doubles its value. */
  cheese: 42,
};

export const ITEM_NAMES: Record<string, string> = {
  corn: 'Corn',
  carrot: 'Carrot',
  egg: 'Egg',
  milk: 'Milk',
  cheese: 'Cheese',
};
