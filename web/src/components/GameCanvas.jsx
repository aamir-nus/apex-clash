import { useEffect, useRef } from "react";
import { createGame } from "../game/config/createGame";

export function GameCanvas({ content, selectedArchetype, ready }) {
  const containerRef = useRef(null);
  const gameRef = useRef(null);

  useEffect(() => {
    if (!ready || !containerRef.current || gameRef.current) {
      return undefined;
    }

    gameRef.current = createGame({
      parent: containerRef.current,
      content,
      selectedArchetype
    });

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [content, ready, selectedArchetype]);

  useEffect(() => {
    const sandboxScene = gameRef.current?.scene?.getScene("CombatSandboxScene");
    if (sandboxScene?.applyArchetype) {
      sandboxScene.applyArchetype(selectedArchetype);
    }
  }, [selectedArchetype]);

  return <div ref={containerRef} className="game-canvas" />;
}
