import { useEffect, useState } from "react";

export function AnimatedNumber({ value, delay = 0, decimals = 0, prefix = "", suffix = "" }: {
  value: number;
  delay?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let raf = 0;
    const timer = setTimeout(() => {
      const duration = 1100;
      const startTime = performance.now();
      const animate = (now: number) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(value * eased);
        if (progress < 1) raf = requestAnimationFrame(animate);
      };
      raf = requestAnimationFrame(animate);
    }, delay);
    return () => { clearTimeout(timer); cancelAnimationFrame(raf); };
  }, [value, delay]);

  return <span style={{ fontVariantNumeric: "tabular-nums" }}>{prefix}{display.toFixed(decimals)}{suffix}</span>;
}
