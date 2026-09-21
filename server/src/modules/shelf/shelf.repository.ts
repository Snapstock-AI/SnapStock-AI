import { AppDataSource } from "../../config/data-source";
import { Shelf } from "../../entities/Shelf";

export class ShelfRepository {
  static async findByBusinessId(businessId: string) {
    return AppDataSource.getRepository(Shelf).find({
      where: { business_id: businessId },
      order: { name: "ASC" },
    });
  }

  static async create(data: {
    business_id: string;
    name: string;
    category: string | null;
  }) {
    const repository = AppDataSource.getRepository(Shelf);
    return repository.save(repository.create(data));
  }

  static async findById(shelfId: string) {
    return AppDataSource.getRepository(Shelf).findOneBy({ id: shelfId });
  }

  static async update(shelf: Shelf) {
    return AppDataSource.getRepository(Shelf).save(shelf);
  }

  static async softDelete(shelf: Shelf) {
    return AppDataSource.getRepository(Shelf).softRemove(shelf);
  }
}
