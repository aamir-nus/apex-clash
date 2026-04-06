import { useEffect, useRef, useState } from "react";
import { createGame } from "../game/config/createGame";

export function GameCanvas({ content, selectedArchetype, playerProfile, activeSave, ready }) {
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!ready || !containerRef.current || gameRef.current) {
      return undefined;
    }

    gameRef.current = createGame({
      parent: containerRef.current,
      content,
      selectedArchetype,
      playerProfile,
      activeSave
    });

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [content, ready, selectedArchetype, playerProfile, activeSave]);

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
    }

    const sandboxScene = gameRef.current?.scene?.getScene("CombatSandboxScene");
    if (sandboxScene?.syncProfile) {
      sandboxScene.syncProfile(playerProfile);
    } else if (sandboxScene?.applyProfile) {
      sandboxScene.applyProfile(playerProfile, selectedArchetype);
    }
  }, [activeSave, playerProfile, selectedArchetype]);

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
