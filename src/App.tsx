import { Route, Switch } from "wouter";
import Sidebar from "./components/Sidebar";
import { AuthProvider, AuthGate } from "./lib/auth-context";
import Login from "./pages/Login";

// Pages
import Overview from "./pages/Overview";
import Accounts from "./pages/Accounts";
import UnityGame from "./pages/games/UnityGame";
import GrudgeWars from "./pages/games/GrudgeWars";
import Angeler from "./pages/games/Angeler";
import GDevelop from "./pages/games/GDevelop";
import Tools from "./pages/games/Tools";
import Services from "./pages/Services";
import Storage from "./pages/Storage";
import DatabasePage from "./pages/Database";
import Logs from "./pages/Logs";
import Lobbies from "./pages/Lobbies";
import Arena from "./pages/Arena";
import TCG from "./pages/TCG";
import UnityServers from "./pages/UnityServers";
import Deploy from "./pages/Deploy";
import SchemaEditor from "./pages/SchemaEditor";
import Query from "./pages/Query";
import Economy from "./pages/Economy";
import ModeConfigs from "./pages/ModeConfigs";
import Docs from "./pages/Docs";
import Battle from "./pages/Battle";

export default function App() {
  return (
    <AuthProvider>
      <AuthGate fallback={<Login />}>
    <div className="min-h-screen">
      <Sidebar />
      <main className="ml-56 p-6">
        <Switch>
          <Route path="/" component={Overview} />
          <Route path="/accounts" component={Accounts} />
          <Route path="/games/unity" component={UnityGame} />
          <Route path="/games/grudge-wars" component={GrudgeWars} />
          <Route path="/games/angeler" component={Angeler} />
          <Route path="/games/gdevelop" component={GDevelop} />
          <Route path="/games/tools" component={Tools} />
          <Route path="/lobbies" component={Lobbies} />
          <Route path="/arena" component={Arena} />
          <Route path="/battle" component={Battle} />
          <Route path="/tcg" component={TCG} />
          <Route path="/unity-servers" component={UnityServers} />
          <Route path="/services" component={Services} />
          <Route path="/deploy" component={Deploy} />
          <Route path="/storage" component={Storage} />
          <Route path="/database" component={DatabasePage} />
          <Route path="/schema" component={SchemaEditor} />
          <Route path="/query" component={Query} />
          <Route path="/economy" component={Economy} />
          <Route path="/logs" component={Logs} />
          <Route path="/mode-configs" component={ModeConfigs} />
          <Route path="/docs" component={Docs} />
          <Route>
            <div className="text-center py-20">
              <h1 className="text-3xl">404</h1>
              <p className="text-muted-foreground mt-2">Page not found</p>
            </div>
          </Route>
        </Switch>
      </main>
    </div>
      </AuthGate>
    </AuthProvider>
  );
}
