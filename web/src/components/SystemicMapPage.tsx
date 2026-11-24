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
  // En haut : tutelles
  {
    id: 'etat',
    title: 'État (Éducation nationale)',
    sub: 'programmes · salaires PE et AESH',
    x: 370,
    y: 44,
    w: 230,
    h: 48,
    note: "Contrat avec l'État : fixe les programmes, rémunère les enseignants, les AESH et la part d'enseignement de la cheffe d'établissement.",
  },
  {
    id: 'ddec',
    title: 'Tutelle diocésaine',
    sub: 'enseignement catholique',
    x: 670,
    y: 44,
    w: 220,
    h: 48,
    note: "Confie sa mission à la cheffe d'établissement et accompagne le caractère propre de l'école catholique.",
  },

  // À gauche : familles, APEL, collège
  {
    id: 'familles',
    title: 'Familles',
    sub: 'Educartable · mails · rencontres',
    x: 104,
    y: 224,
    w: 180,
    h: 50,
    note: "Échangent régulièrement avec les enseignants et la cheffe d'établissement, et peuvent s'investir bénévolement dans l'APEL.",
  },
  {
    id: 'apel',
    title: 'APEL',
    sub: 'parents bénévoles · sorties, matériel',
    x: 104,
    y: 314,
    w: 180,
    h: 50,
    note: "Association de parents d'élèves : organise des ventes et événements pour financer des sorties, activités et du matériel pour l'école.",
  },
  {
    id: 'college',
    title: 'Collège Saint-Pierre',
    sub: 'Plérin · suite après le CM2',
    x: 104,
    y: 468,
    w: 180,
    h: 50,
    note: "Établissement de secteur en lien avec l'école pour préparer l'entrée en 6e des élèves de CM2.",
  },

  // Au centre : dans l'école Sainte-Anne
  {
    id: 'cheffe',
    title: "Cheffe d'établissement",
    sub: 'direction (OGEC) · CE2-CM1 (État)',
    x: 520,
    y: 150,
    w: 232,
    h: 50,
    emphasis: 'pilot',
    note: "Enseigne à mi-temps en CE2-CM1 (payée par l'État) et assure la direction de l'école et de l'OGEC (payée en partie par l'OGEC).",
  },
  {
    id: 'enseignants',
    title: 'Enseignants (11)',
    sub: "9 classes · payés par l'État",
    x: 328,
    y: 236,
    w: 186,
    h: 50,
    note: "11 enseignants (dont 4 à mi-temps) rémunérés par l'État. Ils assurent les cours de la TPS au CM2 et les activités pédagogiques complémentaires.",
  },
  {
    id: 'aesh',
    title: 'AESH (2)',
    sub: "3 élèves · payées par l'État",
    x: 328,
    y: 314,
    w: 186,
    h: 48,
    note: "2 AESH rémunérées par l'État : travaillent en classe avec les enseignants (CM2 et CE2-CM1) auprès de 3 élèves ayant besoin d'un accompagnement.",
  },
  {
    id: 'eleves',
    title: 'Les élèves',
    sub: '220 élèves · TPS au CM2',
    x: 520,
    y: 274,
    w: 138,
    h: 56,
    emphasis: 'center',
    note: "220 élèves répartis en 9 classes sur 3 bâtiments (cycles 1, 2 et 3), au centre de toute l'organisation.",
  },
  {
    id: 'ogec',
    title: 'OGEC',
    sub: 'budget · locaux · employeur',
    x: 712,
    y: 236,
    w: 186,
    h: 50,
    note: "Association de gestion : reçoit le forfait communal de Pordic, gère le budget et les bâtiments, et salarie les ASEM et la part direction.",
  },
  {
    id: 'asem',
    title: 'ASEM',
    sub: "maternelle · salariées OGEC",
    x: 712,
    y: 314,
    w: 186,
    h: 48,
    note: "Salariées de l'OGEC, elles travaillent en binôme avec les enseignants dans les classes de maternelle (TPS/PS/MS, PS/MS, GS).",
  },
  {
    id: 'instances',
    title: "Instances de l'école",
    sub: "conseil des maîtres · cycles · conseil d'établissement · ESS",
    x: 520,
    y: 386,
    w: 440,
    h: 44,
    note: "Réunions officielles où se coordonnent la cheffe d'établissement, les enseignants, les familles, l'APEL, l'OGEC et les partenaires selon les sujets.",
  },

  // À droite : Commune de Pordic (une seule fois !) et ses services
  {
    id: 'commune',
    title: 'Commune de Pordic',
    sub: 'forfait communal · services municipaux',
    x: 984,
    y: 150,
    w: 232,
    h: 50,
    note: "Finance le fonctionnement matériel via le forfait communal versé à l'OGEC et gère les services et équipements utilisés par les élèves.",
  },
  {
    id: 'perisco',
    title: 'Cantine et périscolaire',
    sub: 'repas · garderie · animateurs',
    x: 984,
    y: 254,
    w: 232,
    h: 50,
    note: "Gérés par la commune de Pordic juste à côté de l'école : les animateurs viennent chercher les élèves directement dans les classes.",
  },
  {
    id: 'equipements',
    title: 'Équipements municipaux',
    sub: 'complexe sportif · médiathèque · Ville Robert',
    x: 984,
    y: 356,
    w: 232,
    h: 50,
    note: "Mis à disposition par la commune de Pordic pour les séances de sport, le prêt de livres et les spectacles.",
  },

  // En bas : Paroisse
  {
    id: 'paroisse',
    title: 'Paroisse Saint-Pierre',
    sub: "catéchèse · messes · chœur d'école",
    x: 712,
    y: 468,
    w: 216,
    h: 50,
    note: "3 intervenants et le curé pour la catéchèse et les messes (élèves volontaires) ; l'église accueille aussi le chœur d'école en fin d'année.",
  },
];

