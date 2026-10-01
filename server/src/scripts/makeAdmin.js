import { prisma } from "../config/db.js";

const identifier = process.argv[2];

if (!identifier) {
  console.error("Usage: node src/scripts/makeAdmin.js <email_ou_username>");
  process.exit(1);
}

async function main() {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: identifier },
        { username: identifier },
      ],
    },
  });

  if (!user) {
    console.error(`Utilisateur "${identifier}" introuvable.`);
    process.exit(1);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { role: "ADMIN" },
  });

  console.log(`Succès: L'utilisateur ${updated.username} (${updated.email}) est désormais ADMIN.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Erreur:", err);
  process.exit(1);
});
