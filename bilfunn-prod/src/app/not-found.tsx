import PlateSearch from "@/components/PlateSearch";

export default function NotFound() {
  return (
    <div className="wrap" style={{ paddingTop: 30, maxWidth: 520 }}>
      <div className="card">
        <h1 style={{ fontSize: "1.45rem" }}>Siden finnes ikke</h1>
        <p className="muted">Lenken kan være utdatert, eller registreringsnummeret er ikke gyldig. Start et nytt søk herfra.</p>
        <PlateSearch />
      </div>
    </div>
  );
}
