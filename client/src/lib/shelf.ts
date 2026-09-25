import type { Shelf } from "../types/shelf";
import { API_URL } from "./api";

type ShelfApiBody<T> = {
  success?: boolean;
  data?: T;
  message?: string;
};

async function readShelfResponse<T>(
  response: Response,
): Promise<ShelfApiBody<T>> {
  const text = await response.text();

  try {
    return JSON.parse(text) as ShelfApiBody<T>;
  } catch {
    throw new Error(
      `Shelf API returned ${response.status} from ${response.url}. Restart the backend and try again.`,
    );
  }
}

export async function getShelves(
  token: string,
  businessId: string,
): Promise<Shelf[]> {
  const response = await fetch(
    `${API_URL}/shelves?businessId=${encodeURIComponent(businessId)}`,
    {
      method: "GET",

      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const body = await readShelfResponse<Shelf[]>(response);

  if (!response.ok || body.success === false || !body.data) {
    throw new Error(body.message || "Failed to load shelves");
  }

  return body.data;
}

export async function createShelf(
  name: string,
  category: string,
  token: string,
  businessId: string,
): Promise<Shelf> {
  const response = await fetch(`${API_URL}/shelves`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },

    body: JSON.stringify({
      businessId,
      name,
      category,
    }),
  });

  const body = await readShelfResponse<Shelf>(response);

  if (!response.ok || body.success === false || !body.data) {
    throw new Error(body.message || "Failed to create shelf");
  }

  return body.data;
}

export async function updateShelf(
  shelfId: string,
  name: string,
  category: string,
  token: string,
): Promise<Shelf> {
  const response = await fetch(`${API_URL}/shelves/${shelfId}`, {
    method: "PUT",

    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },

    body: JSON.stringify({
      name,
      category,
    }),
  });

  const body = await readShelfResponse<Shelf>(response);

  if (!response.ok || body.success === false || !body.data) {
    throw new Error(body.message || "Failed to update shelf");
  }

  return body.data;
}

export async function deleteShelf(
  shelfId: string,
  token: string,
): Promise<void> {
  const response = await fetch(`${API_URL}/shelves/${shelfId}`, {
    method: "DELETE",

    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const body = await readShelfResponse<undefined>(response);

  if (!response.ok || body.success === false) {
    throw new Error(body.message || "Failed to delete shelf");
  }
}
