import { BusinessRepository } from "./business.repository";
import { CreateBusinessDTO, UpdateBusinessDTO } from "./business.types";

export class BusinessService {
  static async getMembership(userId: string, businessId: string) {
    const membership = (await BusinessRepository.findByUserId(userId)).find(
      (item) => item.business_id === businessId,
    );

    if (!membership) {
      return null;
    }

    return {
      role: membership.role,
      business_name: (membership as any).business.business_name as string,
    };
  }

  static async findBusinessIdByUserId(userId: string) {
    return BusinessRepository.findBusinessIdByUserId(userId);
  }

  static async listForUser(userId: string) {
    const memberships = await BusinessRepository.findByUserId(userId);

    return memberships.map((membership) => {
      const business = (membership as any).business;
      return {
        id: business.id,
        business_name: business.business_name,
        business_email: business.business_email,
        address: business.address,
        contact_number: business.contact_number,
        freshness_alert_threshold: business.freshness_alert_threshold ?? 65,
        low_stock_threshold: business.low_stock_threshold ?? 25,
        role: membership.role,
      };
    });
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

  static async updateForOwner(
    ownerId: string,
    businessId: string,
    data: UpdateBusinessDTO,
  ) {
    const membership = await this.getMembership(ownerId, businessId);
    if (!membership || membership.role !== "OWNER") {
      throw new Error("Only the business owner can update business details.");
    }

    const business = await BusinessRepository.findById(businessId);
    if (!business) throw new Error("Business not found.");

    Object.assign(business, data);
    const saved = await BusinessRepository.update(business);
    return {
      id: saved.id,
      business_name: saved.business_name,
      business_email: saved.business_email,
      address: saved.address,
      contact_number: saved.contact_number,
      freshness_alert_threshold: saved.freshness_alert_threshold ?? 65,
      low_stock_threshold: saved.low_stock_threshold ?? 25,
      role: "OWNER" as const,
    };
  }

  static async deleteForOwner(ownerId: string, businessId: string) {
    const membership = await this.getMembership(ownerId, businessId);
    if (!membership || membership.role !== "OWNER") {
      throw new Error("Only the business owner can delete the business.");
    }

    const result = await BusinessRepository.delete(businessId);
    if (!result.affected) throw new Error("Business not found.");
  }

  static async isMember(userId: string, businessId: string) {
    return BusinessRepository.isMember(userId, businessId);
  }

  static async listEmployees(ownerId: string, businessId: string) {
    const membership = await this.getMembership(ownerId, businessId);

    if (!membership || membership.role !== "OWNER") {
      throw new Error("Only the business owner can view employees.");
    }

    return BusinessRepository.findEmployeesByBusinessId(businessId);
  }

  static async removeEmployee(
    ownerId: string,
    businessId: string,
    employeeId: string,
  ) {
    const membership = await this.getMembership(ownerId, businessId);

    if (!membership || membership.role !== "OWNER") {
      throw new Error("Only the business owner can remove employees.");
    }

    const employee = await BusinessRepository.findMembership(
      employeeId,
      businessId,
    );

    if (!employee || employee.role !== "EMPLOYEE") {
      throw new Error("Employee not found in this business.");
    }

    await BusinessRepository.removeEmployee(employeeId, businessId);
  }
}
