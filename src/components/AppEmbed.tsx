import { useState } from "react";
import { X, ExternalLink, RefreshCw, Loader2 } from "lucide-react";
import type { GrudgeApp } from "../lib/config";

interface AppEmbedProps {
  app: GrudgeApp;
  onClose: () => void;
}

export default function AppEmbed({ app, onClose }: AppEmbedProps) {
  const [loading, setLoading] = useState(true);
  const iframeKey = app.id; // used to force refresh

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-lg">{app.icon}</span>
          <div>
            <h3 className="text-sm font-semibold">{app.name}</h3>
            <p className="text-[0.6rem] text-muted-foreground">{app.liveUrl}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {app.backend.filter((b) => b !== "none").length > 0 && (
            <div className="flex gap-1 mr-3">
              {app.backend.filter((b) => b !== "none").map((b) => (
                <span key={b} className="text-[0.55rem] px-1.5 py-0.5 rounded bg-accent/30 text-accent uppercase tracking-wider">{b}</span>
              ))}
            </div>
          )}
          <button
            onClick={() => {
              const iframe = document.getElementById("app-embed-iframe") as HTMLIFrameElement;
              if (iframe) iframe.src = app.liveUrl;
            }}
            className="gilded-button flex items-center gap-1 px-2 py-1 text-xs"
          >
            <RefreshCw size={12} /> Refresh
          </button>
          <a
            href={app.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="gilded-button flex items-center gap-1 px-2 py-1 text-xs"
          >
            <ExternalLink size={12} /> New Tab
          </a>
          <button onClick={onClose} className="gilded-button flex items-center gap-1 px-2 py-1 text-xs text-danger">
            <X size={12} /> Close
          </button>
        </div>
      </div>

      {/* Iframe */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <Loader2 size={32} className="animate-spin text-primary" />
            <span className="ml-3 text-sm text-muted-foreground">Loading {app.name}...</span>
          </div>
        )}
        <iframe
          id="app-embed-iframe"
          key={iframeKey}
          src={app.liveUrl}
          onLoad={() => setLoading(false)}
          className="w-full h-full border-0"
          allow="fullscreen; clipboard-write; clipboard-read"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
        />
      </div>
    </div>
  );
}
