import { BusinessRepository } from "./business.repository";
import { CreateBusinessDTO } from "./business.types";

export class BusinessService {
  static async listForUser(userId: string) {
    const memberships = await BusinessRepository.findByUserId(userId);

    return memberships.map((membership) => ({
      id: (membership as any).business.id,
      business_name: (membership as any).business.business_name,
      business_email: (membership as any).business.business_email,
      address: (membership as any).business.address,
      contact_number: (membership as any).business.contact_number,
      role: membership.role,
    }));
  }

  static async createForUser(userId: string, data: CreateBusinessDTO) {
    const existingBusinesses = await BusinessRepository.findByUserId(userId);

    if (existingBusinesses.length > 0) {
      throw new Error("User already belongs to a business");
    }

    const business = await BusinessRepository.createWithOwner(userId, data);

    return {
      id: business.id,
      business_name: business.business_name,
      business_email: business.business_email,
      address: business.address,
      contact_number: business.contact_number,
      role: "OWNER" as const,
    };
  }

  static async assertMember(userId: string, businessId: string) {
    if (!(await BusinessRepository.isMember(userId, businessId))) {
      throw new Error("You do not belong to this business");
    }
  }
}
