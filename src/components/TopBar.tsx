import { RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export default function TopBar({ title }: { title: string }) {
  const qc = useQueryClient();
  const [spinning, setSpinning] = useState(false);

  const refresh = () => {
    setSpinning(true);
    qc.invalidateQueries();
    setTimeout(() => setSpinning(false), 1000);
  };

  return (
    <header className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      <button
        onClick={refresh}
        className="gilded-button flex items-center gap-2 px-3 py-1.5 text-xs"
      >
        <RefreshCw size={14} className={spinning ? "animate-spin" : ""} />
        Refresh
      </button>
    </header>
  );
}
