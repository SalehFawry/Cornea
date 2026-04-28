interface Props {
  label?: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  variant?: "dark" | "light";
  trend?: "up" | "down" | "neutral";
}

export default function MetricCard({
  label,
  value,
  unit,
  subtitle,
  variant = "dark",
  trend,
}: Props) {
  const isLight = variant === "light";

  return (
    <div className={`rounded-card p-6 ${isLight ? "bg-energy-bg-card-light" : "bg-energy-bg-card-dark border border-energy-border-subtle/30"}`}>
      {label && (
        <div className={`flex items-center gap-2 mb-4 ${isLight ? "text-energy-text-inverse" : "text-energy-text-secondary"}`}>
          <span className="text-card-title">{label}</span>
          {trend && (
            <span className={`text-xs ${trend === "up" ? "text-red-400" : trend === "down" ? "text-energy-accent-mint" : "text-energy-text-secondary"}`}>
              {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
            </span>
          )}
        </div>
      )}
      <div className="stat-display">
        <span className={`text-big-stat ${isLight ? "text-energy-text-inverse" : "text-energy-text-primary"}`}>
          {value}
        </span>
        {unit && (
          <span className={`text-stat-unit mt-1 ${isLight ? "text-energy-text-inverse-muted" : "text-energy-text-secondary"}`}>
            {unit}
          </span>
        )}
        {subtitle && (
          <span className={`text-xs mt-2 ${isLight ? "text-energy-text-inverse-muted" : "text-energy-text-secondary"}`}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
