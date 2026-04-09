export class CompetitionRanker {
    /**
     * @param {Object} league - { name, type, country_name }
     * @returns {number} - 1 (Top), 2 (High), 3 (Medium), 4+ (Low)
     */
    static calculate(league) {
        const name = (league.name || '').toLowerCase();
        const typeNormalized = this.detectType(league);
        const country = (league.country_name || '').toLowerCase();

        // 0. Base Case: Standard vs Qualifications/Playoffs
        const isQualification = name.includes('qualification') || name.includes('qualifying');
        const isPlayoff = name.includes('play-off') || name.includes('relegation') || name.includes('promotion');

        // 1. International National
        const nationalRank = this.#rankInternationalNational(name, country);
        if (nationalRank) return nationalRank;

        // 2. International Club
        const clubRank = this.#rankInternationalClub(name, country);
        if (clubRank) return clubRank;

        // 3. Domestic Competitions (Leagues)
        const leagueRank = this.#rankDomesticLeague(name, isPlayoff);
        if (leagueRank) return leagueRank;

        if (typeNormalized === 'League' || !typeNormalized) {
            return isQualification || isPlayoff ? 4 : 3;
        }

        if (typeNormalized === 'Cup') {
            return this.#rankDomesticCup(name);
        }

        return 3; // Fallback
    }

    /**
     * Enhanced type detection for Leagues vs Cups
     */
    static detectType(league) {
        const name = (league.name || '').toLowerCase();
        const type = (league.type || '').toLowerCase();

        // High priority keywords for Cups
        const cupKeywords = [
            'cup', 'copa', 'coupe', 'coppa', 'pokal', 'beker', 'taca', 'taça', 'kupa', 'trophy', 
            'shield', 'super cup', 'supercup', 'supercopa', 'supercoupe', 'league cup'
        ];
        
        // High priority keywords for Leagues
        const leagueKeywords = [
            'league', 'liga', 'ligue', 'division', 'bundesliga', 'serie a', 'serie b', 'championship', 
            'premiership', 'eredivisie', 'mls', 'a-league', 'pro league'
        ];

        if (cupKeywords.some(k => name.includes(k))) return 'Cup';
        if (leagueKeywords.some(k => name.includes(k))) return 'League';

        // Fallback to provided type if normalized
        if (type === 'cup') return 'Cup';
        if (type === 'league') return 'League';

        return 'League'; // Default
    }

    /**
     * Calculates a Global Importance Score (GIS)
     * Lower is better.
     */
    static calculateGlobalScore(countryRank, leagueRank, name, isCup) {
        let score = (countryRank * 100); // Base country weight
        score += (leagueRank * 10);      // Tier weight

        const nameLower = name.toLowerCase();
        
        // Penalty for secondary tiers or playoffs
        if (nameLower.includes('qualification') || nameLower.includes('qualifying')) score += 50;
        if (nameLower.includes('play-off') || nameLower.includes('relegation') || nameLower.includes('promotion')) score += 30;

        // Advantage for leagues over cups of same tier
        if (isCup) score += 5;

        return score;
    }

    static #rankInternationalNational(name, country) {
        if (country === 'world' && !name.includes('club')) {
            if (name.includes('world cup') || name.includes('euro') || name.includes('copa america') ||
                name.includes('africa cup') || name.includes('asian cup') || name.includes('olympics')) {
                return 1;
            }
            if (name.includes('nations league')) return 2;
            return 3;
        }
        return null;
    }

    static #rankInternationalClub(name, country) {
        if (country === 'world' || name.includes('champions league') || name.includes('europa') || name.includes('conference league')) {
            if (name.includes('champions league') || name.includes('libertadores')) return 1;
            if (name.includes('europa league') || name.includes('sudamericana')) return 2;
            if (name.includes('conference league')) return 3;
            if (name.includes('championships') || name.includes('club world cup')) return 1;
        }
        return null;
    }

    static #rankDomesticLeague(name, isPlayoff) {
        const isTier1 = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").startsWith('premier league') || 
            name.startsWith('ligue 1') || name.startsWith('serie a') ||
            name.startsWith('bundesliga') || name.startsWith('la liga') || name.startsWith('eredivisie') ||
            name.startsWith('primeira liga') || name === 'mls' || name.startsWith('pro league') ||
            name.startsWith('a-league') || name.startsWith('super lig') || name.startsWith('superliga') ||
            name.includes('division 1') || name.includes('1. division') || name.includes('1. liga') ||
            name.startsWith('first division');

        if (isTier1) return isPlayoff ? 2 : 1;

        const isTier2 = name.includes('championship') || name.startsWith('ligue 2') || name.startsWith('serie b') ||
            name.includes('2. bundesliga') || name.includes('segunda') ||
            name.includes('2. division') || name.includes('2. liga') || name.startsWith('second division');

        if (isTier2) return isPlayoff ? 3 : 2;

        return null;
    }

    static #rankDomesticCup(name) {
        const n = name.toLowerCase();
        if (n.includes('fa cup') || n.includes('copa del rey') || n.includes('dfb pokal') ||
            n.includes('coupe de france') || n.includes('coppa italia') || n.includes('knvb beker') ||
            n.includes('taca de portugal') || n.includes('us open cup') || n === 'cup') {
            return 1;
        }
        if (n.includes('league cup') || n.includes('super cup') || n.includes('trophy') || n.includes('shield')) {
            return 2;
        }
        return 2;
    }
}
