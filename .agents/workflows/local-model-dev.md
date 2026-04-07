---
description: Développer une feature en collaboration tri-partite — Utilisateur (besoin) → Agent Orchestrateur (contexte/plan) → Modèle Local (code) → Agent Orchestrateur (intégration/validation/push)
---

# Workflow : Développement assisté par Modèle Local

## Philosophie

Ce workflow optimise l'utilisation de tokens en déléguant l'écriture de code à un **modèle local** (LLM local type Gemma, Llama, etc.) qui n'a **aucun accès** au codebase, aux fichiers, ni au contexte du projet. L'agent orchestrateur (Antigravity/Claude) sert de **pont contextuel** entre le besoin utilisateur et le modèle local.

### Les 3 Personas

| Persona | Rôle | Accès |
| :--- | :--- | :--- |
| **Utilisateur** | Exprime le besoin fonctionnel/technique | Vision produit |
| **Orchestrateur** (Antigravity) | Analyse, planifie, génère le prompt, intègre et valide | Accès complet au codebase |
| **Modèle Local** (LLM) | Produit le code à partir d'un prompt autonome | Aucun accès — uniquement le prompt |

---

## Phase 0 — Réception du besoin (Utilisateur → Orchestrateur)

L'utilisateur décrit son besoin. L'orchestrateur :
1. Clarifie les ambiguïtés par le dialogue
2. Identifie le périmètre : Backend, Frontend, Database, ML
3. Confirme avec l'utilisateur avant de passer à la Phase 1

**Gate** : ✅ Le besoin est clair et validé par l'utilisateur.

---

## Phase 1 — Analyse contextuelle (Orchestrateur seul)

L'orchestrateur effectue une recherche approfondie dans le codebase :

### 1.1 Cartographie d'impact
- Identifier **tous les fichiers concernés** (existants à modifier + nouveaux à créer)
- Lire le contenu intégral des fichiers impactés
- Identifier les dépendances (imports, types, services appelés)
- Vérifier les patterns existants similaires dans le projet

### 1.2 Extraction du contexte nécessaire
Pour chaque fichier concerné, extraire :
- **Le code source complet** (ou les sections pertinentes)
- **Les interfaces/types/schemas** associés (Zod, SQL, CSS tokens)
- **Les conventions du projet** (naming, structure, patterns)
- **Les exemples de code similaire** déjà implémentés dans le projet

### 1.3 Vérification des contraintes
- Consulter `.agents/rules/engineering-standards.md`
- Consulter `.agents/skills/project-context/SKILL.md`
- Vérifier les tokens CSS dans `frontend/src/design-system/tokens.css`
- Vérifier les patterns de routes dans `backend/src/routes/`

**Gate** : ✅ Le contexte complet est collecté.

---

## Phase 2 — Génération du Development Prompt (Orchestrateur → Modèle Local)

L'orchestrateur crée un **prompt auto-suffisant** structuré en artifact `dev-prompt-[feature].md`. Ce prompt est le **seul input** du modèle local.

### Structure obligatoire du Development Prompt :

