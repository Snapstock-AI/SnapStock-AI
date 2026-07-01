import type { Client } from "pg";

export async function up(client: Client): Promise<void> {
  // Create invitation status enum
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'invitation_status'
      ) THEN
        CREATE TYPE invitation_status AS ENUM (
          'PENDING',
          'ACCEPTED',
          'EXPIRED',
          'CANCELLED'
        );
      END IF;
    END $$;
  `);

  // Create employee invitations table
  await client.query(`
    CREATE TABLE IF NOT EXISTS employee_invitations (

      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      business_id UUID NOT NULL,

      invited_by UUID NOT NULL,

      email VARCHAR(255) NOT NULL,

      role business_user_role NOT NULL DEFAULT 'EMPLOYEE',

      invitation_token TEXT NOT NULL UNIQUE,

      status invitation_status NOT NULL DEFAULT 'PENDING',

      expires_at TIMESTAMP NOT NULL,

      accepted_at TIMESTAMP,

      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT fk_employee_invitations_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(id)
        ON DELETE CASCADE,

      CONSTRAINT fk_employee_invitations_invited_by
        FOREIGN KEY (invited_by)
        REFERENCES users(id)
        ON DELETE CASCADE
    );
  `);

  // Indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_employee_invitations_email
    ON employee_invitations(email);
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_employee_invitations_business
    ON employee_invitations(business_id);
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_employee_invitations_token
    ON employee_invitations(invitation_token);
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_employee_invitations_status
    ON employee_invitations(status);
  `);
}