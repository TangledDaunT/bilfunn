// Norwegian registration numbers.
// Statens vegvesen accepts ordinary, veteran and personal plates of 2–7 characters.
export function normalizePlate(input: string): string {
  return (input || "")
    .toUpperCase()
    .replace(/[\s\-._]/g, "")
    .replace(/[^A-ZÆØÅ0-9]/g, "")
    .slice(0, 7);
}

export type PlateKind = "standard" | "electric" | "old" | "moped" | "personal" | null;

export function plateKind(plate: string): PlateKind {
  if (/^E[BCDKLVS]\d{5}$/.test(plate)) return "electric";
  if (/^[A-ZÆØÅ]{2}\d{5}$/.test(plate)) return "standard";
  if (/^[A-ZÆØÅ]{2}\d{4}$/.test(plate)) return "old";
  if (/^\d{5}$/.test(plate)) return "moped";
  if (/^[A-ZÆØÅ0-9]{2,7}$/.test(plate) && /[A-ZÆØÅ]/.test(plate)) return "personal";
  return null;
}

export const isValidPlate = (plate: string) => plateKind(plate) !== null;

export function prettyPlate(plate: string): string {
  return /^[A-ZÆØÅ]{2}\d{4,5}$/.test(plate) ? `${plate.slice(0, 2)} ${plate.slice(2)}` : plate;
}
