import { useEffect, useState } from "react";
import {
  subscribeToRuntimeUpdates,
  subscribeToSceneUpdates,
  subscribeToTransitionUpdates
} from "../game/runtime/runtimeBridge";

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
  castState: {
    phase: "idle",
    label: "No active cast",
    progress: 0
  },
  activeEffects: [],
  levelUp: {
    available: false,
    options: []
  },
  encounter: {
    enemiesRemaining: 0,
    status: "Awaiting runtime"
  },
  transition: {
    active: false,
    label: "",
    detail: ""
  },
  controls: [],
  scene: {
    scene: "boot",
    label: "Boot"
  }
};

export function useGameRuntime() {
  const [runtime, setRuntime] = useState(defaultRuntime);

  useEffect(() => subscribeToRuntimeUpdates(setRuntime), []);

  useEffect(
    () =>
      subscribeToSceneUpdates((scene) => {
        setRuntime((current) => ({
          ...current,
          scene
        }));
      }),
    []
  );

  useEffect(
    () =>
      subscribeToTransitionUpdates((transition) => {
        setRuntime((current) => ({
          ...current,
          transition
        }));
      }),
    []
  );

  return runtime;
}
