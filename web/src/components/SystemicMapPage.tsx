import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface SystemicMapPageProps {
  stepNumber: number;
  totalSteps: number;
  onPrev: () => void;
  onNext: () => void;
}

type RelationKind = 'hierarchy' | 'collab' | 'gestion' | 'partner';

interface SysNode {
  id: string;
  label: string;
  sub: string;
  x: number;
  y: number;
  w: number;
  h: number;
  zone: 'tutelle' | 'interne' | 'externe';
  emphasis?: 'center' | 'pilot';
  summary: string;
}

interface SysEdge {
  from: string;
  to: string;
  kind: RelationKind;
  label: string;
  bidirectional?: boolean;
  curve?: number;
}

const RELATION_META: Record<
  RelationKind,
  { label: string; short: string; color: string; dash?: string }
> = {
  hierarchy: {
    label: 'Lien hiérarchique, tutelle et employeur',
    short: 'Hiérarchie et tutelle',
    color: '#0f172a',
  },
  collab: {
    label: 'Collaboration pédagogique et éducative',
    short: 'Collaborations',
    color: '#2563eb',
  },
  gestion: {
    label: 'Gestion, budget et moyens matériels',
    short: 'Gestion et moyens',
    color: '#d97706',
    dash: '6 3',
  },
  partner: {
    label: 'Partenariat local et liaison',
    short: 'Partenariats locaux',
    color: '#16a34a',
    dash: '4 3',
  },
};

