// Charge .env pour les tests d'intégration (les valeurs ne sont jamais affichées).
try {
  process.loadEnvFile();
} catch {
  // Pas de .env : les variables doivent venir de l'environnement (CI).
}
