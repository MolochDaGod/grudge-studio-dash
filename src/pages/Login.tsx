import { useState } from "react";
import { useAuth } from "../lib/auth-context";
import { Shield, Eye, EyeOff, Loader2 } from "lucide-react";

export default function Login() {
  const { login, error } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setLocalError("Username and password required");
      return;
    }
    setLocalError(null);
    setLoading(true);
    try {
      await login(identifier, password);
    } catch (err: any) {
      setLocalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const displayError = localError || error;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "hsl(225 30% 8%)",
        backgroundImage:
          "radial-gradient(ellipse at top, hsl(225 30% 12%) 0%, transparent 50%), radial-gradient(ellipse at bottom, hsl(225 25% 6%) 0%, transparent 50%), radial-gradient(circle at 25% 25%, rgba(212,175,55,0.06) 0%, transparent 40%)",
      }}
    >
      <div className="w-full max-w-sm">
        <div
          className="relative p-8 rounded text-center"
          style={{
            background: "linear-gradient(180deg, hsl(225 25% 14%) 0%, hsl(225 28% 10%) 50%, hsl(225 25% 8%) 100%)",
            border: "2px solid hsl(43 60% 35%)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.6)",
          }}
        >
          {/* Logo */}
          <Shield className="w-10 h-10 mx-auto mb-3" style={{ color: "hsl(43 85% 55%)" }} />
          <h1
            className="text-2xl font-bold tracking-wider uppercase mb-1"
            style={{
              background: "linear-gradient(180deg, hsl(43 90% 75%), hsl(43 85% 55%), hsl(35 70% 40%))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontFamily: "'Cinzel Decorative', serif",
            }}
          >
            GRUDGE
          </h1>
          <p
            className="text-xs uppercase tracking-widest mb-6"
            style={{ color: "hsl(45 15% 50%)", fontFamily: "'IM Fell English SC', serif" }}
          >
            Admin Dashboard
          </p>

          {/* Divider */}
          <div
            className="mx-auto mb-6"
            style={{
              width: 60,
              height: 2,
              background: "linear-gradient(90deg, transparent, hsl(43 60% 40%), transparent)",
            }}
          />

          {/* Error */}
          {displayError && (
            <div
              className="mb-4 p-2 rounded text-xs text-center"
              style={{ background: "rgba(232,85,85,0.15)", color: "hsl(0 65% 60%)", border: "1px solid rgba(232,85,85,0.3)" }}
            >
              {displayError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              placeholder="Username / Email / Grudge ID"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-3 rounded text-sm outline-none"
              style={{
                background: "hsl(225 28% 8%)",
                border: "1px solid hsl(220 15% 25%)",
                color: "hsl(43 85% 65%)",
                boxShadow: "inset 0 2px 8px rgba(0,0,0,0.5)",
                fontFamily: "'Spectral SC', serif",
              }}
            />
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 pr-10 rounded text-sm outline-none"
                style={{
                  background: "hsl(225 28% 8%)",
                  border: "1px solid hsl(220 15% 25%)",
                  color: "hsl(43 85% 65%)",
                  boxShadow: "inset 0 2px 8px rgba(0,0,0,0.5)",
                  fontFamily: "'Spectral SC', serif",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "hsl(220 15% 35%)" }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded text-xs font-bold uppercase tracking-widest cursor-pointer disabled:opacity-50"
              style={{
                background: "linear-gradient(180deg, hsl(43 70% 45%), hsl(38 65% 35%), hsl(35 60% 28%))",
                border: "2px solid hsl(43 50% 50%)",
                color: "hsl(225 30% 10%)",
                fontFamily: "'Cinzel Decorative', serif",
                textShadow: "0 1px 0 rgba(255,255,255,0.3)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.4)",
              }}
            >
              {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Enter the Forge"}
            </button>
          </form>

          <p className="mt-6 text-xs" style={{ color: "hsl(225 15% 30%)" }}>
            Requires admin role on your Grudge ID
          </p>
        </div>
      </div>
    </div>
  );
}
