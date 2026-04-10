import { useEffect, useState } from "react";
import {
  subscribeToCombatFeedEvents,
  subscribeToRuntimeUpdates,
  subscribeToSceneUpdates,
  subscribeToTransitionUpdates
} from "../game/runtime/runtimeBridge";

const defaultRuntime = {
  regionId: "hub_blacksite",
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
  objective: null,
  resumeSource: "fresh-start",
  sessionState: {},
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
  selectedRegionId: "detention_center",
  scene: {
    scene: "boot",
    label: "Boot"
  }
};

function mergeRuntimeState(current, next) {
  return {
    ...defaultRuntime,
    ...current,
    ...next,
    player: {
      ...defaultRuntime.player,
      ...(current?.player ?? {}),
      ...(next?.player ?? {})
    },
    castState: {
      ...defaultRuntime.castState,
      ...(current?.castState ?? {}),
      ...(next?.castState ?? {})
    },
    encounter: {
      ...defaultRuntime.encounter,
      ...(current?.encounter ?? {}),
      ...(next?.encounter ?? {})
    },
    levelUp: {
      ...defaultRuntime.levelUp,
      ...(current?.levelUp ?? {}),
      ...(next?.levelUp ?? {})
    },
    transition: {
      ...defaultRuntime.transition,
      ...(current?.transition ?? {}),
      ...(next?.transition ?? {})
    },
    scene: {
      ...defaultRuntime.scene,
      ...(current?.scene ?? {}),
      ...(next?.scene ?? {})
    },
    cooldowns: next?.cooldowns ?? current?.cooldowns ?? defaultRuntime.cooldowns,
    combatFeed: next?.combatFeed ?? current?.combatFeed ?? defaultRuntime.combatFeed,
    activeEffects: next?.activeEffects ?? current?.activeEffects ?? defaultRuntime.activeEffects,
    controls: next?.controls ?? current?.controls ?? defaultRuntime.controls,
    sessionState: next?.sessionState ?? current?.sessionState ?? defaultRuntime.sessionState
  };
}

export function useGameRuntime() {
  const [runtime, setRuntime] = useState(defaultRuntime);

  useEffect(
    () =>
      subscribeToRuntimeUpdates((nextRuntime) => {
        setRuntime((current) => mergeRuntimeState(current, nextRuntime));
      }),
    []
  );

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

  useEffect(
    () =>
      subscribeToCombatFeedEvents((entry) => {
        setRuntime((current) => ({
          ...current,
          combatFeed: [entry, ...(current.combatFeed ?? [])].slice(0, 8)
        }));
      }),
    []
  );

  return runtime;
}
