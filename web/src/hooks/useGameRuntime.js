import { useEffect, useState } from "react";
import { subscribeToRuntimeUpdates } from "../game/runtime/runtimeBridge";

const defaultRuntime = {
  player: {
    hp: 0,
    maxHp: 0,
    ce: 0,
    maxCe: 0,
    level: 1,
    xp: 0,
    xpToNextLevel: 0,
    attack: 0,
    defense: 0,
    speed: 0,
    pendingStatPoints: 0,
    archetype: "Unloaded"
  },
  cooldowns: [],
  combatFeed: [],
  encounter: {
    enemiesRemaining: 0,
    status: "Awaiting runtime"
  }
};

export function useGameRuntime() {
  const [runtime, setRuntime] = useState(defaultRuntime);

  useEffect(() => subscribeToRuntimeUpdates(setRuntime), []);

  return runtime;
}
