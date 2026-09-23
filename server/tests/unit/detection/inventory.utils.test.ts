import { calculateInventoryQuantity } from "../../../src/modules/detection/inventory.utils";

describe("calculateInventoryQuantity", () => {
  it("adds accepted detections for Stock In", () => {
    expect(calculateInventoryQuantity(10, 5, "STOCK_IN")).toBe(15);
  });

  it("subtracts accepted detections for Stock Out", () => {
    expect(calculateInventoryQuantity(10, 5, "STOCK_OUT")).toBe(5);
  });

  it("rejects Stock Out when it would make stock negative", () => {
    expect(() => calculateInventoryQuantity(3, 5, "STOCK_OUT")).toThrow(
      "Insufficient stock. Current quantity is 3 but the scan detected 5 items for removal.",
    );
  });
});