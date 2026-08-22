import type { Client } from "pg";

export async function up(client: Client): Promise<void> {
  await client.query(`
    INSERT INTO businesses (
      id,
      business_name,
      business_email,
      address,
      contact_number
     
    )
    VALUES (
      '550e8400-e29b-41d4-a716-446655440000',
      'Demo Store',
      'demo@gmail.com',
      'Galle, Sri Lanka',
      '+94 77 123 4567'

      
    )
    ON CONFLICT (id) DO NOTHING;
  `);
}

export async function down(client: Client): Promise<void> {
  await client.query(`
    DELETE FROM businesses
    WHERE id = '550e8400-e29b-41d4-a716-446655440000';
  `);
}