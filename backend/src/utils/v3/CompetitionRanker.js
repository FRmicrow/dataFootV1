/**
 * Utility to calculate the importance_rank of a football competition.
 * Hierarchy from US_051:
 * - Domestic Leagues: Tier 1=1, Tier 2=2, Tier 3+=3
 * - Domestic Cups: Main=1, Secondary=2
 * - International Club: UCL=1, UEL=2, UECL=3
 * - International National: World Cup=1, Euro/Copa=1, Secondary=2
 * - Standard > Qualifications/Playoffs
 */

export class CompetitionRanker {
    /**
     * @param {Object} league - { name, type, country_name }
     * @returns {number} - 1 (Top), 2 (High), 3 (Medium), 4+ (Low)
     */
    static calculate(league) {
        const name = (league.name || '').toLowerCase();
        const type = (league.type || '').toLowerCase(); // 'League' or 'Cup'
        const country = (league.country_name || '').toLowerCase();

        // 0. Base Case: Standard vs Qualifications/Playoffs
        const isQualification = name.includes('qualification') || name.includes('qualifying');
        const isPlayoff = name.includes('play-off') || name.includes('relegation') || name.includes('promotion');

        // 1. International National
        if (country === 'world' && !name.includes('club')) {
            if (name.includes('world cup') || name.includes('euro') || name.includes('copa america') ||
                name.includes('africa cup') || name.includes('asian cup') || name.includes('olympics')) {
                return 1;
            }
            if (name.includes('nations league')) return 2;
            return 3;
        }

        // 2. International Club
        if (country === 'world' || name.includes('champions league') || name.includes('europa') || name.includes('conference league')) {
            if (name.includes('champions league') || name.includes('libertadores')) return 1;
            if (name.includes('europa league') || name.includes('sudamericana')) return 2;
            if (name.includes('conference league')) return 3;
            if (name.includes('championships') || name.includes('club world cup')) return 1;
        }

        // 3. Domestic Competitions (Leagues)
        const isTier1 = name.startsWith('premier league') || name.startsWith('ligue 1') || name.startsWith('serie a') ||
            name.startsWith('bundesliga') || name.startsWith('la liga') || name.startsWith('eredivisie') ||
            name.startsWith('primeira liga') || name === 'mls' || name.startsWith('pro league') ||
            name.startsWith('a-league') || name.startsWith('super lig') || name.startsWith('superliga') ||
            name.includes('division 1') || name.includes('1. division') || name.includes('1. liga') ||
            name.startsWith('first division');

        if (isTier1) {
            return isPlayoff ? 2 : 1;
        }

        const isTier2 = name.includes('championship') || name.startsWith('ligue 2') || name.startsWith('serie b') ||
            name.includes('2. bundesliga') || name.includes('segunda') ||
            name.includes('2. division') || name.includes('2. liga') || name.startsWith('second division');

        if (isTier2) {
            return isPlayoff ? 3 : 2;
        }

        if (type === 'league' || !type) {
            // Default to Tier 3 for other leagues or unknown types that don't match Tier 1/2
            return isQualification || isPlayoff ? 4 : 3;
        }

        if (type === 'cup') {
            // Primary National Cups
            if (name.includes('fa cup') || name.includes('copa del rey') || name.includes('dfb pokal') ||
                name.includes('coupe de france') || name.includes('coppa italia') || name.includes('knvb beker') ||
                name.includes('taca de portugal') || name.includes('us open cup') || name === 'cup') {
                return 1;
            }
            // Secondary or specialized cups (League Cup, Super Cup)
            if (name.includes('league cup') || name.includes('super cup') || name.includes('trophy') || name.includes('shield')) {
                return 2;
            }
            return 2;
        }

        return 3; // Fallback
    }
}
