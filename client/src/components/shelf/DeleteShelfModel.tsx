import { AlertTriangle } from "lucide-react";
import type { Shelf } from "../../types/shelf";

interface DeleteShelfModalProps {
  open: boolean;
  shelf?: Shelf;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteShelfModal({
  open,
  shelf,
  onClose,
  onConfirm,
}: DeleteShelfModalProps) {
  if (!open || !shelf) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">

        <div className="flex items-center gap-3">
          <div className="rounded-full bg-red-100 p-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-lg font-semibold">
              Delete Shelf
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Are you sure you want to delete{" "}
              <span className="font-medium">
                "{shelf.name}"
              </span>
              ? This action cannot be undone.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border px-4 py-2"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>

      </div>
    </div>
  );
}