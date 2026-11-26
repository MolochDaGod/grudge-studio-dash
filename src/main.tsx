import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, AuthGate } from "./lib/auth-context";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { logger } from "./lib/logger";
import App from "./App";
import Login from "./pages/Login";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchInterval: 60_000, retry: 1 } },
});

// Global error handler for unhandled promise rejections
window.addEventListener("unhandledrejection", (event) => {
  logger.error("Unhandled promise rejection", event.reason, {
    promise: event.promise,
  });
});

// Global error handler for runtime errors
window.addEventListener("error", (event) => {
  logger.error("Global error handler", event.error, {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AuthGate fallback={<Login />}>
            <App />
          </AuthGate>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
