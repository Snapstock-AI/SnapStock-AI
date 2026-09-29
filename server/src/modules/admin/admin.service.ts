import axios from "axios";
import { AppDataSource } from "../../config/data-source";
import { AdminRepository } from "./admin.repository";

async function checkDatabaseHealth(): Promise<"ok" | "error"> {
  try {
    await AppDataSource.query("SELECT 1");
    return "ok";
  } catch {
    return "error";
  }
}

async function checkAiServiceHealth(): Promise<"ok" | "unreachable"> {
  const baseUrl = process.env.AI_SERVICE_URL;
  if (!baseUrl) return "unreachable";

  try {
    await axios.get(`${baseUrl}/health`, { timeout: 3000 });
    return "ok";
  } catch {
    return "unreachable";
  }
}

export class AdminService {
  static async listVendors() {
    return AdminRepository.listVendors();
  }

  static async suspendVendor(businessId: string) {
    const updated = await AdminRepository.setStatus(businessId, "SUSPENDED");
    if (!updated) throw new Error("Business not found.");
    return { businessId, status: "SUSPENDED" as const };
  }

  static async activateVendor(businessId: string) {
    const updated = await AdminRepository.setStatus(businessId, "ACTIVE");
    if (!updated) throw new Error("Business not found.");
    return { businessId, status: "ACTIVE" as const };
  }

  static async getStats() {
    const [counts, database, aiService] = await Promise.all([
      AdminRepository.getStats(),
      checkDatabaseHealth(),
      checkAiServiceHealth(),
    ]);

    return {
      ...counts,
      health: { database, aiService },
    };
  }
}