const LINKS: MapLink[] = [
  // Tutelles / employeurs (noir)
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
    d: 'M 272 68 L 272 114 L 228 114 L 228 314 L 235 314',
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

  // Financement / moyens (vert pointillé)
  {
    from: 'commune',
    to: 'ogec',
    kind: 'moyens',
    d: 'M 868 158 L 776 211',
    label: { text: 'forfait communal', x: 842, y: 170, anchor: 'end' },
  },
  {
    from: 'apel',
    to: 'instances',
    kind: 'moyens',
    d: 'M 194 328 L 298 386',
    label: { text: 'sorties et matériel', x: 224, y: 374, anchor: 'end' },
  },
  {
    from: 'equipements',
    to: 'eleves',
    kind: 'moyens',
    d: 'M 868 356 L 824 356',
    label: { text: 'prêt / accès', x: 846, y: 348, anchor: 'middle' },
  },

  // Liens pédagogiques et du quotidien (bleu)
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
    d: 'M 421 248 L 451 264',
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
    d: 'M 421 306 L 451 288',
  },
  {
    from: 'asem',
    to: 'eleves',
    kind: 'lien',
    d: 'M 619 306 L 589 288',
  },
  {
    from: 'eleves',
    to: 'instances',
    kind: 'lien',
    d: 'M 520 302 L 520 364',
    bidirectional: true,
  },
  {
    from: 'familles',
    to: 'enseignants',
    kind: 'lien',
    d: 'M 194 226 L 235 234',
    bidirectional: true,
  },
  {
    from: 'familles',
    to: 'apel',
    kind: 'lien',
    d: 'M 104 249 L 104 289',
    bidirectional: true,
  },
  {
    from: 'perisco',
    to: 'eleves',
    kind: 'lien',
    d: 'M 868 254 L 824 254',
    bidirectional: true,
    label: { text: 'midi / soir', x: 846, y: 246, anchor: 'middle' },
  },
  {
    from: 'college',
    to: 'eleves',
    kind: 'lien',
    d: 'M 194 468 L 328 468 L 328 424',
    bidirectional: true,
    label: { text: 'lien CM2-6e', x: 262, y: 460, anchor: 'middle' },
  },
  {
    from: 'paroisse',
    to: 'eleves',
    kind: 'lien',
    d: 'M 712 443 L 712 424',
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

      <div className="sys-top-row">
        <div className="sys-legend-bar" aria-label="Légende du schéma">
          <span className="sys-legend-item">
            <span className="sys-legend-line" style={{ borderColor: '#0f172a' }} aria-hidden="true" />
            Tutelle / employeur / gestionnaire
          </span>
          <span className="sys-legend-item">
            <span className="sys-legend-line" style={{ borderColor: '#2563eb' }} aria-hidden="true" />
            Collaboration et suivi
          </span>
          <span className="sys-legend-item">
            <span className="sys-legend-line is-dashed" style={{ borderColor: '#16a34a' }} aria-hidden="true" />
            Financement et mise à disposition
          </span>
        </div>
        <span className="sys-hint-inline">Survolez ou cliquez un bloc pour le mettre en évidence</span>
      </div>

      <div className="sys-canvas-wrap">
        <svg
          className="sys-svg"
          viewBox="0 0 1140 508"
          role="img"
          aria-label="Cartographie des liens entre l'école Sainte-Anne, ses tutelles et ses partenaires"
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

          {/* Central school frame */}
          <rect x="218" y="104" width="604" height="318" rx="14" className="sys-zone-internal" />
          <text x="234" y="122" className="sys-zone-label">
            ÉCOLE SAINTE-ANNE
          </text>

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

      {/* Single quiet line showing the note of the hovered/clicked box */}
      <div className="sys-note-bar">
        {activeNode ? (
          <p className="sys-note-text">
            <strong>{activeNode.title} :</strong> {activeNode.note}
          </p>
        ) : (
          <p className="sys-note-placeholder">
            L'État salarie les enseignants et les AESH ; l'OGEC gère le budget, les locaux et salarie les ASEM ; la
            cheffe d'établissement fait le lien entre l'équipe, l'OGEC, les familles, la tutelle et la commune de
            Pordic.
          </p>
        )}
      </div>

      {/* Mobile concise reading version */}
      <div className="sys-mobile-list">
        <p>
          <strong>État et tutelle :</strong> l'État fixe les programmes et rémunère les enseignants, les AESH et la
          part d'enseignement de la cheffe d'établissement. La tutelle diocésaine confie sa mission à la cheffe
          d'établissement.
        </p>
        <p>
          <strong>OGEC et personnel non enseignant :</strong> l'OGEC reçoit le forfait communal de Pordic, gère le
          budget et les bâtiments, et salarie les ASEM ainsi que la part direction de la cheffe d'établissement.
        </p>
        <p>
          <strong>Commune de Pordic et partenaires :</strong> la commune gère la cantine, le périscolaire et met à
          disposition le complexe sportif, la médiathèque et La Ville Robert. L'école est aussi en lien avec les
          familles, l'APEL, le collège Saint-Pierre et la paroisse.
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
