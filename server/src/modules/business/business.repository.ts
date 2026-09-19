import { AppDataSource } from "../../config/data-source";
import { Business } from "../../entities/Business";
import { BusinessUser } from "../../entities/BusinessUser";

export class BusinessRepository {
  static async findByUserId(userId: string) {
    return AppDataSource.getRepository(BusinessUser)
      .createQueryBuilder("membership")
      .innerJoinAndMapOne(
        "membership.business",
        Business,
        "business",
        "business.id = membership.business_id AND business.deleted_at IS NULL",
      )
      .where("membership.user_id = :userId", { userId })
      .getMany();
  }

  static async createWithOwner(
    userId: string,
    data: {
      business_name: string;
      business_email: string;
      address: string;
      contact_number: string;
    },
  ) {
    return AppDataSource.transaction(async (manager) => {
      const business = await manager.save(manager.create(Business, data));

      await manager.save(
        manager.create(BusinessUser, {
          business_id: business.id,
          user_id: userId,
          role: "OWNER",
        }),
      );

      return business;
    });
  }

  static async isMember(userId: string, businessId: string) {
    return AppDataSource.getRepository(BusinessUser).exist({
      where: { user_id: userId, business_id: businessId },
    });
  }
}
