import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface SystemicMapPageProps {
  stepNumber: number;
  totalSteps: number;
  onPrev: () => void;
  onNext: () => void;
  stepDots?: React.ReactNode;
}

type LinkKind = 'tutelle' | 'lien' | 'moyens';

interface MapNode {
  id: string;
  title: string;
  sub: string;
  x: number;
  y: number;
  w: number;
  h: number;
  emphasis?: 'center' | 'pilot';
  note: string;
}

interface MapLink {
  from: string;
  to: string;
  kind: LinkKind;
  d: string;
  bidirectional?: boolean;
  label?: { text: string; x: number; y: number; anchor?: 'start' | 'middle' | 'end' };
}

const NODES: MapNode[] = [
  // Ligne 1 : Tutelles et Commune
  {
    id: 'etat',
    title: 'État (Éducation nationale)',
    sub: 'Programmes, salaires des PE et AESH',
    x: 314,
    y: 42,
    w: 248,
    h: 48,
    note: "Fixe les programmes et rémunère les enseignants, les AESH ainsi que la part d'enseignement de la cheffe d'établissement.",
  },
  {
    id: 'ddec',
    title: 'Tutelle diocésaine',
    sub: 'Enseignement catholique',
    x: 590,
    y: 42,
    w: 210,
    h: 48,
    note: "Confie sa mission à la cheffe d'établissement et suit l'école dans l'enseignement catholique.",
  },
  {
    id: 'commune',
    title: 'Commune de Pordic',
    sub: 'Forfait communal et services municipaux',
    x: 922,
    y: 42,
    w: 240,
    h: 48,
    note: "Participe au financement de l'école grâce au forfait communal et met à disposition des services et équipements municipaux.",
  },

  // Ligne 2 : Familles, Direction, Gestion, Cantine
  {
    id: 'familles',
    title: 'Familles',
    sub: 'Educartable, mails, rencontres',
    x: 102,
    y: 148,
    w: 176,
    h: 50,
    note: "Échangent régulièrement avec les enseignants et la cheffe d'établissement (Educartable, mails, rendez-vous) et peuvent s'investir dans l'APEL.",
  },
  {
    id: 'cheffe',
    title: "Cheffe d'établissement",
    sub: 'Direction (OGEC) et mi-temps CE2-CM1',
    x: 556,
    y: 148,
    w: 230,
    h: 50,
    emphasis: 'pilot',
    note: "Enseigne à mi-temps en CE2-CM1 (payée par l'État) et assure la direction de l'école ainsi que de l'OGEC (payée en partie par l'OGEC).",
  },
  {
    id: 'ogec',
    title: 'OGEC',
    sub: 'Budget, locaux, employeur',
    x: 800,
    y: 148,
    w: 164,
    h: 50,
    note: "Gère le budget et l'entretien des locaux, rémunère les ASEM (qui en sont également membres) et finance la part direction de la cheffe d'établissement.",
  },
  {
    id: 'perisco',
    title: 'Cantine et périscolaire',
    sub: 'Repas, garderie et animateurs',
    x: 1006,
    y: 148,
    w: 194,
    h: 50,
    note: "Gérés par la commune juste à côté de l'école : les animateurs viennent chercher les élèves dans les classes pour le midi et la garderie.",
  },

  // Ligne 3 : APEL, Équipes en classe, Équipements
  {
    id: 'apel',
    title: 'APEL',
    sub: 'Parents, sorties et matériel',
    x: 102,
    y: 266,
    w: 176,
    h: 50,
    note: "Organise des événements et des ventes (comme les sapins de Noël) pour financer des sorties et du matériel pour les élèves.",
  },
  {
    id: 'enseignants',
    title: 'Enseignants (11)',
    sub: "9 classes, payés par l'État",
    x: 294,
    y: 266,
    w: 172,
    h: 50,
    note: "11 enseignants (dont 4 à mi-temps) rémunérés par l'État. Ils font classe de la TPS au CM2 et assurent les activités pédagogiques complémentaires.",
  },
  {
    id: 'aesh',
    title: 'AESH (2)',
    sub: "3 élèves, payées par l'État",
    x: 492,
    y: 266,
    w: 172,
    h: 50,
    note: "2 AESH rémunérées par l'État qui accompagnent 3 élèves en classe (CM2 et CE2-CM1) avec les enseignants.",
  },
  {
    id: 'asem',
    title: 'ASEM (maternelle)',
    sub: 'Salariées et membres OGEC',
    x: 800,
    y: 266,
    w: 164,
    h: 50,
    note: "Salariées et membres de l'OGEC, elles travaillent avec les enseignants en maternelle (TPS/PS/MS, PS/MS et GS) pour les gestes du quotidien et les activités.",
  },
  {
    id: 'equipements',
    title: 'Équipements municipaux',
    sub: 'Sport, médiathèque, Ville Robert',
    x: 1006,
    y: 266,
    w: 194,
    h: 50,
    note: "Mis à disposition par la commune de Pordic : le complexe sportif pour le sport, la médiathèque pour les livres et La Ville Robert pour les spectacles.",
  },

  // Ligne 4 : Les élèves (au cœur, bien dégagés)
  {
    id: 'eleves',
    title: 'Les élèves',
    sub: '220 élèves, 9 classes de la TPS au CM2',
    x: 560,
    y: 374,
    w: 256,
    h: 52,
    emphasis: 'center',
    note: "220 élèves répartis en 9 classes dans 3 bâtiments, de la toute petite section au CM2.",
  },

  // Ligne 5 : Collège, Instances, Paroisse
  {
    id: 'college',
    title: 'Collège Saint-Pierre',
    sub: 'Plérin, poursuite après le CM2',
    x: 168,
    y: 468,
    w: 204,
    h: 48,
    note: "Collège catholique de Plérin en lien avec l'école pour préparer l'entrée en 6e des élèves de CM2.",
  },
  {
    id: 'instances',
    title: "Instances de l'école",
    sub: "Conseil des maîtres, de cycle, d'établissement et ESS",
    x: 560,
    y: 468,
    w: 396,
    h: 48,
    note: "Les réunions de l'école où l'on prépare l'organisation de l'année et où l'on suit la scolarité des élèves.",
  },
  {
    id: 'paroisse',
    title: 'Paroisse Saint-Pierre',
    sub: "Catéchèse, messes et chœur d'école",
    x: 944,
    y: 468,
    w: 216,
    h: 48,
    note: "3 intervenants et le curé pour la catéchèse et les messes (pour les élèves volontaires), et l'église accueille aussi le chœur d'école en fin d'année.",
  },
];

