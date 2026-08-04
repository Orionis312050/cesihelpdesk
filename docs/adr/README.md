# Journal des décisions d'architecture

Chaque fiche consigne une décision structurante, les options écartées et leurs
raisons. L'objectif est que la personne qui reprend le projet comprenne
**pourquoi** c'est ainsi, et sache à quelles conditions revenir en arrière.

Le cahier des charges demandait explicitement de « challenger nos propositions » :
ces fiches sont la trace écrite de ce travail.

| N° | Décision | Statut |
| --- | --- | --- |
| [001](ADR-001-supabase-plutot-que-mysql-express.md) | Tout sur Supabase, suppression du serveur Express/MySQL | Accepté |
| [002](ADR-002-rls-plutot-que-controle-applicatif.md) | Sécurité par RLS plutôt que par contrôle applicatif | Accepté |
| [003](ADR-003-creation-par-fonction-rpc.md) | Création d'incident par une fonction en base | Accepté |
| [004](ADR-004-compression-image-cote-client.md) | Compression des photos dans le navigateur, bucket privé | Accepté |
| [005](ADR-005-emails-declenches-en-base.md) | E-mails déclenchés par la base, pas par le navigateur | Accepté |
| [006](ADR-006-page-routee-plutot-que-modale.md) | Fiche d'incident : page routée plutôt que fenêtre modale | Accepté |
| [007](ADR-007-export-xlsx.md) | Export `.xlsx` réel plutôt que CSV renommé | Accepté |
| [008](ADR-008-graphiques-sans-bibliotheque.md) | Graphiques dessinés à la main, sans bibliothèque | Accepté |
| [009](ADR-009-pas-de-table-audit.md) | Pas de table d'historique générique | Accepté |
| [010](ADR-010-tailwind-seul.md) | Tailwind seul, suppression des modules CSS inutilisés | Accepté |
| [011](ADR-011-perimetre-de-tests.md) | Périmètre de tests volontairement restreint | Accepté |

## Modèle

```markdown
# ADR-0XX — Titre

- **Statut :** Accepté | Remplacé par ADR-0YY
- **Date :** AAAA-MM-JJ

## Contexte
## Options envisagées
## Décision
## Conséquences
## Comment revenir en arrière
```
