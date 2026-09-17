import { z } from "zod";
import type { Vehicle } from "./types";
const text = z.string().trim().min(1).max(160).nullable();
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      Number.isFinite(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
  )
  .nullable();
export const PublicData = z
  .object({
    plate: z.string().regex(/^[A-ZÆØÅ0-9]{2,7}$/),
    make: text,
    model: text,
    vehicleType: text,
    color: text,
    fuel: text,
    firstRegistered: date,
    firstRegisteredNorway: date,
    lastInspection: date,
    nextInspection: date,
    registrationStatus: text,
  })
  .strict();
export type PublicData = z.infer<typeof PublicData>;
function clean(value: unknown) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, 160)
    : null;
}
function cleanDate(value: unknown) {
  const v = clean(value)?.slice(0, 10);
  return v &&
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    Number.isFinite(Date.parse(v)) &&
    new Date(v).toISOString().slice(0, 10) === v
    ? v
    : null;
}
export function publicFields(v: Vehicle): PublicData {
  return PublicData.parse({
    plate: v.plate,
    make: clean(v.make),
    model: clean(v.model),
    vehicleType: clean(v.vehicleGroup || v.bodyType),
    color: clean(v.color),
    fuel: clean(v.fuel),
    firstRegistered: cleanDate(v.firstRegistered),
    firstRegisteredNorway: cleanDate(v.firstRegisteredNorway),
    lastInspection: cleanDate(v.lastInspection),
    nextInspection: cleanDate(v.nextInspection),
    registrationStatus: clean(v.registrationStatus),
  });
}
export type IndexPolicy = {
  version: number;
  requireMakeModel: boolean;
  requireRegistrationDate: boolean;
  additionalFields: number;
};
export const defaultPolicy: IndexPolicy = {
  version: 1,
  requireMakeModel: true,
  requireRegistrationDate: true,
  additionalFields: 2,
};
export function eligible(
  data: PublicData,
  policy: IndexPolicy = defaultPolicy,
) {
  if (policy.requireMakeModel && !(data.make && data.model)) return false;
  if (
    policy.requireRegistrationDate &&
    !(data.firstRegistered || data.firstRegisteredNorway)
  )
    return false;
  return (
    [
      data.vehicleType,
      data.color,
      data.fuel,
      data.lastInspection,
      data.nextInspection,
      data.registrationStatus,
    ].filter(Boolean).length >= policy.additionalFields
  );
}
