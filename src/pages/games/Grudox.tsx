import GameHub from "./GameHub";
import { FLAGSHIP_GAMES } from "../../lib/config";

export default function Grudox() {
  const game = FLAGSHIP_GAMES.find((g) => g.id === "grudox")!;
  return <GameHub game={game} />;
}