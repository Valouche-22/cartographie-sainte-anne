import React from 'react';
import { ArrowUp } from 'lucide-react';

interface CreditsPageProps {
  onBackHome: () => void;
}

const INSTITUTIONS = [
  { name: 'École Sainte-Anne', sub: 'Pordic', src: './logos/ecole-sainte-anne.png' },
  { name: 'ISFEC Bretagne', sub: 'Formation des enseignants', src: './logos/isfec-bretagne.jpg' },
  { name: 'Enseignement catholique', sub: 'Réseau national', src: './logos/enseignement-catholique.png' },
  { name: 'Ville de Pordic', sub: 'Commune', src: './logos/ville-de-pordic.jpg' },
];

const TOOLS = [
  { name: 'Blender', src: './logos/blender.svg' },
  { name: 'Python', src: './logos/python.svg' },
  { name: 'JavaScript', src: './logos/javascript.svg' },
  { name: 'Géoportail', src: './logos/geoportail.svg' },
  { name: 'OpenStreetMap', src: './logos/openstreetmap.svg' },
  { name: 'Google Earth', src: './logos/google-earth.svg' },
  { name: 'GitHub', src: './logos/github.svg' },
  { name: 'Google Antigravity', src: './logos/google-antigravity.svg' },
];

export const CreditsPage: React.FC<CreditsPageProps> = ({ onBackHome }) => {
  return (
    <div className="credits-inner">
      <header className="credits-header">
        <div>
          <h2 className="credits-title">Crédits &amp; Mentions légales</h2>
          <p className="credits-subtitle">Cartographie 3D — École Sainte-Anne de Pordic</p>
        </div>
        <button type="button" className="credits-home-btn" onClick={onBackHome}>
          <ArrowUp size={15} />
          <span>Retour à l'accueil</span>
        </button>
      </header>

      {/* Row 1: Institutions & partenaires */}
      <div className="credits-block">
        <h3 className="credits-section-label">Établissement &amp; institutions</h3>
        <div className="credits-institutions-grid">
          {INSTITUTIONS.map((inst) => (
            <div className="credits-inst-card" key={inst.name}>
              <div className="credits-inst-logo-wrap">
                <img src={inst.src} alt={inst.name} className="credits-inst-logo" loading="lazy" />
              </div>
              <span className="credits-inst-name">{inst.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Row 2: Outils & logiciels */}
      <div className="credits-block">
        <h3 className="credits-section-label">Outils &amp; logiciels utilisés</h3>
        <div className="credits-tools-grid">
          {TOOLS.map((tool) => (
            <div className="credits-tool-item" key={tool.name}>
              <div className="credits-tool-icon-wrap">
                <img src={tool.src} alt={tool.name} className="credits-tool-icon" loading="lazy" />
              </div>
              <span className="credits-tool-name">{tool.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Author, project context & legal notices */}
      <div className="credits-legal-grid">
        <div className="credits-legal-col">
          <h3 className="credits-section-label">À propos &amp; propriété intellectuelle</h3>
          <p className="credits-text">
            Ce site a été conçu et réalisé par <strong>Valentin Sonneville</strong> dans le cadre d'un projet
            universitaire visant à présenter l'école Sainte-Anne de Pordic, l'organisation de ses bâtiments et de ses
            salles de classe, ainsi que les structures communales et paroissiales qui l'entourent.
          </p>
          <p className="credits-text">
            L'ensemble des éléments présents sur ce site (maquette 3D, textes, mise en page et code source) est la{' '}
            <strong>stricte propriété de Valentin Sonneville et de ses ayants droit</strong>, à savoir{' '}
            <strong>l'ISFEC Bretagne</strong> et <strong>l'école Sainte-Anne de Pordic</strong>. Toute reproduction,
            diffusion ou réutilisation sans autorisation préalable est interdite.
          </p>
        </div>

        <div className="credits-legal-col">
          <h3 className="credits-section-label">Mentions légales</h3>
          <ul className="credits-legal-list">
            <li>
              <strong>Réalisation :</strong> Valentin Sonneville — projet pédagogique en lien avec l'ISFEC Bretagne et
              l'école Sainte-Anne (7 rue des Écoles, 22590 Pordic).
            </li>
            <li>
              <strong>Hébergement :</strong> GitHub Pages — GitHub, Inc., 88 Colin P Kelly Jr St, San Francisco, CA
              94107, États-Unis.
            </li>
            <li>
              <strong>Données cartographiques :</strong> emprises bâties et voiries issues de l'IGN (Géoportail / BD
              TOPO®, Licence Ouverte Etalab 2.0) et d'OpenStreetMap (© contributeurs OpenStreetMap, licence ODbL).
            </li>
            <li>
              <strong>Données personnelles &amp; cookies :</strong> ce site est purement informatif ; il ne collecte
              aucune donnée personnelle et ne dépose aucun cookie publicitaire ou de suivi.
            </li>
          </ul>
        </div>
      </div>

      <footer className="credits-footer">
        <button type="button" className="credits-home-btn" onClick={onBackHome}>
          <ArrowUp size={15} />
          <span>Retour à l'accueil</span>
        </button>
      </footer>
    </div>
  );
};
