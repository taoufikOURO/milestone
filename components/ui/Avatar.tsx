/** Initiales d'une personne, sur fond d'accent doux. */
export function Avatar({
  firstName,
  lastName,
  size = "md",
}: {
  firstName: string;
  lastName: string;
  size?: "sm" | "md";
}) {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full border border-accent/20 bg-accent-soft font-display font-bold text-accent-strong ${
        size === "sm" ? "size-8 text-xs" : "size-9 text-sm"
      }`}
    >
      {initials}
    </span>
  );
}
