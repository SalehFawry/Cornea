import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  title?: string;
}

export default function FilterSection({ children, title = "Filters" }: Props) {
  return (
    <div className="bg-energy-bg-card-dark rounded-card p-6 border border-energy-border-subtle/30 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-card-title text-energy-text-primary">{title}</h3>
        <button className="pill-button">Week ↓</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {children}
      </div>
    </div>
  );
}