const NODES: SysNode[] = [
  // Band 1: Cadre institutionnel et tutelles
  {
    id: 'en',
    label: 'Éducation nationale',
    sub: 'DSDEN 22 · IEN · PIAL',
    x: 190,
    y: 52,
    w: 220,
    h: 50,
    zone: 'tutelle',
    summary:
      "Contrat d'association avec l'État : programmes officiels, inspection (IEN), rémunération des enseignants et affectation des AESH via le PIAL.",
  },
  {
    id: 'ddec',
    label: 'Tutelle diocésaine',
    sub: 'DDEC 22 · Enseignement catholique',
    x: 500,
    y: 52,
    w: 230,
    h: 50,
    zone: 'tutelle',
    summary:
      "Confie sa lettre de mission à la cheffe d'établissement et accompagne le projet éducatif de l'enseignement catholique.",
  },
  {
    id: 'commune',
    label: 'Commune de Pordic',
    sub: 'Collectivité territoriale',
    x: 810,
    y: 52,
    w: 220,
    h: 50,
    zone: 'tutelle',
    summary:
      "Verse le forfait communal à l'OGEC, gère la restauration scolaire et le périscolaire, et met à disposition ses équipements sportifs et culturels.",
  },

  // Band 2: Système interne de l'établissement
  {
    id: 'cheffe',
    label: "Cheffe d'établissement",
    sub: 'Direction · mi-temps CE2/CM1',
    x: 500,
    y: 158,
    w: 230,
    h: 52,
    zone: 'interne',
    emphasis: 'pilot',
    summary:
      "Pilote l'école sous la tutelle de la DDEC et en lien avec l'IEN, coordonne l'équipe enseignante, encadre les ASEM (lien OGEC) et dialogue avec les familles et partenaires.",
  },
  {
    id: 'enseignants',
    label: 'Professeurs des écoles',
    sub: '11 enseignants · 9 classes',
    x: 175,
    y: 214,
    w: 204,
    h: 50,
    zone: 'interne',
    summary:
      "Conduisent les apprentissages de la TPS au CM2 et les APC, collaborent avec les AESH et ASEM, siègent aux conseils de maîtres et de cycle, et assurent la liaison CM2-6e.",
  },
  {
    id: 'aesh',
    label: 'AESH (2)',
    sub: 'Accompagnement de 3 élèves',
    x: 175,
    y: 306,
    w: 204,
    h: 48,
    zone: 'interne',
    summary:
      "Affectées par l'Éducation nationale (PIAL / MDPH), elles collaborent au quotidien avec les enseignants en classe (CM2 et CE2 / CM1) pour favoriser l'autonomie des élèves.",
  },
  {
    id: 'eleves',
    label: 'Les élèves',
    sub: '220 élèves · Cycles 1, 2 et 3',
    x: 500,
    y: 254,
    w: 216,
    h: 54,
    zone: 'interne',
    emphasis: 'center',
    summary:
      "Au centre du système éducatif : répartis dans 9 classes (3 bâtiments par cycle), ils bénéficient de l'action coordonnée des équipes internes, des familles et des partenaires communaux.",
  },
  {
    id: 'instances',
    label: 'Instances internes',
    sub: "Conseil des maîtres · Cycles · Conseil d'étab. · ESS",
    x: 500,
    y: 342,
    w: 286,
    h: 46,
    zone: 'interne',
    summary:
      "Lieux officiels de concertation : conseil des maîtres, conseils de cycle, conseil d'établissement (avec APEL et OGEC) et équipes de suivi de scolarisation (ESS).",
  },
  {
    id: 'ogec',
    label: 'OGEC',
    sub: 'Budget · locaux · employeur',
    x: 825,
    y: 176,
    w: 204,
    h: 48,
    zone: 'interne',
    summary:
      "Association de gestion : administre le budget (dont le forfait communal), entretient les bâtiments et emploie les personnels non enseignants (ASEM).",
  },
  {
    id: 'asem',
    label: 'ASEM',
    sub: 'Maternelle · salariées OGEC',
    x: 825,
    y: 258,
    w: 204,
    h: 48,
    zone: 'interne',
    summary:
      "Salariées de l'OGEC, elles interviennent en binôme avec les enseignants de maternelle (TPS/PS/MS, PS/MS, GS) et accompagnent les élèves dans les gestes du quotidien.",
  },
  {
    id: 'apel',
    label: 'APEL',
    sub: "Parents bénévoles · projets",
    x: 825,
    y: 338,
    w: 204,
    h: 48,
    zone: 'interne',
    summary:
      "Représente les familles au conseil d'établissement et organise des actions (ex. vente de sapins) pour financer les sorties, spectacles et matériel pédagogique.",
  },

  // Band 3: Familles et partenaires locaux
  {
    id: 'familles',
    label: 'Familles',
    sub: 'Educartable · mails · rencontres',
    x: 108,
    y: 458,
    w: 178,
    h: 48,
    zone: 'externe',
    summary:
      "Partenaires éducatifs de premier plan : échanges réguliers avec les enseignants et la cheffe d'établissement, engagement bénévole au sein de l'APEL.",
  },
  {
    id: 'college',
    label: 'Collège Saint-Pierre',
    sub: 'Liaison CM2-6e · Plérin',
    x: 304,
    y: 458,
    w: 178,
    h: 48,
    zone: 'externe',
    summary:
      "Partenaire de cycle 3 : liaison école-collège pour préparer la continuité pédagogique et le passage des CM2 en 6e.",
  },
  {
    id: 'perisco',
    label: 'Cantine et périscolaire',
    sub: 'Service communal · midi / soir',
    x: 500,
    y: 458,
    w: 178,
    h: 48,
    zone: 'externe',
    summary:
      "Service municipal situé juste à côté de l'école : les animateurs assurent le relais quotidien dans les classes pour le repas, le goûter et la garderie.",
  },
  {
    id: 'equipements',
    label: 'Équipements municipaux',
    sub: 'Sport · Médiathèque · Ville Robert',
    x: 696,
    y: 458,
    w: 178,
    h: 48,
    zone: 'externe',
    summary:
      "Complexe sportif Louis Auffray (EPS), médiathèque de l'Ic (prêt d'albums et ressources) et centre culturel La Ville Robert (spectacles).",
  },
  {
    id: 'paroisse',
    label: 'Paroisse Saint-Pierre',
    sub: 'Catéchèse · messes · chœur',
    x: 892,
    y: 458,
    w: 178,
    h: 48,
    zone: 'externe',
    summary:
      "Lien pastoral local : 3 intervenants et le curé pour la catéchèse et les messes (élèves volontaires), ainsi que l'accueil du chœur d'école en fin d'année.",
  },
];

