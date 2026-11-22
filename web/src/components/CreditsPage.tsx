import React from 'react';
import { ArrowUp } from 'lucide-react';

interface CreditsPageProps {
  onBackHome: () => void;
}

const INSTITUTIONS = [
  { name: 'École Sainte-Anne', src: './logos/ecole-sainte-anne.png' },
  { name: 'ISFEC Bretagne', src: './logos/isfec-bretagne.jpg' },
  { name: 'Ville de Pordic', src: './logos/ville-de-pordic.jpg' },
];

const TOOLS = [
  { name: 'Blender', src: './logos/blender.svg' },
  { name: 'Python', src: './logos/python.svg' },
  { name: 'JavaScript', src: './logos/javascript.svg' },
  { name: 'Géoportail', src: './logos/geoportail.png' },
  { name: 'OpenStreetMap', src: './logos/openstreetmap.svg' },
  { name: 'Google Earth', src: './logos/google-earth.svg' },
  { name: 'GitHub', src: './logos/github.svg' },
  { name: 'Google Antigravity', src: './logos/google-antigravity.png' },
];

export const CreditsPage: React.FC<CreditsPageProps> = ({ onBackHome }) => {
  return (
    <div className="credits-inner">
      <header className="credits-header">
        <div>
          <h2 className="credits-title">Crédits et mentions légales</h2>
          <p className="credits-subtitle">Cartographie 3D — École Sainte-Anne de Pordic</p>
        </div>
        <button type="button" className="credits-home-btn" onClick={onBackHome}>
          <ArrowUp size={15} />
          <span>Retour à l'accueil</span>
        </button>
      </header>

      {/* Row 1: Établissement et partenaires */}
      <div className="credits-block">
        <h3 className="credits-section-label">Établissement et partenaires</h3>
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

      {/* Row 2: Outils et logiciels */}
      <div className="credits-block">
        <h3 className="credits-section-label">Outils et logiciels utilisés</h3>
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

      {/* Author, ownership & legal notices */}
      <div className="credits-legal-grid">
        <div className="credits-legal-col">
          <h3 className="credits-section-label">À propos et propriété</h3>
          <p className="credits-text">
            Site créé par Valentin Sonneville dans le cadre d'un projet universitaire, pour présenter l'école
            Sainte-Anne de Pordic, ses bâtiments, ses classes et les lieux qui l'entourent.
          </p>
          <p className="credits-text">
            Ce site (maquette 3D, textes, mise en page et code) reste la propriété de Valentin Sonneville. Il est mis à
            disposition de l'école Sainte-Anne de Pordic et de l'ISFEC Bretagne, qui peuvent l'utiliser, le modifier et
            le faire évoluer pour leurs activités. Toute copie ou réutilisation par un tiers sans accord préalable reste
            interdite.
          </p>
          <p className="credits-text">
            Les logos, marques et données de tiers restent la propriété de leurs titulaires respectifs.
          </p>
        </div>

        <div className="credits-legal-col">
          <h3 className="credits-section-label">Mentions légales</h3>
          <ul className="credits-legal-list">
            <li>
              <strong>Auteur :</strong> Valentin Sonneville, en lien avec l'ISFEC Bretagne et l'école Sainte-Anne (7 rue
              des Écoles, 22590 Pordic).
            </li>
            <li>
              <strong>Hébergement :</strong> GitHub Pages (GitHub, Inc., San Francisco, États-Unis).
            </li>
            <li>
              <strong>Données cartographiques :</strong> IGN (Géoportail et BD TOPO®, Licence Ouverte Etalab 2.0) et
              OpenStreetMap (licence ODbL).
            </li>
            <li>
              <strong>Vie privée et cookies :</strong> aucune donnée personnelle collectée et aucun cookie de suivi.
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
