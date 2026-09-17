"use client";

export default function GlobalError({
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  return (
    <html lang="nb">
      <body
        style={{
          fontFamily: "sans-serif",
          padding: 32,
          color: "#142438",
          background: "#f5f7fa",
        }}
      >
        <title>Siden kunne ikke lastes | Skiltnummeret.no</title>
        <main
          style={{
            maxWidth: 560,
            margin: "40px auto",
            padding: 24,
            background: "white",
            borderRadius: 12,
          }}
        >
          <h1>Siden kunne ikke lastes</h1>
          <p>
            Prøv igjen om litt. Kontroller betalingsstatus på Min side før du
            forsøker å betale på nytt.
          </p>
          <button onClick={retry}>Prøv igjen</button>{" "}
          <a href="/konto">Min side</a> <a href="/kontakt">Kontakt oss</a>
        </main>
      </body>
    </html>
  );
}
