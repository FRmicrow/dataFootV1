import React, { useState } from 'react';
import { Card, Badge } from '../../../../design-system';
import './MLGlossary.css';

const SECTIONS = [
    {
        id: 'tabs',
        title: 'Guide des Onglets',
        icon: '🗺️',
        color: 'var(--color-text-primary)',
        terms: [
            {
                term: '🔬 Modèles',
                definition: 'Catalogue de tous les modèles ML déployés, organisés par ligue selon leur importance. Pour chaque modèle tu retrouves : la version, les features utilisées lors de l\'entraînement, les métriques de performance réelles (Hit Rate, Brier Score calculés depuis l\'historique), et un exemple de prédiction sur des équipes réelles de la ligue.'
            },
            {
                term: '📊 Performance',
                definition: 'Lab d\'analyse des résultats. Comporte un ROI Calculator qui simule un historique de paris réels (basé sur les prédictions passées avec odds bookmaker disponibles) avec courbe d\'équité. Vue par ligue (accordion par saison), par club (hit rate individuel) et par marché. Seules les ligues/saisons ayant des odds historiques sont disponibles dans le calculateur.'
            },
            {
                term: '🔭 Prévisions',
                definition: 'Vue opérationnelle en deux sections. Section A : matchs à venir pour tes ligues favorites (configurable), avec toutes les prédictions par marché. Section B : Top Edges toutes compétitions, classés par Power Score (combinaison edge + confiance). Nécessite une synchronisation des odds bookmaker pour afficher les edges (bouton "Sync Odds" dans l\'onglet Système).'
            },
            {
                term: '🧬 Sub-Models',
                definition: 'Constructeur de modèles spécialisés sur mesure. Permet de créer un modèle scopé sur une ligue précise, un type de marché, et un horizon temporel. Le nom est auto-généré au format standardisé (ex: PL-FT-FULL pour Premier League / Full Time / Historique complet). Utilise le pipeline Forge existant pour l\'entraînement.'
            },
            {
                term: '📖 Glossaire',
                definition: 'Cette page. Référence personnelle de tous les concepts ML, métriques et termes techniques utilisés dans le module. Organisée en 6 sections : Guide des Onglets, Métriques, Concepts Modèles, Features & Données, Pipeline & Processus, Trading & Edge.'
            },
            {
                term: '⚙️ Système',
                definition: 'Mission Control du hub ML. Affiche le statut en temps réel des services (ML Service Python, base PostgreSQL), les résultats de performance par ligue, et le feed des dernières analyses. Contient les actions rapides : synchronisation des odds (requis pour les edges), simulation bulk toutes ligues, et déclenchement du réentraînement.'
            },
        ]
    },
    {
        id: 'metrics',
        title: 'Métriques de Performance',
        icon: '📐',
        color: 'var(--color-accent)',
        terms: [
            {
                term: 'Hit Rate',
                definition: 'Taux de succès brut des prédictions. Proportion de prédictions correctes sur le total des paris simulés. Un modèle aléatoire sur 1X2 atteint ~33%. Au-dessus de 50% sur du volume, c\'est significatif.',
                formula: 'Hit Rate = Prédictions correctes / Total prédictions'
            },
            {
                term: 'Brier Score',
                definition: 'Mesure de calibration probabiliste. Évalue si les probabilités prédites sont "bien calibrées" : si le modèle prédit 70%, le résultat doit arriver ~70% du temps. Valeur 0 = parfait, valeur 1 = nul.',
                formula: 'Brier = (1/N) × Σ (probabilité_prédite − résultat_réel)²'
            },
            {
                term: 'ROI (Return on Investment)',
                definition: 'Retour sur investissement simulé si on parie le montant défini sur chaque recommandation du modèle aux cotes bookmaker disponibles. Positif = rentable en théorie. ⚠️ Basé sur l\'historique passé, pas une garantie future.',
                formula: 'ROI = (Profit total / Total misé) × 100'
            },
            {
                term: 'Calibration',
                definition: 'Qualité de l\'alignement entre probabilités prédites et fréquences observées. Un modèle bien calibré qui prédit 60% de victoire à domicile doit avoir ~60% de victoires dans cet ensemble. Mesuré via Brier Score ou courbe de fiabilité.',
            },
            {
                term: 'Max Drawdown',
                definition: 'Perte maximale cumulée depuis le pic de la courbe d\'équité. Exemple : portefeuille à 1200€ qui tombe à 900€ = drawdown de 25%. Indicateur clé du risque de ruine.',
                formula: 'Drawdown = (Pic − Creux) / Pic × 100'
            },
            {
                term: 'Equity Curve',
                definition: 'Courbe d\'évolution du portefeuille au fil des paris. Une courbe régulièrement croissante indique un edge stable. Des zigzags brutaux signalent de la variance ou un manque de volume.',
            },
        ]
    },
    {
        id: 'models',
        title: 'Concepts Modèles',
        icon: '🤖',
        color: 'var(--color-info)',
        terms: [
            {
                term: 'CatBoost',
                definition: 'Algorithme de Gradient Boosting développé par Yandex. Particulièrement performant sur les données tabulaires avec variables catégorielles. Utilisé pour tous les modèles de prédiction du projet.',
            },
            {
                term: 'Overfitting',
                definition: 'Surajustement : le modèle "apprend par cœur" les données d\'entraînement et perd sa capacité à généraliser sur de nouvelles données. Signe : performance excellente en entraînement, médiocre en simulation chronologique.',
            },
            {
                term: 'Feature Importance',
                definition: 'Score attribué à chaque feature indiquant sa contribution à la prédiction. Les features à haute importance ont le plus d\'impact sur la décision du modèle. CatBoost calcule cela via le gain moyen d\'information.',
            },
            {
                term: 'Temporal Leakage',
                definition: 'Fuite temporelle : utilisation accidentelle de données futures lors de l\'entraînement. Exemple : utiliser la forme de décembre pour prédire un match d\'octobre. Évitée via le LeagueReplayEngine (entraînement chronologique strict).',
            },
            {
                term: 'Walk-Forward Validation',
                definition: 'Méthode de validation qui entraîne le modèle sur les données passées et teste sur les données futures immédiates, puis avance dans le temps. Simule la vraie mise en production et évite le leakage.',
            },
            {
                term: 'Champion Model',
                definition: 'Le modèle actif pour la production, marqué is_active=true dans le registre. Remplace le précédent uniquement si ses métriques (Brier + Hit Rate) sont supérieures sur la période de validation.',
            },
        ]
    },
    {
        id: 'features',
        title: 'Features & Données',
        icon: '🗃️',
        color: 'var(--color-success)',
        terms: [
            {
                term: 'xG (Expected Goals)',
                definition: 'Buts attendus : probabilité qu\'un tir aboutisse à un but, calculée à partir de la position, du type d\'action et du contexte. Un xG > buts réels = équipe "sous-performante" et vice versa.',
            },
            {
                term: 'Form Window',
                definition: 'Fenêtre des N derniers matchs utilisée pour calculer la forme récente. Typiquement 5 ou 10 matchs. Fenêtre trop courte = bruit. Trop longue = ignore les changements de dynamique.',
            },
            {
                term: 'H2H (Head-to-Head)',
                definition: 'Confrontations directes entre deux équipes. Features H2H : taux de victoire, taux de nuls, buts moyens. Pertinents pour les derbys et les rivalités mais limités par le manque de volume.',
            },
            {
                term: 'Feature Store',
                definition: 'Table de cache (V3_ML_Feature_Store) qui pré-calcule et stocke les features pour chaque fixture. Évite de recalculer à chaque prédiction et garantit la cohérence entraînement/inférence.',
            },
            {
                term: 'Temporal Features',
                definition: 'Features calculées en respectant la chronologie (pas de données futures). Générées par la TemporalFeatureFactory du ml-service. Exemple : forme calculée uniquement sur les matchs AVANT la date cible.',
            },
            {
                term: 'Home Advantage Factor',
                definition: 'Facteur d\'avantage terrain calculé par ligue et par période. Varie selon le niveau de compétition : très fort en leagues mineures, plus faible dans les grandes ligues (globalement en baisse post-COVID).',
            },
        ]
    },
    {
        id: 'pipeline',
        title: 'Pipeline & Processus',
        icon: '⚙️',
        color: 'var(--color-warning)',
        terms: [
            {
                term: 'Forge',
                definition: 'Pipeline d\'entraînement et d\'évaluation des modèles par ligue. Forge = Orchestrateur qui sélectionne les données, entraîne le modèle, évalue ses performances et l\'enregistre dans V3_Model_Registry.',
            },
            {
                term: 'LeagueReplayEngine',
                definition: 'Moteur de simulation chronologique. Rejoue une saison entière match par match en temps réel pour évaluer les performances sans data leakage. Génère les métriques Hit Rate et Brier Score du Performance Lab.',
            },
            {
                term: 'Backfill',
                definition: 'Processus de remplissage rétroactif : calcul des features ou prédictions sur l\'historique. Utile pour initialiser un nouveau type de feature sur des données passées.',
            },
            {
                term: 'Horizon Type',
                definition: 'Durée de l\'historique utilisé pour l\'entraînement. FULL_HISTORICAL = tout l\'historique disponible. 5Y_ROLLING = 5 dernières saisons glissantes. 3Y_ROLLING = 3 dernières saisons (plus réactif, moins stable).',
            },
            {
                term: 'V3_Risk_Analysis',
                definition: 'Table centrale du système de prédictions. Pour chaque fixture + marché, stocke : probabilité ML, cote fair, cote bookmaker et edge calculé. Alimentée par le Risk Engine (Python) après chaque prédiction.',
            },
            {
                term: 'Odds Sync',
                definition: 'Synchronisation des cotes bookmaker pour les fixtures à venir. Sans sync, les edges ne peuvent pas être calculés (bookmaker_odd = NULL dans V3_Risk_Analysis). Déclenché via le bouton "Sync Odds" dans l\'onglet Système.',
            },
        ]
    },
    {
        id: 'trading',
        title: 'Trading & Edge',
        icon: '💰',
        color: 'var(--color-error)',
        terms: [
            {
                term: 'Value / Edge',
                definition: 'Différence entre la probabilité ML et la probabilité implicite des cotes bookmaker. Edge positif = le modèle estime que le bookmaker sous-évalue un résultat. Exemple : ML prédit 65%, cotes impliquent 55% → edge de +10%.',
                formula: 'Edge = mlProbabilité − (1 / coteBookmaker) × 100'
            },
            {
                term: 'Probabilité Implicite',
                definition: 'Probabilité "cachée" dans une cote bookmaker. Cote 2.00 → 50% implicite. Cote 1.50 → 66.7% implicite. Inclut la marge bookmaker (overround), donc la somme des proba implicites dépasse 100%.',
                formula: 'Prob. implicite = 1 / Cote × 100'
            },
            {
                term: 'Power Score',
                definition: 'Score composite (0-100) qui combine edge et confiance du modèle pour prioriser les meilleures opportunités. ELITE ≥ 80, STRONG ≥ 60, MODERATE ≥ 40, WEAK < 40.',
                formula: 'PowerScore = Edge × mlProbabilité (normalisé 0-100)'
            },
            {
                term: 'EV (Expected Value)',
                definition: 'Valeur attendue d\'un pari. EV positif = le pari est théoriquement profitable à long terme. Calculé en combinant la probabilité ML et la cote bookmaker. EV > 0 est la condition nécessaire (mais non suffisante) pour parier.',
                formula: 'EV = (mlProb × Gain net) − ((1 − mlProb) × Mise)'
            },
            {
                term: 'Bankroll Management',
                definition: 'Gestion du capital. La mise fixe (Flat Betting) est utilisée dans le ROI Calculator. Règle d\'or : ne jamais miser plus de 2-5% du bankroll total sur un seul pari pour survivre à la variance.',
            },
            {
                term: 'Critère de Kelly',
                definition: 'Formule mathématique calculant la mise optimale en fonction de l\'edge et de la cote pour maximiser la croissance du bankroll à long terme. Kelly plein est agressif : la plupart utilisent Kelly fractionné (1/4 ou 1/2 Kelly).',
                formula: 'f = (b×p − q) / b  [b=cote nette, p=prob ML, q=1−p]'
            },
        ]
    },
];

