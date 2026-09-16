import { prettyPlate } from "@/lib/plate";

export function PlateTag({ plate }: { plate: string }) {
  return (
    <span className="plate-static">
      <span className="eu">N</span>
      <span>{prettyPlate(plate)}</span>
    </span>
  );
}
