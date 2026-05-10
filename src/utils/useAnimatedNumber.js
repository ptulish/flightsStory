import { useEffect, useRef, useState } from 'react';

// Animates a numeric value from its previous to next value over `duration` ms.
// Uses requestAnimationFrame and an ease-out cubic for a tactile feel.
export function useAnimatedNumber(value, { duration = 800 } = {}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    fromRef.current = display;
    startRef.current = null;

    const target = Number(value) || 0;
    const from = Number(fromRef.current) || 0;

    const step = (ts) => {
      if (startRef.current == null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (target - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return display;
}
