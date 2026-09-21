import { z } from "zod";

export const CreateBusinessSchema = z.object({
  business_name: z.string().trim().min(1).max(150),
  business_email: z.string().trim().email().max(255),
  address: z.string().trim().min(1),
  contact_number: z.string().trim().min(1).max(20),
});

export type CreateBusinessDTO = z.infer<typeof CreateBusinessSchema>;

export const UpdateBusinessSchema = CreateBusinessSchema.partial().extend({
  freshness_alert_threshold: z.number().int().min(0).max(100).optional(),
  low_stock_threshold: z.number().int().min(0).max(10000).optional(),
});
export type UpdateBusinessDTO = z.infer<typeof UpdateBusinessSchema>;
