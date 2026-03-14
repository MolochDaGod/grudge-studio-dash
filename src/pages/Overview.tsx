import { useQuery } from "@tanstack/react-query";
import TopBar from "../components/TopBar";
import { ServiceCard, StatCard, ProjectCard } from "../components/Cards";
import { checkAllHealth, checkDeployment } from "../lib/api";
import { GRUDGE_APPS, SERVICES } from "../lib/config";
import { Users, Swords, Package, Activity } from "lucide-react";

export default function Overview() {
  const health = useQuery({ queryKey: ["health"], queryFn: checkAllHealth, refetchInterval: 30_000 });

  const deploys = useQuery({
    queryKey: ["deploys"],
    queryFn: () => Promise.all(GRUDGE_APPS.map((p) => checkDeployment(p.liveUrl))),
    refetchInterval: 60_000,
  });

  const onlineServices = health.data?.filter((s) => s.ok).length ?? 0;
  const totalServices = SERVICES.length;
  const onlineApps = deploys.data?.filter((d) => d.online).length ?? 0;

  return (
    <div>
      <TopBar title="Studio Overview" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Activity size={24} className="text-success" />} value={`${onlineServices}/${totalServices}`} label="Services Online" />
        <StatCard icon={<Package size={24} className="text-primary" />} value={GRUDGE_APPS.length} label="Total Apps" />
        <StatCard icon={<Swords size={24} className="text-warning" />} value={`${onlineApps} live`} label="Apps Online" />
        <StatCard icon={<Users size={24} className="text-gold-light" />} value="—" label="Total Accounts" />
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
