import { apiRequest } from './api';

// Against the new SYSTEM_ADMIN-only /admin routes (server/src/modules/admin).
export type VendorStatus = 'ACTIVE' | 'SUSPENDED';

export type Vendor = {
  id: string;
  business_name: string;
  business_email: string;
  contact_number: string;
  status: VendorStatus;
  created_at: string;
  owner_name: string | null;
  owner_email: string | null;
};

export type AdminStats = {
  totalBusinesses: number;
  activeBusinesses: number;
  suspendedBusinesses: number;
  totalUsers: number;
  totalScans: number;
  totalDetections: number;
  activeAlerts: number;
  health: {
    database: 'ok' | 'error';
    aiService: 'ok' | 'unreachable';
  };
};

export async function listVendors(): Promise<Vendor[]> {
  const result = await apiRequest<Vendor[]>('/admin/vendors', {}, true);
  return result.data ?? [];
}

export async function suspendVendor(businessId: string): Promise<void> {
  await apiRequest(`/admin/vendors/${businessId}/suspend`, { method: 'PATCH' }, true);
}

export async function activateVendor(businessId: string): Promise<void> {
  await apiRequest(`/admin/vendors/${businessId}/activate`, { method: 'PATCH' }, true);
}

export async function getAdminStats(): Promise<AdminStats> {
  const result = await apiRequest<AdminStats>('/admin/stats', {}, true);
  if (!result.data) throw new Error('Failed to load stats');
  return result.data;
}