const EDGES: SysEdge[] = [
  // Hiérarchie, tutelle et employeur
  { from: 'en', to: 'enseignants', kind: 'hierarchy', label: 'Inspection (IEN) et rémunération État', curve: -18 },
  { from: 'en', to: 'aesh', kind: 'hierarchy', label: 'Affectation via PIAL / MDPH', curve: -58 },
  { from: 'en', to: 'cheffe', kind: 'hierarchy', label: "Contrat d'association avec l'État", curve: 10 },
  { from: 'ddec', to: 'cheffe', kind: 'hierarchy', label: 'Lettre de mission et tutelle', curve: 0 },
  { from: 'ogec', to: 'asem', kind: 'hierarchy', label: 'Employeur des personnels non enseignants', curve: 0 },
  { from: 'cheffe', to: 'asem', kind: 'hierarchy', label: 'Encadrement quotidien (délégation OGEC)', curve: -14 },

  // Collaborations pédagogiques et éducatives
  { from: 'cheffe', to: 'enseignants', kind: 'collab', label: 'Coordination pédagogique', bidirectional: true, curve: -10 },
  { from: 'enseignants', to: 'aesh', kind: 'collab', label: 'Coopération en classe', bidirectional: true, curve: 0 },
  { from: 'enseignants', to: 'eleves', kind: 'collab', label: 'Enseignement, suivi et APC', curve: -6 },
  { from: 'cheffe', to: 'eleves', kind: 'collab', label: 'Suivi et classe CE2 / CM1', curve: 0 },
  { from: 'aesh', to: 'eleves', kind: 'collab', label: 'Aide individualisée', curve: 14 },
  { from: 'asem', to: 'eleves', kind: 'collab', label: 'Accompagnement maternelle', curve: 0 },
  { from: 'enseignants', to: 'instances', kind: 'collab', label: 'Conseil des maîtres, cycles et ESS', bidirectional: true, curve: 26 },
  { from: 'cheffe', to: 'instances', kind: 'collab', label: 'Présidence et animation', bidirectional: true, curve: 42 },
  { from: 'familles', to: 'enseignants', kind: 'collab', label: 'Échanges Educartable et rencontres', bidirectional: true, curve: -36 },

  // Gestion, financement et moyens matériels
  { from: 'commune', to: 'ogec', kind: 'gestion', label: 'Forfait communal', curve: 14 },
  { from: 'ogec', to: 'cheffe', kind: 'gestion', label: 'Budget, locaux et direction opérationnelle', bidirectional: true, curve: -12 },
  { from: 'apel', to: 'ogec', kind: 'gestion', label: "Vie matérielle et conseil d'établissement", bidirectional: true, curve: 46 },
  { from: 'apel', to: 'instances', kind: 'gestion', label: "Représentation au conseil d'établissement", bidirectional: true, curve: 0 },
  { from: 'apel', to: 'eleves', kind: 'gestion', label: 'Financement sorties et matériel', curve: 16 },
  { from: 'familles', to: 'apel', kind: 'gestion', label: 'Adhésion et bénévolat', bidirectional: true, curve: 54 },

  // Partenariats locaux et liaison
  { from: 'commune', to: 'perisco', kind: 'partner', label: 'Gestion municipale', curve: -54 },
  { from: 'commune', to: 'equipements', kind: 'partner', label: 'Mise à disposition des lieux', curve: 62 },
  { from: 'enseignants', to: 'college', kind: 'partner', label: 'Liaison cycle 3 (CM2-6e)', bidirectional: true, curve: 22 },
  { from: 'perisco', to: 'eleves', kind: 'partner', label: 'Relais midi, goûter et garderie', bidirectional: true, curve: -18 },
  { from: 'equipements', to: 'eleves', kind: 'partner', label: 'EPS, médiathèque et spectacles', bidirectional: true, curve: 18 },
  { from: 'paroisse', to: 'eleves', kind: 'partner', label: 'Catéchèse, messes et chœur', bidirectional: true, curve: 32 },
];

