interface Props {
  columns: { key: string; label: string; render?: (v: unknown, row: Record<string, unknown>) => React.ReactNode }[];
  data: Record<string, unknown>[];
  maxHeight?: string;
  title?: string;
}

export default function DataTable({ columns, data, maxHeight = "420px", title }: Props) {
  if (!Array.isArray(data) || !data.length) {
    return (
      <div className="bg-energy-bg-card-dark rounded-card border border-energy-border-subtle/30 p-8 text-center text-energy-text-secondary">
        No data available.
      </div>
    );
  }

  return (
    <div className="bg-energy-bg-card-dark rounded-card border border-energy-border-subtle/30 overflow-hidden">
      {title && (
        <div className="px-6 py-4 border-b border-energy-border-subtle/30 flex items-center justify-between">
          <h3 className="text-card-title text-energy-text-primary">{title}</h3>
          <button className="pill-button">Change module</button>
        </div>
      )}
      <div style={{ maxHeight, overflowY: "auto" }}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-energy-bg-card-dark">
            <tr>
              {(Array.isArray(columns) ? columns : []).map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left font-medium text-energy-text-secondary border-b border-energy-border-subtle/30"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(Array.isArray(data) ? data : []).map((row, i) => (
              <tr key={i} className="hover:bg-energy-border-subtle/10 transition-colors">
                {(Array.isArray(columns) ? columns : []).map((col) => (
                  <td
                    key={col.key}
                    className="px-4 py-3 border-b border-energy-border-subtle/20 text-energy-text-primary"
                  >
                    {col.render
                      ? col.render(row[col.key], row)
                      : (row[col.key] as React.ReactNode) ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
