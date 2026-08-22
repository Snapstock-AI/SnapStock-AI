import type { Shelf } from "../types/shelf";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const TEST_BUSINESS_ID =
  "550e8400-e29b-41d4-a716-446655440000";


export async function getShelves(
  token: string
): Promise<Shelf[]> {

  const response = await fetch(
    `${API_URL}/shelves?businessId=${TEST_BUSINESS_ID}`,
    {
      method: "GET",

      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const body = await response.json();

  if (!response.ok || body.success === false) {
    throw new Error(
      body.message || "Failed to load shelves"
    );
  }

  return body.data;
}


export async function createShelf(
  name: string,
  category: string,
  token: string
): Promise<Shelf> {

  const response = await fetch(
    `${API_URL}/shelves`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },

      body: JSON.stringify({
        businessId: TEST_BUSINESS_ID,
        name,
        category,
      }),
    }
  );

  const body = await response.json();

  if (!response.ok || body.success === false) {
    throw new Error(
      body.message || "Failed to create shelf"
    );
  }

  return body.data;
}


export async function updateShelf(
  shelfId: string,
  name: string,
  category: string,
  token: string
): Promise<Shelf> {

  const response = await fetch(
    `${API_URL}/shelves/${shelfId}`,
    {
      method: "PUT",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },

      body: JSON.stringify({
        name,
        category,
      }),
    }
  );

  const body = await response.json();

  if (!response.ok || body.success === false) {
    throw new Error(
      body.message || "Failed to update shelf"
    );
  }

  return body.data;
}


export async function deleteShelf(
  shelfId: string,
  token: string
): Promise<void> {

  const response = await fetch(
    `${API_URL}/shelves/${shelfId}`,
    {
      method: "DELETE",

      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const body = await response.json();

  if (!response.ok || body.success === false) {
    throw new Error(
      body.message || "Failed to delete shelf"
    );
  }
}