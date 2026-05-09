import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: "postgresql://postgres:SyjjaWHBNMTlutRIYPatOasyUVNEuJwS@switchyard.proxy.rlwy.net:28325/railway",
  },
});
