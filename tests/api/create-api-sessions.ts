/**
 * Prépare les tests API (Newman) : crée deux sessions de test valides 1 heure
 * dans la base de démonstration, pour l'Owner et le Collaborateur du seed,
 * puis affiche les jetons sous forme de variables shell.
 * Usage : eval "$(npx tsx tests/api/create-api-sessions.ts)"
 */
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function sessionFor(email: string) {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) throw new Error(`Utilisateur ${email} introuvable : lancez d'abord "npm run db:seed".`);
  const token = randomBytes(32).toString("hex");
  await db.session.create({ data: { token, userId: user.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
  return token;
}

async function main() {
  const owner = await sessionFor("owner@cashpilot.demo");
  const collaborator = await sessionFor("collaborator@cashpilot.demo");
  const invoice = await db.invoice.findFirst({ where: { id: "cashpilot-demo-invoice" } });
  if (!invoice) throw new Error('Facture de démonstration introuvable : lancez d\'abord "npm run db:seed".');
  console.log(`export OWNER_TOKEN=${owner}`);
  console.log(`export COLLABORATOR_TOKEN=${collaborator}`);
  console.log(`export INVOICE_ID=${invoice.id}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
