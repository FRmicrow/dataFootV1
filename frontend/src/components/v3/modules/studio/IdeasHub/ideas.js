/**
 * Catalogue des "idées du jour" — 5 contenus pré-préparés, prêts à publier.
 *
 * Chaque idée associe :
 *   - un template (id du registry)
 *   - un preset de thème / aspect
 *   - un hook V4 + params pour récupérer la vraie data (fallback demo auto)
 *   - des copies sociales (FR/EN, Twitter/IG) directement issues de
 *     content/hot-topics/2026-04-20/tweets.md
 *
 * Les hooks sont référencés par nom → résolus dans IdeaDetail via
 * useBackendForIdea(ideaId) pour éviter d'importer tous les hooks ici
 * et de polluer le bundle initial.
 */

import duoDemo from '../templates/DuoComparison/demo';
import supDemo from '../templates/StatSupremacy/demo';
import raceDemo from '../templates/RaceTracker/demo';
import narDemo from '../templates/NarrativeGrid/demo';
import pgDemo from '../templates/PowerGrid/demo';

export const IDEA_STATUS = {
    DRAFT: 'draft',
    READY: 'ready',
    LIVE: 'live',
};

export const IDEAS = [
    {
        id: 'real-madrid-crisis',
        status: IDEA_STATUS.READY,
        title: 'Real Madrid — la saison des fractures',
        subtitle: 'Heatmap des 10 derniers matchs',
        hookAngle: 'Crise · narrative grid',
        templateId: 'narrative-grid',
        theme: 'red-alert',
        aspectDefault: '9:16',
        hookName: 'useNarrativeBackend',
        hookParams: {
            league: 'La Liga',
            season: 2025,
            clubName: 'Real Madrid',
            limit: 10,
        },
        labels: {
            eyebrow: 'Real Madrid · 2025-26',
            headline: 'La chute en 10 matchs',
            subtitle: 'Résultat · xG diff · possession · moral',
            takeaway: 'Saison d\'apprentissage pour Xabi Alonso. Rien n\'est tombé, tout a fléchi.',
        },
        demoFallback: narDemo,
        copies: {
            twitter: {
                fr: [
                    {
                        variant: 'Scène',
                        body:
                            'Camavinga pleure dans le vestiaire.\nVinícius refuse d\'entrer en 2e mi-temps.\nAlonso fixe le banc.\nLe Real 2026 est une série Netflix. Saison finale.',
                    },
                    {
                        variant: 'Bilan',
                        body:
                            'UCL : éliminé.\nLaLiga : 9 pts derrière.\nCopa : out.\nMbappé : genou KO.\nLa première saison d\'Alonso se résume en un mot : apprentissage.',
                    },
                    {
                        variant: 'Casting',
                        body:
                            'Yamal demande un vrai n°9 au Barça.\nPSG prépare 350 M€ pour Yamal.\nReal demande Yamal. Réponse : « aucune chance ».\nLa hiérarchie du foot européen se réécrit sans Madrid.',
                    },
                ],
                en: [
                    {
                        variant: 'Scene',
                        body:
                            'Camavinga crying in the dressing room.\nVinícius refusing to come on in the 2nd half.\nAlonso staring at the bench.\nReal Madrid 2026 is a Netflix series. Final season.',
                    },
                    {
                        variant: 'Scoreboard',
                        body:
                            'UCL: out.\nLaLiga: 9 pts behind.\nCopa: out.\nMbappé: knee injury.\nXabi Alonso\'s first season, in one word: education.',
                    },
                    {
                        variant: 'Power shift',
                        body:
                            'Yamal tells Barça to sign a proper 9.\nPSG prep €350M bid for Yamal.\nReal ask about Yamal. Answer: "no chance."\nEuropean football\'s top table is being reshuffled — without Madrid.',
                    },
                ],
            },
            instagram: {
                fr:
                    'Real Madrid 2025-26 — les 10 derniers matchs en chaleur (ou en froid). Résultat, xG diff, possession, moral. Chaque case, une histoire. 👀\n\n#RealMadrid #LaLiga #statFoot',
                en:
                    'Real Madrid 2025-26 — their last 10 games in heat signatures. Result, xG diff, possession, momentum. Each cell tells a story. 👀\n\n#RealMadrid #LaLiga #statFoot',
            },
        },
        hashtags: ['#RealMadrid', '#LaLiga', '#Alonso'],
    },

    {
        id: 'pl-title-race',
        status: IDEA_STATUS.READY,
        title: 'Premier League — la course au titre',
        subtitle: 'Arsenal · Liverpool · City',
        hookAngle: 'Race tracker · évolution cumulée',
        templateId: 'race-tracker',
        theme: 'dark-observatory',
        aspectDefault: '9:16',
        hookName: 'useRaceBackend',
        hookParams: {
            league: 'Premier League',
            season: 2025,
            teams: ['Arsenal', 'Liverpool', 'Manchester City'],
        },
        labels: {
            eyebrow: 'Premier League · 2025-26',
            headline: 'La course au titre — J1 → aujourd\'hui',
            takeaway: '5 journées. La pression a changé de camp.',
        },
        demoFallback: raceDemo,
        copies: {
            twitter: {
                fr: [
                    {
                        variant: 'Choc',
                        body:
                            '9 points d\'avance en février.\n3 points d\'avance, match en moins, en avril.\nArsenal a fait l\'exploit de rendre la PL intéressante.',
                    },
                    {
                        variant: 'Haaland',
                        body:
                            '1 but sur 6 matchs. Puis le but qui tue Arsenal.\nHaaland ne joue pas le championnat comme un humain.',
                    },
                    {
                        variant: 'Scénario',
                        body:
                            'Si City bat Burnley mercredi : ils passent leaders à la diff de buts.\n5 journées. La pression a changé de camp.',
                    },
                ],
                en: [
                    {
                        variant: 'Shock',
                        body:
                            '9-point lead in February.\n3 points with a game in hand — for City — in April.\nArsenal just made the PL interesting again.',
                    },
                    {
                        variant: 'Haaland',
                        body:
                            '1 goal in 6. Then the killer at the Etihad.\nHaaland doesn\'t play seasons like a human.',
                    },
                    {
                        variant: 'Scenario',
                        body:
                            'City beat Burnley Wednesday → top on goal difference.\n5 games to go. The pressure just switched shirts.',
                    },
                ],
            },
            instagram: {
                fr:
                    'La course au titre en PL, dans une seule courbe. J1 → aujourd\'hui. Qui craque le premier ?\n\n#PremierLeague #Arsenal #Liverpool #ManCity',
                en:
                    'The PL title race, one curve, top to bottom. Who cracks first?\n\n#PremierLeague #Arsenal #Liverpool #ManCity',
            },
        },
        hashtags: ['#PremierLeague', '#PL', '#titlerace'],
    },

    {
        id: 'haaland-kane-supremacy',
        status: IDEA_STATUS.READY,
        title: 'Haaland & Kane — les meilleurs buteurs',
        subtitle: 'Top 4 buts · Premier League 2025-26',
        hookAngle: 'Stat supremacy · top scorers',
        templateId: 'stat-supremacy',
        theme: 'editorial',
        aspectDefault: '9:16',
        hookName: 'useSupremacyBackend',
        hookParams: {
            league: 'Premier League',
            season: 2025,
            sortField: 'goals',
            limit: 4,
        },
        labels: {
            eyebrow: 'Premier League · 2025-26',
            headline: 'Les 4 buteurs qui écrivent la saison',
            heroLabel: 'cumulés par le top 2 PL 2025-26',
        },
        demoFallback: supDemo,
        copies: {
            twitter: {
                fr: [
                    {
                        variant: 'Chiffre',
                        body:
                            'Haaland + Kane en 2025-26 :\nun cumul de buts supérieur à 7 équipes de PL.\nLa supériorité stat, c\'est aussi une identité.',
                    },
                    {
                        variant: 'Angle',
                        body:
                            'Kane a 33 ans. Haaland en a 25.\nLe cumul de leurs saisons actuelles est monstrueux.\nUne génération ne finit jamais où elle commence.',
                    },
                    {
                        variant: 'Scénario',
                        body:
                            'Kane finit la saison avec son meilleur ratio en carrière.\nHaaland finit avec son plus faible ratio en Bundesliga + PL.\nEt pourtant, ils dominent. C\'est ça la supériorité.',
                    },
                ],
                en: [
                    {
                        variant: 'Number',
                        body:
                            'Haaland + Kane in 2025-26:\ncombined goals > 7 PL teams this season.\nStat dominance is a brand.',
                    },
                    {
                        variant: 'Angle',
                        body:
                            'Kane is 33. Haaland is 25.\nTheir combined current seasons are monstrous.\nA generation never ends where it begins.',
                    },
                    {
                        variant: 'Scenario',
                        body:
                            'Kane: career-best ratio.\nHaaland: worst ratio in Bundesliga + PL.\nAnd they still dominate. That\'s supremacy.',
                    },
                ],
            },
            instagram: {
                fr:
                    'Top 4 buteurs PL 2025-26. Un chiffre, une hiérarchie.\nHaaland + Kane = une ère.\n\n#PremierLeague #Haaland #Kane #statFoot',
                en:
                    'Top 4 PL scorers, 2025-26. One number, one hierarchy.\nHaaland + Kane = an era.\n\n#PremierLeague #Haaland #Kane #statFoot',
            },
        },
        hashtags: ['#PremierLeague', '#Haaland', '#Kane'],
    },

    {
        id: 'bayern-wings-duo',
        status: IDEA_STATUS.DRAFT,
        title: 'Díaz + Olise — l\'écho Robben-Ribéry',
        subtitle: 'Duel de duos sur la même DA',
        hookAngle: 'Duo comparison · légende vs nouvelle génération',
        templateId: 'duo-comparison',
        theme: 'noir-gold',
        aspectDefault: '9:16',
        hookName: 'useDuoBackend',
        hookParams: {
            league: 'Bundesliga',
            season: 2025,
            leftPlayers: ['Luis Diaz', 'Michael Olise'],
            rightPlayers: ['Robben', 'Ribéry'],
            labels: {
                leftHeading: 'Díaz × Olise',
                rightHeading: 'Robben × Ribéry',
                title: 'Wings of a generation',
                subtitle: 'Bundesliga · 2025-26 vs 2012-13',
                verdict: 'Le dribble change de couleur, la fonction reste.',
            },
        },
        labels: {
            title: 'Wings of a generation',
            subtitle: 'Bundesliga · 2025-26 vs 2012-13',
        },
        demoFallback: duoDemo,
        copies: {
            twitter: {
                fr: [
                    {
                        variant: 'Écho',
                        body:
                            'Bayern, 2012 : Robben + Ribéry rentraient sur leur pied fort et faisaient basculer des finales.\nBayern, 2026 : Díaz + Olise font exactement la même chose.\nLa fonction reste. Le style change.',
                    },
                    {
                        variant: 'Tactique',
                        body:
                            'Díaz rentre à droite. Olise rentre à gauche.\nLe jeu du Bayern a retrouvé sa mécanique à ailiers inversés.\nKompany n\'a rien inventé. Il a réactivé.',
                    },
                    {
                        variant: 'Duel',
                        body:
                            'Díaz + Olise 2025-26 vs Robben + Ribéry 2012-13.\nLes chiffres ne mentent pas — ils rappellent.',
                    },
                ],
                en: [
                    {
                        variant: 'Echo',
                        body:
                            'Bayern, 2012: Robben + Ribéry cut inside on their strong foot and broke finals.\nBayern, 2026: Díaz + Olise do the exact same thing.\nFunction stays. Style changes.',
                    },
                    {
                        variant: 'Tactical',
                        body:
                            'Díaz cuts in from the right. Olise cuts in from the left.\nBayern\'s inverted-winger engine is back.\nKompany didn\'t invent it. He reactivated it.',
                    },
                    {
                        variant: 'Duel',
                        body:
                            'Díaz + Olise 2025-26 vs Robben + Ribéry 2012-13.\nThe numbers don\'t lie — they echo.',
                    },
                ],
            },
            instagram: {
                fr:
                    'Bayern, une fonction, deux époques. Díaz + Olise rappellent Robben + Ribéry. Visuel duel, 100% DA Noir & Gold.\n\n#Bayern #Bundesliga #Diaz #Olise',
                en:
                    'Bayern, one role, two eras. Díaz + Olise echoing Robben + Ribéry. Duel visual, pure Noir & Gold DA.\n\n#Bayern #Bundesliga #Diaz #Olise',
            },
        },
        hashtags: ['#Bayern', '#Bundesliga', '#Diaz', '#Olise'],
    },

    {
        id: 'wc2026-power-ranking',
        status: IDEA_STATUS.DRAFT,
        title: 'Mondial 2026 — J-52',
        subtitle: 'Power ranking des favoris',
        hookAngle: 'Power grid · foresight',
        templateId: 'power-grid',
        theme: 'tactical-board',
        aspectDefault: '9:16',
        hookName: 'usePowerGridBackend',
        hookParams: {
            mode: 'foresight',
            limit: 12,
            labels: {
                eyebrow: 'World Cup 2026 · J-52',
                headline: 'Power ranking — probas de titre',
                columns: 3,
            },
        },
        labels: {
            headline: 'Mondial 2026 — qui part favori ?',
        },
        demoFallback: pgDemo,
        copies: {
            twitter: {
                fr: [
                    {
                        variant: 'Compte à rebours',
                        body:
                            'J-52 avant le coup d\'envoi.\n48 équipes. 16 villes. 3 pays.\nPremier Mondial à cette échelle.',
                    },
                    {
                        variant: 'Histoire',
                        body:
                            'Tori Penso sera la première femme arbitre américaine à officier à un Mondial masculin.\n2026, c\'est aussi ça.',
                    },
                    {
                        variant: 'Ouverture',
                        body:
                            '11 juin 2026, Estadio Azteca.\nMexique ouvre un Mondial pour la 3e fois.\nLe seul stade qui peut dire ça.',
                    },
                ],
                en: [
                    {
                        variant: 'Countdown',
                        body:
                            '52 days to kickoff.\n48 teams. 16 cities. 3 nations.\nFirst World Cup at this scale.',
                    },
                    {
                        variant: 'History',
                        body:
                            'Tori Penso will be the first American woman to ref a men\'s World Cup.\n2026 is also this. Quiet headline. Loud shift.',
                    },
                    {
                        variant: 'Opening',
                        body:
                            'June 11, 2026, Estadio Azteca.\nMexico opens a World Cup for the 3rd time.\nNo other stadium can say that.',
                    },
                ],
            },
            instagram: {
                fr:
                    'J-52 avant le Mondial 2026. Power ranking des 12 favoris, DA Tactical Board. 48 équipes, 16 villes, 3 pays.\n\n#WorldCup2026 #statFoot',
                en:
                    '52 days to World Cup 2026. Power ranking, top 12 contenders, Tactical Board DA. 48 teams, 16 cities, 3 nations.\n\n#WorldCup2026 #statFoot',
            },
        },
        hashtags: ['#WorldCup2026', '#FIFA'],
    },
];

/** @param {string} id */
export function getIdea(id) {
    return IDEAS.find((i) => i.id === id) || null;
}
