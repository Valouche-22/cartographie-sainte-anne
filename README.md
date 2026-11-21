# Découverte de l'école Sainte-Anne – Pordic (Maquette 3D & Site Web Immersif)

Projet universitaire (Licence Professorat des Écoles) : reconstitution architecturale 3D de l'**École Sainte-Anne de Pordic** (`7 rue des Écoles, 22590 Pordic`, Côtes-d'Armor, Bretagne) à partir de données géographiques ouvertes, accompagnée d'une visite interactive 3D synchronisée au défilement.

## Structure du projet

- `ecole_sainte_anne.blend` : fichier source Blender (organisé en 9 collections : `TERRAIN`, `BATIMENTS`, `CLASSES`, `CANTINE`, `PERISCOLAIRE`, `COURS`, `VEGETATION`, `MOBILIER`, `SIGNALISATION`).
- `ecole_sainte_anne.glb` : modèle 3D exporté et optimisé pour le web (copié également dans `web/public/models/ecole_sainte_anne.glb`).
- `web/` : application web React + TypeScript + Vite + Three.js + GSAP ScrollTrigger.
- `web/public/data/school-data.json` : fichier de configuration central des bâtiments, des 10 classes (`Classe 01` à `Classe 10`), de la cantine, du périscolaire et des 8 scènes narratives.
- `scripts/` : scripts Python reproductibles (`fetch_geodata.py`, `analyze_site.py`, `build_blender_scene.py`).
- `renders/` : rendu aérien de la maquette 3D (`vue_aerienne.png`) et captures d'écran du site.
- `SOURCES.md` : provenance des données géographiques et attributions.

## Démarrage rapide en local

```bash
cd web
npm install
npm run dev
```

Puis ouvrez l'adresse affichée dans votre navigateur (par défaut `http://localhost:5173`).

## Personnaliser les classes et les salles

Modifiez simplement le fichier `web/public/data/school-data.json` :
- Changez le champ `level` (ex. `"PS / MS"`, `"CP"`, `"CM2"`), `name` ou `description` de chaque salle.
- Rechargez la page : les étiquettes 3D et les panneaux d'information se mettent à jour automatiquement.