function computeEdgePath(a: SysNode, b: SysNode, curve = 0): string {
  // Attach cleanly to the outer border of each node along the direction vector
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const clipBorder = (n: SysNode, vx: number, vy: number) => {
    const hw = n.w / 2 + 2;
    const hh = n.h / 2 + 2;
    const tx = Math.abs(vx) > 0.001 ? hw / Math.abs(vx) : 1e9;
    const ty = Math.abs(vy) > 0.001 ? hh / Math.abs(vy) : 1e9;
    const t = Math.min(tx, ty);
    return { x: n.x + vx * t, y: n.y + vy * t };
  };
  const p1 = clipBorder(a, dx, dy);
  const p2 = clipBorder(b, -dx, -dy);
  const mx = (p1.x + p2.x) * 0.5;
  const my = (p1.y + p2.y) * 0.5;
  const len = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
  const nx = -(p2.y - p1.y) / len;
  const ny = (p2.x - p1.x) / len;
  const cx = mx + nx * curve;
  const cy = my + ny * curve;
  return `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
}

export const SystemicMapPage: React.FC<SystemicMapPageProps> = ({
  stepNumber,
  totalSteps,
  onPrev,
  onNext,
}) => {
  const [activeLayer, setActiveLayer] = useState<'all' | RelationKind>('all');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const nodeMap = useMemo(() => new Map(NODES.map((n) => [n.id, n])), []);

  const relatedSet = useMemo(() => {
    if (!selectedNodeId) return null;
    const s = new Set<string>([selectedNodeId]);
    for (const e of EDGES) {
      if (activeLayer !== 'all' && e.kind !== activeLayer) continue;
      if (e.from === selectedNodeId) s.add(e.to);
      if (e.to === selectedNodeId) s.add(e.from);
    }
    return s;
  }, [selectedNodeId, activeLayer]);

  const selectedNode = selectedNodeId ? nodeMap.get(selectedNodeId) || null : null;

  const selectedLinks = useMemo(() => {
    if (!selectedNodeId) return [];
    return EDGES.filter(
      (e) =>
        (activeLayer === 'all' || e.kind === activeLayer) &&
        (e.from === selectedNodeId || e.to === selectedNodeId)
    ).map((e) => {
      const otherId = e.from === selectedNodeId ? e.to : e.from;
      const other = nodeMap.get(otherId);
      const dir = e.bidirectional ? '↔' : e.from === selectedNodeId ? '→' : '←';
      return { otherName: other?.label || otherId, dir, label: e.label, kind: e.kind };
    });
  }, [selectedNodeId, activeLayer, nodeMap]);

  return (
    <div className="sys-inner">
      <header className="sys-header">
        <div>
          <h2 className="sys-title">Cartographie systémique</h2>
          <p className="sys-subtitle">
            Acteurs, instances, tutelles et partenaires de l'école Sainte-Anne reliés en système
          </p>
        </div>
        <span className="col-step-badge sys-step-badge">
          {stepNumber} / {totalSteps}
        </span>
      </header>

      {/* Interactive Legend + Layer Filter */}
      <div className="sys-legend-bar" role="group" aria-label="Légende et filtre des relations">
        <button
          type="button"
          className={`sys-legend-btn ${activeLayer === 'all' ? 'active' : ''}`}
          onClick={() => setActiveLayer('all')}
        >
          Toutes les relations
        </button>
        {(Object.keys(RELATION_META) as RelationKind[]).map((kind) => {
          const meta = RELATION_META[kind];
          return (
            <button
              key={kind}
              type="button"
              className={`sys-legend-btn ${activeLayer === kind ? 'active' : ''}`}
              onClick={() => setActiveLayer(activeLayer === kind ? 'all' : kind)}
            >
              <span
                className={`sys-legend-line ${meta.dash ? 'is-dashed' : ''}`}
                style={{ borderColor: meta.color }}
                aria-hidden="true"
              />
              <span>{meta.short}</span>
            </button>
          );
        })}
      </div>

      {/* Crisp Editorial SVG Systemic Diagram */}
      <div className="sys-canvas-wrap">
        <svg
          className="sys-svg"
          viewBox="0 0 1000 508"
          role="img"
          aria-label="Schéma systémique de l'école Sainte-Anne de Pordic"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedNodeId(null);
          }}
        >
          <defs>
            {(Object.keys(RELATION_META) as RelationKind[]).map((kind) => (
              <React.Fragment key={kind}>
                <marker
                  id={`arrow-${kind}`}
                  viewBox="0 0 10 10"
                  refX="8.5"
                  refY="5"
                  markerWidth="5.5"
                  markerHeight="5.5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill={RELATION_META[kind].color} />
                </marker>
              </React.Fragment>
            ))}
          </defs>

          {/* 3 Structural Zones */}
          <rect x="12" y="10" width="976" height="84" rx="12" className="sys-zone-box sys-zone-outer" />
          <text x="26" y="25" className="sys-zone-label">
            CADRE INSTITUTIONNEL ET TUTELLES
          </text>

          <rect x="12" y="108" width="976" height="282" rx="14" className="sys-zone-box sys-zone-internal" />
          <text x="26" y="126" className="sys-zone-label sys-zone-label-strong">
            ÉTABLISSEMENT — SYSTÈME INTERNE (ÉCOLE SAINTE-ANNE)
          </text>

          <rect x="12" y="406" width="976" height="92" rx="12" className="sys-zone-box sys-zone-outer" />
          <text x="26" y="422" className="sys-zone-label">
            FAMILLES, LIAISON ET PARTENAIRES LOCAUX
          </text>

          {/* Edges */}
          {EDGES.map((edge, idx) => {
            const a = nodeMap.get(edge.from);
            const b = nodeMap.get(edge.to);
            if (!a || !b) return null;
            const meta = RELATION_META[edge.kind];
            const layerMatch = activeLayer === 'all' || activeLayer === edge.kind;
            const nodeMatch =
              !selectedNodeId || edge.from === selectedNodeId || edge.to === selectedNodeId;
            const highlighted = layerMatch && nodeMatch;
            const opacity = !layerMatch ? 0.06 : selectedNodeId ? (nodeMatch ? 0.92 : 0.08) : 0.56;
            const strokeW = highlighted && (selectedNodeId || activeLayer !== 'all') ? 2.1 : 1.45;
            const d = computeEdgePath(a, b, edge.curve || 0);
            return (
              <path
                key={idx}
                d={d}
                fill="none"
                stroke={meta.color}
                strokeWidth={strokeW}
                strokeDasharray={meta.dash}
                strokeOpacity={opacity}
                markerEnd={`url(#arrow-${edge.kind})`}
                markerStart={edge.bidirectional ? `url(#arrow-${edge.kind})` : undefined}
                className="sys-edge"
              />
            );
          })}

          {/* Nodes */}
          {NODES.map((node) => {
            const isSelected = selectedNodeId === node.id;
            const isDimmed = relatedSet !== null && !relatedSet.has(node.id);
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
                onClick={() => setSelectedNodeId(isSelected ? null : node.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedNodeId(isSelected ? null : node.id);
                  }
                }}
                aria-label={`${node.label} — ${node.sub}`}
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
                  {node.label}
                </text>
                <text x={node.x} y={node.y + 13} textAnchor="middle" className="sys-node-sub">
                  {node.sub}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Interactive Inspector Bar (shows exact links for clicked actor, or concise reading guide by default) */}
      <div className="sys-detail-bar">
        {selectedNode ? (
          <div className="sys-detail-content">
            <div className="sys-detail-head">
              <strong>{selectedNode.label}</strong>
              <span className="sys-detail-summary">{selectedNode.summary}</span>
            </div>
            <div className="sys-detail-links">
              {selectedLinks.map((lk, idx) => (
                <span className="sys-link-chip" key={idx}>
                  <span
                    className="sys-link-chip-dot"
                    style={{ background: RELATION_META[lk.kind].color }}
                  />
                  <strong>
                    {lk.dir} {lk.otherName}
                  </strong>{' '}
                  : {lk.label}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="sys-detail-hint">
            Cliquez sur un acteur, une instance ou un partenaire du schéma (ou filtrez par type de
            relation ci-dessus) pour isoler ses liens hiérarchiques, pédagogiques, financiers et
            territoriaux.
          </p>
        )}
      </div>

      {/* Mobile readable synthesis of the 4 systemic axes */}
      <div className="sys-mobile-list">
        {(Object.keys(RELATION_META) as RelationKind[]).map((kind) => {
          const meta = RELATION_META[kind];
          const edges = EDGES.filter((e) => e.kind === kind);
          return (
            <div className="sys-mobile-group" key={kind}>
              <h3 className="sys-mobile-group-title">
                <span className="sys-link-chip-dot" style={{ background: meta.color }} />
                {meta.label}
              </h3>
              <ul>
                {edges.map((e, i) => (
                  <li key={i}>
                    <strong>{nodeMap.get(e.from)?.label}</strong> {e.bidirectional ? '↔' : '→'}{' '}
                    <strong>{nodeMap.get(e.to)?.label}</strong> : {e.label}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
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
