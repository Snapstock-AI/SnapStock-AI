export function calculateInventoryQuantity(
  currentQuantity: number,
  detectedQuantity: number,
  scanMode: "STOCK_IN" | "STOCK_OUT",
) {
  const quantity = currentQuantity +
    (scanMode === "STOCK_IN" ? detectedQuantity : -detectedQuantity);

  if (quantity < 0) {
    throw new Error(
      `Insufficient stock. Current quantity is ${currentQuantity} but the scan detected ${detectedQuantity} items for removal.`,
    );
  }

  return quantity;
}