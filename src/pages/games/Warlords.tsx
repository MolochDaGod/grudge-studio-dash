import GameHub from "./GameHub";
import { FLAGSHIP_GAMES } from "../../lib/config";

export default function Warlords() {
  const game = FLAGSHIP_GAMES.find((g) => g.id === "warlords")!;
  return <GameHub game={game} />;
}