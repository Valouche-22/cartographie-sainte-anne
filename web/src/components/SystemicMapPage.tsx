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
  // Tutelles (haut)
  {
    id: 'etat',
    title: 'État (Éducation nationale)',
    sub: 'programmes · salaires PE et AESH',
    x: 370,
    y: 44,
    w: 232,
    h: 48,
    note: "Fixe les programmes et paie les enseignants, les AESH et le mi-temps d'enseignement de la cheffe d'établissement.",
  },
  {
    id: 'ddec',
    title: 'Tutelle diocésaine',
    sub: 'enseignement catholique',
    x: 670,
    y: 44,
    w: 220,
    h: 48,
    note: "Confie sa mission à la cheffe d'établissement et accompagne l'école au sein de l'enseignement catholique.",
  },

  // Familles et APEL (gauche)
  {
    id: 'familles',
    title: 'Familles',
    sub: 'Educartable · mails · rencontres',
    x: 104,
    y: 226,
    w: 180,
    h: 50,
    note: "Échangent régulièrement avec les enseignants et la cheffe d'établissement, et peuvent participer à l'APEL.",
  },
  {
    id: 'apel',
    title: 'APEL',
    sub: 'parents bénévoles · sorties, matériel',
    x: 104,
    y: 314,
    w: 180,
    h: 50,
    note: "Organise des ventes (comme les sapins de Noël) et des événements pour financer des sorties et du matériel.",
  },

  // Cœur de l'école (centre)
  {
    id: 'cheffe',
    title: "Cheffe d'établissement",
    sub: 'direction (OGEC) · CE2-CM1 (État)',
    x: 520,
    y: 150,
    w: 234,
    h: 50,
    emphasis: 'pilot',
    note: "Enseigne à mi-temps en CE2-CM1 (payée par l'État) et dirige l'école et l'OGEC (payée en partie par l'OGEC).",
  },
  {
    id: 'enseignants',
    title: 'Enseignants (11)',
    sub: "9 classes · payés par l'État",
    x: 328,
    y: 236,
    w: 186,
    h: 50,
    note: "11 enseignants payés par l'État qui assurent les cours de la TPS au CM2 et les activités pédagogiques complémentaires.",
  },
  {
    id: 'aesh',
    title: 'AESH (2)',
    sub: "3 élèves · payées par l'État",
    x: 328,
    y: 314,
    w: 186,
    h: 48,
    note: "2 AESH payées par l'État qui aident 3 élèves en classe (CM2 et CE2-CM1) avec les enseignants.",
  },
  {
    id: 'eleves',
    title: 'Les élèves',
    sub: '220 élèves · TPS au CM2',
    x: 520,
    y: 274,
    w: 140,
    h: 56,
    emphasis: 'center',
    note: "220 élèves répartis en 9 classes dans 3 bâtiments, de la toute petite section au CM2.",
  },
  {
    id: 'ogec',
    title: 'OGEC',
    sub: 'budget · locaux · employeur',
    x: 712,
    y: 236,
    w: 186,
    h: 50,
    note: "Gère le budget (avec l'aide de la commune), l'entretien des bâtiments et paie les ASEM ainsi que la part direction.",
  },
  {
    id: 'asem',
    title: 'ASEM',
    sub: 'maternelle · salariées OGEC',
    x: 712,
    y: 314,
    w: 186,
    h: 48,
    note: "Salariées de l'OGEC, elles travaillent avec les enseignants en maternelle (TPS/PS/MS, PS/MS et GS).",
  },
  {
    id: 'instances',
    title: "Instances de l'école",
    sub: "conseil des maîtres · cycles · conseil d'établissement · ESS",
    x: 520,
    y: 400,
    w: 344,
    h: 44,
    note: "Réunions qui permettent de décider de l'organisation de l'année et de suivre la scolarité des élèves.",
  },

  // Commune de Pordic (droite, une seule fois) et ses services
  {
    id: 'commune',
    title: 'Commune de Pordic',
    sub: 'forfait communal · services municipaux',
    x: 984,
    y: 150,
    w: 232,
    h: 50,
    note: "Verse une participation financière à l'OGEC et gère les services et équipements utilisés par les élèves.",
  },
  {
    id: 'perisco',
    title: 'Cantine et périscolaire',
    sub: 'repas · garderie · animateurs',
    x: 984,
    y: 254,
    w: 232,
    h: 50,
    note: "Gérés par la commune juste à côté de l'école : les animateurs viennent chercher les élèves dans les classes.",
  },
  {
    id: 'equipements',
    title: 'Équipements municipaux',
    sub: 'complexe sportif · médiathèque · Ville Robert',
    x: 984,
    y: 356,
    w: 232,
    h: 50,
    note: "Mis à disposition par la commune pour le sport, le prêt de livres et les spectacles.",
  },

  // Partenaires extérieurs (bas)
  {
    id: 'college',
    title: 'Collège Saint-Pierre',
    sub: 'Plérin · suite après le CM2',
    x: 270,
    y: 474,
    w: 204,
    h: 48,
    note: "Collège en lien avec l'école pour préparer le passage des CM2 en 6e.",
  },
  {
    id: 'paroisse',
    title: 'Paroisse Saint-Pierre',
    sub: "catéchèse · messes · chœur d'école",
    x: 754,
    y: 474,
    w: 216,
    h: 48,
    note: "3 intervenants et le curé pour la catéchèse et les messes (volontaires), et accueil du chœur d'école en fin d'année.",
  },
];

