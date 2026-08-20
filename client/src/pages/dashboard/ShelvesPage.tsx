import { useState,useEffect } from "react";
import { Plus } from "lucide-react";

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

export default function ShelvesPage() {

  const [shelves, setShelves] = useState<Shelf[]>([])


  const [showShelfModal,setShowShelfModal] =
    useState(false);


 const [selectedShelf,setSelectedShelf] =
    useState<Shelf | undefined>(undefined);
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);

const [shelfToDelete, setShelfToDelete] =
    useState<Shelf | undefined>(undefined);
  
  const { token } = useAuth();

useEffect(() => {

  if (!token) return;

  const loadShelves = async () => {

    try {

      const data = await getShelves(token);

      setShelves(data);

    } catch (error: any) {

      console.error(
        "Failed to load shelves:",
        error
      );

    }

  };

  loadShelves();

}, [token]);



  const handleShelfSubmit = async (shelf: Shelf) => {

  if (!token) {
    console.error("User is not authenticated");
    return;
  }

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
        token
      );

      setShelves((prev) => [
        ...prev,
        newShelf,
      ]);

    }

    setShowShelfModal(false);
    setSelectedShelf(undefined);

  } catch (error: any) {

    console.error(
      "Failed to save shelf:",
      error
    );

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
          <h1 className="font-serif text-3xl font-semibold">
            Shelves
          </h1>

          <p className="mt-1 text-sm text-muted">
            Manage shelves used for produce scanning.
          </p>
        </div>


        <button
          onClick={()=>{
            setSelectedShelf(undefined);
            setShowShelfModal(true);
          }}
          className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2 text-white hover:bg-brand-600"
        >

          <Plus className="h-4 w-4" />

          Add Shelf

        </button>


      </div>



      <div className="grid gap-4">


        {shelves.map((shelf)=>(

          <ShelfCard

            key={shelf.id}

            shelf={shelf}


            onRename={(shelf)=>{

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

          mode={
            selectedShelf
              ? "edit"
              : "add"
          }

          shelf={selectedShelf}


          onClose={()=>{

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