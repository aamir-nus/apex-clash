import { useEffect, useRef } from "react";
import { subscribeToSoundEvents } from "../game/runtime/runtimeBridge";

const soundProfiles = {
  hit_confirm: [{ frequency: 220, duration: 0.08, type: "square", gain: 0.06 }],
  enemy_down: [{ frequency: 140, duration: 0.18, type: "triangle", gain: 0.075 }],
  dodge: [{ frequency: 480, duration: 0.06, type: "sawtooth", gain: 0.05 }],
  skill_cast: [{ frequency: 320, duration: 0.12, type: "square", gain: 0.06 }],
  low_resource: [{ frequency: 180, duration: 0.14, type: "sine", gain: 0.05 }],
  danger: [
    { frequency: 196, duration: 0.08, type: "square", gain: 0.045 },
    { frequency: 156, duration: 0.11, type: "triangle", gain: 0.04, delay: 0.04 }
  ],
  route_clear: [
    { frequency: 392, duration: 0.1, type: "triangle", gain: 0.05 },
    { frequency: 523.25, duration: 0.12, type: "triangle", gain: 0.055, delay: 0.08 },
    { frequency: 659.25, duration: 0.16, type: "sine", gain: 0.045, delay: 0.16 }
  ],
  extract: [
    { frequency: 261.63, duration: 0.08, type: "sine", gain: 0.04 },
    { frequency: 329.63, duration: 0.08, type: "sine", gain: 0.04, delay: 0.07 }
  ],
  route_return: [
    { frequency: 523.25, duration: 0.09, type: "triangle", gain: 0.045 },
    { frequency: 659.25, duration: 0.1, type: "triangle", gain: 0.05, delay: 0.06 },
    { frequency: 783.99, duration: 0.13, type: "sine", gain: 0.04, delay: 0.14 }
  ]
};

export function useGameAudio(enabled = true) {
  const audioContextRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    return subscribeToSoundEvents(({ type }) => {
      const profile = soundProfiles[type];
      if (!profile?.length) {
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
      profile.forEach((tone) => {
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        const startAt = now + (tone.delay ?? 0);

        oscillator.type = tone.type;
        oscillator.frequency.setValueAtTime(tone.frequency, startAt);
        gainNode.gain.setValueAtTime(0.0001, startAt);
        gainNode.gain.exponentialRampToValueAtTime(tone.gain ?? 0.06, startAt + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + tone.duration);

        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        oscillator.start(startAt);
        oscillator.stop(startAt + tone.duration);
      });
    });
  }, [enabled]);
}
