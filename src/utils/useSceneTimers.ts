import { useCallback, useEffect, useRef } from 'react';

/**
 * Scene-scoped timer registry.
 * Timers and intervals scheduled through this hook are cancelled automatically
 * when the scene unmounts, preventing stale callbacks after restart/navigation.
 */
export function useSceneTimers() {
  const timeoutsRef = useRef<Set<number>>(new Set());
  const intervalsRef = useRef<Set<number>>(new Set());

  const setSceneTimeout = useCallback((callback: () => void, delayMs: number): number => {
    const id = window.setTimeout(() => {
      timeoutsRef.current.delete(id);
      callback();
    }, delayMs);
    timeoutsRef.current.add(id);
    return id;
  }, []);

  const setSceneInterval = useCallback((callback: () => void, delayMs: number): number => {
    const id = window.setInterval(callback, delayMs);
    intervalsRef.current.add(id);
    return id;
  }, []);

  const clearAll = useCallback(() => {
    timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    intervalsRef.current.forEach((id) => window.clearInterval(id));
    timeoutsRef.current.clear();
    intervalsRef.current.clear();
  }, []);

  useEffect(() => clearAll, [clearAll]);

  return { setSceneTimeout, setSceneInterval, clearAll };
}
