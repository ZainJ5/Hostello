'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Counts down to a deadline.
 *
 * The remaining seconds are *derived* from a deadline timestamp rather than
 * decremented on each tick, so a backgrounded tab — where setInterval gets
 * throttled to once a minute — still shows the right number the moment it
 * comes back, and there is no state to drift out of sync.
 */
export function useCountdown(seconds = 60) {
  const [deadline, setDeadline] = useState(() => Date.now() + seconds * 1000);
  const [now, setNow] = useState(() => Date.now());

  const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));

  useEffect(() => {
    const id = setInterval(() => {
      const tick = Date.now();
      setNow(tick);
      // Nothing left to count — stop waking the tab up.
      if (tick >= deadline) clearInterval(id);
    }, 250);
    return () => clearInterval(id);
  }, [deadline]);

  const restart = useCallback(
    (nextSeconds = seconds) => {
      const from = Date.now();
      setNow(from);
      setDeadline(from + nextSeconds * 1000);
    },
    [seconds]
  );

  return { remaining, active: remaining > 0, restart };
}

export default useCountdown;
