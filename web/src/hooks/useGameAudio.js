import { useEffect, useRef } from "react";
import { subscribeToSoundEvents } from "../game/runtime/runtimeBridge";

const soundProfiles = {
  hit_confirm: { frequency: 220, duration: 0.08, type: "square" },
  enemy_down: { frequency: 140, duration: 0.18, type: "triangle" },
  dodge: { frequency: 480, duration: 0.06, type: "sawtooth" },
  skill_cast: { frequency: 320, duration: 0.12, type: "square" },
  low_resource: { frequency: 180, duration: 0.14, type: "sine" }
};

export function useGameAudio(enabled = true) {
  const audioContextRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    return subscribeToSoundEvents(({ type }) => {
      const profile = soundProfiles[type];
      if (!profile) {
        return;
      }

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        return;
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }

      const context = audioContextRef.current;
      const now = context.currentTime;
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.type = profile.type;
      oscillator.frequency.setValueAtTime(profile.frequency, now);
      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.06, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + profile.duration);

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + profile.duration);
    });
  }, [enabled]);
}
