import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { Shelf } from "../../types/shelf";
import {
  SHELF_CATEGORIES,
  type ShelfCategory,
} from "../../types/shelf";

interface ShelfModalProps {
  open: boolean;
  mode: "add" | "edit";
  shelf?: Shelf;
  onClose: () => void;
  onSubmit: (shelf: Shelf) => void;
}

export default function ShelfModal({
  open,
  mode,
  shelf,
  onClose,
  onSubmit,
}: ShelfModalProps) {

  const [name, setName] = useState("");

  const [category, setCategory] = useState("Fruit");
    
  const [customCategory, setCustomCategory] = useState("");  


  useEffect(() => {

    if (mode === "edit" && shelf) {

      setName(shelf.name);
      setCategory(shelf.category);

    } else {

      setName("");
      setCategory("Fruit");

    }

  }, [mode, shelf, open]);


  if (!open) return null;


  const handleSubmit = () => {

      if (!name.trim()) return;
      if (category === "Other" && !customCategory.trim()) {
            
            return;
      }


    onSubmit({

      id: shelf?.id ?? crypto.randomUUID(),

      name: name.trim(),
      
    category:
        category === "Other"
            ? customCategory.trim()
            : category,
        });



    setName("");

    setCategory("Fruit");

    onClose();

  };


  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">


      <div className="w-[400px] rounded-xl bg-white p-6 dark:bg-gray-900">


        <div className="mb-5 flex items-center justify-between">

          <h2 className="text-xl font-semibold">

            {mode === "add"
              ? "Add Shelf"
              : "Rename Shelf"}

          </h2>


          <button onClick={onClose}>

            <X />

          </button>

        </div>



        <input

          value={name}

          onChange={(e)=>setName(e.target.value)}

          placeholder="Shelf name"

          className="
            mb-4
            w-full
            rounded-lg
            border
            px-3
            py-2
            dark:bg-gray-800
          "

        />



        <select

          value={category}

          onChange={(e)=>
            setCategory(
              e.target.value as
              ShelfCategory
            )
          }

          className="
            mb-6
            w-full
            rounded-lg
            border
            px-3
            py-2
            dark:bg-gray-800
          "

        >

            {SHELF_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                {category}
                </option>
            ))}

              </select>
              
        {category === "Other" && (
        <input
            type="text"
            placeholder="Enter category"
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            className="mb-3 w-full rounded-lg border px-3 py-2 dark:bg-gray-800"
        />
        )}      



        <div className="flex justify-end gap-3">


          <button

            onClick={onClose}

            className="rounded-lg border px-4 py-2"

          >
            Cancel

          </button>



          <button

            onClick={handleSubmit}

            className="
              rounded-lg
              bg-blue-600
              px-4
              py-2
              text-white
            "

          >

            {mode === "add"
              ? "Create"
              : "Save"}

          </button>


        </div>


      </div>


    </div>

  );
}