import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface SystemicMapPageProps {
  stepNumber: number;
  totalSteps: number;
  onPrev: () => void;
  onNext: () => void;
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
    sub: 'programmes · salaires PE et AESH',
    x: 314,
    y: 42,
    w: 248,
    h: 48,
    note: "Fixe les programmes et paie les enseignants, les AESH et le mi-temps d'enseignement de la cheffe d'établissement.",
  },
  {
    id: 'ddec',
    title: 'Tutelle diocésaine',
    sub: 'enseignement catholique',
    x: 590,
    y: 42,
    w: 210,
    h: 48,
    note: "Confie sa mission à la cheffe d'établissement et accompagne l'école au sein de l'enseignement catholique.",
  },
  {
    id: 'commune',
    title: 'Commune de Pordic',
    sub: 'forfait communal · services municipaux',
    x: 922,
    y: 42,
    w: 240,
    h: 48,
    note: "Verse une participation financière à l'OGEC et gère les services et équipements utilisés par les élèves.",
  },

  // Ligne 2 : Familles, Direction, Gestion, Cantine
  {
    id: 'familles',
    title: 'Familles',
    sub: 'Educartable · mails · rencontres',
    x: 102,
    y: 148,
    w: 176,
    h: 50,
    note: "Échangent régulièrement avec les enseignants et la cheffe d'établissement, et peuvent participer à l'APEL.",
  },
  {
    id: 'cheffe',
    title: "Cheffe d'établissement",
    sub: 'direction (OGEC) · CE2-CM1 (État)',
    x: 556,
    y: 148,
    w: 230,
    h: 50,
    emphasis: 'pilot',
    note: "Enseigne à mi-temps en CE2-CM1 (payée par l'État) et dirige l'école et l'OGEC (payée en partie par l'OGEC).",
  },
  {
    id: 'ogec',
    title: 'OGEC',
    sub: 'budget · locaux · employeur',
    x: 800,
    y: 148,
    w: 164,
    h: 50,
    note: "Gère le budget (avec l'aide de la commune), l'entretien des bâtiments et paie les ASEM ainsi que la part direction.",
  },
  {
    id: 'perisco',
    title: 'Cantine et périscolaire',
    sub: 'repas · garderie · animateurs',
    x: 1006,
    y: 148,
    w: 194,
    h: 50,
    note: "Gérés par la commune juste à côté de l'école : les animateurs viennent chercher les élèves dans les classes.",
  },

  // Ligne 3 : APEL, Équipes en classe, Équipements
  {
    id: 'apel',
    title: 'APEL',
    sub: 'parents bénévoles · sorties, matériel',
    x: 102,
    y: 266,
    w: 176,
    h: 50,
    note: "Organise des ventes (comme les sapins de Noël) et des événements pour financer des sorties et du matériel.",
  },
  {
    id: 'enseignants',
    title: 'Enseignants (11)',
    sub: "9 classes · payés par l'État",
    x: 294,
    y: 266,
    w: 172,
    h: 50,
    note: "11 enseignants payés par l'État qui assurent les cours de la TPS au CM2 et les activités pédagogiques complémentaires.",
  },
  {
    id: 'aesh',
    title: 'AESH (2)',
    sub: "3 élèves · payées par l'État",
    x: 492,
    y: 266,
    w: 172,
    h: 50,
    note: "2 AESH payées par l'État qui aident 3 élèves en classe (CM2 et CE2-CM1) avec les enseignants.",
  },
  {
    id: 'asem',
    title: 'ASEM',
    sub: 'maternelle · salariées OGEC',
    x: 800,
    y: 266,
    w: 164,
    h: 50,
    note: "Salariées de l'OGEC, elles travaillent avec les enseignants en maternelle (TPS/PS/MS, PS/MS et GS).",
  },
  {
    id: 'equipements',
    title: 'Équipements municipaux',
    sub: 'sport · médiathèque · Ville Robert',
    x: 1006,
    y: 266,
    w: 194,
    h: 50,
    note: "Mis à disposition par la commune pour le sport, le prêt de livres et les spectacles.",
  },

  // Ligne 4 : Les élèves (au cœur, bien dégagés)
  {
    id: 'eleves',
    title: 'Les élèves',
    sub: '220 élèves · 9 classes · TPS au CM2',
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
    sub: 'Plérin · suite après le CM2',
    x: 168,
    y: 468,
    w: 204,
    h: 48,
    note: "Collège en lien avec l'école pour préparer le passage des CM2 en 6e.",
  },
  {
    id: 'instances',
    title: "Instances de l'école",
    sub: "conseil des maîtres · cycles · conseil d'établissement · ESS",
    x: 560,
    y: 468,
    w: 396,
    h: 48,
    note: "Réunions qui permettent de décider de l'organisation de l'année et de suivre la scolarité des élèves.",
  },
  {
    id: 'paroisse',
    title: 'Paroisse Saint-Pierre',
    sub: "catéchèse · messes · chœur d'école",
    x: 944,
    y: 468,
    w: 216,
    h: 48,
    note: "3 intervenants et le curé pour la catéchèse et les messes (volontaires), et accueil du chœur d'école en fin d'année.",
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
    label: { text: 'employeur', x: 414, y: 204, anchor: 'end' },
  },
  {
    from: 'etat',
    to: 'cheffe',
    kind: 'tutelle',
    d: 'M 436 62 L 494 123',
    label: { text: "contrat d'État", x: 478, y: 88, anchor: 'start' },
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
    label: { text: 'direction', x: 694, y: 138, anchor: 'middle' },
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
    label: { text: 'forfait communal', x: 822, y: 90, anchor: 'end' },
  },
  {
    from: 'apel',
    to: 'eleves',
    kind: 'moyens',
    d: 'M 190 278 L 432 366',
    label: { text: 'sorties et matériel', x: 300, y: 332, anchor: 'middle' },
  },
  {
    from: 'equipements',
    to: 'eleves',
    kind: 'moyens',
    d: 'M 966 291 L 966 374 L 688 374',
    label: { text: 'prêt / accès', x: 836, y: 365, anchor: 'middle' },
  },

  // Collaboration (bleu)
  {
    from: 'familles',
    to: 'enseignants',
    kind: 'lien',
    d: 'M 190 164 L 246 241',
    bidirectional: true,
    label: { text: 'suivi', x: 204, y: 210, anchor: 'end' },
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
    label: { text: 'CE2-CM1', x: 642, y: 266, anchor: 'start' },
  },
  {
    from: 'enseignants',
    to: 'eleves',
    kind: 'lien',
    d: 'M 342 291 L 458 348',
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
    d: 'M 758 291 L 670 348',
  },
  {
    from: 'perisco',
    to: 'eleves',
    kind: 'lien',
    d: 'M 909 164 L 896 164 L 896 332 L 688 356',
    bidirectional: true,
    label: { text: 'midi / soir', x: 878, y: 325, anchor: 'end' },
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
    label: { text: 'lien CM2-6e', x: 324, y: 416, anchor: 'middle' },
  },
  {
    from: 'paroisse',
    to: 'eleves',
    kind: 'lien',
    d: 'M 886 444 L 684 398',
    bidirectional: true,
    label: { text: 'paroisse', x: 794, y: 416, anchor: 'middle' },
  },
];

