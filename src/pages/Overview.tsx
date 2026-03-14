import { useQuery } from "@tanstack/react-query";
import TopBar from "../components/TopBar";
import { ServiceCard, StatCard, ProjectCard } from "../components/Cards";
import { checkAllHealth, checkDeployment } from "../lib/api";
import { PROJECTS, SERVICES } from "../lib/config";
import { Users, Swords, Package, Activity } from "lucide-react";

export default function Overview() {
  const health = useQuery({ queryKey: ["health"], queryFn: checkAllHealth, refetchInterval: 30_000 });

  // Check each project deployment
  const deploys = useQuery({
    queryKey: ["deploys"],
    queryFn: () => Promise.all(PROJECTS.map((p) => checkDeployment(p.liveUrl))),
    refetchInterval: 60_000,
  });

  const onlineServices = health.data?.filter((s) => s.ok).length ?? 0;
  const totalServices = SERVICES.length;

  return (
    <div>
      <TopBar title="Studio Overview" />

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Activity size={24} className="text-success" />} value={`${onlineServices}/${totalServices}`} label="Services Online" />
        <StatCard icon={<Package size={24} className="text-primary" />} value={PROJECTS.length} label="Projects" />
        <StatCard icon={<Swords size={24} className="text-warning" />} value={PROJECTS.filter((p) => p.category === "game").length} label="Games" />
        <StatCard icon={<Users size={24} className="text-gold-light" />} value="—" label="Total Accounts" />
      </div>

      {/* Service health strip */}
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

      {/* Project cards */}
      <section>
        <h2 className="text-lg mb-3">All Projects</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PROJECTS.map((proj, i) => (
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
