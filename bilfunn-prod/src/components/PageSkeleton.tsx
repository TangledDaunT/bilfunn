export default function PageSkeleton({
  title,
  cards = 2,
  columns = 1,
}: {
  title: string;
  cards?: number;
  columns?: 1 | 2;
}) {
  return (
    <div
      className="wrap"
      style={{ paddingTop: 28 }}
      aria-busy="true"
      role="status"
    >
      <p>{title}</p>
      <div aria-hidden="true" className={columns === 2 ? "grid g2" : "grid"}>
        {Array.from({ length: cards }, (_, i) => (
          <div className="card" key={i} style={{ minHeight: 200 }}>
            {[65, 90, 75, 85].map((width, j) => (
              <div
                key={j}
                style={{
                  width: `${width}%`,
                  height: j ? 16 : 28,
                  background: "#e6ebf0",
                  borderRadius: 6,
                  marginBottom: 22,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
