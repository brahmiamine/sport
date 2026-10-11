# Sport — Coach de salle PWA

Application **React + Vite + TypeScript**, mobile-first et installable, pensée pour être utilisée directement à la salle.

## Fonctionnalités

- Bibliothèque d’exercices Musculation / Cardio / HIIT / Mobilité
- Cartographie visuelle des muscles principaux et secondaires
- Séances Full Body A, B et récupération C incluses
- Constructeur de séance avec estimation automatique du temps total
- Player plein écran pour suivre la séance, série par série
- Timer de repos automatique + vibration mobile
- Séries, répétitions, repos et instructions affichés pendant l’exercice
- Historique local des séances
- PWA hors-ligne et installable
- Déploiement automatique GitHub Pages

## Développement

```bash
npm install
npm run dev
```

## GitHub Pages

Le workflow `.github/workflows/deploy.yml` construit et déploie automatiquement le dossier `dist` sur GitHub Pages à chaque push sur `main`.

Dans **Settings → Pages**, sélectionner **GitHub Actions** comme source si nécessaire.

URL attendue : `https://brahmiamine.github.io/sport/`

## Suite possible

- poids/charges par série et PR personnels
- calendrier A/B/A automatique
- stats volume par muscle
- notifications de récupération
- export/import JSON
- synchronisation cloud optionnelle
- illustrations/GIFs dédiés à chaque exercice
