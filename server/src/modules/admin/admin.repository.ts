import { AppDataSource } from "../../config/data-source";
import { Business, BusinessStatus } from "../../entities/Business";

export class AdminRepository {
  static async listVendors() {
    return AppDataSource.getRepository(Business)
      .createQueryBuilder("business")
      .leftJoin(
        "business_users",
        "membership",
        "membership.business_id = business.id AND membership.role = 'OWNER'",
      )
      .leftJoin("users", "owner", "owner.id = membership.user_id")
      .select([
        "business.id AS id",
        "business.business_name AS business_name",
        "business.business_email AS business_email",
        "business.contact_number AS contact_number",
        "business.status AS status",
        "business.created_at AS created_at",
        "owner.full_name AS owner_name",
        "owner.email AS owner_email",
      ])
      .where("business.deleted_at IS NULL")
      .orderBy("business.created_at", "DESC")
      .getRawMany();
  }

  static async setStatus(
    businessId: string,
    status: BusinessStatus,
  ): Promise<boolean> {
    const result = await AppDataSource.getRepository(Business).update(
      { id: businessId },
      { status },
    );
    return Boolean(result.affected);
  }

  static async getStats() {
    const businessRepo = AppDataSource.getRepository(Business);

    const [totalBusinesses, activeBusinesses, suspendedBusinesses] =
      await Promise.all([
        businessRepo.count(),
        businessRepo.count({ where: { status: "ACTIVE" } }),
        businessRepo.count({ where: { status: "SUSPENDED" } }),
      ]);

    const [[usersRow], [scansRow], [detectionsRow], [alertsRow]] =
      await Promise.all([
        AppDataSource.query(
          `SELECT COUNT(*)::int AS count FROM users WHERE deleted_at IS NULL`,
        ),
        AppDataSource.query(`SELECT COUNT(*)::int AS count FROM scans`),
        AppDataSource.query(`SELECT COUNT(*)::int AS count FROM detections`),
        AppDataSource.query(
          `SELECT COUNT(*)::int AS count FROM alerts WHERE active = true`,
        ),
      ]);

    return {
      totalBusinesses,
      activeBusinesses,
      suspendedBusinesses,
      totalUsers: Number(usersRow.count),
      totalScans: Number(scansRow.count),
      totalDetections: Number(detectionsRow.count),
      activeAlerts: Number(alertsRow.count),
    };
  }
}
