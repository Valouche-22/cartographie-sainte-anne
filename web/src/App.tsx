import React, { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowDown, ChevronDown, ChevronUp, X } from 'lucide-react';
import { SchoolScene3D } from './components/SchoolScene3D';
import { BuildingInfo, CameraPreset, RoomInfo, SchoolData } from './types';

gsap.registerPlugin(ScrollTrigger);

export const App: React.FC = () => {
  const [data, setData] = useState<SchoolData | null>(null);
  const [loadPct, setLoadPct] = useState(0);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isHero, setIsHero] = useState(true);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [freeExplore, setFreeExplore] = useState(false);
  const [hideRoofs, setHideRoofs] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingInfo | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<RoomInfo | null>(null);
  const [cameraPresetTrigger, setCameraPresetTrigger] = useState<{ preset: CameraPreset; seq: number } | null>(null);

  // Smooth magnetic section scrolling state
  // sectionIdx: 0 = hero-cover, 1..N = data.scenes[0..N-1]
  const sectionIdxRef = useRef(0);
  const isAutoScrollingRef = useRef(false);
  const scrollTweenRef = useRef<gsap.core.Tween | null>(null);
  const wheelLockUntilRef = useRef(0);

  useEffect(() => {
    fetch(`./data/school-data.json?v=${__BUILD_ID__}`)
      .then((r) => r.json())
      .then((json: SchoolData) => setData(json))
      .catch(() => setLoadError('Impossible de charger les données.'));
  }, []);

  const applySectionState = useCallback(
    (sectionIdx: number) => {
      if (!data) return;
      sectionIdxRef.current = sectionIdx;
      if (sectionIdx <= 0) {
        setIsHero(true);
        setHideRoofs(false);
        setShowLabels(false);
      } else {
        const sceneIdx = Math.min(sectionIdx - 1, data.scenes.length - 1);
        setIsHero(false);
        setActiveSceneIndex(sceneIdx);
        const sc = data.scenes[sceneIdx];
        if (sc) {
          setHideRoofs(sc.hideRoofs);
          setShowLabels(sc.showLabels);
        }
      }
    },
    [data]
  );

  const goToSection = useCallback(
    (targetIdx: number, instant = false) => {
      if (!data) return;
      const maxIdx = data.scenes.length;
      const clamped = Math.max(0, Math.min(maxIdx, targetIdx));
      const elId = clamped === 0 ? 'hero-cover' : `chapter-${data.scenes[clamped - 1].id}`;
      const targetEl = document.getElementById(elId);
      if (!targetEl) return;

      const targetY = clamped === 0 ? 0 : targetEl.getBoundingClientRect().top + window.scrollY;
      applySectionState(clamped);

      scrollTweenRef.current?.kill();
      if (instant) {
        isAutoScrollingRef.current = false;
        window.scrollTo(0, targetY);
        return;
      }

      isAutoScrollingRef.current = true;
      wheelLockUntilRef.current = performance.now() + 820;

      const proxy = { y: window.scrollY };
      scrollTweenRef.current = gsap.to(proxy, {
        y: targetY,
        duration: 1.05,
        ease: 'power2.inOut',
        onUpdate: () => {
          window.scrollTo(0, proxy.y);
        },
        onComplete: () => {
          window.scrollTo(0, targetY);
          isAutoScrollingRef.current = false;
        },
      });
    },
    [data, applySectionState]
  );

  // Smooth magnetic wheel + keyboard navigation
  useEffect(() => {
    if (!data || freeExplore) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (Math.abs(e.deltaY) < 8) return;
      const now = performance.now();
      if (now < wheelLockUntilRef.current) return;
      const dir = e.deltaY > 0 ? 1 : -1;
      const next = Math.max(0, Math.min(data.scenes.length, sectionIdxRef.current + dir));
      if (next !== sectionIdxRef.current) {
        goToSection(next);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        goToSection(sectionIdxRef.current + 1);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        goToSection(sectionIdxRef.current - 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        goToSection(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        goToSection(data.scenes.length);
      }
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      scrollTweenRef.current?.kill();
    };
  }, [data, freeExplore, goToSection]);

  // Fallback ScrollTrigger sync for manual scrollbar dragging or touch scrolling
  useEffect(() => {
    if (!data || freeExplore) return;
    const triggers: ScrollTrigger[] = [];

    const heroEl = document.getElementById('hero-cover');
    if (heroEl) {
      triggers.push(
        ScrollTrigger.create({
          trigger: heroEl,
          start: 'top center',
          end: 'bottom 45%',
          onEnter: () => {
            if (!isAutoScrollingRef.current) applySectionState(0);
          },
          onEnterBack: () => {
            if (!isAutoScrollingRef.current) applySectionState(0);
          },
        })
      );
    }

    const chapterEls = document.querySelectorAll('.chapter-panel');
    chapterEls.forEach((el, idx) => {
      const activate = () => {
        if (!isAutoScrollingRef.current) applySectionState(idx + 1);
      };
      triggers.push(
        ScrollTrigger.create({
          trigger: el,
          start: 'top 52%',
          end: 'bottom 48%',
          onEnter: activate,
          onEnterBack: activate,
        })
      );
    });

    ScrollTrigger.refresh();
    return () => {
      triggers.forEach((t) => t.kill());
    };
  }, [data, freeExplore, applySectionState]);

  const enterFreeExplore = () => {
    scrollTweenRef.current?.kill();
    isAutoScrollingRef.current = false;
    setFreeExplore(true);
    setSelectedBuilding(null);
    setSelectedRoom(null);
    setShowLabels(true);
  };

  const returnToGuidedTour = () => {
    const savedSection = sectionIdxRef.current;
    setFreeExplore(false);
    setSelectedBuilding(null);
    setSelectedRoom(null);
    setTimeout(() => {
      goToSection(savedSection, true);
    }, 50);
  };

  const triggerPreset = (preset: CameraPreset) => {
    setSelectedBuilding(null);
    setSelectedRoom(null);
    setCameraPresetTrigger((prev) => ({ preset, seq: (prev?.seq || 0) + 1 }));
  };

  const handleSelectRoom = (r: RoomInfo) => {
    if (!freeExplore) return;
    setHideRoofs(true);
    setSelectedBuilding(null);
    setSelectedRoom(r);
  };

  const handleSelectBuilding = (b: BuildingInfo) => {
    if (!freeExplore) return;
    setSelectedRoom(null);
    setSelectedBuilding(b);
  };

  const totalChapters = data?.scenes.length || 0;

  return (
    <>
      {!modelLoaded && !loadError && (
        <div className="loader-screen">
          <p className="loader-title">École Sainte-Anne</p>
          <div className="loader-bar-wrap">
            <div className="loader-bar" style={{ width: `${Math.max(10, loadPct)}%` }} />
          </div>
        </div>
      )}

      {loadError && (
        <div className="loader-screen">
          <p style={{ color: '#b91c1c' }}>{loadError}</p>
        </div>
      )}

      {data && (
        <SchoolScene3D
          data={data}
          isHero={isHero}
          activeSceneIndex={activeSceneIndex}
          freeExplore={freeExplore}
          hideRoofs={hideRoofs}
          showLabels={showLabels}
          selectedBuilding={selectedBuilding}
          selectedRoom={selectedRoom}
          cameraPresetTrigger={cameraPresetTrigger}
          onSelectBuilding={handleSelectBuilding}
          onSelectRoom={handleSelectRoom}
          onLoadProgress={setLoadPct}
          onLoaded={() => setModelLoaded(true)}
          onLoadError={setLoadError}
        />
      )}

      {/* Discreet corner button to toggle free exploration */}
      <button
        type="button"
        className={`corner-free-btn ${freeExplore ? 'active' : ''}`}
        onClick={() => (freeExplore ? returnToGuidedTour() : enterFreeExplore())}
      >
        {freeExplore ? 'Visite guidée' : 'Vue libre'}
      </button>

      {data && !freeExplore && (
        <main className="guided-flow">
          {/* Simple fullscreen opening view */}
          <section className="hero-cover" id="hero-cover">
            <div className="hero-backdrop" />
            <div className="hero-inner">
              <h1 className="hero-h1">{data.school.name}</h1>
              <p className="hero-sub">{data.school.city}</p>
              <button
                type="button"
                className="hero-start-btn"
                onClick={() => goToSection(1)}
              >
                <span>Commencer la visite</span>
                <ArrowDown size={14} />
              </button>
            </div>

            <button
              type="button"
              className="scroll-cue"
              onClick={() => goToSection(1)}
              aria-label="Faire défiler vers le bas pour commencer"
            >
              <span className="scroll-mouse" aria-hidden="true">
                <span className="scroll-wheel" />
              </span>
              <span className="scroll-cue-text">Faire défiler vers le bas</span>
              <ChevronDown size={15} className="scroll-cue-arrow" />
            </button>
          </section>

          {/* Clean white left column */}
          <div className="editorial-column">
            <div className="col-sticky-top">
              <span className="col-brand" onClick={() => goToSection(0)}>
                {data.school.name}
              </span>
              <span className="col-step-badge">
                {activeSceneIndex + 1} / {totalChapters}
              </span>
            </div>

            {data.scenes.map((sc, idx) => (
              <section className="chapter-panel" key={sc.id} id={`chapter-${sc.id}`}>
                <div className={`chapter-body ${!isHero && idx === activeSceneIndex ? 'is-active' : ''}`}>
                  <h2 className="chapter-title">{sc.title}</h2>

                  <div className="fact-list">
                    {sc.rows.map((row, rIdx) => (
                      <div className="fact-row" key={rIdx}>
                        {row.label && <span className="fact-label">{row.label}</span>}
                        <p className="fact-value">{row.value}</p>
                      </div>
                    ))}
                  </div>

                  {sc.note && <p className="chapter-note">{sc.note}</p>}
                </div>
              </section>
            ))}

            <div className="col-sticky-bottom">
              <div className="col-scroll-hint">
                {activeSceneIndex < totalChapters - 1 ? (
                  <button
                    type="button"
                    className="scroll-next-hint"
                    onClick={() => goToSection(activeSceneIndex + 2)}
                  >
                    <span>Défiler vers le bas · Suite : {data.scenes[activeSceneIndex + 1].title}</span>
                    <ChevronDown size={14} className="hint-bounce" />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="scroll-next-hint"
                    onClick={() => goToSection(0)}
                  >
                    <span>Fin de la visite · Revenir au début</span>
                    <ChevronUp size={14} />
                  </button>
                )}
              </div>
              <div className="col-nav-row">
                <button
                  type="button"
                  className="step-nav-btn"
                  onClick={() => goToSection(activeSceneIndex)}
                >
                  <ChevronUp size={15} /> Précédent
                </button>
                <div className="step-dots" role="tablist" aria-label="Étapes de la visite">
                  {data.scenes.map((sc, idx) => (
                    <button
                      key={sc.id}
                      type="button"
                      className={`step-dot ${idx === activeSceneIndex ? 'active' : ''}`}
                      onClick={() => goToSection(idx + 1)}
                      title={sc.title}
                      aria-label={`Aller à ${sc.title}`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  className="step-nav-btn primary"
                  disabled={activeSceneIndex >= totalChapters - 1}
                  onClick={() => goToSection(activeSceneIndex + 2)}
                >
                  Suivant <ChevronDown size={15} />
                </button>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* Free Explore info box */}
      {freeExplore && (selectedBuilding || selectedRoom) && (
        <aside className="info-panel">
          <div className="info-panel-header">
            <div>
              <h3>{selectedRoom ? selectedRoom.name : selectedBuilding?.name}</h3>
              <div className="info-role">
                {selectedRoom ? selectedRoom.level : selectedBuilding?.role}
              </div>
            </div>
            <button
              className="close-btn"
              onClick={() => {
                setSelectedBuilding(null);
                setSelectedRoom(null);
              }}
              aria-label="Fermer"
            >
              <X size={14} />
            </button>
          </div>
          <p className="info-desc">
            {selectedRoom ? selectedRoom.description : selectedBuilding?.description}
          </p>
        </aside>
      )}

      {/* Free Explore toolbar */}
      {freeExplore && (
        <nav className="toolbar" aria-label="Navigation libre">
          <button className="tool-btn" onClick={() => triggerPreset('general')}>
            École
          </button>
          <button className="tool-btn" onClick={() => triggerPreset('cantine')}>
            Cantine / Périscolaire
          </button>
          <button className="tool-btn" onClick={() => triggerPreset('church')}>
            Église
          </button>
          <button className="tool-btn" onClick={() => triggerPreset('culture')}>
            Médiathèque / Ville Robert
          </button>
          <button className="tool-btn" onClick={() => triggerPreset('stadium')}>
            Complexe sportif
          </button>
          <span className="tool-sep" />
          <button
            className={`tool-btn ${hideRoofs ? 'active' : ''}`}
            onClick={() => setHideRoofs((v) => !v)}
          >
            {hideRoofs ? 'Afficher toits' : 'Masquer toits classes'}
          </button>
          <button
            className={`tool-btn ${showLabels ? 'active' : ''}`}
            onClick={() => setShowLabels((v) => !v)}
          >
            Étiquettes
          </button>
        </nav>
      )}
    </>
  );
};

export default App;
