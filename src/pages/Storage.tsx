import { useQuery } from "@tanstack/react-query";
import TopBar from "../components/TopBar";
import { StatCard } from "../components/Cards";
import { storageApi } from "../lib/api";
import { API } from "../lib/config";

const KNOWN_BUCKETS = [
  { name: "grudge-studio-assets", access: "public", desc: "Game textures, models, UI assets" },
  { name: "grudge-game-data", access: "private", desc: "Game configuration, save data, level data" },
  { name: "grudge-avatars", access: "public", desc: "User profile images and avatars" },
];

export default function Storage() {
  const buckets = useQuery({ queryKey: ["storage-buckets"], queryFn: storageApi.buckets });

  return (
    <div>
      <TopBar title="Object Storage" />

      <p className="text-sm text-muted-foreground mb-6">
        MinIO object storage at <span className="text-primary">{API.minio}</span> — 3 buckets configured.
      </p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard icon="🪣" value={KNOWN_BUCKETS.length} label="Buckets" />
        <StatCard icon="📁" value={buckets.data?.reduce((sum: number, b: any) => sum + (b.objectCount ?? 0), 0) ?? "—"} label="Total Objects" />
        <StatCard icon="🔒" value={KNOWN_BUCKETS.filter((b) => b.access === "private").length} label="Private" />
      </div>

      <div className="space-y-4">
        {KNOWN_BUCKETS.map((bucket) => {
          const live = buckets.data?.find((b: any) => b.name === bucket.name);
          return (
            <div key={bucket.name} className="fantasy-panel p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🪣</span>
                  <h3 className="text-sm font-semibold">{bucket.name}</h3>
                  <span className={`text-[0.6rem] px-2 py-0.5 rounded ${
                    bucket.access === "public" ? "bg-success/20 text-success" : "bg-warning/20 text-warning"
                  }`}>
                    {bucket.access}
                  </span>
                </div>
                {live && <span className="text-xs text-muted-foreground">{live.objectCount ?? 0} objects</span>}
              </div>
              <p className="text-xs text-muted-foreground">{bucket.desc}</p>
              {live?.size && (
                <p className="text-xs text-muted-foreground mt-1">Size: {(live.size / 1024 / 1024).toFixed(1)} MB</p>
              )}
            </div>
          );
        })}
      </div>

      {buckets.isError && (
        <div className="inset-panel p-4 mt-4 text-sm text-danger">
          Could not connect to storage API — ensure MinIO proxy is configured on the Game API.
        </div>
      )}
    </div>
  );
}
