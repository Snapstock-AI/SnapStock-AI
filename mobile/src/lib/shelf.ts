import { apiRequest } from './api';

// Mirrors client/src/types/shelf.ts and client/src/lib/shelf.ts against the
// same /shelves REST endpoints (server/src/modules/shelf).
export const SHELF_CATEGORIES = ['Fruit', 'Vegetable', 'Nuts', 'Other'] as const;
export type ShelfCategory = (typeof SHELF_CATEGORIES)[number];

export type Shelf = {
  id: string;
  business_id?: string;
  name: string;
  category: string;
};

export async function getShelves(businessId: string): Promise<Shelf[]> {
  const result = await apiRequest<Shelf[]>(
    `/shelves?businessId=${encodeURIComponent(businessId)}`,
    {},
    true,
  );
  return result.data ?? [];
}

export async function createShelf(
  businessId: string,
  name: string,
  category: string,
): Promise<Shelf> {
  const result = await apiRequest<Shelf>(
    '/shelves',
    {
      method: 'POST',
      body: JSON.stringify({ businessId, name, category }),
    },
    true,
  );
  if (!result.data) throw new Error('Failed to create shelf');
  return result.data;
}

export async function updateShelf(shelfId: string, name: string, category: string): Promise<Shelf> {
  const result = await apiRequest<Shelf>(
    `/shelves/${shelfId}`,
    {
      method: 'PUT',
      body: JSON.stringify({ name, category }),
    },
    true,
  );
  if (!result.data) throw new Error('Failed to update shelf');
  return result.data;
}

export async function deleteShelf(shelfId: string): Promise<void> {
  await apiRequest(`/shelves/${shelfId}`, { method: 'DELETE' }, true);
}
