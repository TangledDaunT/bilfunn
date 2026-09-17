import { expect, it } from "vitest";
import { freePreview } from "../../src/lib/vehicle";
import { mapSvv } from "../../src/lib/vehicle/svv";
it("keeps private and paid fields out of the six-field preview", () => {
  const preview = freePreview({
    plate: "AB12345",
    make: "Example",
    model: "Test",
    bodyType: "Car",
    color: "Blue",
    firstRegisteredNorway: "2023-04-15",
    year: 1990,
    vin: "PRIVATE",
    owner: { name: "PRIVATE" },
    fuel: "Diesel",
    source: "SVV",
    fetchedAt: "2026-01-01",
    simulated: false,
  });
  expect(preview).toEqual({
    plate: "AB12345",
    make: "Example",
    model: "Test",
    bodyType: "Car",
    color: "Blue",
    year: "2023",
  });
});
it("does not infer a preview year when the Norwegian registration date is missing", () => {
  expect(
    freePreview({
      plate: "AB12345",
      year: 2023,
      source: "SVV",
      fetchedAt: "2026-01-01",
      simulated: false,
    }).year,
  ).toBeNull();
});
it("derives overdue status only from a valid past deadline in the existing adapter", () => {
  expect(
    mapSvv("AB12345", {
      periodiskKjoretoyKontroll: { kontrollfrist: "2000-01-01" },
    }).inspectionOverdue,
  ).toBe(true);
  expect(
    mapSvv("AB12345", {
      periodiskKjoretoyKontroll: { kontrollfrist: "2999-01-01" },
    }).inspectionOverdue,
  ).toBe(false);
  expect(mapSvv("AB12345", {}).inspectionOverdue).toBe(false);
});
