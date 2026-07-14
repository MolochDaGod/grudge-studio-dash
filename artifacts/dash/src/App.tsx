import { Route, Switch } from "wouter";
import Sidebar from "./components/Sidebar";
import GamesTopBar from "./components/GamesTopBar";

// Pages
import Overview from "./pages/Overview";
import Accounts from "./pages/Accounts";
import UnityGame from "./pages/games/UnityGame";
import Warlords from "./pages/games/Warlords";
import Carrier from "./pages/games/Carrier";
import Grudox from "./pages/games/Grudox";
import GrudgeWars from "./pages/games/GrudgeWars";
import Angeler from "./pages/games/Angeler";
import GDevelop from "./pages/games/GDevelop";
import Tools from "./pages/games/Tools";
import Services from "./pages/Services";
import Storage from "./pages/Storage";
import AssetsPage from "./pages/Assets";
import AssetBrowser from "./pages/AssetBrowser";
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
import Railway from "./pages/Railway";
import Battle from "./pages/Battle";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <div className="min-h-screen">
      <GamesTopBar />
      <Sidebar />
      <main className="ml-56 pt-14 p-6">
        <Switch>
          <Route path="/" component={Overview} />
          {/* Canonical Grudge ID return path — AuthProvider picks up ?grudge_token= */}
          <Route path="/auth/callback" component={Overview} />
          <Route path="/settings" component={Settings} />
          <Route path="/accounts" component={Accounts} />
          <Route path="/games/warlords" component={Warlords} />
          <Route path="/games/carrier" component={Carrier} />
          <Route path="/games/grudox" component={Grudox} />
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
          <Route path="/railway" component={Railway} />
          <Route path="/deploy" component={Deploy} />
          <Route path="/storage" component={Storage} />
          <Route path="/assets" component={AssetsPage} />
          <Route path="/asset-browser" component={AssetBrowser} />
          <Route path="/warlords-assets" component={AssetBrowser} />
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
  );
}