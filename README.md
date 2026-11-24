# Cartographie 3D — École Sainte-Anne de Pordic

Application web de cartographie 3D interactive présentant l'**école Sainte-Anne de Pordic** (Côtes-d'Armor, Bretagne), ses bâtiments, ses salles de classe et les équipements communaux qui l'entourent.

Site réalisé par Valentin Sonneville dans le cadre d'un travail universitaire (ISFEC Bretagne).

**Accès en ligne :** https://valouche-22.github.io/cartographie-sainte-anne/

---

## Parcours de la visite

La visite guidée s'articule en 9 étapes synchronisées avec la caméra 3D, suivies d'une page de crédits et mentions légales :

1. **École Sainte-Anne** — Présentation générale (effectifs, équipe, bâtiments, horaires des cours, organisation, associations, familles et transports).
2. **L'organisation de l'école** — Schéma clair avec légende présentant les liens entre l'État, la tutelle diocésaine, la commune, les acteurs internes et les partenaires autour des élèves.
3. **Les acteurs de l'école** — Rôle de la cheffe d'établissement, des enseignants, des AESH, des ASEM, de l'APEL et de l'OGEC.
4. **La cour** — Distinction entre la cour élémentaire (terrains de foot, panier de basket, marelle, préau, bacs végétalisés, espace en herbe) et la cour maternelle (préau des maternelles, bac à sable, structure de jeu, draisiennes, tricycles et petits vélos).
5. **Les salles de classe** — Vue globale puis exploration détaillée par bâtiment (Cycle 1, Cycle 2 et Cycle 3) avec toits escamotables et repérage des 9 classes (avec répartition PE + ASEM et PE + AESH), de la salle de sieste et de motricité, des sanitaires, du bureau de la cheffe d'établissement, de la salle des enseignants, des locaux matériels, du local APEL et OGEC et du préfabriqué.
6. **Cantine et périscolaire** — Restauration scolaire et garderie municipales situées à proximité immédiate de l'école.
7. **Église Saint-Pierre** — Culture religieuse, chœur d'école, catéchèse et messes en lien avec la paroisse de Pordic.
8. **Complexe sportif Louis Auffray** — Salles et terrains municipaux mis à disposition par la commune pour l'EPS.
9. **Médiathèque de l'Ic et La Ville Robert** — Médiathèque municipale, parc attenant et centre culturel communal.
10. **Crédits et mentions légales** — Institutions, outils utilisés et informations légales.

## Fonctionnalités

- **Visite guidée au défilement** : navigation fluide étape par étape (molette, clavier ou boutons) avec sous-vues automatiques sur la cour et les bâtiments de classes.
- **Vue libre 3D** : exploration libre de la maquette (rotation, déplacement, zoom), raccourcis vers les principaux lieux, masquage des toits des classes et fiches d'information au clic.
- **Interface PC et mobile** : mise en page en colonne latérale sur ordinateur et navigation verticale tactile adaptée sur smartphone.

## Outils et logiciels utilisés

- **Cartographie et repérage** : Géoportail (IGN / BD TOPO®), OpenStreetMap, Google Earth
- **Modélisation et rendu 3D** : Blender, Python, Three.js
- **Développement web** : HTML, CSS, JavaScript (TypeScript, React, Vite, GSAP)
- **Versionnage, hébergement et assistance** : Git, GitHub (GitHub Pages), Google Antigravity

## Structure du projet

```text
.
├── ecole_sainte_anne.blend        # Scène source Blender
├── ecole_sainte_anne.glb          # Modèle 3D exporté pour le web
├── data/                          # Données géographiques brutes (IGN / OSM)
├── scripts/
│   ├── fetch_geodata.py           # Récupération des données géographiques
│   ├── analyze_site.py            # Analyse des emprises et altitudes
│   └── build_blender_scene.py     # Génération procédurale de la maquette 3D dans Blender
├── web/                           # Application web (React, TypeScript, Vite, Three.js, GSAP)
│   ├── public/
│   │   ├── data/school-data.json  # Configuration des bâtiments, salles et scènes
│   │   ├── logos/                 # Logos des institutions et outils
│   │   └── models/                # Modèle 3D (.glb) servi par le site
│   └── src/
│       ├── App.tsx                # Navigation guidée, vue libre et interface PC / mobile
│       ├── components/
│       │   ├── SchoolScene3D.tsx  # Rendu Three.js, caméras et étiquettes 3D
│       │   └── CreditsPage.tsx    # Page Crédits et mentions légales
│       └── styles.css             # Feuille de styles
├── renders/                       # Rendus et aperçus
└── SOURCES.md                     # Provenance et licences des données cartographiques
```

## Développement local et déploiement

```bash
cd web
npm install
npm run dev
```

Pour compiler la version de production ou déployer sur GitHub Pages :

```bash
npm run build
npm run deploy
```

## Propriété et mentions

Ce projet est réalisé dans un cadre pédagogique et n'a pas vocation à être diffusé au-delà de ce cadre. Le site, sa maquette 3D, ses textes, sa mise en page et son code sont la propriété exclusive de Valentin Sonneville. Toute copie, modification ou réutilisation est interdite sans accord préalable.

Les données cartographiques proviennent de l'IGN (Géoportail et BD TOPO®, Licence Ouverte Etalab 2.0) et d'OpenStreetMap (licence ODbL). Les logos, marques et données de tiers restent la propriété de leurs titulaires respectifs.
