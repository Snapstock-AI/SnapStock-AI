import { BusinessService } from "../business/business.service";
import { ShelfRepository } from "./shelf.repository";
import { Shelf } from "../../entities/Shelf";

export class ShelfService {
  static async listForBusiness(userId: string, businessId: string) {
    await BusinessService.assertMember(userId, businessId);

    return ShelfRepository.findByBusinessId(businessId);
  }

  static async create(
    userId: string,
    businessId: string,
    name: string,
    category?: string,
  ) {
    await BusinessService.assertMember(userId, businessId);

    return ShelfRepository.create({
      business_id: businessId,
      name: name.trim(),
      category: category?.trim() || null,
    });
  }

  static async update(
    userId: string,
    shelfId: string,
    name: string,
    category?: string,
  ) {
    const shelf = await ShelfRepository.findById(shelfId);

    if (!shelf) {
      throw new Error("Shelf not found.");
    }

    await BusinessService.assertMember(userId, shelf.business_id);

    shelf.name = name.trim();
    shelf.category = category?.trim() || null;

    return ShelfRepository.update(shelf);
  }

  static async remove(userId: string, shelfId: string) {
    const shelf = await ShelfRepository.findById(shelfId);

    if (!shelf) {
      throw new Error("Shelf not found.");
    }

    await BusinessService.assertMember(userId, shelf.business_id);
    await ShelfRepository.softDelete(shelf);
  }
}
