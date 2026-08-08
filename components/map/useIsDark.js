'use client';

import { useEffect, useState } from 'react';

/**
 * Tracks the `dark` class the app puts on `<html>`, so the basemap can swap the
 * moment the theme toggle is used rather than on the next reload.
 */
export default function useIsDark() {
  const [isDark, setIsDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setIsDark(root.classList.contains('dark'));
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}
