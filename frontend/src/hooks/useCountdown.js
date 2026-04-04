/**
 * hooks/useCountdown.js
 * Countdown timer hook for rate-limit retry UI.
 */
import { useState, useEffect, useRef } from 'react';

/**
 * Counts down from `seconds` to 0, calling onComplete when done.
 * @param {number|null} seconds  — null means inactive
 * @param {() => void} onComplete
 * @returns {number|null} remaining seconds
 */
export function useCountdown(seconds, onComplete) {
  const [remaining, setRemaining] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (seconds == null || seconds <= 0) {
      setRemaining(null);
      return;
    }

    setRemaining(seconds);

    timerRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          onComplete?.();
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [seconds]); // eslint-disable-line react-hooks/exhaustive-deps

  return remaining;
}