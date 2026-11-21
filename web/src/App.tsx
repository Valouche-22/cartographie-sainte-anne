import React, { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowDown, ArrowUp, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, X } from 'lucide-react';
import { SchoolScene3D } from './components/SchoolScene3D';
import { BuildingInfo, CameraPreset, RoomInfo, SchoolData } from './types';

gsap.registerPlugin(ScrollTrigger);

export const App: React.FC = () => {
  const [data, setData] = useState<SchoolData | null>(null);
  const [minLoadDone, setMinLoadDone] = useState(false);
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
  const [classBuildingFocus, setClassBuildingFocus] = useState<'all' | 'S1' | 'N1' | 'E2'>('all');
  const [ecoleCarouselPage, setEcoleCarouselPage] = useState(0);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 860px)').matches : false
  );

  // Smooth magnetic section scrolling state
  // sectionIdx: 0 = hero-cover, 1..N = data.scenes[0..N-1]
  const sectionIdxRef = useRef(0);
  const isAutoScrollingRef = useRef(false);
  const scrollTweenRef = useRef<gsap.core.Tween | null>(null);
  const wheelLockUntilRef = useRef(0);
  const labelDelayTimerRef = useRef<number | null>(null);
  const mobileFeedRef = useRef<HTMLDivElement | null>(null);
  const ecoleCarouselRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 860px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Enforce a 1.5-second minimum loading screen duration (bar animates smoothly via GPU CSS keyframes)
  useEffect(() => {
    const timer = window.setTimeout(() => setMinLoadDone(true), 1500);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    fetch(`./data/school-data.json?v=${__BUILD_ID__}`)
      .then((r) => r.json())
      .then((json: SchoolData) => setData(json))
      .catch(() => setLoadError('Impossible de charger les données.'));
  }, []);

  // Automatically scale chapter spacing/typography down ONLY when a chapter overflows its panel/card height
  useEffect(() => {
    if (!data || freeExplore) return;
    const fitChapters = () => {
      const isDesktop = window.innerWidth > 860;
      if (isDesktop) {
        const panels = document.querySelectorAll<HTMLElement>('.chapter-panel');
        panels.forEach((panel) => {
          const body = panel.querySelector<HTMLElement>('.chapter-body');
          if (!body) return;
          body.style.setProperty('--fit', '1');
          const cs = window.getComputedStyle(panel);
          const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
          const availH = panel.clientHeight - padY - 6;
          if (availH <= 0 || body.scrollHeight <= availH) return;
          for (const f of [0.94, 0.88, 0.82, 0.76, 0.71, 0.66, 0.61]) {
            body.style.setProperty('--fit', String(f));
            if (body.scrollHeight <= availH) break;
          }
        });
      } else {
        const cards = document.querySelectorAll<HTMLElement>('.mobile-reel-card');
        cards.forEach((card) => {
          const body = card.querySelector<HTMLElement>('.mobile-reel-body');
          if (!body || body.classList.contains('has-carousel')) return;
          body.style.setProperty('--mfit', '1');
          const cs = window.getComputedStyle(card);
          const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
          const availH = card.clientHeight - padY - 6;
          if (availH <= 0 || body.scrollHeight <= availH) return;
          for (const f of [0.95, 0.9, 0.85, 0.8]) {
            body.style.setProperty('--mfit', String(f));
            if (body.scrollHeight <= availH) break;
          }
        });
      }
    };
    const raf = requestAnimationFrame(fitChapters);
    window.addEventListener('resize', fitChapters);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(fitChapters);
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', fitChapters);
    };
  }, [data, freeExplore, isMobile]);

  const applySectionState = useCallback(
    (sectionIdx: number) => {
      if (!data) return;
      const wasHero = sectionIdxRef.current <= 0;
      sectionIdxRef.current = sectionIdx;
      if (labelDelayTimerRef.current !== null) {
        window.clearTimeout(labelDelayTimerRef.current);
        labelDelayTimerRef.current = null;
      }
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
          if (wasHero && sceneIdx === 0 && sc.showLabels) {
            setShowLabels(false);
            labelDelayTimerRef.current = window.setTimeout(() => {
              labelDelayTimerRef.current = null;
              setShowLabels(true);
            }, 500);
          } else {
            setShowLabels(sc.showLabels);
          }
          if (sc.id !== 'classes') {
            setClassBuildingFocus('all');
          }
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

      if (isMobile) {
        const feed = mobileFeedRef.current;
        applySectionState(clamped);
        if (feed) {
          const slide = feed.querySelector<HTMLElement>(`[data-reel-index="${clamped}"]`);
          if (slide) {
            feed.scrollTo({ top: slide.offsetTop, behavior: instant ? 'auto' : 'smooth' });
          } else {
            feed.scrollTo({ top: clamped * feed.clientHeight, behavior: instant ? 'auto' : 'smooth' });
          }
        }
        return;
      }

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
    [data, isMobile, applySectionState]
  );

  // Smooth magnetic wheel + keyboard navigation (desktop only)
  useEffect(() => {
    if (!data || freeExplore || isMobile) return;

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
  }, [data, freeExplore, isMobile, goToSection]);

  // Fallback ScrollTrigger sync for manual scrollbar dragging (desktop only)
  useEffect(() => {
    if (!data || freeExplore || isMobile) return;
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
  }, [data, freeExplore, isMobile, applySectionState]);

  // Mobile TikTok-style vertical snap feed observer
  useEffect(() => {
    if (!data || freeExplore || !isMobile) return;
    const feed = mobileFeedRef.current;
    if (!feed) return;
    const slides = feed.querySelectorAll<HTMLElement>('.mobile-reel-slide');
    if (!slides.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        let bestIdx: number | null = null;
        let bestRatio = 0;
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.52 && entry.intersectionRatio > bestRatio) {
            const raw = (entry.target as HTMLElement).dataset.reelIndex;
            if (raw !== undefined) {
              bestRatio = entry.intersectionRatio;
              bestIdx = Number(raw);
            }
          }
        }
        if (bestIdx !== null && bestIdx !== sectionIdxRef.current) {
          applySectionState(bestIdx);
        }
      },
      { root: feed, threshold: [0.55, 0.75, 0.9] }
    );

    slides.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [data, freeExplore, isMobile, applySectionState]);

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
  const activeSceneId = data?.scenes[activeSceneIndex]?.id || 'ecole';
  const progressPct = totalChapters > 0 ? ((activeSceneIndex + 1) / totalChapters) * 100 : 0;

  const showLoader = (!modelLoaded || !minLoadDone) && !loadError;

  return (
    <>
      {showLoader && (
        <div className="loader-screen">
          <p className="loader-title">École Sainte-Anne</p>
          <div className="loader-bar-wrap">
            <div className="loader-bar" />
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
          classBuildingFocus={classBuildingFocus}
          onSelectBuilding={handleSelectBuilding}
          onSelectRoom={handleSelectRoom}
          onLoadProgress={() => {}}
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

      {data && !freeExplore && (isHero || activeSceneIndex < totalChapters - 1) && (
        <button
          type="button"
          className={`scroll-cue ${!isHero ? 'in-split' : ''}`}
          onClick={() => goToSection(isHero ? 1 : activeSceneIndex + 2)}
          aria-label="Faire défiler vers le bas pour continuer"
        >
          <ChevronDown size={15} className="scroll-cue-arrow" />
          <span className="scroll-cue-text">Faire défiler vers le bas</span>
          <ChevronDown size={15} className="scroll-cue-arrow" />
        </button>
      )}

      {data && !freeExplore && isMobile && (
        <>
          {/* Mobile top rainbow progress bar + floating brand/step pill (visible on steps 1..7) */}
          {!isHero && (
            <div className="mobile-reel-chrome" data-active-scene={activeSceneId}>
              <div className="mobile-top-progress-track" aria-hidden="true">
                <div className="mobile-top-progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
              <button
                type="button"
                className="mobile-top-pill"
                onClick={() => goToSection(0)}
              >
                <span className="mobile-top-brand">{data.school.name}</span>
                <span className="col-step-badge">
                  {activeSceneIndex + 1} / {totalChapters}
                </span>
              </button>
            </div>
          )}

          {/* TikTok-style vertical rainbow navigation rail on the right edge */}
          {!isHero && (
            <div className="mobile-reel-rail" role="tablist" aria-label="Étapes de la visite">
              {data.scenes.map((sc, idx) => (
                <button
                  key={sc.id}
                  type="button"
                  data-scene={sc.id}
                  className={`mobile-rail-dot ${idx === activeSceneIndex ? 'active' : ''}`}
                  onClick={() => goToSection(idx + 1)}
                  title={sc.title}
                  aria-label={`Aller à ${sc.title}`}
                />
              ))}
            </div>
          )}

          {/* TikTok-style mandatory vertical snap scroll feed */}
          <main className="mobile-reel-feed" ref={mobileFeedRef}>
            <section className="mobile-reel-slide mobile-reel-hero" data-reel-index={0} id="hero-cover">
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
            </section>

            {data.scenes.map((sc, idx) => (
              <section
                className="mobile-reel-slide mobile-reel-chapter"
                key={sc.id}
                id={`chapter-${sc.id}`}
                data-reel-index={idx + 1}
                data-scene={sc.id}
              >
                {/* Top 45% intentionally transparent so live 3D scene & labels shine through */}
                <div className="mobile-reel-window" aria-hidden="true" />

                {/* Bottom 55% snapped editorial card */}
                <div className="mobile-reel-card">
                  <div className="mobile-reel-grabber" aria-hidden="true" />
                  <div
                    className={`mobile-reel-body ${!isHero && idx === activeSceneIndex ? 'is-active' : ''} ${
                      sc.id === 'ecole' ? 'has-carousel' : ''
                    }`}
                  >
                    <h2 className="chapter-title">{sc.title}</h2>

                    {sc.id === 'ecole' ? (
                      (() => {
                        const pages = [
                          sc.rows.slice(0, 3),
                          sc.rows.slice(3, 6),
                          sc.rows.slice(6),
                        ].filter((p) => p.length > 0);
                        const scrollToPage = (pIdx: number) => {
                          const clamped = Math.max(0, Math.min(pages.length - 1, pIdx));
                          setEcoleCarouselPage(clamped);
                          const el = ecoleCarouselRef.current;
                          if (el) {
                            el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' });
                          }
                        };
                        return (
                          <div className="mobile-carousel-wrap">
                            <div
                              className="mobile-carousel-track"
                              ref={ecoleCarouselRef}
                              onScroll={(e) => {
                                const el = e.currentTarget;
                                if (el.clientWidth > 0) {
                                  const nextP = Math.round(el.scrollLeft / el.clientWidth);
                                  if (nextP !== ecoleCarouselPage) {
                                    setEcoleCarouselPage(nextP);
                                  }
                                }
                              }}
                            >
                              {pages.map((pageRows, pIdx) => (
                                <div className="mobile-carousel-page" key={pIdx}>
                                  <div className="fact-list">
                                    {pageRows.map((row, rIdx) => (
                                      <div className="fact-row" key={rIdx}>
                                        {row.label && <span className="fact-label">{row.label}</span>}
                                        <p className="fact-value">{row.value}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="mobile-carousel-controls">
                              <button
                                type="button"
                                className="mobile-carousel-arrow"
                                disabled={ecoleCarouselPage <= 0}
                                onClick={() => scrollToPage(ecoleCarouselPage - 1)}
                                aria-label="Fiche précédente"
                              >
                                <ChevronLeft size={16} />
                              </button>
                              <div className="mobile-carousel-dots" role="tablist" aria-label="Pages d'informations">
                                {pages.map((_, pIdx) => (
                                  <button
                                    key={pIdx}
                                    type="button"
                                    className={`mobile-carousel-dot ${ecoleCarouselPage === pIdx ? 'active' : ''}`}
                                    onClick={() => scrollToPage(pIdx)}
                                    aria-label={`Page ${pIdx + 1} sur ${pages.length}`}
                                  />
                                ))}
                              </div>
                              <button
                                type="button"
                                className="mobile-carousel-arrow"
                                disabled={ecoleCarouselPage >= pages.length - 1}
                                onClick={() => scrollToPage(ecoleCarouselPage + 1)}
                                aria-label="Fiche suivante"
                              >
                                <ChevronRight size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="fact-list">
                        {sc.rows.map((row, rIdx) => (
                          <div className="fact-row" key={rIdx}>
                            {row.label && <span className="fact-label">{row.label}</span>}
                            <p className="fact-value">{row.value}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {sc.id === 'classes' && (
                      <div className="building-focus-bar" role="group" aria-label="Zoom par bâtiment">
                        {(
                          [
                            { key: 'all', label: 'Vue globale' },
                            { key: 'S1', label: 'Bâtiment Cycle 1' },
                            { key: 'N1', label: 'Bâtiment Cycle 2' },
                            { key: 'E2', label: 'Bâtiment Cycle 3' },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.key}
                            type="button"
                            className={`building-focus-btn ${classBuildingFocus === opt.key ? 'active' : ''}`}
                            onClick={() => setClassBuildingFocus(opt.key)}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {sc.note && <p className="chapter-note">{sc.note}</p>}

                    {idx === totalChapters - 1 && (
                      <button
                        type="button"
                        className="back-home-btn"
                        onClick={() => goToSection(0)}
                      >
                        <ArrowUp size={15} />
                        <span>Retour à l'accueil</span>
                      </button>
                    )}
                  </div>

                  {idx < totalChapters - 1 && (
                    <button
                      type="button"
                      className="mobile-reel-next-hint"
                      onClick={() => goToSection(idx + 2)}
                      aria-label="Étape suivante"
                    >
                      <ChevronDown size={18} className="scroll-cue-arrow" />
                    </button>
                  )}
                </div>
              </section>
            ))}
          </main>
        </>
      )}

      {data && !freeExplore && !isMobile && (
        <main className="guided-flow">
          {/* Desktop fullscreen opening view (strictly untouched) */}
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
          </section>

          {/* Desktop left column (strictly untouched) */}
          <div className="editorial-column" data-active-scene={activeSceneId}>
            <div className="col-sticky-top">
              <span className="col-brand" onClick={() => goToSection(0)}>
                {data.school.name}
              </span>
              <span className="col-step-badge">
                {activeSceneIndex + 1} / {totalChapters}
              </span>
              <div className="col-progress-track" aria-hidden="true">
                <div className="col-progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
            </div>

            {data.scenes.map((sc, idx) => (
              <section className="chapter-panel" key={sc.id} id={`chapter-${sc.id}`} data-scene={sc.id}>
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

                  {sc.id === 'classes' && (
                    <div className="building-focus-bar" role="group" aria-label="Zoom par bâtiment">
                      {(
                        [
                          { key: 'all', label: 'Vue globale' },
                          { key: 'S1', label: 'Bâtiment Cycle 1' },
                          { key: 'N1', label: 'Bâtiment Cycle 2' },
                          { key: 'E2', label: 'Bâtiment Cycle 3' },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          className={`building-focus-btn ${classBuildingFocus === opt.key ? 'active' : ''}`}
                          onClick={() => setClassBuildingFocus(opt.key)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {sc.note && <p className="chapter-note">{sc.note}</p>}

                  {idx === totalChapters - 1 && (
                    <button
                      type="button"
                      className="back-home-btn"
                      onClick={() => goToSection(0)}
                    >
                      <ArrowUp size={15} />
                      <span>Retour à l'accueil</span>
                    </button>
                  )}
                </div>
              </section>
            ))}

            <div className="col-sticky-bottom">
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
                    data-scene={sc.id}
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
        </main>
      )}

      {/* Free Explore info box */}
      {freeExplore && (selectedBuilding || selectedRoom) && (
        <aside
          className="info-panel"
          style={
            {
              '--panel-accent': selectedRoom?.color || '#1d4ed8',
            } as React.CSSProperties
          }
        >
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
