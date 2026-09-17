import { ImageResponse } from "next/og";
export const alt = "Skiltnummeret.no – Kjøretøyopplysninger";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background: "#edf5f8",
        color: "#142438",
        padding: 80,
      }}
    >
      <div style={{ fontSize: 36, marginBottom: 60 }}>Skiltnummeret.no</div>
      <div style={{ fontSize: 68, fontWeight: 700 }}>Kjenn bilen.</div>
      <div style={{ fontSize: 68, fontWeight: 700 }}>Før du bestemmer deg.</div>
      <div style={{ fontSize: 28, marginTop: 40 }}>
        Tilgjengelige tekniske kjøretøyopplysninger
      </div>
    </div>,
    size,
  );
}
