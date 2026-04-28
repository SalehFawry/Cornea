import { useState, useEffect } from "react";

interface Props {
  title?: string;
  subtitle?: string;
  showTime?: boolean;
}

export default function PageHeader({ title = "Overview", subtitle, showTime = true }: Props) {
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-page-title text-energy-text-primary">{title}</h1>
        {subtitle && (
          <p className="text-body-label text-energy-text-secondary mt-1">{subtitle}</p>
        )}
      </div>
      {showTime && (
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-light text-energy-text-primary tracking-tight">
            {currentTime}
          </span>
          <span className="text-body-label text-energy-text-secondary">Time</span>
        </div>
      )}
    </div>
  );
}
