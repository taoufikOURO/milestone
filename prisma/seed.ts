// Seed volontairement vide : aucune donnée réelle n'est versionnée.
// Les données de démonstration seront ajoutées plus tard si besoin.

async function main(): Promise<void> {
  console.log("Seed : rien à insérer.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

export {};
