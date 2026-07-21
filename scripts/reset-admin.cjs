/* One-command local administrator reset for Laxmi Flex Printers Billing. */
const { Client } = require("pg");
const bcrypt = require("bcryptjs");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set. Restart Windows after running setx, then try again.");
  process.exit(1);
}

async function main() {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const password = "admin123";
    const hash = await bcrypt.hash(password, 12);
    await client.query(
      `INSERT INTO users (username, password, name, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, true, NOW(), NOW())
       ON CONFLICT (username)
       DO UPDATE SET password = EXCLUDED.password, name = EXCLUDED.name,
                     role = EXCLUDED.role, is_active = true, updated_at = NOW()`,
      ["admin", hash, "Administrator", "admin"]
    );
    console.log("Admin user reset successfully.");
    console.log("Username: admin");
    console.log("Password: admin123");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Could not reset admin user:", error.message);
  process.exit(1);
});