const LINKS: MapLink[] = [
  // Hiérarchie / employeur (noir)
  {
    from: 'etat',
    to: 'cheffe',
    kind: 'tutelle',
    d: 'M 420 68 L 478 125',
    label: { text: "contrat d'État", x: 422, y: 94, anchor: 'end' },
  },
  {
    from: 'etat',
    to: 'enseignants',
    kind: 'tutelle',
    d: 'M 328 68 L 328 211',
    label: { text: 'employeur', x: 320, y: 146, anchor: 'end' },
  },
  {
    from: 'etat',
    to: 'aesh',
    kind: 'tutelle',
    d: 'M 272 68 L 272 112 L 222 112 L 222 314 L 235 314',
  },
  {
    from: 'ddec',
    to: 'cheffe',
    kind: 'tutelle',
    d: 'M 620 68 L 562 125',
    label: { text: 'tutelle', x: 618, y: 94, anchor: 'start' },
  },
  {
    from: 'ogec',
    to: 'asem',
    kind: 'tutelle',
    d: 'M 712 261 L 712 290',
    label: { text: 'employeur', x: 720, y: 279, anchor: 'start' },
  },
  {
    from: 'ogec',
    to: 'cheffe',
    kind: 'tutelle',
    d: 'M 664 211 L 604 175',
    bidirectional: true,
    label: { text: 'direction OGEC', x: 646, y: 189, anchor: 'start' },
  },
  {
    from: 'commune',
    to: 'perisco',
    kind: 'tutelle',
    d: 'M 984 175 L 984 229',
    label: { text: 'gère', x: 992, y: 205, anchor: 'start' },
  },
  {
    from: 'commune',
    to: 'equipements',
    kind: 'tutelle',
    d: 'M 1100 150 L 1122 150 L 1122 356 L 1100 356',
  },

  // Financement et locaux (vert pointillé)
  {
    from: 'commune',
    to: 'ogec',
    kind: 'moyens',
    d: 'M 868 158 L 776 211',
    label: { text: 'forfait communal', x: 842, y: 170, anchor: 'end' },
  },
  {
    from: 'apel',
    to: 'eleves',
    kind: 'moyens',
    d: 'M 194 328 L 284 352 L 456 298',
    label: { text: 'sorties et matériel', x: 248, y: 360, anchor: 'middle' },
  },
  {
    from: 'equipements',
    to: 'eleves',
    kind: 'moyens',
    d: 'M 868 358 L 722 358 L 570 302',
    label: { text: 'prêt / accès', x: 822, y: 372, anchor: 'middle' },
  },

  // Collaboration (bleu)
  {
    from: 'cheffe',
    to: 'enseignants',
    kind: 'lien',
    d: 'M 442 175 L 382 211',
    bidirectional: true,
  },
  {
    from: 'cheffe',
    to: 'eleves',
    kind: 'lien',
    d: 'M 520 175 L 520 246',
  },
  {
    from: 'enseignants',
    to: 'eleves',
    kind: 'lien',
    d: 'M 421 248 L 450 264',
  },
  {
    from: 'enseignants',
    to: 'aesh',
    kind: 'lien',
    d: 'M 328 261 L 328 290',
    bidirectional: true,
  },
  {
    from: 'aesh',
    to: 'eleves',
    kind: 'lien',
    d: 'M 421 306 L 450 288',
  },
  {
    from: 'asem',
    to: 'eleves',
    kind: 'lien',
    d: 'M 619 306 L 590 288',
  },
  {
    from: 'eleves',
    to: 'instances',
    kind: 'lien',
    d: 'M 520 302 L 520 378',
    bidirectional: true,
  },
  {
    from: 'familles',
    to: 'enseignants',
    kind: 'lien',
    d: 'M 194 228 L 235 234',
    bidirectional: true,
  },
  {
    from: 'familles',
    to: 'apel',
    kind: 'lien',
    d: 'M 104 251 L 104 289',
    bidirectional: true,
  },
  {
    from: 'perisco',
    to: 'eleves',
    kind: 'lien',
    d: 'M 868 264 L 832 264 L 832 344 L 584 294',
    bidirectional: true,
    label: { text: 'midi / soir', x: 842, y: 256, anchor: 'middle' },
  },
  {
    from: 'college',
    to: 'eleves',
    kind: 'lien',
    d: 'M 332 450 L 332 366 L 474 302',
    bidirectional: true,
    label: { text: 'lien CM2-6e', x: 342, y: 432, anchor: 'start' },
  },
  {
    from: 'paroisse',
    to: 'eleves',
    kind: 'lien',
    d: 'M 708 450 L 708 374 L 556 302',
    bidirectional: true,
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
          viewBox="0 0 1140 512"
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
            const opacity = activeId ? (isRelated ? 0.95 : 0.14) : 0.78;
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
            Pour résumer simplement : l'État paie les enseignants et les AESH, tandis que l'OGEC gère le budget, les
            bâtiments et paie les ASEM. La cheffe d'établissement enseigne à mi-temps (payée par l'État) et dirige
            l'école et l'OGEC (payée en partie par l'OGEC). À côté, la commune de Pordic aide à financer l'école et
            met à disposition la cantine, le périscolaire, le complexe sportif, la médiathèque et La Ville Robert.
          </p>
        )}
      </div>

      {/* Mobile concise reading version */}
      <div className="sys-mobile-list">
        <p>
          Pour résumer simplement : l'État paie les enseignants et les AESH, tandis que l'OGEC gère le budget, les
          bâtiments et paie les ASEM.
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
