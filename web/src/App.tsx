import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    fetch(`./data/school-data.json?v=${__BUILD_ID__}`)
      .then((r) => r.json())
      .then((json: SchoolData) => setData(json))
      .catch(() => setLoadError('Impossible de charger les données.'));
  }, []);

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
                onClick={() => scrollToElement(`chapter-${data.scenes[0].id}`)}
              >
                <span>Parcourir</span>
                <ArrowDown size={14} />
              </button>
            </div>
          </section>

          {/* Clean white left column */}
          <div className="editorial-column">
            <div className="col-sticky-top">
              <span className="col-brand" onClick={() => scrollToElement('hero-cover')}>
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
