import { z } from "zod";

export const CreateBusinessSchema = z.object({
  business_name: z.string().trim().min(1).max(150),
  business_email: z.string().trim().email().max(255),
  address: z.string().trim().min(1),
  contact_number: z.string().trim().min(1).max(20),
});

export type CreateBusinessDTO = z.infer<typeof CreateBusinessSchema>;
