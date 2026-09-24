import { apiRequest } from "@/lib/api";

export type Invitation = {
  id: string;
  email: string;
  role: "EMPLOYEE";
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED";
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
};

export type Employee = {
  user_id: string;
  full_name: string;
  email: string;
  role: "EMPLOYEE";
  joined_at: string;
};

export async function listEmployees(businessId: string): Promise<Employee[]> {
  const response = await apiRequest<Employee[]>(
    `/businesses/${businessId}/employees`,
    {},
    true,
  );

  return response.data || [];
}

export async function removeEmployee(
  businessId: string,
  userId: string,
): Promise<void> {
  await apiRequest(
    `/businesses/${businessId}/employees/${userId}`,
    { method: "DELETE" },
    true,
  );
}

export async function listEmployeeInvitations(
  businessId: string,
): Promise<Invitation[]> {
  const response = await apiRequest<Invitation[]>(
    `/businesses/${businessId}/invitations`,
    {},
    true,
  );

  return response.data || [];
}

export async function sendEmployeeInvitation(
  businessId: string,
  email: string,
): Promise<Invitation> {
  const response = await apiRequest<Invitation>(
    `/businesses/${businessId}/invitations`,
    {
      method: "POST",
      body: JSON.stringify({ email }),
    },
    true,
  );

  if (!response.data) {
    throw new Error("Invitation was not created.");
  }

  return response.data;
}
