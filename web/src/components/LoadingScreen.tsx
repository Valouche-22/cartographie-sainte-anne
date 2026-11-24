import React, { useEffect, useRef, useState } from 'react';

interface LoadingScreenProps {
  ready: boolean;
  exiting: boolean;
}

const SPECTRUM_DOTS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#84cc16',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#a855f7',
];

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ ready, exiting }) => {
  const [percent, setPercent] = useState(0);
  const readyRef = useRef(ready);
  readyRef.current = ready;

  useEffect(() => {
    const start = performance.now();
    const duration = 2900;
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      // Smooth cubic ease-out-in progression matching the 3s CSS choreography
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
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

  const litCount = Math.floor((percent / 100) * SPECTRUM_DOTS.length);

  return (
    <div className={`loader-screen ${exiting ? 'is-exiting' : ''}`} role="status" aria-live="polite">
      {/* Subtle architectural background grid + luminous ambient prism */}
      <div className="loader-bg-grid" aria-hidden="true" />
      <div className="loader-bg-aura" aria-hidden="true" />

      {/* Top hairline rainbow progress filament */}
      <div className="loader-top-ribbon" aria-hidden="true">
        <div className="loader-top-ribbon-fill" />
      </div>

      <div className="loader-stage">
        {/* Bespoke isometric architectural maquette of École Sainte-Anne */}
        <div className="loader-emblem">
          <svg
            className="loader-iso-svg"
            viewBox="0 0 260 176"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="loader-prism-sheen" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
                <stop offset="42%" stopColor="#ffffff" stopOpacity="0" />
                <stop offset="50%" stopColor="#ffffff" stopOpacity="0.82" />
                <stop offset="58%" stopColor="#ffffff" stopOpacity="0" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="loader-rainbow-stroke" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="25%" stopColor="#eab308" />
                <stop offset="50%" stopColor="#10b981" />
                <stop offset="75%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
              <clipPath id="loader-diamond-clip">
                <polygon points="130,20 246,98 130,170 14,98" />
              </clipPath>
            </defs>

            {/* Soft ground cast shadow */}
            <polygon
              className="iso-shadow"
              points="130,45 234,105 130,165 26,105"
              fill="rgba(15, 37, 68, 0.045)"
            />

            {/* Isometric cartographic ground plate */}
            <polygon
              className="iso-ground-fill"
              points="130,42 234,102 130,162 26,102"
              fill="#ffffff"
            />
            <polygon
              className="iso-draw iso-ground-line"
              points="130,42 234,102 130,162 26,102"
              stroke="#94a3b8"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            {/* Rainbow edge accent on front-most ground borders */}
            <polyline
              className="iso-draw iso-ground-prism"
              points="26,102 130,162 234,102"
              stroke="url(#loader-rainbow-stroke)"
              strokeWidth="1.65"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Delicate architectural compass registration ticks */}
            <g className="iso-ticks" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round">
              <line x1="130" y1="31" x2="130" y2="37" />
              <line x1="130" y1="167" x2="130" y2="173" />
              <line x1="14" y1="102" x2="20" y2="102" />
              <line x1="240" y1="102" x2="246" y2="102" />
            </g>

            {/* Central courtyard lawn + sports court lines */}
            <g className="iso-courtyard">
              <polygon
                points="121.3,83 152.5,101 131.7,113 100.5,95"
                fill="rgba(226, 232, 240, 0.42)"
                stroke="#cbd5e1"
                strokeWidth="0.9"
                strokeLinejoin="round"
              />
              <line x1="136.9" y1="92" x2="116.1" y2="104" stroke="#ffffff" strokeWidth="0.95" />
              <circle cx="105.8" cy="84" r="5.2" fill="rgba(16, 185, 129, 0.22)" stroke="#10b981" strokeWidth="1" />
              <circle cx="105.8" cy="84" r="2" fill="#10b981" />
            </g>

            {/* Building 1: Bâtiment Cycle 2 (Nord — sky blue roof accent) */}
            <g className="iso-bldg iso-bldg-n1">
              <polygon className="iso-fill" points="112.7,68 156,93 156,77 112.7,52" fill="#f8fafc" />
              <polygon className="iso-fill" points="156,93 175,82 175,66 165.5,61.5 156,77" fill="#e2e8f0" />
              <polygon className="iso-fill" points="112.7,52 156,77 165.5,61.5 122.2,36.5" fill="rgba(14, 165, 233, 0.22)" />
              <polygon className="iso-fill" points="131.7,41 122.2,36.5 165.5,61.5 175,66" fill="rgba(14, 165, 233, 0.12)" />
              <path
                className="iso-draw iso-draw-b1"
                d="M112.7 68 L156 93 L175 82 L175 66 L165.5 61.5 L122.2 36.5 L112.7 52 Z M112.7 52 L156 77 L156 93 M156 77 L165.5 61.5"
                stroke="#0f2544"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>

            {/* Building 2: Bâtiment Cycle 3 (Est — indigo/violet roof accent) */}
            <g className="iso-bldg iso-bldg-e2">
              <polygon className="iso-fill" points="123.1,132 142.1,143 142.1,124 132.6,108.5 123.1,113" fill="#f1f5f9" />
              <polygon className="iso-fill" points="142.1,143 183.7,119 183.7,100 142.1,124" fill="#e2e8f0" />
              <polygon className="iso-fill" points="123.1,113 164.6,89 174.2,84.5 132.6,108.5" fill="rgba(99, 102, 241, 0.15)" />
              <polygon className="iso-fill" points="142.1,124 183.7,100 174.2,84.5 132.6,108.5" fill="rgba(99, 102, 241, 0.24)" />
              <path
                className="iso-draw iso-draw-b2"
                d="M123.1 132 L142.1 143 L183.7 119 L183.7 100 L174.2 84.5 L164.6 89 L123.1 113 Z M142.1 143 L142.1 124 L183.7 100 M142.1 124 L132.6 108.5 L174.2 84.5 M132.6 108.5 L123.1 113"
                stroke="#0f2544"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>

            {/* Building 3: Bâtiment Cycle 1 (Principal — warm red-orange roof accent) */}
            <g className="iso-bldg iso-bldg-s1">
              <polygon className="iso-fill" points="53.8,100 91.9,122 91.9,106 53.8,84" fill="#ffffff" />
              <polygon className="iso-fill" points="91.9,122 112.7,110 112.7,94 102.3,90 91.9,106" fill="#e2e8f0" />
              <polygon className="iso-fill" points="53.8,84 91.9,106 102.3,90 64.2,68" fill="rgba(239, 68, 68, 0.2)" />
              <polygon className="iso-fill" points="74.6,72 64.2,68 102.3,90 112.7,94" fill="rgba(249, 115, 22, 0.14)" />
              <path
                className="iso-draw iso-draw-b3"
                d="M53.8 100 L91.9 122 L112.7 110 L112.7 94 L102.3 90 L64.2 68 L53.8 84 Z M53.8 84 L91.9 106 L91.9 122 M91.9 106 L102.3 90"
                stroke="#0f2544"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>

            {/* Specular light sweep gliding across the architectural model */}
            <g clipPath="url(#loader-diamond-clip)">
              <rect
                className="iso-sheen"
                x="-120"
                y="0"
                width="140"
                height="180"
                fill="url(#loader-prism-sheen)"
              />
            </g>
          </svg>
        </div>

        {/* Masked editorial title block */}
        <div className="loader-brand">
          <div className="loader-title-mask">
            <h1 className="loader-title">École Sainte-Anne</h1>
          </div>
          <div className="loader-rule" aria-hidden="true" />
          <div className="loader-sub-mask">
            <p className="loader-sub">Pordic · Côtes-d'Armor</p>
          </div>
        </div>

        {/* Precision rainbow progress rail + 9 chapter spectrum pips + tabular % */}
        <div className="loader-progress-block">
          <div className="loader-pips" aria-hidden="true">
            {SPECTRUM_DOTS.map((color, i) => (
              <span
                key={color}
                className={`loader-pip ${i < litCount ? 'is-lit' : ''}`}
                style={{ '--pip-color': color } as React.CSSProperties}
              />
            ))}
          </div>
          <div className="loader-bar-wrap">
            <div className="loader-bar" />
            <span className="loader-bar-shimmer" aria-hidden="true" />
          </div>
          <span className="loader-percent">{percent} %</span>
        </div>
      </div>
    </div>
  );
};
