import { Pencil, Trash2, Package } from "lucide-react";
import type { Shelf } from "../../types/shelf";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Package className="h-6 w-6" />
            </div>

            <div>
              <h3 className="text-lg font-semibold tracking-tight">
                {shelf.name}
              </h3>

              <p className="text-sm text-muted-foreground">
                Category: {shelf.category}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onRename(shelf)}
              aria-label="Rename shelf"
            >
              <Pencil className="h-5 w-5 text-primary" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onDelete(shelf)}
              aria-label="Delete shelf"
            >
              <Trash2 className="h-5 w-5 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
