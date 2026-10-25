import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 : la connexion passe par un driver adapter, plus par schema.prisma.
const globalForPrisma = globalThis;

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma =
  globalForPrisma.__prisma ?? (globalForPrisma.__prisma = createClient());

/**
 * Vrai si une base est configurée. Tant que ce n'est pas le cas, l'app
 * s'affiche avec les données d'exemple des maquettes.
 */
export function hasDatabase() {
  return Boolean(prisma);
}
