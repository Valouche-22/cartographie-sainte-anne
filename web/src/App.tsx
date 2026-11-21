import React, { useEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ArrowDown,
  ChevronDown,
  ChevronUp,
  Compass,
  Eye,
  EyeOff,
  Home,
  Navigation,
  Tag,
  Utensils,
  X,
} from 'lucide-react';
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

  useEffect(() => {
    fetch(`./data/school-data.json?v=${__BUILD_ID__}`)
      .then((r) => r.json())
      .then((json: SchoolData) => setData(json))
      .catch(() => setLoadError('Impossible de charger school-data.json'));
  }, []);

  // Natural document scroll: Hero scrolls up naturally, then each clean chapter card enters in the left column!
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
            setIsHero(true);
            setHideRoofs(false);
            setShowLabels(false);
          },
          onEnterBack: () => {
            setIsHero(true);
            setHideRoofs(false);
            setShowLabels(false);
          },
        })
      );
    }

    const chapterEls = document.querySelectorAll('.chapter-panel');
    chapterEls.forEach((el, idx) => {
      const activate = () => {
        setIsHero(false);
        setActiveSceneIndex(idx);
        const sc = data.scenes[idx];
        if (sc) {
          setHideRoofs(sc.hideRoofs);
          setShowLabels(sc.showLabels);
        }
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
  }, [data, freeExplore]);

  const scrollToElement = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const enterFreeExplore = () => {
    setFreeExplore(true);
    setSelectedBuilding(null);
    setSelectedRoom(null);
    setShowLabels(true);
  };

  const returnToGuidedTour = () => {
    setFreeExplore(false);
    setSelectedBuilding(null);
    setSelectedRoom(null);
    setTimeout(() => {
      if (isHero) {
        scrollToElement('hero-cover');
      } else {
        const sc = data?.scenes[activeSceneIndex];
        if (sc) {
          setHideRoofs(sc.hideRoofs);
          setShowLabels(sc.showLabels);
          scrollToElement(`chapter-${sc.id}`);
        }
      }
    }, 60);
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
      {/* Clean Loading Screen */}
      {!modelLoaded && !loadError && (
        <div className="loader-screen">
          <span className="loader-kicker">L1 PE · SOPA 1 · PORDIC</span>
          <h1 className="loader-title">École Sainte-Anne</h1>
          <div className="loader-bar-wrap">
            <div className="loader-bar" style={{ width: `${Math.max(10, loadPct)}%` }} />
          </div>
        </div>
      )}

      {loadError && (
        <div className="loader-screen">
          <h2 className="loader-title" style={{ fontSize: '1.5rem' }}>Erreur de chargement</h2>
          <p style={{ color: '#b91c1c' }}>{loadError}</p>
        </div>
      )}

      {/* Fixed 3D Viewport (Fullscreen on Hero & Free Explore · Clean 68% Right Frame during Guided Chapters!) */}
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

      {/* SINGLE DISCREET CORNER BUTTON (Top-Right) */}
      <button
        type="button"
        className={`corner-free-btn ${freeExplore ? 'active' : ''}`}
        onClick={() => (freeExplore ? returnToGuidedTour() : enterFreeExplore())}
      >
        {freeExplore ? <Navigation size={14} /> : <Compass size={14} />}
        <span>{freeExplore ? 'Retour visite guidée' : 'Vue libre'}</span>
      </button>

      {/* ================================================================
          GUIDED SCROLL EXPERIENCE (Hero Fullscreen -> Clean White Left Column)
      ================================================================ */}
      {data && !freeExplore && (
        <main className="guided-flow">
          {/* FULLSCREEN HERO COVER */}
          <section className="hero-cover" id="hero-cover">
            <div className="hero-backdrop" />
            <div className="hero-inner">
              <span className="hero-tag">L1 PE · SOPA 1 · PORDIC (22590)</span>
              <h1 className="hero-h1">École Sainte-Anne</h1>
              <p className="hero-sub">Cartographie de l'établissement et des structures associées</p>
              <button
                type="button"
                className="hero-start-btn"
                onClick={() => scrollToElement(`chapter-${data.scenes[0].id}`)}
              >
                <span>Scrollez pour visiter</span>
                <ArrowDown size={15} />
              </button>
            </div>
          </section>

          {/* LEFT EDITORIAL COLUMN (380px Pure White — Zero Overlap with 3D on the Right!) */}
          <div className="editorial-column">
            {/* Sticky Progress Header inside Left Column */}
            <div className="col-sticky-top">
              <span className="col-brand" onClick={() => scrollToElement('hero-cover')}>
                École Sainte-Anne · Pordic
              </span>
              <span className="col-step-badge">
                {String(activeSceneIndex + 1).padStart(2, '0')} / {String(totalChapters).padStart(2, '0')}
              </span>
            </div>

            {/* Clean Stacked Full-Height Chapters */}
            {data.scenes.map((sc, idx) => (
              <section className="chapter-panel" key={sc.id} id={`chapter-${sc.id}`}>
                <div className={`chapter-body ${!isHero && idx === activeSceneIndex ? 'is-active' : ''}`}>
                  <div className="chapter-meta">
                    <span className="chapter-index">{sc.step}</span>
                    <span className="chapter-pill" style={{ color: sc.tagColor, borderColor: `${sc.tagColor}33`, background: `${sc.tagColor}0f` }}>
                      {sc.tag}
                    </span>
                  </div>

                  <h2 className="chapter-title">{sc.title}</h2>

                  <dl className="fact-table">
                    {sc.rows.map((row) => (
                      <div className="fact-row" key={row.label}>
                        <dt>{row.label}</dt>
                        <dd>{row.value}</dd>
                      </div>
                    ))}
                  </dl>

                  {sc.note && <p className="chapter-note">{sc.note}</p>}

                  {idx === totalChapters - 1 && (
                    <button type="button" className="end-free-btn" onClick={enterFreeExplore}>
                      <Compass size={15} />
                      Explorer librement la maquette 3D
                    </button>
                  )}
                </div>
              </section>
            ))}

            {/* Sticky Bottom Step Controls inside Left Column */}
            <div className="col-sticky-bottom">
              <button
                type="button"
                className="step-nav-btn"
                onClick={() =>
                  activeSceneIndex === 0
                    ? scrollToElement('hero-cover')
                    : scrollToElement(`chapter-${data.scenes[activeSceneIndex - 1].id}`)
                }
              >
                <ChevronUp size={15} /> Précédent
              </button>
              <div className="mini-dots">
                {data.scenes.map((sc, idx) => (
                  <button
                    key={sc.id}
                    type="button"
                    className={`mini-dot ${!isHero && idx === activeSceneIndex ? 'active' : ''}`}
                    onClick={() => scrollToElement(`chapter-${sc.id}`)}
                    aria-label={sc.title}
                  />
                ))}
              </div>
              <button
                type="button"
                className="step-nav-btn"
                disabled={activeSceneIndex >= totalChapters - 1}
                onClick={() => {
                  const next = data.scenes[activeSceneIndex + 1];
                  if (next) scrollToElement(`chapter-${next.id}`);
                }}
              >
                Suivant <ChevronDown size={15} />
              </button>
            </div>
          </div>
        </main>
      )}

      {/* Free Explore Info Drawer */}
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
              <X size={15} />
            </button>
          </div>
          {selectedBuilding?.area_m2 && (
            <div className="info-meta-single">
              <span>Surface</span>
              <strong>{selectedBuilding.area_m2.toLocaleString('fr-FR')} m²</strong>
            </div>
          )}
          <p className="info-desc">
            {selectedRoom ? selectedRoom.description : selectedBuilding?.description}
          </p>
        </aside>
      )}

      {/* Free Explore Compact Toolbar (ONLY shown in Vue libre) */}
      {freeExplore && (
        <nav className="toolbar" aria-label="Navigation vue libre">
          <button className="tool-btn" onClick={() => triggerPreset('general')}>
            <Home size={14} /> École
          </button>
          <button className="tool-btn" onClick={() => triggerPreset('cantine')}>
            <Utensils size={14} /> Cantine / Périsco
          </button>
          <button className="tool-btn" onClick={() => triggerPreset('church')}>
            ⛪ Église
          </button>
          <button className="tool-btn" onClick={() => triggerPreset('culture')}>
            🎭 Médiathèque / Ville Robert
          </button>
          <button className="tool-btn" onClick={() => triggerPreset('stadium')}>
            ⚽ Complexe sportif
          </button>
          <div className="tool-sep" />
          <button
            className={`tool-btn ${hideRoofs ? 'active' : ''}`}
            onClick={() => setHideRoofs((v) => !v)}
          >
            {hideRoofs ? <Eye size={14} /> : <EyeOff size={14} />}
            {hideRoofs ? 'Fermer toits classes' : 'Toits classes'}
          </button>
          <button
            className={`tool-btn ${showLabels ? 'active' : ''}`}
            onClick={() => setShowLabels((v) => !v)}
          >
            <Tag size={14} /> Étiquettes
          </button>
        </nav>
      )}
    </>
  );
};

export default App;
