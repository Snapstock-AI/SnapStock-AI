import { AppDataSource } from "../../config/data-source";
import { Business } from "../../entities/Business";
import { BusinessUser } from "../../entities/BusinessUser";
import { User } from "../../entities/User";

export class BusinessRepository {
  static async findById(businessId: string) {
    return AppDataSource.getRepository(Business).findOneBy({ id: businessId });
  }

  static async update(business: Business) {
    return AppDataSource.getRepository(Business).save(business);
  }

  static async delete(businessId: string) {
    return AppDataSource.getRepository(Business).delete({ id: businessId });
  }

  static async findBusinessIdByUserId(userId: string) {
    const membership = await AppDataSource.getRepository(BusinessUser).findOne({
      where: { user_id: userId },
      select: { business_id: true },
    });

    return membership?.business_id ?? null;
  }

  static async findBusinessMembershipByUserId(
    userId: string,
  ): Promise<{ businessId: string; role: "OWNER" | "EMPLOYEE" } | null> {
    const membership = await AppDataSource.getRepository(BusinessUser).findOne({
      where: { user_id: userId },
      select: { business_id: true, role: true },
    });

    if (!membership) return null;
    return {
      businessId: membership.business_id,
      role: membership.role as "OWNER" | "EMPLOYEE",
    };
  }

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

  static async findEmployeesByBusinessId(businessId: string) {
    return AppDataSource.getRepository(BusinessUser)
      .createQueryBuilder("membership")
      .innerJoin(User, "user", "user.id = membership.user_id")
      .select([
        "membership.user_id AS user_id",
        "membership.role AS role",
        "membership.joined_at AS joined_at",
        "user.full_name AS full_name",
        "user.email AS email",
      ])
      .where("membership.business_id = :businessId", { businessId })
      .andWhere("membership.role = :role", { role: "EMPLOYEE" })
      .orderBy("membership.joined_at", "ASC")
      .getRawMany();
  }

  static async findMembership(userId: string, businessId: string) {
    return AppDataSource.getRepository(BusinessUser).findOne({
      where: { user_id: userId, business_id: businessId },
    });
  }

  static async removeEmployee(userId: string, businessId: string) {
    return AppDataSource.getRepository(BusinessUser).delete({
      user_id: userId,
      business_id: businessId,
      role: "EMPLOYEE",
    });
  }
}
