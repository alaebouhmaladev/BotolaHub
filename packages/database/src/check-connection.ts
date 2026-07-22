import dotenv from "dotenv";
import { checkDatabaseConnection, prisma } from "./index.js";

dotenv.config();

async function main() {
  console.log("Testing PostgreSQL database connection...");
  const ok = await checkDatabaseConnection();
  if (ok) {
    console.log("PostgreSQL database connection successful!");
    process.exit(0);
  } else {
    console.error("PostgreSQL database connection failed!");
    process.exit(1);
  }
}

main().finally(async () => {
  await prisma.$disconnect();
});
