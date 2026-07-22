# 📚 Guide - Génération de Documentation

## Installation

TypeDoc doit être installé en tant que dépendance de développement:

```bash
npm install --save-dev typedoc
```

## Utilisation

### Générer la documentation

```bash
npm run docs
```

Cette commande:
- Parse tous les fichiers TypeScript dans `src/`
- Extrait les commentaires JSDoc
- Génère une documentation HTML statique dans le dossier `docs/`

### Générer et servir localement

```bash
npm run docs:serve
```

Cette commande:
- Génère la documentation
- Lance un serveur local
- Ouvre automatiquement le navigateur sur `http://localhost:8080`

## Configuration

La configuration est définie dans `typedoc.json`:

```json
{
  "entryPoints": ["src"],           // Point d'entrée
  "out": "docs",                    // Dossier de sortie
  "theme": "default",               // Thème (default, dark, minimal)
  "readme": "DOCUMENTATION.md",     // Readme à inclure
  "excludePrivate": true,           // Exclure les membres privés
  "excludeInternal": true,          // Exclure les membres internes
  "tsconfig": "tsconfig.json"       // Fichier de config TypeScript
}
```

## Formats de commentaires JSDoc

### Fonction avec description et paramètres

```typescript
/**
 * Récupère la liste des salles disponibles
 * Les données sont mises en cache pendant 5 minutes
 * 
 * @returns {Promise<string[]>} Liste des noms de salles triées alphabétiquement
 * @throws {Error} Si la requête Supabase échoue
 * 
 * @example
 * const rooms = await helpdeskDataService.getRooms()
 * // ['Salle A', 'Salle B', 'Salle C']
 */
async getRooms(): Promise<string[]> { ... }
```

### Interface avec propriétés documentées

```typescript
/**
 * Ticket d'incident complet avec métadonnées
 */
export interface Ticket extends FormData {
  /** Identifiant unique du ticket */
  id: string
  
  /** Date de création du ticket */
  date: string
  
  /** État actuel du ticket */
  status: Status
}
```

### Type alias avec description

```typescript
/**
 * État possible d'un ticket d'incident
 * - NOUVEAU: Ticket venant d'être créé
 * - EN_COURS: Ticket en cours de traitement
 * - EN_ATTENTE: Ticket en attente de réponse
 * - TERMINE: Ticket résolu
 */
export type Status = 'NOUVEAU' | 'EN_COURS' | 'EN_ATTENTE' | 'TERMINE'
```

## Dossier de sortie

Après génération, le dossier `docs/` contient:

```
docs/
├── index.html           // Page d'accueil
├── modules/             // Modules documentés
├── interfaces/          # Interfaces
├── types/              # Types
├── classes/            # Classes
└── assets/             # CSS, JS
```

## .gitignore

Ajoute le dossier `docs/` à `.gitignore` si tu ne veux pas le versionner:

```
docs/
node_modules/
```

## Intégration CI/CD

Pour générer la doc automatiquement à chaque commit:

```bash
# Dans un script pré-commit
npm run docs
git add docs/
```

## Bonnes pratiques

✅ **À faire:**
- Documenter chaque fonction exportée
- Ajouter des `@example` pour les cas d'usage
- Décrire les types complexes
- Indiquer les erreurs possibles avec `@throws`

❌ **À éviter:**
- Laisser du code sans commentaires
- Documenter du code trivial (getters simples)
- Oublier les paramètres dans `@param`

## Customisation

Pour personnaliser davantage, édite `typedoc.json`:

- `theme`: "default", "dark", ou "minimal"
- `titleLink`: URL du lien du titre
- `gaID`: ID Google Analytics
- `hideGenerator`: Masquer le badge TypeDoc

Plus d'options: https://typedoc.org/options/

## Troubleshooting

### "typedoc not found"
```bash
npm install --save-dev typedoc
```

### La documentation ne se met pas à jour
```bash
# Supprime le dossier docs et regénère
rm -rf docs
npm run docs
```

### Types non reconnus
Vérifie que `tsconfig.json` pointe vers les bons chemins et que TypeScript compile sans erreurs.
