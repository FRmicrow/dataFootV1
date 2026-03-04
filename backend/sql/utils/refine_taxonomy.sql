-- US-DB-001: Standardize Competition Categorization via Trophy Types

-- 1. UEFA Club (ID: 1)
UPDATE V2_competitions 
SET trophy_type_id = 1 
WHERE 
    competition_name LIKE '%UEFA Champions League%' OR 
    competition_name LIKE '%UEFA Europa League%' OR
    competition_name LIKE '%UEFA Conference League%' OR
    competition_name LIKE '%UEFA Europa Conference League%' OR
    competition_name LIKE '%UEFA Super Cup%';

-- 2. UEFA National Team (ID: 2)
UPDATE V2_competitions 
SET trophy_type_id = 2 
WHERE 
    (competition_name LIKE '%UEFA Euro%' OR 
     competition_name LIKE '%UEFA Nations League%' OR
     (competition_name LIKE '%Qualifying%' AND competition_name LIKE '%Europe%') OR
     (competition_name LIKE '%Qualifiers%' AND competition_name LIKE '%European%'))
    AND competition_name NOT LIKE '%U21%' 
    AND competition_name NOT LIKE '%U19%'
    AND competition_name NOT LIKE '%U17%'
    AND competition_name NOT LIKE '%UEFA Europa%';

-- 3. FIFA Club (ID: 3)
UPDATE V2_competitions 
SET trophy_type_id = 3 
WHERE 
    competition_name LIKE '%Club World Cup%' OR 
    competition_name LIKE '%Intercontinental Cup%';

-- 4. FIFA National Team (ID: 4)
UPDATE V2_competitions 
SET trophy_type_id = 4 
WHERE 
    (competition_name LIKE '%World Cup%' AND competition_name NOT LIKE '%Qualif%') OR 
    competition_name LIKE '%Olympics Men%' OR
    competition_name LIKE '%Confederations Cup%' OR
    (competition_name LIKE '%Friendlies%' AND (country_id IS NULL OR country_id = ''));

-- 5. Continental Club (ID: 5)
UPDATE V2_competitions 
SET trophy_type_id = 5 
WHERE 
    trophy_type_id NOT IN (1, 3) AND (
    competition_name LIKE '%Champions League%' OR 
    competition_name LIKE '%Leagues Cup%' OR 
    competition_name LIKE '%Copa Libertadores%' OR 
    competition_name LIKE '%Copa Sudamericana%' OR
    competition_name LIKE '%AFC Champions League%' OR
    competition_name LIKE '%CAF Champions League%' OR
    competition_name LIKE '%CONCACAF Champions League%' OR
    competition_name LIKE '%CAF Confederation Cup%' OR
    competition_name LIKE '%AFC Cup%'
);

-- 6. Continental National Team (ID: 6)
UPDATE V2_competitions 
SET trophy_type_id = 6 
WHERE 
    (competition_name LIKE '%Copa America%' OR 
     competition_name LIKE '%Gold Cup%' OR
     competition_name LIKE '%Africa Cup of Nations%' OR
     competition_name LIKE '%Asian Cup%' OR
     competition_name LIKE '%Qualifying%' OR 
     competition_name LIKE '%Qualifiers%')
    AND trophy_type_id != 2 AND trophy_type_id != 1;

-- 7. Domestic Super Cup (ID: 9)
UPDATE V2_competitions
SET trophy_type_id = 9
WHERE 
    competition_name LIKE '%Super Cup%' OR
    competition_name LIKE '%Supercup%' OR
    competition_name LIKE '%Supercopa%' OR
    competition_name LIKE '%Trophée des Champions%' OR
    competition_name LIKE '%Community Shield%';

-- 8. Domestic League Cup (ID: 10)
UPDATE V2_competitions
SET trophy_type_id = 10
WHERE
    competition_name LIKE '%League Cup%' OR
    competition_name LIKE '%Coupe de la Ligue%' OR
    competition_name LIKE '%EFL Cup%';

-- 9. Domestic Cup (ID: 8)
UPDATE V2_competitions 
SET trophy_type_id = 8 
WHERE 
    trophy_type_id NOT IN (1, 2, 3, 4, 5, 6, 9, 10) AND (
    competition_name LIKE '%Cup%' OR 
    competition_name LIKE '%Beker%' OR 
    competition_name LIKE '%Taça%' OR 
    competition_name LIKE '%Pokal%' OR
    competition_name LIKE '%Coupe%' OR
    competition_name LIKE '%Coppa%' OR
    (competition_name LIKE '%Copa%' AND competition_name NOT LIKE '%America%' AND competition_name NOT LIKE '%Libertadores%' AND competition_name NOT LIKE '%Sudamericana%') OR
    (competition_name LIKE '%Friendlies%' AND country_id IS NOT NULL AND country_id != '')
);

-- 10. Domestic League (ID: 7)
UPDATE V2_competitions 
SET trophy_type_id = 7 
WHERE 
    trophy_type_id NOT IN (1, 2, 3, 4, 5, 6, 8, 9, 10) OR
    competition_name LIKE '%MLS%' OR 
    competition_name LIKE '%Ligue 1%' OR 
    competition_name LIKE '%Ligue 2%' OR
    competition_name LIKE '%Premier League%' OR
    competition_name LIKE '%La Liga%' OR
    competition_name LIKE '%Bundesliga%' OR
    competition_name LIKE '%Serie A%' OR
    competition_name LIKE '%Serie B%' OR
    competition_name LIKE '%Eredivisie%' OR
    competition_name LIKE '%Primeira Liga%';
