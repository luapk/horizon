import { useEffect, useState } from "react";

/** Reactively track a media query. */
function useMedia(query: string): boolean {
  const [match, setMatch] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatch(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [query]);
  return match;
}

/** True on phone / narrow-tablet widths — drives the responsive layout switch. */
export const useIsNarrow = () => useMedia("(max-width: 860px)");

export const usePrefersReducedMotion = () => useMedia("(prefers-reduced-motion: reduce)");
