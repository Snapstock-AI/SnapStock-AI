import type { Business } from '../context/AuthContext';
import { apiRequest } from './api';

// Mirrors the /businesses/mine and PATCH /businesses/:id calls made inline
// in client/src/pages/dashboard/SettingsPage.tsx.
export async function getMyBusinesses(): Promise<Business[]> {
  const result = await apiRequest<Business[]>('/businesses/mine', {}, true);
  return result.data ?? [];
}

export type BusinessUpdateInput = Partial<{
  business_name: string;
  business_email: string;
  address: string;
  contact_number: string;
  low_stock_threshold: number;
  freshness_alert_threshold: number;
}>;

export async function updateBusiness(businessId: string, patch: BusinessUpdateInput): Promise<Business> {
  const result = await apiRequest<Business>(
    `/businesses/${businessId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(patch),
    },
    true,
  );
  if (!result.data) throw new Error('Failed to update business');
  return result.data;
}
