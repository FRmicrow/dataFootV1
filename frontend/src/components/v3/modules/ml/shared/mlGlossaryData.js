export const ML_GLOSSARY_TERMS = {
    hit_rate: {
        term: 'Hit rate',
        definition: "Part des prédictions correctes sur l'échantillon observé. C'est la lecture la plus simple du niveau de justesse.",
    },
    brier_score: {
        term: 'Brier score',
        definition: "Mesure la qualité des probabilités prédites. Plus il est bas, plus le modèle est bien calibré.",
    },
    log_loss: {
        term: 'Log loss',
        definition: "Pénalise fortement les probabilités trop confiantes lorsqu'elles sont fausses. Indicateur clé pour FT et HT.",
    },
    mae_total: {
        term: 'MAE total',
        definition: "Écart absolu moyen entre le total attendu et le total réel. Utilisé pour goals, corners et cards.",
    },
    roi: {
        term: 'ROI',
        definition: "Retour simulé sur les paris historiques disponibles. Sert à lire la valeur économique, pas seulement la justesse statistique.",
    },
    shadow_model: {
        term: 'Shadow model',
        definition: "Modèle spécialisé calculé en parallèle du global pour être comparé sans prendre la main en production.",
    },
    horizon: {
        term: 'Horizon',
        definition: "Fenêtre d'historique utilisée pour entraîner le modèle: FULL, 5Y ou 3Y selon le marché.",
    },
    fair_odd: {
        term: 'Fair odd',
        definition: "Cote théorique dérivée de la probabilité du modèle, sans marge bookmaker.",
    },
    expected_total: {
        term: 'Total attendu',
        definition: "Estimation du volume attendu sur un marché de total: buts, corners ou cartons.",
    },
    control_bar: {
        term: 'Control bar',
        definition: "Barre de navigation et de filtres du ML Hub. Elle doit rester lisible au scroll et sur écran réduit.",
    },
};

export const ML_GLOSSARY_GROUPS = {
    models: ['hit_rate', 'brier_score', 'log_loss', 'horizon', 'shadow_model'],
    performance: ['roi', 'hit_rate', 'brier_score', 'log_loss', 'mae_total'],
    foresight: ['fair_odd', 'expected_total', 'shadow_model', 'horizon'],
    analytics: ['hit_rate', 'brier_score', 'log_loss', 'mae_total', 'shadow_model'],
};