```markdown
# 🎯 Objectif
[Description claire de ce qu'il faut développer]

# 📐 Architecture du projet
[Stack technique, structure des dossiers concernés, conventions]

# 📜 Règles OBLIGATOIRES
[Règles critiques extraites de engineering-standards + project-context]
- Naming conventions
- Structure de réponse API : { success: true, data: ... }
- Validation Zod
- Pas de console.*, utiliser logger
- CSS tokens, pas de inline style
- etc.

# 📦 Code existant (contexte)
[Pour CHAQUE fichier concerné, le code source intégral ou les sections pertinentes]

## Fichier : `backend/src/services/example.service.js`
```js
// Code complet du fichier existant
```

## Fichier : `backend/src/routes/v4_routes.js` (section à modifier)
```js
// Extrait pertinent
```

# 🧩 Interfaces & Schemas
[Types, Zod schemas, SQL tables, CSS tokens pertinents]

# 📋 Contrats de Données
[Pour chaque donnée critique manipulée par la feature, spécifier le mapping complet]

## Mapping Source → Cible
| Source (fichier/API) | Champ source | Destination DB | Colonne cible | Type | Conversion | Nullable |
|---|---|---|---|---|---|---|
| `player.json` | `expected_goals` | `player_stats` | `xg` | `DECIMAL(5,2)` | `parseFloat()` | Non (défaut: 0.0) |
| `match.json` | `goals_scored` | `fixtures` | `home_score` | `INTEGER` | `parseInt()` | Oui (null si match à venir) |
| API `/api/v4/players` | `response.data[].name` | — (affichage) | — | `string` | aucune | Non |

## Règles de Fallback (gestion d'erreurs)
| Scénario d'échec | Comportement attendu | Log requis |
|---|---|---|
| Fichier source manquant | Logger l'erreur + passer à l'élément suivant (ne PAS planter) | `logger.warn('Fichier manquant: {path}')` |
| Champ source absent/null | Utiliser la valeur par défaut spécifiée dans la colonne "Nullable" | `logger.debug('Fallback appliqué: {champ}')` |
| Type de conversion échoue | Rejeter la ligne, logger, continuer le traitement | `logger.error('Conversion échouée: {valeur} → {type}')` |
| Réponse API en erreur (4xx/5xx) | Afficher un composant d'erreur, ne pas casser le rendu | `logger.error('API error: {status}')` |

# ✏️ Instructions de développement
[Instructions PRÉCISES fichier par fichier]

## 1. Créer `backend/src/services/nouvelle-feature.service.js`
- Doit exporter [fonctions]
- Pattern à suivre : voir le fichier `example.service.js` ci-dessus
- [Spécifications détaillées]

## 2. Modifier `backend/src/routes/v4_routes.js`
- Ajouter la route `GET /api/v4/...`
- Insérer APRÈS la ligne `router.get('/api/v4/existant', ...)`
- [Code attendu ou description précise]

## 3. Créer `frontend/src/components/NouveauComposant/NouveauComposant.jsx`
- Props attendues : { ... }
- Utiliser les tokens CSS : var(--color-surface), var(--radius-sm)
- [Spécifications UI]

# 🧪 Cas de Test Formels
[Chaque scénario suit le format : Condition Initiale → Action → Résultat Attendu (valeur précise)]

## Tests Backend (API / Service)
| # | Condition Initiale | Action | Résultat Attendu |
|---|---|---|---|
| T1 | DB contient joueur A avec xG=1.5 | `GET /api/v4/players/A/stats` | `{ success: true, data: { xg: 1.5 } }` |
| T2 | DB vide (aucun joueur) | `GET /api/v4/players/999/stats` | `{ success: false, error: "Player not found" }` (HTTP 404) |
| T3 | Payload sans champ obligatoire | `POST /api/v4/players` body: `{}` | Zod validation error (HTTP 400) |

## Tests Frontend (Composant / UI)
| # | Condition Initiale | Action Utilisateur | Résultat Attendu |
|---|---|---|---|
| T4 | API retourne joueur A avec xG=1.5 | Naviguer vers Player Insights | Tableau affiche `1.5` dans la colonne xG |
| T5 | API retourne erreur 500 | Naviguer vers Player Insights | Message d'erreur affiché, pas de crash |
| T6 | API retourne liste vide | Naviguer vers Player Insights | État vide affiché ("Aucune donnée") |

## Tests Edge Cases
| # | Condition Initiale | Action | Résultat Attendu |
|---|---|---|---|
| T7 | Fichier source contient xG="abc" | Import du fichier | Ligne rejetée, log d'erreur, import continue |
| T8 | Fichier source contient 10 000 lignes | Import du fichier | Import complet en < 5s, pas de memory leak |

# ✅ Format de réponse attendu
Pour CHAQUE fichier, réponds avec :
1. Le chemin complet du fichier
2. S'il s'agit d'un NOUVEAU fichier ou d'une MODIFICATION
3. Le code COMPLET du fichier (pas de placeholder, pas de "// reste inchangé")
4. Si MODIFICATION : indique clairement les lignes ajoutées/modifiées

Réponds UNIQUEMENT avec du code. Pas d'explication avant ou après.
```

### Bonnes pratiques pour le prompt :
- **Toujours inclure le code existant** — le modèle local ne peut pas le deviner
- **Inclure des exemples similaires** du projet pour guider le pattern
- **Être prescriptif** — spécifier les noms de fonctions, variables, etc.
- **Un seul prompt par unité logique** — ne pas surcharger (1 service + 1 route + 1 composant max)
- **Spécifier le format de sortie** — facilite l'intégration en Phase 3

**Gate** : ✅ L'utilisateur valide le Development Prompt avant de l'envoyer au modèle local.

---