const GlossaryTerm = ({ term, definition, formula }) => (
    <div className="ml-glossary__term">
        <h4 className="ml-glossary__term-name">{term}</h4>
        <p className="ml-glossary__term-def">{definition}</p>
        {formula && (
            <div className="ml-glossary__formula">
                <code>{formula}</code>
            </div>
        )}
    </div>
);

const MLGlossary = () => {
    const [activeSection, setActiveSection] = useState(null);

    return (
        <div className="ml-glossary">
            <div className="ml-glossary__header">
                <h2 className="ml-glossary__title">📖 Glossaire ML</h2>
                <p className="ml-glossary__subtitle">Guide de référence personnel — {SECTIONS.reduce((acc, s) => acc + s.terms.length, 0)} termes</p>
            </div>

            <div className="ml-glossary__nav">
                {SECTIONS.map(s => (
                    <button
                        key={s.id}
                        className={`ml-glossary__nav-btn ${activeSection === s.id ? 'ml-glossary__nav-btn--active' : ''}`}
                        style={{ '--section-color': s.color }}
                        onClick={() => setActiveSection(activeSection === s.id ? null : s.id)}
                    >
                        {s.icon} {s.title}
                        <span className="ml-glossary__nav-count">{s.terms.length}</span>
                    </button>
                ))}
            </div>

            <div className="ml-glossary__sections">
                {SECTIONS.filter(s => activeSection === null || s.id === activeSection).map(section => (
                    <section key={section.id} className="ml-glossary__section">
                        <div className="ml-glossary__section-header" style={{ '--section-color': section.color }}>
                            <span className="ml-glossary__section-icon">{section.icon}</span>
                            <h3 className="ml-glossary__section-title">{section.title}</h3>
                            <Badge style={{ background: section.color, color: '#fff', border: 'none' }}>
                                {section.terms.length}
                            </Badge>
                        </div>
                        <Card className="ml-glossary__section-card">
                            {section.terms.map((t, i) => (
                                <React.Fragment key={i}>
                                    <GlossaryTerm {...t} />
                                    {i < section.terms.length - 1 && <div className="ml-glossary__term-divider" />}
                                </React.Fragment>
                            ))}
                        </Card>
                    </section>
                ))}
            </div>
        </div>
    );
};

export default MLGlossary;