const KIND_COLOR: Record<LinkKind, string> = {
  tutelle: '#0f172a',
  lien: '#2563eb',
  moyens: '#16a34a',
};

export const SystemicMapPage: React.FC<SystemicMapPageProps> = ({
  stepNumber,
  totalSteps,
  onPrev,
  onNext,
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
          <span className="sys-legend-line" style={{ borderColor: '#0f172a' }} aria-hidden="true" />
          Hiérarchie / employeur
        </span>
        <span className="sys-legend-item">
          <span className="sys-legend-line" style={{ borderColor: '#2563eb' }} aria-hidden="true" />
          Collaboration
        </span>
        <span className="sys-legend-item">
          <span className="sys-legend-line is-dashed" style={{ borderColor: '#16a34a' }} aria-hidden="true" />
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
            <marker id="arr-tutelle" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse">
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#0f172a" />
            </marker>
            <marker id="arr-lien" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse">
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#2563eb" />
            </marker>
            <marker id="arr-moyens" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse">
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#16a34a" />
            </marker>
          </defs>

          {/* Links */}
          {LINKS.map((lk, idx) => {
            const isRelated = !activeId || lk.from === activeId || lk.to === activeId;
            const opacity = activeId ? (isRelated ? 0.96 : 0.14) : 0.78;
            const sw = activeId && isRelated ? 2.2 : 1.6;
            return (
              <g key={idx} className="sys-link-group" style={{ opacity }}>
                <path
                  d={lk.d}
                  fill="none"
                  stroke={KIND_COLOR[lk.kind]}
                  strokeWidth={sw}
                  strokeDasharray={lk.kind === 'moyens' ? '5 3' : undefined}
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
                  rx="9"
                  className="sys-node-rect"
                />
                <text x={node.x} y={node.y - 4} textAnchor="middle" className="sys-node-title">
                  {node.title}
                </text>
                <text x={node.x} y={node.y + 13} textAnchor="middle" className="sys-node-sub">
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
            L'État paie les enseignants et les AESH, tandis que l'OGEC gère le budget, les bâtiments et paie les ASEM.
            La cheffe d'établissement enseigne à mi-temps (payée par l'État) et dirige l'école et l'OGEC (payée en
            partie par l'OGEC). À côté, la commune de Pordic aide à financer l'école et met à disposition la cantine,
            le périscolaire, le complexe sportif, la médiathèque et La Ville Robert.
          </p>
        )}
      </div>

      {/* Mobile concise reading version */}
      <div className="sys-mobile-list">
        <p>
          L'État paie les enseignants et les AESH, tandis que l'OGEC gère le budget, les bâtiments et paie les ASEM.
        </p>
        <p>
          La cheffe d'établissement enseigne à mi-temps (payée par l'État) et dirige l'école et l'OGEC (payée en
          partie par l'OGEC).
        </p>
        <p>
          À côté, la commune de Pordic aide à financer l'école et met à disposition la cantine, le périscolaire, le
          complexe sportif, la médiathèque et La Ville Robert.
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
