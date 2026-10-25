import 'dotenv/config'
import { defineConfig } from 'prisma/config'

// On lit process.env directement (plutôt que le helper env()) pour que
// `prisma generate` fonctionne même sans DATABASE_URL : l'app tourne alors
// sur les données d'exemple. Les commandes qui touchent vraiment la base
// (migrate, db push) échoueront explicitement, ce qui est le bon comportement.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
  migrations: {
    path: 'prisma/migrations',
  },
})
