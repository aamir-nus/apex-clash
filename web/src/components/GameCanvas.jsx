import { useEffect, useRef, useState } from "react";
import { createGame } from "../game/config/createGame";

export function GameCanvas({ content, selectedArchetype, playerProfile, activeSave, firstRunTutorial, ready }) {
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const runtimeConfigRef = useRef({
    content,
    selectedArchetype,
    playerProfile,
    activeSave,
    firstRunTutorial
  });
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    runtimeConfigRef.current = {
      content,
      selectedArchetype,
      playerProfile,
      activeSave,
      firstRunTutorial
    };
  }, [activeSave, content, firstRunTutorial, playerProfile, selectedArchetype]);

  useEffect(() => {
    if (!ready || !containerRef.current || gameRef.current) {
      return undefined;
    }

    const initialRuntimeConfig = runtimeConfigRef.current;
    gameRef.current = createGame({
      parent: containerRef.current,
      content: initialRuntimeConfig.content,
      selectedArchetype: initialRuntimeConfig.selectedArchetype,
      playerProfile: initialRuntimeConfig.playerProfile,
      activeSave: initialRuntimeConfig.activeSave,
      firstRunTutorial: initialRuntimeConfig.firstRunTutorial
    });

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [content, ready]);

  useEffect(() => {
    if (ready && containerRef.current) {
      containerRef.current.focus();
      setFocused(true);
    }
  }, [ready]);

  useEffect(() => {
    if (gameRef.current) {
      gameRef.current.registry.set("selectedArchetype", selectedArchetype);
      gameRef.current.registry.set("playerProfile", playerProfile ?? null);
      gameRef.current.registry.set("activeSave", activeSave ?? null);
      gameRef.current.registry.set("firstRunTutorial", firstRunTutorial);
    }

    ["CombatSandboxScene", "DungeonScene", "BossScene"].forEach((sceneKey) => {
      const activeScene = gameRef.current?.scene?.getScene(sceneKey);
      if (!activeScene) {
        return;
      }

      if (activeScene.syncProfile) {
        activeScene.syncProfile(playerProfile);
        return;
      }

      if (activeScene.applyProfile) {
        activeScene.applyProfile(playerProfile, selectedArchetype);
      }
    });
  }, [activeSave, firstRunTutorial, playerProfile, selectedArchetype]);

  return (
    <div className={focused ? "game-shell focused" : "game-shell"}>
      <div
        ref={containerRef}
        className="game-canvas"
        onBlur={() => setFocused(false)}
        onClick={() => {
          containerRef.current?.focus();
          setFocused(true);
        }}
        onFocus={() => setFocused(true)}
        role="application"
        tabIndex={0}
      />
      <div className="game-focus-bar">
        <span>{focused ? "Controls armed" : "Click game to focus controls"}</span>
        <small>Keyboard-first play surface</small>
      </div>
    </div>
  );
}