## Phase 3 — Développement (Modèle Local)

L'utilisateur envoie le Development Prompt au modèle local et récupère la sortie.

### Responsabilité utilisateur :
1. Copier-coller le prompt dans l'interface du modèle local
2. Récupérer la réponse (code généré)
3. Coller la réponse dans la conversation avec l'orchestrateur

> **Note** : Si le modèle local n'a pas respecté les consignes ou a produit du code incomplet, l'orchestrateur peut générer un **prompt de correction** ciblé (Phase 2bis) sans ré-envoyer tout le contexte.

**Gate** : ✅ Le code est récupéré du modèle local.

---

## Phase 4 — Intégration (Orchestrateur)

L'orchestrateur reçoit le code du modèle local et :

### 4.1 Revue de code
- Vérifier la conformité aux standards du projet
- Vérifier les imports, chemins de fichiers
- Corriger les incohérences mineures (naming, formatting)
- S'assurer que le code s'intègre sans conflit avec l'existant

### 4.2 Intégration
- Créer les nouveaux fichiers
- Appliquer les modifications aux fichiers existants
- Mettre à jour les imports/exports si nécessaire
- Ajuster les routes, le router, les index files

### 4.3 Corrections autonomes
L'orchestrateur a le droit de corriger **sans repasser par le modèle local** :
- Erreurs de syntaxe mineures
- Mauvais chemins d'import
- Oubli de convention (logger au lieu de console.log)
- Ajustements de CSS tokens
- Coquilles dans les noms de variables

> Si la correction nécessite de **réécrire une logique métier**, retourner en Phase 2 avec un prompt de correction ciblé.

**Gate** : ✅ Le code est intégré dans le projet.

---

## Phase 5 — Validation & Tests (Orchestrateur)

### 5.1 Tests automatisés
```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test
```

### 5.2 Vérification fonctionnelle
- Lancer le serveur : `cd backend && npm run dev`
- Vérifier via le navigateur ou curl que la feature fonctionne
- Tester les edge cases identifiés en Phase 0

### 5.3 Audit visuel (si frontend)
- Screenshot de la feature
- Vérification du responsive
- Conformité au design system

### 5.4 Boucle de correction
- **Si OK** → Phase 6
- **Si KO mineur** (erreur corrigible par l'orchestrateur) → corriger et relancer Phase 5
- **Si KO majeur** (logique incorrecte) → retour en Phase 2 avec un prompt de correction

**Gate** : ✅ Tous les tests passent + validation fonctionnelle OK.

---

## Phase 6 — Documentation & Push (Orchestrateur)

### 6.1 Documentation
- Mettre à jour `docs/features/Vxx-[Nom]/` si applicable
- Créer le `QA-REPORT.md`
- Mettre à jour le Swagger si endpoints modifiés

### 6.2 Git
```bash
git add -A
git commit -m "feat: [description de la feature]"
git push
```

### 6.3 Bilan
Présenter à l'utilisateur :
```
✅ Feature : [Nom]
✅ Fichiers créés : [liste]
✅ Fichiers modifiés : [liste]
✅ Tests : X/X backend, X/X frontend
✅ Corrections orchestrateur : [liste ou "aucune"]
✅ Commit : [hash]
```

---

## Annexe — Template de prompt de correction (Phase 2bis)

Quand le modèle local produit du code incorrect, l'orchestrateur génère un prompt ciblé :

```markdown
# 🔧 Correction requise

## Problème identifié
[Description précise de ce qui ne marche pas]

## Code actuel (produit par toi)
```[lang]
[code incorrect]
```

## Erreur / Comportement observé
[Message d'erreur, stacktrace, ou description du bug]

## Correction attendue
[Consignes précises pour la correction]

## Contraintes
[Rappel des règles spécifiques violées]
```

---

## Annexe — Stratégie de découpage des prompts

Pour les features complexes, découper en **unités de prompt** :

| # | Périmètre | Contenu |
|---|---|---|
| Prompt 1 | Database + Backend Service | Schema SQL + Service layer |
| Prompt 2 | Backend Controller + Route | Controller + validation Zod + route |
| Prompt 3 | Frontend Component | Composant React + CSS + appel API |
| Prompt 4 | Tests | Tests unitaires backend + frontend |

Chaque prompt est **indépendant** et ne nécessite pas la réponse des prompts précédents (l'orchestrateur injecte les contrats d'interface dans chaque prompt).
