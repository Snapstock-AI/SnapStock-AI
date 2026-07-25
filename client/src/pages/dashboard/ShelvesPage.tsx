import { useState } from "react";
import { Plus } from "lucide-react";

import ShelfCard from "../../components/shelf/ShelfCard";
import type { Shelf } from "../../types/shelf";
import ShelfModal from "../../components/shelf/ShelfModal";
import DeleteShelfModal from "@/components/shelf/DeleteShelfModel";


export default function ShelvesPage() {

  const [shelves, setShelves] = useState<Shelf[]>([
    {
      id: "1",
      name: "Shelf A - Bananas",
      category: "Fruit",
    },
    {
      id: "2",
      name: "Shelf B - Tomatoes",
      category: "Vegetable",
    },
    {
      id: "3",
      name: "Shelf C - Apples",
      category: "Fruit",
    },
  ]);


  const [showShelfModal,setShowShelfModal] =
    useState(false);


 const [selectedShelf,setSelectedShelf] =
    useState<Shelf | undefined>(undefined);
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);

const [shelfToDelete, setShelfToDelete] =
  useState<Shelf | undefined>(undefined);



  const handleShelfSubmit = (shelf: Shelf) => {

    if(selectedShelf) {

      
      setShelves((prev)=>
        prev.map((item)=>
          item.id === shelf.id
            ? shelf
            : item
        )
      );

    }
    else {

   
      setShelves((prev)=>[
        ...prev,
        shelf
      ]);

    }

   

  };

  const handleDeleteShelf = () => {

  if (!shelfToDelete) return;

  setShelves((prev) =>
    prev.filter(
      (shelf) => shelf.id !== shelfToDelete.id
    )
  );

  setShowDeleteModal(false);
  setShelfToDelete(undefined);
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