const LINKS: MapLink[] = [
  // Hiérarchie / employeur (noir)
  {
    from: 'etat',
    to: 'enseignants',
    kind: 'tutelle',
    d: 'M 294 66 L 294 241',
    label: { text: 'employeur', x: 284, y: 152, anchor: 'end' },
  },
  {
    from: 'etat',
    to: 'aesh',
    kind: 'tutelle',
    d: 'M 424 66 L 424 241',
    label: { text: 'employeur', x: 414, y: 152, anchor: 'end' },
  },
  {
    from: 'etat',
    to: 'cheffe',
    kind: 'tutelle',
    d: 'M 436 62 L 494 123',
    label: { text: "contrat d'État", x: 472, y: 90, anchor: 'start' },
  },
  {
    from: 'ddec',
    to: 'cheffe',
    kind: 'tutelle',
    d: 'M 590 66 L 590 123',
    label: { text: 'tutelle', x: 600, y: 96, anchor: 'start' },
  },
  {
    from: 'ogec',
    to: 'cheffe',
    kind: 'tutelle',
    d: 'M 718 148 L 671 148',
    bidirectional: true,
    label: { text: 'direction', x: 694, y: 136, anchor: 'middle' },
  },
  {
    from: 'ogec',
    to: 'asem',
    kind: 'tutelle',
    d: 'M 800 173 L 800 241',
    label: { text: 'employeur', x: 810, y: 210, anchor: 'start' },
  },
  {
    from: 'commune',
    to: 'perisco',
    kind: 'tutelle',
    d: 'M 988 66 L 988 123',
    label: { text: 'gère', x: 998, y: 98, anchor: 'start' },
  },
  {
    from: 'commune',
    to: 'equipements',
    kind: 'tutelle',
    d: 'M 1042 42 L 1114 42 L 1114 266 L 1103 266',
  },

  // Financement et locaux (vert pointillé)
  {
    from: 'commune',
    to: 'ogec',
    kind: 'moyens',
    d: 'M 866 66 L 802 123',
    label: { text: 'forfait communal', x: 826, y: 92, anchor: 'end' },
  },
  {
    from: 'apel',
    to: 'eleves',
    kind: 'moyens',
    d: 'M 142 291 L 142 374 L 432 374',
    label: { text: 'sorties et matériel', x: 276, y: 364, anchor: 'middle' },
  },
  {
    from: 'equipements',
    to: 'eleves',
    kind: 'moyens',
    d: 'M 966 291 L 966 374 L 688 374',
    label: { text: 'mise à disposition', x: 848, y: 364, anchor: 'middle' },
  },

  // Collaboration (bleu)
  {
    from: 'familles',
    to: 'enseignants',
    kind: 'lien',
    d: 'M 190 164 L 246 241',
    bidirectional: true,
    label: { text: 'échanges', x: 204, y: 208, anchor: 'end' },
  },
  {
    from: 'familles',
    to: 'apel',
    kind: 'lien',
    d: 'M 102 173 L 102 241',
    bidirectional: true,
  },
  {
    from: 'cheffe',
    to: 'enseignants',
    kind: 'lien',
    d: 'M 476 173 L 352 241',
    bidirectional: true,
    label: { text: 'coordination', x: 392, y: 212, anchor: 'end' },
  },
  {
    from: 'cheffe',
    to: 'aesh',
    kind: 'lien',
    d: 'M 516 173 L 516 241',
    bidirectional: true,
  },
  {
    from: 'enseignants',
    to: 'aesh',
    kind: 'lien',
    d: 'M 380 266 L 406 266',
    bidirectional: true,
  },
  {
    from: 'cheffe',
    to: 'eleves',
    kind: 'lien',
    d: 'M 632 173 L 632 348',
    label: { text: 'CE2-CM1', x: 641, y: 266, anchor: 'start' },
  },
  {
    from: 'enseignants',
    to: 'eleves',
    kind: 'lien',
    d: 'M 316 291 L 450 348',
  },
  {
    from: 'aesh',
    to: 'eleves',
    kind: 'lien',
    d: 'M 514 291 L 526 348',
  },
  {
    from: 'asem',
    to: 'eleves',
    kind: 'lien',
    d: 'M 786 291 L 674 348',
  },
  {
    from: 'enseignants',
    to: 'asem',
    kind: 'lien',
    d: 'M 368 291 L 368 312 L 736 312 L 736 291',
    bidirectional: true,
    label: { text: 'maternelle', x: 575, y: 305, anchor: 'middle' },
  },
  {
    from: 'perisco',
    to: 'eleves',
    kind: 'lien',
    d: 'M 909 164 L 896 164 L 896 332 L 688 356',
    bidirectional: true,
    label: { text: 'midi et soir', x: 882, y: 322, anchor: 'end' },
  },
  {
    from: 'eleves',
    to: 'instances',
    kind: 'lien',
    d: 'M 560 400 L 560 444',
    bidirectional: true,
  },
  {
    from: 'college',
    to: 'eleves',
    kind: 'lien',
    d: 'M 230 444 L 438 398',
    bidirectional: true,
    label: { text: 'lien CM2-6e', x: 312, y: 408, anchor: 'middle' },
  },
  {
    from: 'paroisse',
    to: 'eleves',
    kind: 'lien',
    d: 'M 886 444 L 684 398',
    bidirectional: true,
    label: { text: 'lien paroissial', x: 814, y: 408, anchor: 'middle' },
  },
];

