-- ============================================================================
-- SCRIPT DE VÉRIFICATION ET ANALYSE
-- ============================================================================
-- Ce script aide à identifier les données manquantes après la mise à jour
-- ============================================================================

-- 1. COMPTER LES COMPÉTITIONS PAR TYPE DE TROPHÉE
SELECT 
    tt.trophy_type_id,
    tt.type_name,
    COUNT(c.competition_id) as competition_count
FROM V2_trophy_type tt
LEFT JOIN V2_Competition c ON tt.trophy_type_id = c.trophy_type_id
GROUP BY tt.trophy_type_id, tt.type_name
ORDER BY tt.type_order;

-- 2. LISTER LES COMPÉTITIONS SANS trophy_type_id
SELECT 
    competition_id,
    competition_name,
    country_id,
    trophy_type_id
FROM V2_Competition
WHERE trophy_type_id IS NULL OR trophy_type_id = 1
ORDER BY competition_id;

-- 3. LISTER LES COMPÉTITIONS SANS country_id (normales pour internationales)
SELECT 
    c.competition_id,
    c.competition_name,
    c.trophy_type_id,
    tt.type_name,
    c.country_id
FROM V2_Competition c
LEFT JOIN V2_trophy_type tt ON c.trophy_type_id = tt.trophy_type_id
WHERE c.country_id IS NULL
ORDER BY c.trophy_type_id, c.competition_id;

-- 4. COMPTER LES COMPÉTITIONS PAR PAYS (TOP 20)
SELECT 
    co.country_name,
    co.country_code,
    COUNT(c.competition_id) as competition_count
FROM V2_countries co
LEFT JOIN V2_Competition c ON co.country_id = c.country_id
GROUP BY co.country_id, co.country_name, co.country_code
HAVING COUNT(c.competition_id) > 0
ORDER BY competition_count DESC
LIMIT 20;

-- 5. VÉRIFIER LES COMPÉTITIONS AVEC trophy_type_id = 1 (par défaut, à corriger)
SELECT 
    competition_id,
    competition_name,
    trophy_type_id,
    country_id,
    is_active
FROM V2_Competition
WHERE trophy_type_id = 1 
  AND competition_id NOT IN (1, 2, 3, 4, 5, 6, 7) -- Exclure les vraies compétitions UEFA
ORDER BY competition_name;

-- 6. LISTE DES COMPÉTITIONS DOMESTIQUES PAR PAYS
SELECT 
    co.country_name,
    c.competition_name,
    tt.type_name as trophy_type,
    c.level
FROM V2_Competition c
JOIN V2_countries co ON c.country_id = co.country_id
JOIN V2_trophy_type tt ON c.trophy_type_id = tt.trophy_type_id
WHERE c.trophy_type_id IN (7, 8, 9, 10) -- Compétitions domestiques
ORDER BY co.importance_rank, c.trophy_type_id, c.level;

-- 7. IDENTIFIER LES DOUBLONS POSSIBLES
SELECT 
    competition_name,
    country_id,
    COUNT(*) as count
FROM V2_Competition
GROUP BY competition_name, country_id
HAVING COUNT(*) > 1
ORDER BY count DESC, competition_name;

-- 8. RÉSUMÉ GLOBAL
SELECT 
    'Total Competitions' as metric,
    COUNT(*) as value
FROM V2_Competition
UNION ALL
SELECT 
    'With trophy_type_id',
    COUNT(*) 
FROM V2_Competition 
WHERE trophy_type_id IS NOT NULL
UNION ALL
SELECT 
    'With country_id',
    COUNT(*) 
FROM V2_Competition 
WHERE country_id IS NOT NULL
UNION ALL
SELECT 
    'Active Competitions',
    COUNT(*) 
FROM V2_Competition 
WHERE is_active = 1
UNION ALL
SELECT 
    'Missing trophy_type_id',
    COUNT(*) 
FROM V2_Competition 
WHERE trophy_type_id IS NULL
UNION ALL
SELECT 
    'Default trophy_type_id (need review)',
    COUNT(*) 
FROM V2_Competition 
WHERE trophy_type_id = 1 AND country_id IS NOT NULL;

-- 9. EXPORT POUR REVUE MANUELLE
-- Liste des compétitions qui nécessitent une vérification manuelle
SELECT 
    c.competition_id,
    c.competition_name,
    c.competition_short_name,
    c.trophy_type_id,
    tt.type_name as trophy_type,
    c.country_id,
    co.country_name,
    c.is_active,
    CASE 
        WHEN c.trophy_type_id IS NULL THEN 'Missing trophy_type_id'
        WHEN c.trophy_type_id = 1 AND c.country_id IS NOT NULL THEN 'Default trophy_type needs review'
        WHEN c.competition_name LIKE '%Cup%' AND c.trophy_type_id NOT IN (8, 10) THEN 'Possibly wrong trophy_type for Cup'
        WHEN c.competition_name LIKE '%League%' AND c.trophy_type_id NOT IN (7, 10) THEN 'Possibly wrong trophy_type for League'
        ELSE 'Review recommended'
    END as issue
FROM V2_Competition c
LEFT JOIN V2_trophy_type tt ON c.trophy_type_id = tt.trophy_type_id
LEFT JOIN V2_countries co ON c.country_id = co.country_id
WHERE 
    c.trophy_type_id IS NULL 
    OR (c.trophy_type_id = 1 AND c.country_id IS NOT NULL AND c.competition_id NOT IN (1, 4))
    OR (c.competition_name LIKE '%Cup%' AND c.trophy_type_id NOT IN (8, 10, 1, 3, 4, 5, 6))
    OR (c.competition_name LIKE '%League%' AND c.trophy_type_id NOT IN (7, 10, 1, 5))
ORDER BY c.competition_id;
