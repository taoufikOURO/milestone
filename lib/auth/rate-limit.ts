// Limite de fréquence des envois d'emails, calculée à partir des dates de
// création des tokens déjà émis (table email_tokens) : pas de stockage dédié.

export const EMAIL_COOLDOWN_MS = 60 * 1000; // 1 envoi par minute
export const EMAIL_WINDOW_MS = 60 * 60 * 1000; // fenêtre d'une heure
export const EMAIL_MAX_PER_WINDOW = 5;

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

/** `recent` : dates de création des tokens du même type pour cet utilisateur. */
export function checkEmailRateLimit(recent: Date[], now: Date): RateLimitResult {
  const t = now.getTime();
  const inWindow = recent.map((d) => d.getTime()).filter((d) => t - d < EMAIL_WINDOW_MS);
  if (inWindow.length === 0) return { allowed: true };

  const last = Math.max(...inWindow);
  if (t - last < EMAIL_COOLDOWN_MS) {
    return { allowed: false, retryAfterSeconds: Math.ceil((EMAIL_COOLDOWN_MS - (t - last)) / 1000) };
  }
  if (inWindow.length >= EMAIL_MAX_PER_WINDOW) {
    const oldest = Math.min(...inWindow);
    return { allowed: false, retryAfterSeconds: Math.ceil((EMAIL_WINDOW_MS - (t - oldest)) / 1000) };
  }
  return { allowed: true };
}
