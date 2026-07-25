import { Pencil, Trash2, Package } from "lucide-react";
import type { Shelf } from "../../types/shelf";

interface ShelfCardProps {
  shelf: Shelf;
  onRename: (shelf: Shelf) => void;
  onDelete: (shelf: Shelf) => void;
}

export default function ShelfCard({
  shelf,
  onRename,
  onDelete,
}: ShelfCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-surface-elevated p-5 shadow-sm">
      <div className="flex items-start justify-between">

        <div className="flex items-center gap-4">

          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
            <Package className="h-6 w-6" />
          </div>

          <div>
            <h3 className="text-lg font-semibold">
              {shelf.name}
            </h3>

            <p className="text-sm text-muted">
              Category: {shelf.category}
            </p>
          </div>

        </div>

        <div className="flex gap-2">

          <button
            onClick={() => onRename(shelf)}
            className="rounded-lg p-2 hover:bg-surface-muted"
          >
            <Pencil className="h-5 w-5 text-blue-600" />
          </button>

          <button
            onClick={() => onDelete(shelf)}
            className="rounded-lg p-2 hover:bg-surface-muted"
          >
            <Trash2 className="h-5 w-5 text-red-600" />
          </button>

        </div>

      </div>
    </div>
  );
}