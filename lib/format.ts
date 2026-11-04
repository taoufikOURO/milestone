import { dateOfDay } from "@/lib/domain/timeline";

// Dates de groupe : colonnes DATE, lues à minuit UTC.
const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const shortFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });

export const formatDate = (d: Date) => dateFormat.format(d);

/** Numéro de jour (lib/planning), au même format que formatDate. */
export const formatDay = (day: number) => dateFormat.format(dateOfDay(day));

/** Numéro de jour sans l'année, pour les libellés courts. */
export const formatDayShort = (day: number) => shortFormat.format(dateOfDay(day));
