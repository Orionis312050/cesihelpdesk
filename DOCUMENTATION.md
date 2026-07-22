# 📋 Documentation - CESI Helpdesk

## 📑 Table des matières
1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Structure des fichiers](#structure-des-fichiers)
4. [Types et interfaces](#types-et-interfaces)
5. [Services](#services)
6. [Composants](#composants)
7. [Guide d'utilisation](#guide-dutilisation)

---

## Vue d'ensemble

**CESI Helpdesk** est une application web de gestion des incidents pour l'école CESI. Elle permet aux utilisateurs de signaler des incidents (pannes électriques, problèmes de plomberie, soucis réseau, etc.) et aux administrateurs de les suivre et les résoudre.

### ✨ Fonctionnalités principales
- 📝 Création d'incidents par les utilisateurs
- 👀 Visualisation et filtrage des incidents (administrateurs)
- 📊 Statistiques en temps réel
- 🏷️ Catégorisation des incidents
- ⚠️ Marquage des incidents urgents/dangereux
- 💾 Stockage persistant avec Supabase
- 🎨 Interface moderne et responsive

---

## Architecture

### Stack technologique
- **Framework**: React 18 + TypeScript
- **Styling**: Tailwind CSS + CSS Modules
- **Base de données**: Supabase (PostgreSQL)
- **Build**: Vite
- **Environnement**: Node.js

### Pattern architectural
L'application suit une architecture en couches:
```
src/
├── components/     # Composants React (UI)
├── services/       # Logique métier et requêtes API
├── types/          # Interfaces TypeScript
├── data/           # Constantes (STATUSES, COLORS)
└── App.tsx         # Point d'entrée
```

---

## Structure des fichiers

### 📁 Composants (`src/components/`)

Chaque composant est organisé dans son propre dossier avec:
- **[Component].tsx**: Logique du composant
- **[Component].module.css**: Styles personnalisés

#### Admin (`src/components/admin/`)
- **AdminList**: Tableau de suivi des incidents
  - Colonnes: Date, Titre, Lieu, Types, Statut, Assigné, Action
  - Tri par date (croissant/décroissant)
  - Filtrage par statut et recherche texte
  - Export CSV

- **AdminStats**: Statistiques des incidents
  - Total d'incidents
  - Incidents en cours
  - Incidents en attente
  - Incidents terminés

- **TicketModal**: Modal pour éditer un incident
  - Modification du statut
  - Assignation à un responsable
  - Ajout de commentaires

#### Forms (`src/components/forms/`)
- **UserForm**: Formulaire de création d'incident
  - Saisie du demandeur (nom, email)
  - Sélection de la salle
  - Sélection des types d'incidents
  - Upload de photo
  - Indication du risque

#### Layout (`src/components/layout/`)
- **AppHeader**: En-tête avec sélecteur de vue
- **AppFooter**: Pied de page avec infos d'architecture
- **AdminToolbar**: Boutons d'action admin

#### UI (`src/components/ui/`)
- **AutocompleteInput**: Champ de saisie avec autocomplétion
- **Icons**: Composant d'icônes SVG
- **Toast**: Notifications temporaires (succès/erreur)

### 🔧 Services (`src/services/`)

#### helpdeskData.ts
Service de gestion des données via Supabase
```typescript
/**
 * Récupère la liste des salles (locations) disponibles
 * Données mises en cache pendant 5 minutes
 */
await helpdeskDataService.getRooms()

/**
 * Récupère la liste des types d'incidents
 * Données mises en cache pendant 5 minutes
 */
await helpdeskDataService.getIncidentTypes()

/**
 * Vide le cache (après création d'incident)
 */
helpdeskDataService.clearCache()
```

#### tickets.ts
Service CRUD pour les tickets d'incident
```typescript
// Charger tous les tickets
await ticketService.list()

// Créer un ticket
await ticketService.create(formData)

// Mettre à jour un ticket
await ticketService.update(ticketId, updates)
```

### 📄 Types (`src/types/helpdesk.ts`)

```typescript
// État d'un ticket
type Status = 'NOUVEAU' | 'EN_COURS' | 'EN_ATTENTE' | 'TERMINE'

// Vue affichée
type View = 'USER_FORM' | 'ADMIN_FORM' | 'ADMIN_LIST' | 'ADMIN_STATS'

// Données du formulaire
interface FormData {
  name: string           // Nom du demandeur
  email: string          // Email
  room: string           // Salle/location
  types: string[]        // Types d'incidents
  title: string          // Titre de l'incident
  comment: string        // Description
  risk: boolean          // Urgent/dangereux
  photo: string | null   // Photo (optionnelle)
}

// Ticket complet avec métadonnées
interface Ticket extends FormData {
  id: string             // Identifiant unique
  date: string           // Date de création
  status: Status         // État actuel
  handler: string        // Responsable assigné
  adminComment: string   // Commentaire admin
}
```

### 📦 Données (`src/data/helpdesk.ts`)

Constantes statiques:
```typescript
// États et leurs couleurs
STATUSES: Record<Status, string>
COLORS: Record<Status, string>
```

---

## Types et interfaces

### Status
États possibles d'un ticket:
- **NOUVEAU**: Ticket venant d'être créé (couleur: bleu)
- **EN_COURS**: En cours de traitement (couleur: orange)
- **EN_ATTENTE**: En attente de réponse (couleur: jaune)
- **TERMINE**: Résolu (couleur: vert)

### View
Vues de l'interface:
- **USER_FORM**: Formulaire de création d'incident
- **ADMIN_FORM**: Formulaire d'administration (non implémenté)
- **ADMIN_LIST**: Tableau de suivi
- **ADMIN_STATS**: Tableau de statistiques

### FormData
Données saisies par l'utilisateur lors de la création:
- `name`: Nom complet
- `email`: Email de contact
- `room`: Salle de l'incident
- `types`: Types d'incidents (peut être multiple)
- `title`: Titre court
- `comment`: Description détaillée
- `risk`: Incident urgent/dangereux
- `photo`: Photo optionnelle

### Ticket
FormData + métadonnées admin:
- `id`: Identifiant auto-généré par Supabase
- `date`: Date de création
- `status`: État du ticket
- `handler`: Administrateur responsable
- `adminComment`: Commentaire de l'admin

---

## Services

### helpdeskDataService

**Rôle**: Récupère les données de référence (salles, types d'incidents)
**Cachage**: 5 minutes pour optimiser les requêtes Supabase
**Environnement**:
- DEV: Requêtes directes à Supabase
- PROD: Appels API backend

**Méthodes**:

#### getRooms()
```typescript
const rooms = await helpdeskDataService.getRooms()
// ['Salle A', 'Salle B', 'Salle C']
```

#### getIncidentTypes()
```typescript
const types = await helpdeskDataService.getIncidentTypes()
// ['Électricité', 'Plomberie', 'Réseau']
```

#### clearCache()
```typescript
helpdeskDataService.clearCache()
// Vide le cache pour forcer un rechargement
```

### ticketService

**Rôle**: Gestion complète des tickets (CRUD)
**BD**: Supabase + tables relationnelles

**Méthodes**:

#### list()
Charge tous les tickets avec détails complets
```typescript
const tickets = await ticketService.list()
```

#### create(formData)
Crée un nouveau ticket + entrées dans tables de liaison
```typescript
await ticketService.create({
  name: 'Jean Dupont',
  email: 'jean@cesi.fr',
  room: 'Salle A',
  types: ['Électricité', 'Réseau'],
  title: 'Pas d\'électricité',
  comment: 'L\'électricité ne marche pas...',
  risk: true,
  photo: null
})
```

#### update(id, updates)
Met à jour un ticket (statut, responsable, commentaire)
```typescript
await ticketService.update('123', {
  status: 'EN_COURS',
  handler: 'Admin 1',
  adminComment: 'En cours de traitement'
})
```

---

## Composants

### UserForm
**Localisation**: `src/components/forms/UserForm/UserForm.tsx`
**Rôle**: Formulaire de création d'incident pour les utilisateurs

**Props**: Aucune (utilise hooks internes)

**État local**:
- Données du formulaire (nom, email, salle, etc.)
- État de chargement (lors de la récupération des salles/types)
- Aperçu de la photo uploadée

**Comportement**:
1. Au montage, charge les salles et types d'incidents depuis Supabase
2. Affiche les champs avec autocomplétion pour salle/types
3. Permet l'upload d'une photo
4. À la soumission, crée le ticket et affiche une notification

### AdminList
**Localisation**: `src/components/admin/AdminList/AdminList.tsx`
**Rôle**: Tableau de suivi des incidents

**Props**:
- `tickets: Ticket[]`: Liste des tickets à afficher
- `onEdit: (id: string, updates) => void`: Callback d'édition
- `onRefresh: () => void`: Callback de rafraîchissement

**Fonctionnalités**:
- Affichage des tickets en tableau
- Colonnes: Date, Titre, Lieu, Types, Statut, Assigné
- Tri par date (ascendant/descendant)
- Filtrage par statut et recherche texte
- Export en CSV
- Icône d'alerte pour les incidents urgents
- Style spécial pour les lignes urgentes

### AdminStats
**Localisation**: `src/components/admin/AdminStats/AdminStats.tsx`
**Rôle**: Affichage des statistiques

**Props**:
- `tickets: Ticket[]`: Tickets à analyser

**Statistiques**:
- Total d'incidents
- Incidents NOUVEAU
- Incidents EN_COURS / EN_ATTENTE
- Incidents TERMINE

### TicketModal
**Localisation**: `src/components/admin/TicketModal/TicketModal.tsx`
**Rôle**: Modal pour éditer les détails d'un ticket

**Props**:
- `ticket: Ticket`: Ticket à éditer
- `onUpdate: (updates) => Promise<void>`: Callback de sauvegarde
- `onClose: () => void`: Fermeture du modal

**Champs éditables**:
- Statut (select)
- Responsable assigné (input)
- Commentaire administrateur (textarea)

### AutocompleteInput
**Localisation**: `src/components/ui/AutocompleteInput/AutocompleteInput.tsx`
**Rôle**: Champ de saisie avec suggestions

**Props**:
- `value: string`: Valeur actuelle
- `onChange: (value) => void`: Callback de changement
- `options: string[]`: Liste des suggestions
- `placeholder: string`: Texte d'aide
- `disabled?: boolean`: État désactivé (loading)

**Comportement**:
- Affiche les suggestions au fur et à mesure de la saisie
- Filtre les options selon le texte entré
- Surligne les suggestions au survol
- Couleur jaune (#FBE800) au survol

### Toast
**Localisation**: `src/components/ui/Toast/Toast.tsx`
**Rôle**: Notification temporaire

**Props**:
- `message: string`: Texte du message
- `type: 'success' | 'danger'`: Type de notification
- `onClose: () => void`: Callback à la fermeture

**Comportement**:
- S'affiche avec animation
- Se ferme automatiquement après 3 secondes
- Vert pour succès, rouge pour erreur

### Icons
**Localisation**: `src/components/ui/Icons/Icons.tsx`
**Rôle**: Ensemble d'icônes SVG réutilisables

**Icônes disponibles**:
- `Home`: Maison (16x16)
- `List`: Liste (16x16)
- `Chart`: Diagramme circulaire (16x16)
- `Plus`: Croix (16x16)
- `Download`: Téléchargement (16x16)
- `Eye`: Oeil (16x16)
- `Alert`: Triangle d'alerte (20x20, rouge)
- `Search`: Loupe (16x16)
- `Upload`: Upload (32x32)

---

## Guide d'utilisation

### Installation
```bash
npm install
```

### Configuration
Créer un fichier `.env.local`:
```
VITE_SUPABASE_URL=https://votre-instance.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=votre-clé-publique
```

### Développement
```bash
npm run dev
```

### Build production
```bash
npm run build
```

### Flux d'utilisation

#### 👤 Utilisateur
1. Remplit le formulaire (USER_FORM)
2. Sélectionne la salle et les types d'incidents
3. Upload une photo (optionnel)
4. Valide → Ticket créé dans Supabase
5. Reçoit confirmation

#### 👨‍💼 Administrateur
1. Voir ADMIN_LIST (tableau de tous les tickets)
2. Filtrer par statut ou rechercher
3. Cliquer sur un ticket pour le modal d'édition
4. Modifier statut/responsable/commentaire
5. Voir statistiques en temps réel (ADMIN_STATS)
6. Exporter la liste en CSV

### Flux de création d'incident

```
User Form → Validation → API Supabase → 
→ Insert tickets → Insert ticket_categories → 
→ Cache clear → Success Toast
```

### Flux de mise à jour

```
Admin List → Click Ticket → Modal → Edit → 
→ API Supabase → Update tickets → Success Toast
```

---

## 🗄️ Schéma Supabase

### Tables

#### `tickets`
```sql
- id: bigint (PK, auto-increment)
- demandeur_nom: text
- demandeur_email: text
- salle_id: bigint (FK → salles.id)
- titre: text
- description: text
- image_url: text (nullable)
- risque_accident: boolean
- statut: text (nouveau, en cours, en attente, terminé)
- assigne_a_id: bigint (FK → utilisateurs.id, nullable)
- commentaire_admin: text (nullable)
- created_at: timestamp
```

#### `salles`
```sql
- id: bigint (PK, auto-increment)
- nom: text (unique)
```

#### `categories_incident`
```sql
- id: bigint (PK, auto-increment)
- label: text (unique)
```

#### `utilisateurs`
```sql
- id: bigint (PK, auto-increment)
- nom_complet: text
```

#### `ticket_categories` (table de liaison)
```sql
- ticket_id: bigint (FK → tickets.id)
- category_id: bigint (FK → categories_incident.id)
- PK: (ticket_id, category_id)
```

---

## 📋 Variables d'environnement

| Variable | Description | Exemple |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | URL de l'instance Supabase | `https://abc123.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clé API publique Supabase | `eyJhbGc...` |

---

## 🎨 Palette de couleurs

| État | Couleur | Hex |
|------|---------|-----|
| NOUVEAU | Bleu | `#3B82F6` |
| EN_COURS | Orange | `#F97316` |
| EN_ATTENTE | Jaune | `#FBE800` |
| TERMINE | Vert | `#22C55E` |

---

## 🚀 Optimisations

- ✅ Cache 5 min pour salles/types d'incidents
- ✅ Requêtes Supabase optimisées (select/order)
- ✅ Composants React memoïzés où nécessaire
- ✅ CSS Modules pour éviter les conflits de styles
- ✅ Tailwind pour utility-first styling

---

## 📝 Notes de développement

- Les IDs sont auto-générés côté Supabase (sequences)
- Les dates sont en ISO 8601 (UTC)
- Les statuts normalisés (accents supprimés) lors du matching
- Cache invalidé après chaque création de ticket
- Photos encodées en base64 ou URLs externes

---

**Dernière mise à jour**: 23 Juillet 2026
**Version**: 1.0
