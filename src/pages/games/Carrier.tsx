import GameHub from "./GameHub";
import { FLAGSHIP_GAMES } from "../../lib/config";

export default function Carrier() {
  const game = FLAGSHIP_GAMES.find((g) => g.id === "carrier")!;
  return <GameHub game={game} />;
}