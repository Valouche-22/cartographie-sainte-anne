import React, { useEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ArrowDown,
  Compass,
  Eye,
  EyeOff,
  Home,
  MapPin,
  Navigation,
  Tag,
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

  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [freeExplore, setFreeExplore] = useState(false);
  const [hideRoofs, setHideRoofs] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingInfo | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<RoomInfo | null>(null);
  const [cameraPresetTrigger, setCameraPresetTrigger] = useState<{ preset: CameraPreset; seq: number } | null>(null);

  useEffect(() => {
    fetch(`./data/school-data.json?v=${__BUILD_ID__}`)
      .then((r) => r.json())
      .then((json: SchoolData) => {
        setData(json);
        if (json.scenes[0]) {
          setHideRoofs(json.scenes[0].hideRoofs);
          setShowLabels(json.scenes[0].showLabels);
        }
      })
      .catch(() => setLoadError('Impossible de charger school-data.json'));
  }, []);

  // GSAP ScrollTrigger driving the entire guided tour via scroll
  useEffect(() => {
    if (!data || freeExplore) return;
    const triggers: ScrollTrigger[] = [];
    const sections = document.querySelectorAll('.story-section');

    const activateStep = (idx: number) => {
      setActiveSceneIndex(idx);
      const sc = data.scenes[idx];
      if (sc) {
        setHideRoofs(sc.hideRoofs);
        setShowLabels(sc.showLabels);
      }
    };

    sections.forEach((sec, idx) => {
      const st = ScrollTrigger.create({
        trigger: sec,
        start: 'top 55%',
        end: 'bottom 45%',
        onEnter: () => activateStep(idx),
        onEnterBack: () => activateStep(idx),
      });
      triggers.push(st);
    });

    ScrollTrigger.refresh();

    return () => {
      triggers.forEach((t) => t.kill());
    };
  }, [data, freeExplore]);

  const enterFreeExplore = () => {
    setFreeExplore(true);
    setSelectedBuilding(null);
    setSelectedRoom(null);
  };

  const returnToScrollTour = () => {
    setFreeExplore(false);
    setSelectedBuilding(null);
    setSelectedRoom(null);
    const sc = data?.scenes[activeSceneIndex];
    if (sc) {
      setHideRoofs(sc.hideRoofs);
      setShowLabels(sc.showLabels);
    }
    setTimeout(() => {
      const el = document.getElementById(data?.scenes[activeSceneIndex]?.id || 'presentation');
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  };

  const jumpToSection = (id: string) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

  const totalSteps = data?.scenes.length || 0;

  return (
    <>
      {/* Loading Screen */}
      {!modelLoaded && !loadError && (
        <div className="loader-screen">
          <div className="brand-sub">Cartographie de stage · L1 PE · SOPA 1</div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '2rem' }}>
            École Sainte-Anne – Pordic
          </h1>
          <div className="loader-bar-wrap">
            <div className="loader-bar" style={{ width: `${Math.max(10, loadPct)}%` }} />
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
            Chargement de la maquette 3D… {loadPct}%
          </p>
        </div>
      )}

      {loadError && (
        <div className="loader-screen">
          <h2>Erreur de chargement</h2>
          <p style={{ color: '#fca5a5', maxWidth: 420 }}>{loadError}</p>
        </div>
      )}

      {/* Fixed 3D Scene */}
      {data && (
        <SchoolScene3D
          data={data}
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

      {/* Minimal Top Bar: Title Left + Single Discreet Corner Button Right */}
      <header className="top-bar">
        <div className="brand">
          <span className="brand-title">École Sainte-Anne · Pordic</span>
          <span className="brand-sub">Cartographie de stage · L1 PE · SOPA 1</span>
        </div>
        <button
          className={`mode-badge ${freeExplore ? 'active' : ''}`}
          onClick={() => (freeExplore ? returnToScrollTour() : enterFreeExplore())}
        >
          {freeExplore ? <Navigation size={14} /> : <Compass size={14} />}
          {freeExplore ? 'Revenir à la visite guidée' : 'Vue libre'}
        </button>
      </header>

      {/* Subtle Vertical Progress Rail (Guided Scroll Mode Only) */}
      {data && !freeExplore && (
        <aside className="progress-rail" aria-label="Progression de la visite">
          <span className="progress-counter">
            {String(activeSceneIndex + 1).padStart(2, '0')}/{String(totalSteps).padStart(2, '0')}
          </span>
          <div className="progress-dots">
            {data.scenes.map((sc, idx) => (
              <button
                key={sc.id}
                type="button"
                className={`progress-dot ${idx === activeSceneIndex ? 'active' : ''}`}
                onClick={() => jumpToSection(sc.id)}
                title={`${sc.step} · ${sc.title}`}
                aria-label={`${sc.step} · ${sc.title}`}
              />
            ))}
          </div>
        </aside>
      )}

      {/* Subtle Scroll Hint on First Section Only */}
      {data && !freeExplore && activeSceneIndex === 0 && modelLoaded && (
        <div className="scroll-cue" aria-hidden="true">
          <span>Faites défiler pour découvrir</span>
          <ArrowDown size={14} />
        </div>
      )}

      {/* Scroll-Driven Editorial Narrative Cards (Aligned Left — Never Blocking the 3D Subject) */}
      {data && !freeExplore && (
        <main className="story-overlay">
          {data.scenes.map((sc, idx) => {
            const isActive = idx === activeSceneIndex;
            return (
              <section className="story-section" key={sc.id} id={sc.id}>
                <article className={`story-card ${isActive ? 'is-active' : ''}`}>
                  <div className="story-header-row">
                    <span className="story-step">
                      {sc.step} / {String(totalSteps).padStart(2, '0')}
                    </span>
                    {sc.hideRoofs && <span className="story-pill-auto">Toitures classes ouvertes</span>}
                  </div>

                  {idx === 0 ? <h1>{sc.title}</h1> : <h2>{sc.title}</h2>}
                  <div className="story-subtitle">{sc.subtitle}</div>
                  <p className="story-body">{sc.body}</p>

                  {sc.facts && sc.facts.length > 0 && (
                    <div className="fact-chips">
                      {sc.facts.map((fact) => (
                        <span className="fact-chip" key={fact}>
                          {fact}
                        </span>
                      ))}
                    </div>
                  )}

                  {sc.points && sc.points.length > 0 && (
                    <ul className="story-points">
                      {sc.points.map((pt) => (
                        <li key={pt}>{pt}</li>
                      ))}
                    </ul>
                  )}

                  {idx === totalSteps - 1 && (
                    <div className="story-cta-wrap">
                      <button type="button" className="story-cta-btn" onClick={enterFreeExplore}>
                        <Compass size={15} />
                        Passer en vue libre
                      </button>
                    </div>
                  )}
                </article>
              </section>
            );
          })}
        </main>
      )}

      {/* Selected Building or Room Info Panel (Free Explore Mode Only) */}
      {freeExplore && (selectedBuilding || selectedRoom) && (
        <aside className="info-panel">
          <div className="info-panel-header">
            <div>
              <h3>{selectedRoom ? selectedRoom.name : selectedBuilding?.name}</h3>
              <div style={{ fontSize: '0.8rem', color: '#38bdf8', marginTop: 2 }}>
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

          {selectedRoom?.indicative && (
            <span className="info-tag">Répartition provisoire · à compléter</span>
          )}

          {selectedBuilding?.area_m2 && (
            <div className="info-meta-single">
              <span style={{ color: '#94a3b8' }}>Surface approximative</span>
              <strong>{selectedBuilding.area_m2.toLocaleString('fr-FR')} m²</strong>
            </div>
          )}

          <p className="story-body" style={{ fontSize: '0.86rem' }}>
            {selectedRoom ? selectedRoom.description : selectedBuilding?.description}
          </p>
        </aside>
      )}

      {/* Bottom Controls Toolbar — SHOWN EXCLUSIVELY IN FREE EXPLORE MODE */}
      {freeExplore && (
        <nav className="toolbar" aria-label="Contrôles vue libre">
          <button className="tool-btn" onClick={() => triggerPreset('general')}>
            <Home size={14} /> École
          </button>
          <button className="tool-btn" onClick={() => triggerPreset('aerial')}>
            <MapPin size={14} /> Bourg
          </button>
          <div className="tool-sep" />
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
            {hideRoofs ? 'Toits classes' : 'Voir classes'}
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
