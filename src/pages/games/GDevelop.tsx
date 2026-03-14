import TopBar from "../../components/TopBar";

export default function GDevelop() {
  return (
    <div>
      <TopBar title="GDevelop Games" />

      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">🕹️</span>
        <p className="text-sm text-muted-foreground">GDevelop-based game projects for Grudge Studio</p>
      </div>

      <section>
        <h2 className="text-lg mb-3">Projects</h2>
        <div className="inset-panel p-6 text-center text-muted-foreground text-sm">
          <p>No GDevelop projects configured yet.</p>
          <p className="mt-2 text-xs">Add GDevelop game URLs and repos to track them here.</p>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-lg mb-3">Integration</h2>
        <div className="inset-panel p-4 space-y-2 text-sm">
          <p><span className="text-primary">Engine:</span> GDevelop (HTML5 export)</p>
          <p><span className="text-primary">Deploy:</span> Vercel or GitHub Pages</p>
          <p><span className="text-primary">Backend:</span> api.grudge-studio.com (shared)</p>
          <p><span className="text-primary">Accounts:</span> Linked via Grudge Studio cross-ecosystem auth</p>
        </div>
      </section>
    </div>
  );
}
