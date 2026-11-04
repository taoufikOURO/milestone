// Dates de groupe : colonnes DATE, lues à minuit UTC.
const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export const formatDate = (d: Date) => dateFormat.format(d);
