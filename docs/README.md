# Documentation — CESI Helpdesk

## Par où commencer

| Vous êtes… | Lisez |
| --- | --- |
| Nouveau sur le projet, vous voulez le faire tourner | [01 — Installation](01-installation.md) |
| Vous reprenez le développement | [02 — Architecture](02-architecture.md), puis [les décisions](adr/) |
| Vous devez modifier la base ou la sécurité | [03 — Base de données](03-base-de-donnees.md) |
| Vous exploitez l'application au quotidien | [04 — Exploitation](04-exploitation.md) |
| Vous utilisez l'application | [05 — Guide utilisateur](05-guide-utilisateur.md) |
| Vous devez vérifier ou démontrer le projet | [06 — Recette](06-recette.md) |
| Vous déployez sur les serveurs de l'établissement | [07 — Autohébergement](07-autohebergement.md) |
| Vous cherchez la signature d'une fonction | [Référence d'API](api/) — `npm run docs` |

## Contenu

- **[01 — Installation](01-installation.md)** — de zéro à une application qui
  tourne : prérequis, base locale, migrations, premier compte, déploiement.
- **[02 — Architecture](02-architecture.md)** — structure du code, diagrammes,
  conventions, et surtout **ce qui n'a pas été fait et pourquoi**.
- **[03 — Base de données](03-base-de-donnees.md)** — schéma, modèle de menace,
  politiques RLS, stockage des photos, gestion des migrations.
- **[04 — Exploitation](04-exploitation.md)** — ajouter une salle, créer un
  compte, configurer les e-mails, sauvegarder, dépanner.
- **[05 — Guide utilisateur](05-guide-utilisateur.md)** — mode d'emploi en
  français, pour le déclarant et pour le service technique.
- **[06 — Recette](06-recette.md)** — 60 contrôles, avec traçabilité vers chaque
  exigence du cahier des charges.
- **[07 — Autohébergement](07-autohebergement.md)** — la pile Supabase et le
  front sur une VM Proxmox, publiés par Nginx Proxy Manager : installation,
  sécurité, sauvegardes, mises à jour. Outillé par le dossier `deploy/`.
- **[adr/](adr/)** — douze fiches de décision : chaque choix structurant, les
  options écartées, et comment revenir en arrière.

## Ce que cette documentation ne contient pas

- **Un inventaire des composants.** TypeDoc le génère à partir du code
  (`npm run docs`) ; une liste écrite à la main serait fausse au premier
  renommage. Le dossier `docs/api/` n'est pas versionné, pour la même raison.
- **Un journal des versions.** L'historique Git le fournit
  (`git log --oneline`), et les messages de commit suivent une convention.
- **Un diagramme de la hiérarchie des composants.** Les outils de développement
  React le montrent en direct, à jour.

Décliner une section en expliquant pourquoi fait partie du travail de
documentation.

## Convention

Les fichiers numérotés se lisent dans l'ordre. Les fiches de décision sont
indépendantes et se consultent au besoin. Toute la documentation destinée aux
utilisateurs et aux exploitants est en français, comme l'interface.