const KIND_COLOR: Record<LinkKind, string> = {
  tutelle: '#2d3748',
  lien: '#345b8d',
  moyens: '#3b7256',
};

export const SystemicMapPage: React.FC<SystemicMapPageProps> = ({
  stepNumber,
  totalSteps,
  onPrev,
  onNext,
  stepDots,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  const nodeById = useMemo(() => new Map(NODES.map((n) => [n.id, n])), []);

  const connectedNodes = useMemo(() => {
    if (!activeId) return null;
    const set = new Set<string>([activeId]);
    for (const l of LINKS) {
      if (l.from === activeId) set.add(l.to);
      if (l.to === activeId) set.add(l.from);
    }
    return set;
  }, [activeId]);

  const activeNode = activeId ? nodeById.get(activeId) || null : null;

  return (
    <div className="sys-inner">
      <header className="sys-header">
        <div>
          <h2 className="sys-title">L'organisation de l'école</h2>
          <p className="sys-subtitle">École Sainte-Anne de Pordic</p>
        </div>
        <span className="col-step-badge sys-step-badge">
          {stepNumber} / {totalSteps}
        </span>
      </header>

      <div className="sys-legend-bar" aria-label="Légende du schéma">
        <span className="sys-legend-item">
          <svg className="sys-legend-swatch" width="28" height="10" viewBox="0 0 28 10" aria-hidden="true">
            <line x1="1" y1="5" x2="22" y2="5" stroke={KIND_COLOR.tutelle} strokeWidth="1.6" strokeLinecap="round" />
            <path d="M 20 2.3 L 26.5 5 L 20 7.7 L 21.4 5 z" fill={KIND_COLOR.tutelle} />
          </svg>
          Hiérarchie / employeur
        </span>
        <span className="sys-legend-item">
          <svg className="sys-legend-swatch" width="28" height="10" viewBox="0 0 28 10" aria-hidden="true">
            <line x1="1" y1="5" x2="22" y2="5" stroke={KIND_COLOR.lien} strokeWidth="1.6" strokeLinecap="round" />
            <path d="M 20 2.3 L 26.5 5 L 20 7.7 L 21.4 5 z" fill={KIND_COLOR.lien} />
          </svg>
          Collaboration
        </span>
        <span className="sys-legend-item">
          <svg className="sys-legend-swatch" width="28" height="10" viewBox="0 0 28 10" aria-hidden="true">
            <line
              x1="1"
              y1="5"
              x2="22"
              y2="5"
              stroke={KIND_COLOR.moyens}
              strokeWidth="1.6"
              strokeDasharray="5 3.5"
              strokeLinecap="round"
            />
            <path d="M 20 2.3 L 26.5 5 L 20 7.7 L 21.4 5 z" fill={KIND_COLOR.moyens} />
          </svg>
          Financement et locaux
        </span>
      </div>

      <div className="sys-canvas-wrap">
        <svg
          className="sys-svg"
          viewBox="0 0 1128 504"
          role="img"
          aria-label="Schéma des relations entre l'école Sainte-Anne, ses tutelles et ses partenaires"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveId(null);
          }}
        >
          <defs>
            <marker id="arr-tutelle" viewBox="0 0 10 10" refX="8.2" refY="5" markerWidth="5.8" markerHeight="5.8" orient="auto-start-reverse">
              <path d="M 1 2 L 8.6 5 L 1 8 L 2.5 5 z" fill={KIND_COLOR.tutelle} />
            </marker>
            <marker id="arr-lien" viewBox="0 0 10 10" refX="8.2" refY="5" markerWidth="5.8" markerHeight="5.8" orient="auto-start-reverse">
              <path d="M 1 2 L 8.6 5 L 1 8 L 2.5 5 z" fill={KIND_COLOR.lien} />
            </marker>
            <marker id="arr-moyens" viewBox="0 0 10 10" refX="8.2" refY="5" markerWidth="5.8" markerHeight="5.8" orient="auto-start-reverse">
              <path d="M 1 2 L 8.6 5 L 1 8 L 2.5 5 z" fill={KIND_COLOR.moyens} />
            </marker>
          </defs>

          {/* Links */}
          {LINKS.map((lk, idx) => {
            const isRelated = !activeId || lk.from === activeId || lk.to === activeId;
            const opacity = activeId ? (isRelated ? 0.96 : 0.14) : 0.88;
            const sw = activeId && isRelated ? 1.85 : 1.45;
            return (
              <g key={idx} className="sys-link-group" style={{ opacity }}>
                {((lk.from === 'cheffe' && lk.to === 'enseignants') ||
                  (lk.from === 'enseignants' && lk.to === 'asem')) && (
                  <path d={lk.d} fill="none" stroke="#fcfcfd" strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round" />
                )}
                <path
                  d={lk.d}
                  fill="none"
                  stroke={KIND_COLOR[lk.kind]}
                  strokeWidth={sw}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={lk.kind === 'moyens' ? '6 4' : undefined}
                  markerEnd={`url(#arr-${lk.kind})`}
                  markerStart={lk.bidirectional ? `url(#arr-${lk.kind})` : undefined}
                />
                {lk.label && (
                  <text
                    x={lk.label.x}
                    y={lk.label.y}
                    textAnchor={lk.label.anchor || 'middle'}
                    className="sys-edge-label"
                  >
                    {lk.label.text}
                  </text>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {NODES.map((node) => {
            const isSelected = activeId === node.id;
            const isDimmed = connectedNodes !== null && !connectedNodes.has(node.id);
            const cls = [
              'sys-node',
              node.emphasis === 'center' ? 'sys-node-center' : '',
              node.emphasis === 'pilot' ? 'sys-node-pilot' : '',
              isSelected ? 'is-selected' : '',
              isDimmed ? 'is-dimmed' : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <g
                key={node.id}
                className={cls}
                onMouseEnter={() => setActiveId(node.id)}
                onMouseLeave={() => setActiveId(null)}
                onClick={() => setActiveId(isSelected ? null : node.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveId(isSelected ? null : node.id);
                  }
                }}
              >
                <rect
                  x={node.x - node.w / 2}
                  y={node.y - node.h / 2}
                  width={node.w}
                  height={node.h}
                  rx="8"
                  className="sys-node-rect"
                />
                <text x={node.x} y={node.y - 4.5} textAnchor="middle" className="sys-node-title">
                  {node.title}
                </text>
                <text x={node.x} y={node.y + 12.5} textAnchor="middle" className="sys-node-sub">
                  {node.sub}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="sys-note-bar">
        {activeNode ? (
          <p className="sys-note-text">
            <strong>{activeNode.title} :</strong> {activeNode.note}
          </p>
        ) : (
          <p className="sys-note-placeholder">
            L'État rémunère les enseignants et les AESH, tandis que l'OGEC gère le budget, les locaux et rémunère les
            ASEM (qui en sont également membres). La cheffe d'établissement enseigne à mi-temps en CE2-CM1 (payée par
            l'État) et dirige l'école ainsi que l'OGEC (payée en partie par l'OGEC). La commune de Pordic participe
            aussi au financement et met à disposition la cantine, le périscolaire, le complexe sportif, la médiathèque
            et La Ville Robert.
          </p>
        )}
      </div>

      {/* Mobile concise reading version */}
      <div className="sys-mobile-list">
        <p>
          L'État rémunère les enseignants et les AESH, tandis que l'OGEC gère le budget, les locaux et rémunère les
          ASEM (qui en sont également membres).
        </p>
        <p>
          La cheffe d'établissement enseigne à mi-temps en CE2-CM1 (payée par l'État) et dirige l'école ainsi que
          l'OGEC (payée en partie par l'OGEC).
        </p>
        <p>
          La commune de Pordic participe aussi au financement et met à disposition la cantine, le périscolaire, le
          complexe sportif, la médiathèque et La Ville Robert.
        </p>
      </div>

      <footer className="sys-footer">
        <button type="button" className="step-nav-btn" onClick={onPrev}>
          <ChevronUp size={15} /> Précédent
        </button>
        {stepDots}
        <button type="button" className="step-nav-btn primary" onClick={onNext}>
          Suivant <ChevronDown size={15} />
        </button>
      </footer>
    </div>
  );
};
