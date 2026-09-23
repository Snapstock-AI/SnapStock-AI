import { useState,useEffect } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { Link } from "react-router";

import ShelfCard from "../../components/shelf/ShelfCard";
import type { Shelf } from "../../types/shelf";
import ShelfModal from "../../components/shelf/ShelfModal";
import DeleteShelfModal from "@/components/shelf/DeleteShelfModel";
import {
  getShelves,
  createShelf,
  updateShelf,
  deleteShelf,
} from "../../lib/shelf";

import { useAuth } from "@/context/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function ShelvesPage() {

  const [shelves, setShelves] = useState<Shelf[]>([])


  const [showShelfModal,setShowShelfModal] =
    useState(false);


 const [selectedShelf,setSelectedShelf] =
    useState<Shelf | undefined>(undefined);
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);

const [shelfToDelete, setShelfToDelete] =
    useState<Shelf | undefined>(undefined);
  const [error, setError] = useState("");
  
  const { token, user } = useAuth();

useEffect(() => {

  if (!token) return;

  const loadShelves = async () => {

    try {

      if (!user?.businessId) return;

      const data = await getShelves(token, user.businessId);

      setShelves(data);

    } catch (error: any) {

      console.error(
        "Failed to load shelves:",
        error
      );

    }

  };

  loadShelves();

}, [token, user?.businessId]);



  const handleShelfSubmit = async (shelf: Shelf): Promise<void> => {

  if (!token) {
    throw new Error("You are not authenticated.");
  }

  if (!user?.businessId) {
    throw new Error("Your account is not connected to a business.");
  }

  setError("");

  try {

    if (selectedShelf) {

      const updatedShelf = await updateShelf(
        shelf.id,
        shelf.name,
        shelf.category,
        token
      );

      setShelves((prev) =>
        prev.map((item) =>
          item.id === updatedShelf.id
            ? updatedShelf
            : item
        )
      );

    } else {
      const newShelf = await createShelf(
        shelf.name,
        shelf.category,
        token,
        user.businessId,
      );

      setShelves((prev) => [
        ...prev,
        newShelf,
      ]);

    }

    setShowShelfModal(false);
    setSelectedShelf(undefined);

  } catch (saveError: unknown) {
    const message = saveError instanceof Error ? saveError.message : "Failed to save shelf.";
    setError(message);
    throw saveError;
  }
};

  const handleDeleteShelf = async () => {

  if (!shelfToDelete || !token) {
    return;
  }

  try {

    await deleteShelf(
      shelfToDelete.id,
      token
    );

    setShelves((prev) =>
      prev.filter(
        (shelf) =>
          shelf.id !== shelfToDelete.id
      )
    );

    setShowDeleteModal(false);
    setShelfToDelete(undefined);

  } catch (error: any) {

    console.error(
      "Failed to delete shelf:",
      error
    );

  }
};



  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/dashboard/scans"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to scans
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">
            Shelves
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Manage shelves used for produce scanning.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => {
            setSelectedShelf(undefined);
            setShowShelfModal(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Add Shelf
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4">
        {shelves.map((shelf) => (
          <ShelfCard
            key={shelf.id}
            shelf={shelf}
            onRename={(shelf) => {
              setSelectedShelf(shelf);
              setShowShelfModal(true);
            }}
            onDelete={(shelf) => {
              setShelfToDelete(shelf);
              setShowDeleteModal(true);
            }}
          />
        ))}

        <ShelfModal
          open={showShelfModal}
          mode={selectedShelf ? "edit" : "add"}
          shelf={selectedShelf}
          onClose={() => {
            setShowShelfModal(false);
            setSelectedShelf(undefined);
          }}
          onSubmit={handleShelfSubmit}
        />

        <DeleteShelfModal
          open={showDeleteModal}
          shelf={shelfToDelete}
          onClose={() => {
            setShowDeleteModal(false);
            setShelfToDelete(undefined);
          }}
          onConfirm={handleDeleteShelf}
        />
      </div>
    </div>
  );
}
