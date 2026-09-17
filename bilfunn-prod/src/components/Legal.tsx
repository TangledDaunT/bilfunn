export default function LegalPage({
  title,
  sections,
}: {
  title: string;
  sections: Array<[string, React.ReactNode]>;
}) {
  return (
    <div className="wrap" style={{ paddingTop: 28, maxWidth: 720 }}>
      <h1>{title}</h1>
      <p className="tiny">Utkast til gjennomgang før lansering.</p>
      <div className="card">
        {sections.map(([h, body]) => (
          <section key={h}>
            <h3 style={{ marginTop: 18 }}>{h}</h3>
            <div className="muted small">{body}</div>
          </section>
        ))}
      </div>
      <p className="tiny" style={{ marginTop: 14 }}>
        Denne teksten skal gjennomgås av norsk juridisk rådgiver før lansering.
      </p>
    </div>
  );
}
