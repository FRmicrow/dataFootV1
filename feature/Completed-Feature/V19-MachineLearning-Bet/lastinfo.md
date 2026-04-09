### 2) Les formules : c’est documenté ou “déjà connu” ?

Oui, la majorité des briques “scoring”/sélection que j’ai évoquées existent déjà sous des formes documentées dans la littérature stats/ML et chez les praticiens (forecasting, sports analytics, trading quant). Mais :

* **Les formules exactes** (poids, seuils, “score composite”, règles de gating) ne sont pas “une vérité universelle”.
* Ce qui est “connu” ce sont surtout :

  * **les métriques** (log loss, Brier, calibration, deviance, MAE, CLV)
  * **les bonnes pratiques** (walk-forward, anti-leakage, champion/challenger, monitoring drift)
  * **les structures** (gates → selection → publication)

Donc oui : on va utiliser des concepts standard et éprouvés, **mais** l’assemblage final (ton “machine score”) sera **à toi**, calibré sur tes données, ton périmètre (PSG vs PL), et tes marchés (1N2 vs corners).

Et non, on ne “redéveloppe pas” inutilement : on va **réutiliser** au maximum :

* métriques standard
* calibration standard
* scoring standard “multi-objectif”

Puis faire une couche de décision propre (gating + champion selection) adaptée à ton système.

---

# 3) Risk & Bankroll management : OK — on y va

Je te propose un cadre simple mais solide, puis on pourra le complexifier.

## A) Deux niveaux : Risk de modèle et risk de portefeuille

### 1) Risk de modèle (avant même de parier)

On attribue un **Confidence Score** 0–100 qui conditionne :

* le volume de bets autorisé
* la taille de mise max
* l’accès à certains marchés

**Composants documentés/standard** :

* Calibration (Expected Calibration Error)
* Stabilité inter-saisons (std des metrics)
* Drift récent (delta sur dernières saisons)
* Data completeness (coverage)
* CLV (si dispo)

> Ces éléments sont “connus”, mais ta pondération/threshold sera custom.

### 2) Risk de portefeuille (exposition)

Limiter :

* exposition par équipe
* exposition par marché
* exposition par journée (round)
* exposition par corrélation (même match, même side, mêmes drivers)

---

## B) Taille de mise : 3 modes (du plus safe au plus agressif)

### Mode 1 — Flat staking (recommandé pour démarrer)

* Mise fixe : 1u par bet
* OU 0.5u si confidence < 60
* OU 0 bet si confidence < 40

✅ ultra robuste, pas de ruine par surconfiance

---

### Mode 2 — Fractional Kelly (quand CLV & calibration sont solides)

Pour une probabilité modèle `p`, une cote `o` :

* gain net `b = o - 1`
* Kelly : `f* = (p*b - (1-p)) / b`
* Fractional Kelly : `stake = bankroll * k * max(0, f*)`, avec `k` typiquement 0.1 à 0.25.

Garde-fous :

* cap par bet (ex: 2% bankroll)
* cap par journée (ex: 10% bankroll)

---

### Mode 3 — Hybrid (le meilleur en prod)

* Flat stake par défaut
* Kelly uniquement si :

  * confidence > 75
  * CLV moyen positif sur période récente
  * drift faible

---

## C) “Exposure rules” (anti-corrélation)

### Règles simples et efficaces

* Max 1 bet par match (sauf marchés non corrélés, option)
* Max 3 bets impliquant la même équipe par journée
* Max 30% des mises sur un seul marché (ex: corners)
* Si plusieurs bets sont très corrélés (ex: Home win + HT home win) :

  * réduire les stakes via un “correlation penalty” (ex: *0.6*)

---

## D) Risk “data-driven” : Pre-lineup vs Post-lineup

Tu dois tagger chaque recommandation :

* **PRE-LINEUP** : incertitude plus élevée → stake réduit
* **POST-LINEUP** : stake normal

Règle :

* PRE-LINEUP : stake × 0.5 + threshold edge plus élevé
* POST-LINEUP : stake standard

---

## E) Arrêt automatique (circuit breaker)

Hyper important pour éviter de “ruiner” la machine en cas de bug ou drift.

Déclencheurs :

* drawdown > X% (ex: 15%)
* CLV moyen négatif sur N bets (ex: 50)
* baisse brutale de calibration récente
* explosion du nombre de bets (bug de threshold)

Actions :

* stop betting
* lancer “drift audit run”
* désactiver champion si gate échoue

---

# Prochaine brique : Formule exacte de “Champion Scoring” (math)

Tu avais demandé le #2 : on peut maintenant définir une **formule composite** claire, documentée dans l’esprit (multi-métriques), mais customisée.

Exemple (pour 1N2) :

**Score =**

* 0.45 * normalized(LogLoss)
* 0.20 * normalized(CalibrationError)
* 0.20 * normalized(StabilityPenalty)
* 0.15 * normalized(RecentPerformancePenalty)

Et pour corners/cards :

* deviance + MAE + stability + recent

Ensuite “champion = plus petit score” sous contraintes de gates.

Si tu veux, je te propose :

* la formule exacte (avec normalisation, pénalités, seuils)
* et comment elle change selon : PL vs Ligue 1 vs PSG-focused.

Je pars là-dessus ?
