import { useState, useEffect } from "react";
import type { Shelf } from "../../types/shelf";
import {
  SHELF_CATEGORIES,
  type ShelfCategory,
} from "../../types/shelf";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ShelfModalProps {
  open: boolean;
  mode: "add" | "edit";
  shelf?: Shelf;
  onClose: () => void;
  onSubmit: (shelf: Shelf) => Promise<void>;
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
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);


  useEffect(() => {

    if (mode === "edit" && shelf) {

      setName(shelf.name);
      setCategory(shelf.category);

    } else {

      setName("");
      setCategory("Fruit");

    }

    setCustomCategory("");
    setError("");
    setSaving(false);

  }, [mode, shelf, open]);


  const handleSubmit = async () => {

      if (!name.trim()) {
        setError("Shelf name is required.");
        return;
      }
      if (category === "Other" && !customCategory.trim()) {
            setError("Enter a category for this shelf.");
            return;
      }

    setSaving(true);
    setError("");

    try {
      await onSubmit({
        id: shelf?.id ?? crypto.randomUUID(),
        name: name.trim(),
        category: category === "Other" ? customCategory.trim() : category,
      });
    } catch (submitError: unknown) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to save shelf.",
      );
    } finally {
      setSaving(false);
    }

  };


  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "Add Shelf" : "Rename Shelf"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shelf-name">Shelf name</Label>
            <Input
              id="shelf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Shelf name"
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={category}
              onValueChange={(value) => setCategory(value as ShelfCategory)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {SHELF_CATEGORIES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {category === "Other" && (
            <div className="space-y-2">
              <Label htmlFor="custom-category">Custom category</Label>
              <Input
                id="custom-category"
                type="text"
                placeholder="Enter category"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
              />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : mode === "add" ? "Create" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
