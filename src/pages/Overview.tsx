import { useQuery } from "@tanstack/react-query";
import TopBar from "../components/TopBar";
import { ServiceCard, StatCard, ProjectCard } from "../components/Cards";
import { checkAllHealth, checkDeployment, adminApi, accountApi } from "../lib/api";
import { GRUDGE_APPS, SERVICES } from "../lib/config";
import { Users, Swords, Package, Activity } from "lucide-react";

export default function Overview() {
  const health = useQuery({ queryKey: ["health"], queryFn: checkAllHealth, refetchInterval: 30_000 });

  const deploys = useQuery({
    queryKey: ["deploys"],
    queryFn: () => Promise.all(GRUDGE_APPS.map((p) => checkDeployment(p.liveUrl))),
    refetchInterval: 60_000,
  });

  // Game stats: characters, gold, matches (from game-api)
  const gameStats = useQuery({ queryKey: ["game-stats"], queryFn: adminApi.gameStats, refetchInterval: 60_000 });
  // Identity stats: role breakdown, active players (from grudge-id)
  const idStats = useQuery({ queryKey: ["id-stats"], queryFn: accountApi.identityStats, refetchInterval: 60_000 });

  const stats = idStats.data?.stats ?? gameStats.data?.stats;
  const roles = stats?.roleBreakdown ?? {};

  const onlineServices = health.data?.filter((s) => s.ok).length ?? 0;
  const totalServices  = SERVICES.length;
  const onlineApps     = deploys.data?.filter((d) => d.online).length ?? 0;
  const totalAccounts  = stats?.totalUsers ?? "—";
  const active24h      = stats?.activeUsers24h ?? "—";

  return (
    <div>
      <TopBar title="Studio Overview" />

      {/* Top row: infra health */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <StatCard icon={<Activity size={24} className="text-success" />} value={`${onlineServices}/${totalServices}`} label="Services Online" />
        <StatCard icon={<Package size={24} className="text-primary" />} value={GRUDGE_APPS.length} label="Total Apps" />
        <StatCard icon={<Swords size={24} className="text-warning" />} value={`${onlineApps} live`} label="Apps Online" />
        <StatCard icon={<Users size={24} className="text-gold-light" />} value={totalAccounts} label="Total Accounts" />
      </div>

      {/* Second row: player activity + game economy */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon="🔋" value={active24h} label="Active (24h)" />
        <StatCard icon="🛡️" value={roles.member ?? "—"} label="Members" />
        <StatCard icon="⚿" value={stats?.totalCharacters ?? "—"} label="Characters" />
        <StatCard icon="💰" value={stats?.goldSupply != null ? Number(stats.goldSupply).toLocaleString() : "—"} label="Gold Circulating" />
      </div>

      <section className="mb-6">
        <h2 className="text-lg mb-3">Backend Services</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {health.data
            ? health.data.map((svc) => <ServiceCard key={svc.key} svc={svc} />)
            : SERVICES.map((s) => (
                <ServiceCard key={s.key} svc={{ key: s.key, name: s.name, url: s.url, ok: false, ms: 0 }} />
              ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg mb-3">All Apps</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {GRUDGE_APPS.map((proj, i) => (
            <ProjectCard
              key={proj.id}
              project={proj}
              online={deploys.data?.[i]?.online}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
