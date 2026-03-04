-- US-DB-001: Standardize Competition Categorization via Trophy Types

-- 1. Continental National Team (ID: 6)
UPDATE V2_competitions 
SET trophy_type_id = 6 
WHERE trophy_type_id IS NULL AND (
    competition_name LIKE '%Copa America%' OR 
    competition_name LIKE '%Qualification%' OR 
    -- Avoid Euro if it could be a club competition, but 'Euro' usually refers to Euro Cup in this context
    -- Let's be more specific for Euro
    competition_name LIKE '%UEFA Euro%' OR
    competition_name LIKE '%Euro Championship%' OR
    competition_name LIKE '%Gold Cup%'
);

-- 2. FIFA National Team (ID: 4)
UPDATE V2_competitions 
SET trophy_type_id = 4 
WHERE trophy_type_id IS NULL AND (
    competition_name LIKE '%World Cup%' OR 
    competition_name LIKE '%Olympics%'
);

-- Note: Friendlies are excluded here to avoid miscategorizing Club Friendlies (which should likely be 8 or a separate type)

-- 3. Continental Club (ID: 5)
UPDATE V2_competitions 
SET trophy_type_id = 5 
WHERE trophy_type_id IS NULL AND (
    (competition_name LIKE '%Champions League%' AND competition_name NOT LIKE '%UEFA%') OR 
    competition_name LIKE '%Leagues Cup%' OR 
    competition_name LIKE '%Copa Libertadores%' OR 
    competition_name LIKE '%Copa Sudamericana%' OR
    competition_name LIKE '%AFC Champions League%' OR
    competition_name LIKE '%CAF Champions League%' OR
    competition_name LIKE '%CONCACAF Champions League%'
);

-- 4. Domestic Cup (ID: 8)
-- Only if it has a country_id and is not already assigned
UPDATE V2_competitions 
SET trophy_type_id = 8 
WHERE trophy_type_id IS NULL AND country_id IS NOT NULL AND (
    competition_name LIKE '%Cup%' OR 
    competition_name LIKE '%Beker%' OR 
    competition_name LIKE '%Taça%' OR 
    competition_name LIKE '%Pokal%' OR
    competition_name LIKE '%Coupe%' OR
    competition_name LIKE '%Coppa%' OR
    competition_name LIKE '%Copa%' -- Careful with Copa Libertadores handled above
);

-- 5. Domestic League (ID: 7)
UPDATE V2_competitions 
SET trophy_type_id = 7 
WHERE trophy_type_id IS NULL AND country_id IS NOT NULL AND (
    competition_name LIKE '%MLS%' OR 
    competition_name LIKE '%Carioca%' OR 
    competition_name LIKE '%Paulista%' OR
    competition_name LIKE '%Mineiro%' OR
    competition_name LIKE '%Gaúcho%' OR
    competition_name LIKE '%Serie A%' OR
    competition_name LIKE '%Serie B%' OR
    competition_name LIKE '%Ligue 1%' OR
    competition_name LIKE '%Ligue 2%' OR
    competition_name LIKE '%Bundesliga%' OR
    competition_name LIKE '%Premier League%' OR
    competition_name LIKE '%La Liga%' OR
    competition_name LIKE '%Eredivisie%' OR
    competition_name LIKE '%Primeira Liga%'
);

-- Final Audit specifically for Messi-related IDs
-- We already saw 9, 11, 23, 24, 72. 
-- Let's check for "World Cup Qualifiers" specifically as it's often National Team
UPDATE V2_competitions
SET trophy_type_id = 6
WHERE trophy_type_id IS NULL AND competition_name LIKE '%Qualifiers%' AND competition_name NOT LIKE '%Champions League%';

UPDATE V2_competitions
SET trophy_type_id = 6
WHERE trophy_type_id IS NULL AND competition_name LIKE '%WC Qualification%';
