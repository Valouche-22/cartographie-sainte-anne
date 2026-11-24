import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface SystemicMapPageProps {
  stepNumber: number;
  totalSteps: number;
  onPrev: () => void;
  onNext: () => void;
}

export const SystemicMapPage: React.FC<SystemicMapPageProps> = ({
  stepNumber,
  totalSteps,
  onPrev,
  onNext,
}) => {
  return (
    <div className="sys-inner">
      <header className="sys-header">
        <div>
          <h2 className="sys-title">L'organisation de l'école</h2>
          <p className="sys-subtitle">Comment les acteurs et les partenaires travaillent ensemble autour des élèves</p>
        </div>
        <span className="col-step-badge sys-step-badge">
          {stepNumber} / {totalSteps}
        </span>
      </header>

      {/* Simple, readable 3-item legend */}
      <div className="sys-legend-bar" aria-label="Légende du schéma">
        <span className="sys-legend-item">
          <span className="sys-legend-line" style={{ borderColor: '#0f172a' }} aria-hidden="true" />
          Tutelle / employeur
        </span>
        <span className="sys-legend-item">
          <span className="sys-legend-line" style={{ borderColor: '#2563eb' }} aria-hidden="true" />
          Travail en commun
        </span>
        <span className="sys-legend-item">
          <span className="sys-legend-line is-dashed" style={{ borderColor: '#16a34a' }} aria-hidden="true" />
          Financement / locaux mis à disposition
        </span>
      </div>

      {/* Clean, zero-crossing editorial diagram */}
      <div className="sys-canvas-wrap">
        <svg
          className="sys-svg"
          viewBox="0 0 920 462"
          role="img"
          aria-label="Schéma des relations entre les acteurs, tutelles et partenaires de l'école Sainte-Anne"
        >
          <defs>
            <marker id="arr-dark" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse">
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#0f172a" />
            </marker>
            <marker id="arr-blue" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse">
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#2563eb" />
            </marker>
            <marker id="arr-green" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse">
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#16a34a" />
            </marker>
          </defs>

          {/* Subtle inner frame for École Sainte-Anne */}
          <rect x="24" y="106" width="872" height="236" rx="14" className="sys-zone-internal" />
          <text x="42" y="125" className="sys-zone-label">
            ÉCOLE SAINTE-ANNE
          </text>

          {/* ===== CLEAN NON-CROSSING CONNECTORS ===== */}
          {/* Top vertical links: État -> Enseignants, Tutelle -> Cheffe, Commune -> OGEC */}
          <line x1="165" y1="74" x2="165" y2="140" stroke="#0f172a" strokeWidth="1.7" markerEnd="url(#arr-dark)" />
          <line x1="460" y1="74" x2="460" y2="132" stroke="#0f172a" strokeWidth="1.7" markerEnd="url(#arr-dark)" />
          <line x1="755" y1="74" x2="755" y2="140" stroke="#16a34a" strokeWidth="1.7" strokeDasharray="5 3" markerEnd="url(#arr-green)" />

          {/* Subtle short edge labels on top links */}
          <text x="174" y="96" className="sys-edge-label">contrats et suivi</text>
          <text x="469" y="96" className="sys-edge-label">mission</text>
          <text x="764" y="96" className="sys-edge-label">forfait communal</text>

          {/* Horizontal links inside school: Enseignants <-> Cheffe <-> OGEC/ASEM */}
          <line x1="278" y1="164" x2="352" y2="164" stroke="#2563eb" strokeWidth="1.7" markerStart="url(#arr-blue)" markerEnd="url(#arr-blue)" />
          <line x1="568" y1="164" x2="642" y2="164" stroke="#2563eb" strokeWidth="1.7" markerStart="url(#arr-blue)" markerEnd="url(#arr-blue)" />

          {/* Links converging cleanly toward Les élèves (center) */}
          <line x1="460" y1="190" x2="460" y2="230" stroke="#2563eb" strokeWidth="1.7" markerEnd="url(#arr-blue)" />
          <line x1="278" y1="186" x2="352" y2="246" stroke="#2563eb" strokeWidth="1.7" markerEnd="url(#arr-blue)" />
          <line x1="642" y1="186" x2="568" y2="246" stroke="#2563eb" strokeWidth="1.7" markerEnd="url(#arr-blue)" />

          {/* Lower internal links: APEL/familles <-> Enseignants & -> Élèves; Réunions <-> OGEC & <-> Élèves */}
          <line x1="165" y1="196" x2="165" y2="254" stroke="#2563eb" strokeWidth="1.6" markerStart="url(#arr-blue)" markerEnd="url(#arr-blue)" />
          <line x1="278" y1="276" x2="352" y2="266" stroke="#16a34a" strokeWidth="1.6" strokeDasharray="5 3" markerEnd="url(#arr-green)" />
          <line x1="755" y1="196" x2="755" y2="254" stroke="#2563eb" strokeWidth="1.6" markerStart="url(#arr-blue)" markerEnd="url(#arr-blue)" />
          <line x1="642" y1="276" x2="568" y2="266" stroke="#2563eb" strokeWidth="1.6" markerStart="url(#arr-blue)" markerEnd="url(#arr-blue)" />

          {/* Bottom links to local partners around the school */}
          <line x1="398" y1="288" x2="215" y2="386" stroke="#2563eb" strokeWidth="1.6" markerStart="url(#arr-blue)" markerEnd="url(#arr-blue)" />
          <line x1="460" y1="288" x2="460" y2="386" stroke="#16a34a" strokeWidth="1.7" strokeDasharray="5 3" markerEnd="url(#arr-green)" />
          <line x1="522" y1="288" x2="705" y2="386" stroke="#2563eb" strokeWidth="1.6" markerStart="url(#arr-blue)" markerEnd="url(#arr-blue)" />

          <text x="276" y="366" className="sys-edge-label">suite en 6e</text>
          <text x="469" y="366" className="sys-edge-label">mis à disposition</text>
          <text x="646" y="366" className="sys-edge-label">paroisse</text>

          {/* ===== ROW 1: CADRE EXTERNE (3 NODES) ===== */}
          <g className="sys-node">
            <rect x="55" y="22" width="220" height="50" rx="9" className="sys-node-rect" />
            <text x="165" y="43" textAnchor="middle" className="sys-node-title">État (Éducation nationale)</text>
            <text x="165" y="60" textAnchor="middle" className="sys-node-sub">programmes, enseignants, AESH</text>
          </g>

          <g className="sys-node">
            <rect x="355" y="22" width="210" height="50" rx="9" className="sys-node-rect" />
            <text x="460" y="43" textAnchor="middle" className="sys-node-title">Tutelle diocésaine</text>
            <text x="460" y="60" textAnchor="middle" className="sys-node-sub">enseignement catholique</text>
          </g>

          <g className="sys-node">
            <rect x="645" y="22" width="220" height="50" rx="9" className="sys-node-rect" />
            <text x="755" y="43" textAnchor="middle" className="sys-node-title">Commune de Pordic</text>
            <text x="755" y="60" textAnchor="middle" className="sys-node-sub">financement, cantine, locaux</text>
          </g>

          {/* ===== ROW 2 & 3: SYSTÈME INTERNE (6 NODES) ===== */}
          <g className="sys-node">
            <rect x="55" y="142" width="220" height="52" rx="9" className="sys-node-rect" />
            <text x="165" y="164" textAnchor="middle" className="sys-node-title">Enseignants (11) et AESH (2)</text>
            <text x="165" y="181" textAnchor="middle" className="sys-node-sub">9 classes · suivi et aide en classe</text>
          </g>

          <g className="sys-node sys-node-pilot">
            <rect x="355" y="136" width="210" height="52" rx="9" className="sys-node-rect" />
            <text x="460" y="158" textAnchor="middle" className="sys-node-title">Cheffe d'établissement</text>
            <text x="460" y="175" textAnchor="middle" className="sys-node-sub">direction · classe CE2-CM1</text>
          </g>

          <g className="sys-node">
            <rect x="645" y="142" width="220" height="52" rx="9" className="sys-node-rect" />
            <text x="755" y="164" textAnchor="middle" className="sys-node-title">OGEC et ASEM</text>
            <text x="755" y="181" textAnchor="middle" className="sys-node-sub">budget, locaux, maternelle</text>
          </g>

          <g className="sys-node">
            <rect x="55" y="256" width="220" height="52" rx="9" className="sys-node-rect" />
            <text x="165" y="278" textAnchor="middle" className="sys-node-title">APEL et familles</text>
            <text x="165" y="295" textAnchor="middle" className="sys-node-sub">échanges, projets, sorties</text>
          </g>

          <g className="sys-node sys-node-center">
            <rect x="355" y="232" width="210" height="54" rx="10" className="sys-node-rect" />
            <text x="460" y="255" textAnchor="middle" className="sys-node-title">Les élèves</text>
            <text x="460" y="272" textAnchor="middle" className="sys-node-sub">220 élèves · de la TPS au CM2</text>
          </g>

          <g className="sys-node">
            <rect x="645" y="256" width="220" height="52" rx="9" className="sys-node-rect" />
            <text x="755" y="278" textAnchor="middle" className="sys-node-title">Réunions d'école</text>
            <text x="755" y="295" textAnchor="middle" className="sys-node-sub">conseils d'équipe et ESS</text>
          </g>

          {/* ===== ROW 4: AUTOUR DE L'ÉCOLE (3 NODES) ===== */}
          <g className="sys-node">
            <rect x="55" y="388" width="220" height="50" rx="9" className="sys-node-rect" />
            <text x="165" y="409" textAnchor="middle" className="sys-node-title">Collège Saint-Pierre (Plérin)</text>
            <text x="165" y="426" textAnchor="middle" className="sys-node-sub">lien pour le passage en 6e</text>
          </g>

          <g className="sys-node">
            <rect x="342" y="388" width="236" height="50" rx="9" className="sys-node-rect" />
            <text x="460" y="409" textAnchor="middle" className="sys-node-title">Services et lieux de la commune</text>
            <text x="460" y="426" textAnchor="middle" className="sys-node-sub">cantine, périscolaire, sport, médiathèque</text>
          </g>

          <g className="sys-node">
            <rect x="645" y="388" width="220" height="50" rx="9" className="sys-node-rect" />
            <text x="755" y="409" textAnchor="middle" className="sys-node-title">Paroisse Saint-Pierre</text>
            <text x="755" y="426" textAnchor="middle" className="sys-node-sub">catéchèse, messes, chœur d'école</text>
          </g>
        </svg>
      </div>

      {/* Short mobile summary below diagram for comfortable reading on small screens */}
      <div className="sys-mobile-list">
        <p>
          <strong>Tutelle et employeurs :</strong> l'État encadre les programmes, les enseignants et les AESH ; la
          tutelle diocésaine confie sa mission à la cheffe d'établissement ; l'OGEC emploie les ASEM.
        </p>
        <p>
          <strong>Travail au quotidien :</strong> la cheffe d'établissement, les enseignants, les AESH et les ASEM
          collaborent autour des 220 élèves (avec des réunions d'équipe et des ESS), en lien avec les familles, le
          collège Saint-Pierre et la paroisse.
        </p>
        <p>
          <strong>Financement et lieux :</strong> la commune de Pordic participe au fonctionnement et met à disposition
          la cantine, le périscolaire, le complexe sportif, la médiathèque et La Ville Robert ; l'APEL finance les
          sorties et du matériel.
        </p>
      </div>

      <footer className="sys-footer">
        <button type="button" className="step-nav-btn" onClick={onPrev}>
          <ChevronUp size={15} /> Précédent
        </button>
        <button type="button" className="step-nav-btn primary" onClick={onNext}>
          Suivant <ChevronDown size={15} />
        </button>
      </footer>
    </div>
  );
};
