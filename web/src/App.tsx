import React, { useEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Compass,
  Eye,
  EyeOff,
  Home,
  Layers,
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
      .then((json: SchoolData) => setData(json))
      .catch(() => setLoadError('Impossible de charger school-data.json'));
  }, []);

  // GSAP ScrollTrigger for narrative camera transitions
  useEffect(() => {
    if (!data || freeExplore) return;
    const triggers: ScrollTrigger[] = [];
    const sections = document.querySelectorAll('.story-section');
    sections.forEach((sec, idx) => {
      const st = ScrollTrigger.create({
        trigger: sec,
        start: 'top center',
        end: 'bottom center',
        onEnter: () => {
          setActiveSceneIndex(idx);
          const sc = data.scenes[idx];
          if (sc) {
            setHideRoofs(sc.hideRoofs);
            setShowLabels(sc.showLabels);
          }
        },
        onEnterBack: () => {
          setActiveSceneIndex(idx);
          const sc = data.scenes[idx];
          if (sc) {
            setHideRoofs(sc.hideRoofs);
            setShowLabels(sc.showLabels);
          }
        },
      });
      triggers.push(st);
    });
    return () => {
      triggers.forEach((t) => t.kill());
    };
  }, [data, freeExplore]);

  const triggerPreset = (preset: CameraPreset) => {
    setFreeExplore(true);
    setSelectedBuilding(null);
    setSelectedRoom(null);
    setCameraPresetTrigger((prev) => ({ preset, seq: (prev?.seq || 0) + 1 }));
  };

  const handleSelectRoom = (r: RoomInfo) => {
    setFreeExplore(true);
    setHideRoofs(true);
    setSelectedBuilding(null);
    setSelectedRoom(r);
  };

  const handleSelectBuilding = (b: BuildingInfo) => {
    setFreeExplore(true);
    setSelectedRoom(null);
    setSelectedBuilding(b);
  };

  const returnToScrollTour = () => {
    setFreeExplore(false);
    setSelectedBuilding(null);
    setSelectedRoom(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* Loading Screen */}
      {!modelLoaded && !loadError && (
        <div className="loader-screen">
          <div className="brand-sub">Maquette architecturale 3D</div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '2rem' }}>
            École Sainte-Anne – Pordic
          </h1>
          <div className="loader-bar-wrap">
            <div className="loader-bar" style={{ width: `${Math.max(10, loadPct)}%` }} />
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
            Chargement du modèle 3D… {loadPct}%
          </p>
        </div>
      )}

      {loadError && (
        <div className="loader-screen">
          <h2>Erreur de chargement</h2>
          <p style={{ color: '#fca5a5', maxWidth: 420 }}>{loadError}</p>
        </div>
      )}

      {/* 3D Scene */}
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

      {/* Top Bar */}
      <header className="top-bar">
        <div className="brand">
          <span className="brand-title">Découverte de l'école Sainte-Anne</span>
          <span className="brand-sub">Pordic · 48.5702°N, 2.8158°W · Licence PE</span>
        </div>
        <button
          className={`mode-badge ${freeExplore ? 'active' : ''}`}
          onClick={() => (freeExplore ? returnToScrollTour() : setFreeExplore(true))}
        >
          {freeExplore ? <Navigation size={15} /> : <Compass size={15} />}
          {freeExplore ? 'Revenir à la visite guidée' : 'Mode exploration libre'}
        </button>
      </header>

      {/* Scroll Narrative Overlay */}
      {data && (
        <main className={`story-overlay ${freeExplore ? 'hidden-story' : ''}`}>
          {data.scenes.map((sc) => (
            <section className="story-section" key={sc.id} id={sc.id}>
              <article className="story-card">
                <span className="story-step">Étape {sc.step} / {String(data.scenes.length).padStart(2, '0')}</span>
                {sc.step === '01' ? <h1>{sc.title}</h1> : <h2>{sc.title}</h2>}
                <div className="story-subtitle">{sc.subtitle}</div>
                <p className="story-body">{sc.body}</p>

                {sc.id === 'classes' && (
                  <div className="room-chips">
                    {data.rooms
                      .filter((r) => r.category === 'classe')
                      .map((r) => (
                        <button
                          key={r.id}
                          className={`room-chip ${selectedRoom?.id === r.id ? 'selected' : ''}`}
                          onClick={() => handleSelectRoom(r)}
                        >
                          <span className="room-dot" style={{ background: r.color }} />
                          {r.name}
                        </button>
                      ))}
                  </div>
                )}
              </article>
            </section>
          ))}
        </main>
      )}

      {/* Selected Building or Room Panel */}
      {(selectedBuilding || selectedRoom) && (
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
            <span className="info-tag">Disposition indicative · Modifiable dans school-data.json</span>
          )}

          {selectedBuilding && (
            <div className="info-meta">
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Surface IGN</div>
                <strong>{selectedBuilding.area_m2} m²</strong>
              </div>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Hauteur IGN</div>
                <strong>{selectedBuilding.height_m} m</strong>
              </div>
            </div>
          )}

          <p className="story-body" style={{ fontSize: '0.86rem' }}>
            {selectedRoom ? selectedRoom.description : selectedBuilding?.description}
          </p>
        </aside>
      )}

      {/* Bottom Controls Toolbar */}
      <nav className="toolbar" aria-label="Contrôles 3D">
        <button className="tool-btn" onClick={() => triggerPreset('general')}>
          <Home size={15} /> Vue générale
        </button>
        <button className="tool-btn" onClick={() => triggerPreset('aerial')}>
          <MapPin size={15} /> Aérienne
        </button>
        <button className="tool-btn" onClick={() => triggerPreset('front')}>
          <Eye size={15} /> Face
        </button>
        <button className="tool-btn" onClick={() => triggerPreset('top')}>
          <Layers size={15} /> Dessus
        </button>
        <div className="tool-sep" />
        <button className="tool-btn" onClick={() => triggerPreset('church')}>
          ⛪ Église
        </button>
        <button className="tool-btn" onClick={() => triggerPreset('culture')}>
          🎭 Ville Robert / Médiathèque
        </button>
        <button className="tool-btn" onClick={() => triggerPreset('stadium')}>
          ⚽ Stade Louis Auffray
        </button>
        <div className="tool-sep" />
        <button
          className={`tool-btn ${hideRoofs ? 'active' : ''}`}
          onClick={() => setHideRoofs((v) => !v)}
        >
          {hideRoofs ? <Eye size={15} /> : <EyeOff size={15} />}
          {hideRoofs ? 'Afficher toitures' : 'Masquer toitures'}
        </button>
        <button
          className={`tool-btn ${showLabels ? 'active' : ''}`}
          onClick={() => setShowLabels((v) => !v)}
        >
          <Tag size={15} /> Étiquettes
        </button>
      </nav>
    </>
  );
};

export default App;
