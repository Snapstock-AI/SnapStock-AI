export const SHELF_CATEGORIES = [
  "Fruit",
  "Vegetable",
  "Nuts",
  "Other",
] as const;

export type ShelfCategory = typeof SHELF_CATEGORIES[number];

export interface Shelf {
  id: string;
  name: string;
  category: string;
}