import React, { useEffect, useRef, useState } from 'react';

interface LoadingScreenProps {
  ready: boolean;
  exiting: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ ready, exiting }) => {
  const [percent, setPercent] = useState(0);
  const readyRef = useRef(ready);
  readyRef.current = ready;

  useEffect(() => {
    const start = performance.now();
    const duration = 1450;
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      // Smooth exponential ease-out feel like luxury studio preloaders
      const eased = 1 - Math.pow(1 - t, 3);
      if (t >= 1 && readyRef.current) {
        setPercent(100);
        return;
      }
      const next = t >= 1 ? 99 : Math.min(99, Math.round(eased * 100));
      setPercent(next);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const formatted = String(percent).padStart(2, '0');

  return (
    <div
      className={`loader-screen ${exiting ? 'is-exiting' : ''}`}
      role="status"
      aria-live="polite"
      aria-label="Chargement d'École Sainte-Anne"
    >
      {/* Top parting curtain */}
      <div className="loader-curtain loader-curtain-top">
        <div className="loader-curtain-glow loader-curtain-glow-top" aria-hidden="true" />
        <div className="loader-word-clip loader-word-clip-top">
          <span className="loader-word loader-word-top">École</span>
        </div>
        <div className="loader-lip loader-lip-top" aria-hidden="true" />
      </div>

      {/* Bottom parting curtain */}
      <div className="loader-curtain loader-curtain-bottom">
        <div className="loader-lip loader-lip-bottom" aria-hidden="true" />
        <div className="loader-curtain-glow loader-curtain-glow-bottom" aria-hidden="true" />
        <div className="loader-word-clip loader-word-clip-bottom">
          <span className="loader-word loader-word-bottom">Sainte-Anne</span>
        </div>
        <div className="loader-city-clip">
          <span className="loader-city">Pordic</span>
        </div>
        <div className="loader-status">
          <span className="loader-status-label">Chargement en cours</span>
          <span className="loader-status-sep" aria-hidden="true">·</span>
          <span className="loader-status-pct">{formatted} %</span>
        </div>
      </div>

      {/* Center rainbow equator beam that draws across before cleaving in two */}
      <div className="loader-seam-wrap" aria-hidden="true">
        <div className="loader-seam-line" />
        <div className="loader-seam-halo" />
      </div>
    </div>
  );
};
