import React, { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowDown, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, X } from 'lucide-react';
import { SchoolScene3D } from './components/SchoolScene3D';
import { CreditsPage } from './components/CreditsPage';
import { BuildingInfo, CameraPreset, RoomInfo, SchoolData } from './types';

gsap.registerPlugin(ScrollTrigger);

const COUR_FOCUS_ORDER: ('elementaire' | 'maternelle')[] = ['elementaire', 'maternelle'];
const CLASS_FOCUS_ORDER: ('all' | 'S1' | 'N1' | 'E2')[] = ['all', 'S1', 'N1', 'E2'];

const COUR_ROWS: Record<'elementaire' | 'maternelle', string[]> = {
  elementaire: [
    'Terrains de foot et jeux collectifs',
    'Terrain et panier de basket',
    'Préau couvert',
    'Espace en herbe et grand arbre',
  ],
  maternelle: [
    'Préau couvert des maternelles',
    'Bac à sable',
    'Structure de jeu',
    'Draisiennes, tricycles et petits vélos',
  ],
};

export const App: React.FC = () => {
  const [data, setData] = useState<SchoolData | null>(null);
  const [minLoadDone, setMinLoadDone] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showScrollCue, setShowScrollCue] = useState(false);

  const [isHero, setIsHero] = useState(true);
  const [isCredits, setIsCredits] = useState(false);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [freeExplore, setFreeExplore] = useState(false);
  const [hideRoofs, setHideRoofs] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingInfo | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<RoomInfo | null>(null);
  const [cameraPresetTrigger, setCameraPresetTrigger] = useState<{ preset: CameraPreset; seq: number } | null>(null);
  const [classBuildingFocus, setClassBuildingFocus] = useState<'all' | 'S1' | 'N1' | 'E2'>('all');
  const [courFocus, setCourFocus] = useState<'elementaire' | 'maternelle'>('elementaire');
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
  const mobileDeckRef = useRef<HTMLDivElement | null>(null);
  const mobileTrackRef = useRef<HTMLDivElement | null>(null);
  const mobileTrackYRef = useRef({ y: 0 });
  const mobileTweenRef = useRef<gsap.core.Tween | null>(null);
  const ecoleCarouselRef = useRef<HTMLDivElement | null>(null);
  const classFocusRef = useRef<'all' | 'S1' | 'N1' | 'E2'>('all');
  const courFocusRef = useRef<'elementaire' | 'maternelle'>('elementaire');
  classFocusRef.current = classBuildingFocus;
  courFocusRef.current = courFocus;

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

  // Context-aware inactivity delay for the "Faire défiler vers le bas" hint:
  // hides immediately on any page or sub-viewpoint change, then reappears only if the user hasn't scrolled:
  // - Hero (page 1): 5.5s
  // - École Sainte-Anne (page 2, longer reading): 20s
  // - Multi-viewpoint pages (La cour, Les salles de classe): 6s per viewpoint
  // - All other pages: 10s
  useEffect(() => {
    setShowScrollCue(false);
    if (!data || !modelLoaded || !minLoadDone || loadError || freeExplore || isCredits) return;

    const currentSceneId = data.scenes[activeSceneIndex]?.id;
    let delayMs = 10000;
    if (isHero) {
      delayMs = 5500;
    } else if (currentSceneId === 'ecole') {
      delayMs = 20000;
    } else if (currentSceneId === 'cour' || currentSceneId === 'classes') {
      delayMs = 6000;
    }

    const timer = window.setTimeout(() => setShowScrollCue(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [data, modelLoaded, minLoadDone, loadError, freeExplore, isHero, isCredits, activeSceneIndex, courFocus, classBuildingFocus]);

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
    (sectionIdx: number, fromBelow = false) => {
      if (!data) return;
      const wasHero = sectionIdxRef.current <= 0;
      const prevSecIdx = sectionIdxRef.current;
      sectionIdxRef.current = sectionIdx;
      if (labelDelayTimerRef.current !== null) {
        window.clearTimeout(labelDelayTimerRef.current);
        labelDelayTimerRef.current = null;
      }
      if (sectionIdx <= 0) {
        setIsHero(true);
        setIsCredits(false);
        setHideRoofs(false);
        setShowLabels(false);
      } else if (sectionIdx > data.scenes.length) {
        setIsHero(false);
        setIsCredits(true);
        setActiveSceneIndex(data.scenes.length - 1);
        setHideRoofs(false);
        setShowLabels(false);
      } else {
        const sceneIdx = Math.min(sectionIdx - 1, data.scenes.length - 1);
        setIsHero(false);
        setIsCredits(false);
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
          if (prevSecIdx !== sectionIdx) {
            if (sc.id === 'classes') {
              classFocusRef.current = 'all';
              setClassBuildingFocus('all');
            } else {
              classFocusRef.current = 'all';
              setClassBuildingFocus('all');
            }
            if (sc.id === 'cour') {
              const initCour = fromBelow ? 'maternelle' : 'elementaire';
              courFocusRef.current = initCour;
              setCourFocus(initCour);
            } else {
              courFocusRef.current = 'elementaire';
              setCourFocus('elementaire');
            }
          }
        }
      }
    },
    [data]
  );

  const goToSection = useCallback(
    (targetIdx: number, instant = false, fromBelow = false) => {
      if (!data) return;
      const maxIdx = data.scenes.length + 1;
      const clamped = Math.max(0, Math.min(maxIdx, targetIdx));

      if (isMobile) {
        applySectionState(clamped, fromBelow);
        const deck = mobileDeckRef.current;
        const track = mobileTrackRef.current;
        if (deck && track) {
          const slideH = deck.clientHeight || window.innerHeight;
          const destY = -clamped * slideH;
          mobileTweenRef.current?.kill();
          if (instant) {
            mobileTrackYRef.current.y = destY;
            track.style.transform = `translate3d(0, ${destY}px, 0)`;
          } else {
            mobileTweenRef.current = gsap.to(mobileTrackYRef.current, {
              y: destY,
              duration: 0.44,
              ease: 'power3.out',
              onUpdate: () => {
                track.style.transform = `translate3d(0, ${mobileTrackYRef.current.y}px, 0)`;
              },
              onComplete: () => {
                mobileTrackYRef.current.y = destY;
                track.style.transform = `translate3d(0, ${destY}px, 0)`;
              },
            });
          }
        }
        return;
      }

      const elId =
        clamped === 0
          ? 'hero-cover'
          : clamped > data.scenes.length
          ? 'credits-page'
          : `chapter-${data.scenes[clamped - 1].id}`;
      const targetEl = document.getElementById(elId);
      if (!targetEl) return;

      const targetY = clamped === 0 ? 0 : targetEl.getBoundingClientRect().top + window.scrollY;
      applySectionState(clamped, fromBelow);

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

  // Step through sub-viewpoints on multi-view pages (La cour, Les salles de classe) before changing page
  const stepGuided = useCallback(
    (dir: 1 | -1): boolean => {
      if (!data) return false;
      const secIdx = sectionIdxRef.current;
      if (secIdx >= 1) {
        const sc = data.scenes[secIdx - 1];
        if (sc?.id === 'cour') {
          const cur = COUR_FOCUS_ORDER.indexOf(courFocusRef.current);
          const nextSub = cur + dir;
          if (nextSub >= 0 && nextSub < COUR_FOCUS_ORDER.length) {
            const val = COUR_FOCUS_ORDER[nextSub];
            courFocusRef.current = val;
            setCourFocus(val);
            wheelLockUntilRef.current = performance.now() + 720;
            return false;
          }
        } else if (sc?.id === 'classes') {
          const cur = CLASS_FOCUS_ORDER.indexOf(classFocusRef.current);
          const nextSub = cur + dir;
          if (nextSub >= 0 && nextSub < CLASS_FOCUS_ORDER.length) {
            const val = CLASS_FOCUS_ORDER[nextSub];
            classFocusRef.current = val;
            setClassBuildingFocus(val);
            wheelLockUntilRef.current = performance.now() + 720;
            return false;
          }
        }
      }
      const nextPage = Math.max(0, Math.min(data.scenes.length + 1, secIdx + dir));
      if (nextPage !== secIdx) {
        goToSection(nextPage, false, dir < 0);
        return true;
      }
      return false;
    },
    [data, goToSection]
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
      stepGuided(dir);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        stepGuided(1);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        stepGuided(-1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        goToSection(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        goToSection(data.scenes.length + 1);
      }
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      scrollTweenRef.current?.kill();
    };
  }, [data, freeExplore, isMobile, goToSection, stepGuided]);

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

    const creditsEl = document.getElementById('credits-page');
    if (creditsEl) {
      const activateCredits = () => {
        if (!isAutoScrollingRef.current) applySectionState(data.scenes.length + 1);
      };
      triggers.push(
        ScrollTrigger.create({
          trigger: creditsEl,
          start: 'top 52%',
          end: 'bottom 48%',
          onEnter: activateCredits,
          onEnterBack: activateCredits,
        })
      );
    }

    ScrollTrigger.refresh();
    return () => {
      triggers.forEach((t) => t.kill());
    };
  }, [data, freeExplore, isMobile, applySectionState]);

  // Mobile GPU-composited TikTok-style vertical swipe engine (zero native scroll-snap jank; desktop untouched)
  useEffect(() => {
    if (!data || freeExplore || !isMobile) return;
    const deck = mobileDeckRef.current;
    const track = mobileTrackRef.current;
    if (!deck || !track) return;

    const maxIdx = data.scenes.length + 1;
    const syncToCurrent = () => {
      const h = deck.clientHeight || window.innerHeight;
      const y = -sectionIdxRef.current * h;
      mobileTweenRef.current?.kill();
      mobileTrackYRef.current.y = y;
      track.style.transform = `translate3d(0, ${y}px, 0)`;
    };
    syncToCurrent();

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let baseY = 0;
    let axis: 'none' | 'v' | 'h' = 'none';
    let lastDy = 0;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      mobileTweenRef.current?.kill();
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      startTime = performance.now();
      const h = deck.clientHeight || window.innerHeight;
      baseY = -sectionIdxRef.current * h;
      mobileTrackYRef.current.y = baseY;
      axis = 'none';
      lastDy = 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;

      if (axis === 'none') {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        const inCarousel = !!(e.target as HTMLElement | null)?.closest('.mobile-carousel-track');
        if (inCarousel && Math.abs(dx) >= Math.abs(dy) * 0.9) {
          axis = 'h';
          return;
        }
        const creditsScroll = (e.target as HTMLElement | null)?.closest('.mobile-credits-scroll') as HTMLElement | null;
        if (creditsScroll) {
          // Allow native scroll inside mobile credits page; swipe down at top goes back to step 7
          const atTop = creditsScroll.scrollTop <= 2;
          if (!(atTop && dy > 0)) {
            axis = 'h';
            return;
          }
        }
        axis = Math.abs(dy) >= Math.abs(dx) ? 'v' : 'h';
      }

      if (axis !== 'v') return;
      e.preventDefault();
      lastDy = dy;

      const idx = sectionIdxRef.current;
      const sc = idx >= 1 ? data.scenes[idx - 1] : undefined;
      const subStepNext =
        dy < 0 &&
        ((sc?.id === 'cour' && courFocusRef.current === 'elementaire') ||
          (sc?.id === 'classes' && classFocusRef.current !== 'E2'));
      const subStepPrev =
        dy > 0 &&
        ((sc?.id === 'cour' && courFocusRef.current === 'maternelle') ||
          (sc?.id === 'classes' && classFocusRef.current !== 'all'));

      // Gentle rubber-band resistance at bounds or when switching sub-viewpoint within the same slide
      const resisted =
        (idx === 0 && dy > 0) || (idx === maxIdx && dy < 0) || subStepNext || subStepPrev
          ? dy * 0.28
          : dy;
      const nextY = baseY + resisted;
      mobileTrackYRef.current.y = nextY;
      track.style.transform = `translate3d(0, ${nextY}px, 0)`;
    };

    const onTouchEnd = () => {
      if (axis !== 'v') {
        axis = 'none';
        return;
      }
      axis = 'none';
      const dt = Math.max(16, performance.now() - startTime);
      const velocity = Math.abs(lastDy) / dt; // px/ms
      const h = deck.clientHeight || window.innerHeight;
      const threshold = Math.min(54, h * 0.08);

      if (lastDy < -threshold || (lastDy < -18 && velocity > 0.28)) {
        const movedPage = stepGuided(1);
        if (!movedPage) goToSection(sectionIdxRef.current);
      } else if (lastDy > threshold || (lastDy > 18 && velocity > 0.28)) {
        const movedPage = stepGuided(-1);
        if (!movedPage) goToSection(sectionIdxRef.current);
      } else {
        goToSection(sectionIdxRef.current);
      }
    };

    deck.addEventListener('touchstart', onTouchStart, { passive: true });
    deck.addEventListener('touchmove', onTouchMove, { passive: false });
    deck.addEventListener('touchend', onTouchEnd, { passive: true });
    deck.addEventListener('touchcancel', onTouchEnd, { passive: true });
    window.addEventListener('resize', syncToCurrent);

    return () => {
      mobileTweenRef.current?.kill();
      deck.removeEventListener('touchstart', onTouchStart);
      deck.removeEventListener('touchmove', onTouchMove);
      deck.removeEventListener('touchend', onTouchEnd);
      deck.removeEventListener('touchcancel', onTouchEnd);
      window.removeEventListener('resize', syncToCurrent);
    };
  }, [data, freeExplore, isMobile, goToSection, stepGuided]);

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
          hideRoofs={
            hideRoofs && !(isMobile && !freeExplore && activeSceneId === 'classes' && classBuildingFocus === 'all')
          }
          showLabels={showLabels}
          selectedBuilding={selectedBuilding}
          selectedRoom={selectedRoom}
          cameraPresetTrigger={cameraPresetTrigger}
          classBuildingFocus={classBuildingFocus}
          courFocus={courFocus}
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

      {data && !freeExplore && !isCredits && showScrollCue && (
        <button
          type="button"
          className={`scroll-cue ${!isHero ? 'in-split' : ''}`}
          onClick={() => stepGuided(1)}
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
          {!isHero && !isCredits && (
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
          {!isHero && !isCredits && (
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

          {/* TikTok-style GPU-composited vertical swipe deck */}
          <main className="mobile-reel-feed" ref={mobileDeckRef}>
            <div className="mobile-reel-track" ref={mobileTrackRef}>
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
                    ) : sc.id === 'cour' ? (
                      <>
                        <div className="fact-list cour-groups-list">
                          {(
                            [
                              { key: 'elementaire', label: 'Cour élémentaire', color: '#ef4444' },
                              { key: 'maternelle', label: 'Cour maternelle', color: '#2563eb' },
                            ] as const
                          ).map((grp) => (
                            <div
                              key={grp.key}
                              className={`fact-row cour-group cour-group-${grp.key} ${
                                courFocus === grp.key ? 'is-active' : 'is-inactive'
                              }`}
                              onClick={() => setCourFocus(grp.key)}
                            >
                              <span className="fact-label cour-group-title">
                                <span className="cour-dot" style={{ background: grp.color }} />
                                {grp.label}
                              </span>
                              <ul className="cour-items">
                                {COUR_ROWS[grp.key].map((text, rIdx) => (
                                  <li className="fact-value" key={rIdx}>
                                    {text}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                        <div className="building-focus-bar" role="group" aria-label="Vue des cours">
                          <button
                            type="button"
                            className={`cour-focus-btn cour-elem ${courFocus === 'elementaire' ? 'active' : ''}`}
                            onClick={() => setCourFocus('elementaire')}
                          >
                            <span className="cour-dot" style={{ background: '#ef4444' }} />
                            Cour élémentaire
                          </button>
                          <button
                            type="button"
                            className={`cour-focus-btn cour-mat ${courFocus === 'maternelle' ? 'active' : ''}`}
                            onClick={() => setCourFocus('maternelle')}
                          >
                            <span className="cour-dot" style={{ background: '#2563eb' }} />
                            Cour maternelle
                          </button>
                        </div>
                      </>
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
                  </div>

                  <button
                    type="button"
                    className="mobile-reel-next-hint"
                    onClick={() => stepGuided(1)}
                    aria-label="Étape suivante"
                  >
                    <ChevronDown size={18} className="scroll-cue-arrow" />
                  </button>
                </div>
              </section>
            ))}

            <section
              className="mobile-reel-slide mobile-reel-credits"
              id="credits-page"
              data-reel-index={totalChapters + 1}
            >
              <div className="mobile-credits-scroll">
                <CreditsPage onBackHome={() => goToSection(0)} />
              </div>
            </section>
            </div>
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

                  {sc.id === 'cour' ? (
                    <>
                      <div className="fact-list cour-groups-list">
                        {(
                          [
                            { key: 'elementaire', label: 'Cour élémentaire', color: '#ef4444' },
                            { key: 'maternelle', label: 'Cour maternelle', color: '#2563eb' },
                          ] as const
                        ).map((grp) => (
                          <div
                            key={grp.key}
                            className={`fact-row cour-group cour-group-${grp.key} ${
                              courFocus === grp.key ? 'is-active' : 'is-inactive'
                            }`}
                            onClick={() => setCourFocus(grp.key)}
                          >
                            <span className="fact-label cour-group-title">
                              <span className="cour-dot" style={{ background: grp.color }} />
                              {grp.label}
                            </span>
                            <ul className="cour-items">
                              {COUR_ROWS[grp.key].map((text, rIdx) => (
                                <li className="fact-value" key={rIdx}>
                                  {text}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                      <div className="building-focus-bar" role="group" aria-label="Vue des cours">
                        <button
                          type="button"
                          className={`cour-focus-btn cour-elem ${courFocus === 'elementaire' ? 'active' : ''}`}
                          onClick={() => setCourFocus('elementaire')}
                        >
                          <span className="cour-dot" style={{ background: '#ef4444' }} />
                          Cour élémentaire
                        </button>
                        <button
                          type="button"
                          className={`cour-focus-btn cour-mat ${courFocus === 'maternelle' ? 'active' : ''}`}
                          onClick={() => setCourFocus('maternelle')}
                        >
                          <span className="cour-dot" style={{ background: '#2563eb' }} />
                          Cour maternelle
                        </button>
                      </div>
                    </>
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
                </div>
              </section>
            ))}

            <div className="col-sticky-bottom">
              <button
                type="button"
                className="step-nav-btn"
                onClick={() => stepGuided(-1)}
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
                onClick={() => stepGuided(1)}
              >
                Suivant <ChevronDown size={15} />
              </button>
            </div>
          </div>

          {/* Dedicated full-width Credits & Legal Notice page at the end of the tour */}
          <section className="credits-page" id="credits-page">
            <CreditsPage onBackHome={() => goToSection(0)} />
          </section>
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
