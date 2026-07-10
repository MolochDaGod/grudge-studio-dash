import { useAuth } from "../lib/auth-context";
import { ExternalLink, Loader2, ShieldCheck } from "lucide-react";

/**
 * Dash does NOT host its own password form.
 * Canonical sign-in is id.grudge-studio.com (fleet ONE TRUTH).
 */
export default function Login() {
  const { loginWithGrudgeId, error, loading } = useAuth();

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "hsl(225 30% 8%)",
        backgroundImage:
          "radial-gradient(ellipse at top, rgba(30,80,180,0.12) 0%, transparent 50%), radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.12) 0%, transparent 45%)",
      }}
    >
      <div className="w-full max-w-sm">
        <div className="fantasy-panel p-8 text-center">
          <img
            src="/grudge-id-logo.png"
            alt="Grudge Studio"
            width={88}
            height={88}
            className="w-22 h-22 mx-auto mb-4 rounded-full object-cover ring-1 ring-primary/40 shadow-lg"
            style={{ width: 88, height: 88 }}
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://id.grudge-studio.com/grudge-id-logo.png";
            }}
          />

          <h1 className="text-xl font-bold tracking-wide gold-text mb-1">Grudge Studio</h1>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
            Admin Dashboard
          </p>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Sign in with <strong className="text-foreground">Grudge ID</strong> — the same account
            used for Warlords, crafting, launcher, and the fleet. No separate dash password.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded text-xs text-danger border border-danger/30 bg-danger/10">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={() => loginWithGrudgeId()}
            disabled={loading}
            className="w-full py-3 rounded text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            style={{
              background: "linear-gradient(180deg, hsl(43 80% 55%), hsl(38 70% 40%))",
              color: "hsl(225 30% 10%)",
              border: "1px solid hsl(43 50% 45%)",
            }}
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <ShieldCheck size={18} />
                Sign in with Grudge ID
              </>
            )}
          </button>

          <p className="mt-4 text-[0.7rem] text-muted-foreground leading-relaxed">
            Opens{" "}
            <a
              href="https://id.grudge-studio.com/login"
              className="text-primary hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              id.grudge-studio.com
            </a>{" "}
            then returns here with a secure token. Admin or master role required.
          </p>

          <a
            href="https://id.grudge-studio.com/login"
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-1 text-[0.7rem] text-muted-foreground hover:text-primary"
          >
            Create or manage account <ExternalLink size={11} />
          </a>
        </div>
      </div>
    </div>
  );
}
