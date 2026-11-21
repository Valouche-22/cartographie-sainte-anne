import React, { useEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
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

const TERRITORY_NODES = [
  {
    id: 'cantine-periscolaire',
    distance: 'Attenant',
    title: 'Cantine & Périscolaire',
    detail: 'Prise en charge directe par les animateurs (midi, garderie, goûter à la cantine)',
    color: '#2d6a4f',
  },
  {
    id: 'eglise',
    distance: '2 min à pied',
    title: 'Église Saint-Pierre',
    detail: 'Pastorale (lundi matin 1 h), 3 intervenants + curé, messes Noël & Pâques (volontaires)',
    color: '#b85d28',
  },
  {
    id: 'sport',
    distance: '5 min à pied',
    title: 'Complexe Louis Auffray',
    detail: 'Salles omnisports, terrains extérieurs et matériel mis à disposition par Pordic',
    color: '#1e5f8a',
  },
  {
    id: 'culture',
    distance: '10 min à pied',
    title: 'Médiathèque & La Ville Robert',
    detail: 'Albums de jeunesse et ressources en classe, parc boisé et centre culturel municipal',
    color: '#9d3b68',
  },
];

export const App: React.FC = () => {
  const [data, setData] = useState<SchoolData | null>(null);
  const [loadPct, setLoadPct] = useState(0);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [freeExplore, setFreeExplore] = useState(false);
  const [hideRoofs, setHideRoofs] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
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

  // Scroll-driven timeline: invisible scroll tracks drive fixed editorial chapters cleanly
  useEffect(() => {
    if (!data || freeExplore) return;
    const triggers: ScrollTrigger[] = [];
    const tracks = document.querySelectorAll('.scroll-track-step');

    const activateStep = (idx: number) => {
      setActiveSceneIndex(idx);
      const sc = data.scenes[idx];
      if (sc) {
        setHideRoofs(sc.hideRoofs);
        setShowLabels(sc.showLabels);
      }
    };

    tracks.forEach((sec, idx) => {
      const st = ScrollTrigger.create({
        trigger: sec,
        start: 'top 52%',
        end: 'bottom 48%',
        onEnter: () => activateStep(idx),
        onEnterBack: () => activateStep(idx),
      });
      triggers.push(st);
    });

    const onScroll = () => {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      setScrollProgress(Math.min(1, Math.max(0, window.scrollY / maxScroll)));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    ScrollTrigger.refresh();

    return () => {
      triggers.forEach((t) => t.kill());
      window.removeEventListener('scroll', onScroll);
    };
  }, [data, freeExplore]);

  const scrollToScene = (idx: number) => {
    const el = document.getElementById(`track-step-${idx}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const scrollToSceneById = (id: string) => {
    if (!data) return;
    const idx = data.scenes.findIndex((s) => s.id === id);
    if (idx >= 0) scrollToScene(idx);
  };

  const enterFreeExplore = () => {
    setFreeExplore(true);
    setSelectedBuilding(null);
    setSelectedRoom(null);
    setShowLabels(true);
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
    setTimeout(() => scrollToScene(activeSceneIndex), 50);
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

  const activeScene = data?.scenes[activeSceneIndex];

  return (
    <>
      {/* Editorial Light Loading Screen */}
      {!modelLoaded && !loadError && (
        <div className="loader-screen">
          <span className="loader-kicker">Cartographie de stage · L1 PE · SOPA 1</span>
          <h1 className="loader-title">École Sainte-Anne</h1>
          <p className="loader-place">Pordic · Côtes-d'Armor</p>
          <div className="loader-bar-wrap">
            <div className="loader-bar" style={{ width: `${Math.max(8, loadPct)}%` }} />
          </div>
          <span className="loader-pct">{loadPct}%</span>
        </div>
      )}

      {loadError && (
        <div className="loader-screen">
          <h2 className="loader-title" style={{ fontSize: '1.6rem' }}>Erreur de chargement</h2>
          <p style={{ color: '#b91c1c', maxWidth: 420 }}>{loadError}</p>
        </div>
      )}

      {/* Fullscreen 3D Canvas */}
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

      {/* Top Architectural Header + Chapter Strip + Single Corner Free-View Button */}
      <header className={`top-chrome ${activeScene?.kind === 'hero' && !freeExplore ? 'is-hero' : ''}`}>
        <div className="brand-pill" onClick={() => !freeExplore && scrollToScene(0)}>
          <span className="brand-dot" />
          <span className="brand-name">École Sainte-Anne</span>
          <span className="brand-meta">Pordic · SOPA 1</span>
        </div>

        {/* Clean Chapter Breadcrumb Strip (Guided Scroll Mode Only, hidden on Hero cover) */}
        {data && !freeExplore && activeScene?.kind !== 'hero' && (
          <nav className="chapter-strip" aria-label="Étapes de la visite">
            {data.scenes
              .filter((s) => s.kind !== 'hero')
              .map((sc) => {
                const realIdx = data.scenes.findIndex((x) => x.id === sc.id);
                const isCurrent = realIdx === activeSceneIndex;
                return (
                  <button
                    key={sc.id}
                    type="button"
                    className={`chapter-tab ${isCurrent ? 'active' : ''}`}
                    onClick={() => scrollToScene(realIdx)}
                  >
                    <span className="chapter-num">{sc.step}</span>
                    <span className="chapter-txt">{sc.shortLabel}</span>
                  </button>
                );
              })}
            <div className="chapter-progress-line" style={{ width: `${scrollProgress * 100}%` }} />
          </nav>
        )}

        <button
          type="button"
          className={`free-toggle-btn ${freeExplore ? 'active' : ''}`}
          onClick={() => (freeExplore ? returnToScrollTour() : enterFreeExplore())}
        >
          {freeExplore ? <Navigation size={14} /> : <Compass size={14} />}
          <span>{freeExplore ? 'Visite guidée' : 'Vue libre'}</span>
        </button>
      </header>

      {/* ================================================================
          STAGE 00 — FULLSCREEN EDITORIAL HERO COVER
      ================================================================ */}
      {data && !freeExplore && activeScene?.kind === 'hero' && (
        <section className="hero-stage" aria-label="Accueil">
          <div className="hero-scrim" />
          <div className="hero-content">
            <span className="hero-eyebrow">{activeScene.eyebrow}</span>
            <h1 className="hero-title">{activeScene.title}</h1>
            <p className="hero-lead">{activeScene.lead}</p>

            {activeScene.items && (
              <div className="hero-metrics">
                {activeScene.items.map((it) => (
                  <div className="hero-metric" key={it.label}>
                    <span className="hero-metric-label">{it.label}</span>
                    <span className="hero-metric-val">{it.value}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              className="hero-scroll-btn"
              onClick={() => scrollToScene(1)}
            >
              <span className="hero-scroll-line" />
              <span>Faites défiler pour entrer dans la visite</span>
            </button>
          </div>
        </section>
      )}

      {/* ================================================================
          STAGES 01–07 — CINEMASCOPE BOTTOM ARCHITECTURAL CAPTION DOCK
          (Fixed in place, crossfades smoothly — leaves 82% of 3D open above!)
      ================================================================ */}
      {data && !freeExplore && activeScene?.kind === 'chapter' && (
        <section className="caption-dock-wrap" aria-live="polite">
          <article className="caption-dock" key={activeScene.id}>
            <div className="dock-left">
              <div className="dock-kicker-row">
                <span className="dock-step-num">{activeScene.step}</span>
                <span className="dock-eyebrow">{activeScene.eyebrow}</span>
              </div>
              <h2 className="dock-title">{activeScene.title}</h2>
              <p className="dock-lead">{activeScene.lead}</p>
            </div>

            {activeScene.items && activeScene.items.length > 0 && (
              <div className={`dock-grid cols-${Math.min(activeScene.items.length, 4)}`}>
                {activeScene.items.map((it) => (
                  <div className="dock-cell" key={it.label}>
                    <span className="dock-cell-label">{it.label}</span>
                    <p className="dock-cell-value">{it.value}</p>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>
      )}

      {/* ================================================================
          STAGE 08 — INTERACTIVE TERRITORIAL ECOSYSTEM SYNTHESIS CARD
          (Replaces the overly zoomed-out town view with a crisp radial map!)
      ================================================================ */}
      {data && !freeExplore && activeScene?.kind === 'synthesis' && (
        <section className="synthesis-stage">
          <div className="synthesis-card">
            <div className="synthesis-header">
              <span className="dock-eyebrow">{activeScene.eyebrow}</span>
              <h2 className="synthesis-title">{activeScene.title}</h2>
              <p className="synthesis-lead">{activeScene.lead}</p>
            </div>

            <div className="synthesis-grid">
              {TERRITORY_NODES.map((node) => (
                <button
                  type="button"
                  key={node.id}
                  className="territory-tile"
                  onClick={() => scrollToSceneById(node.id)}
                >
                  <div className="territory-tile-top">
                    <span className="territory-dot" style={{ background: node.color }} />
                    <span className="territory-dist">{node.distance}</span>
                  </div>
                  <h3>{node.title}</h3>
                  <p>{node.detail}</p>
                </button>
              ))}
            </div>

            <div className="synthesis-footer">
              <span className="synthesis-note">
                Liaison collège Saint-Pierre de Plérin · Réseaux TUB, BreizhGo &amp; ProxiTUB
              </span>
              <button type="button" className="synthesis-cta" onClick={enterFreeExplore}>
                <Compass size={15} />
                Explorer la maquette en vue libre
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Invisible Scroll Track Spacer Driving the Guided Tour */}
      {data && !freeExplore && (
        <div className="scroll-tracks" aria-hidden="true">
          {data.scenes.map((sc, idx) => (
            <div className="scroll-track-step" key={sc.id} id={`track-step-${idx}`} />
          ))}
        </div>
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

          {selectedRoom?.indicative && (
            <span className="info-tag">Répartition provisoire · à compléter</span>
          )}

          {selectedBuilding?.area_m2 && (
            <div className="info-meta-single">
              <span>Surface approximative</span>
              <strong>{selectedBuilding.area_m2.toLocaleString('fr-FR')} m²</strong>
            </div>
          )}

          <p className="info-desc">
            {selectedRoom ? selectedRoom.description : selectedBuilding?.description}
          </p>
        </aside>
      )}

      {/* Free Explore Compact Toolbar — SHOWN EXCLUSIVELY IN FREE VIEW */}
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
            {hideRoofs ? 'Fermer toits classes' : 'Ouvrir toits classes'}
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
