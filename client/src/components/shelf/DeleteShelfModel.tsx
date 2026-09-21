import { AlertTriangle } from "lucide-react";
import type { Shelf } from "../../types/shelf";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  return (
    <Dialog open={open && !!shelf} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-destructive/15 p-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Delete Shelf</DialogTitle>
              <DialogDescription className="mt-1">
                Are you sure you want to delete{" "}
                <span className="font-medium text-foreground">
                  &quot;{shelf?.name}&quot;
                </span>
                ? This action cannot be undone.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
