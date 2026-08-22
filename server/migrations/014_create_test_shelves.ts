import type { Client } from "pg";

export async function up(client: Client): Promise<void> {
  await client.query(`
    INSERT INTO shelves (
      id,
      business_id,
      name,
      category
    )
    VALUES
      (
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440000',
        'Shelf A - Bananas',
        'Fruit'
      ),
      (
        '550e8400-e29b-41d4-a716-446655440002',
        '550e8400-e29b-41d4-a716-446655440000',
        'Shelf B - Tomatoes',
        'Vegetable'
      ),
      (
        '550e8400-e29b-41d4-a716-446655440003',
        '550e8400-e29b-41d4-a716-446655440000',
        'Shelf C - Apples',
        'Fruit'
      )
    ON CONFLICT (id) DO NOTHING;
  `);
}

export async function down(client: Client): Promise<void> {
  await client.query(`
    DELETE FROM shelves
    WHERE business_id =
      '550e8400-e29b-41d4-a716-446655440000';
  `);
}