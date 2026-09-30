import setupDatabase from "../../server/tests/db/global-setup";
import { e2eDatabaseUrl } from "./env";

// Recreates the E2E database from the migrations. Must finish before the API is started,
// so it runs as the `prepare` npm script rather than as a Playwright global setup.
process.env.TEST_DATABASE_URL = e2eDatabaseUrl();
setupDatabase()
  .then(() => console.log("E2E database recreated"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
