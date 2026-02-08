-- ============================================================================
-- SCRIPT DE MISE À JOUR INTELLIGENTE DE V2_Competition
-- ============================================================================
-- Ce script remplit les colonnes trophy_type_id et country_id manquantes
-- Basé sur l'analyse des noms de compétitions
-- ============================================================================

-- ============================================================================
-- PARTIE 1: COMPÉTITIONS UEFA (trophy_type_id = 1 ou 2)
-- ============================================================================

-- UEFA Club Competitions (trophy_type_id = 1)
UPDATE V2_Competition SET trophy_type_id = 1, country_id = NULL WHERE competition_id = 18988; -- Europa League
UPDATE V2_Competition SET trophy_type_id = 1, country_id = NULL WHERE competition_id = 43929; -- UEFA Champions League

-- UEFA National Team Competitions (trophy_type_id = 2)
UPDATE V2_Competition SET trophy_type_id = 2, country_id = NULL WHERE competition_id = 21985; -- Euro Championship
UPDATE V2_Competition SET trophy_type_id = 2, country_id = NULL WHERE competition_id = 38498; -- WC Qualification Europe
UPDATE V2_Competition SET trophy_type_id = 2, country_id = NULL WHERE competition_id = 38533; -- WC Qualifying Europe
UPDATE V2_Competition SET trophy_type_id = 2, country_id = NULL WHERE competition_id = 38880; -- UEFA World Cup Qualifiers
UPDATE V2_Competition SET trophy_type_id = 2, country_id = NULL WHERE competition_id = 42147; -- World Cup - Qualification Europe
UPDATE V2_Competition SET trophy_type_id = 2, country_id = NULL WHERE competition_id = 47399; -- UEFA Nations League
UPDATE V2_Competition SET trophy_type_id = 2, country_id = NULL WHERE competition_id = 47401; -- Euro Championship - Qualification
UPDATE V2_Competition SET trophy_type_id = 2, country_id = NULL WHERE competition_id = 47656; -- UEFA European Championship Qualifiers
UPDATE V2_Competition SET trophy_type_id = 2, country_id = NULL WHERE competition_id = 47658; -- EC Qualification
UPDATE V2_Competition SET trophy_type_id = 2, country_id = NULL WHERE competition_id = 47659; -- European Championship
UPDATE V2_Competition SET trophy_type_id = 2, country_id = NULL WHERE competition_id = 47664; -- UEFA U21 Championship
UPDATE V2_Competition SET trophy_type_id = 2, country_id = NULL WHERE competition_id = 47675; -- UEFA U19 Championship
UPDATE V2_Competition SET trophy_type_id = 2, country_id = NULL WHERE competition_id = 47676; -- UEFA U17 Championship

-- UEFA Other Competitions
UPDATE V2_Competition SET trophy_type_id = 1, country_id = NULL WHERE competition_id = 47373; -- UEFA Europa League
UPDATE V2_Competition SET trophy_type_id = 1, country_id = NULL WHERE competition_id = 47396; -- UEFA Super Cup
UPDATE V2_Competition SET trophy_type_id = 1, country_id = NULL WHERE competition_id = 47440; -- UEFA Europa Conference League

-- ============================================================================
-- PARTIE 2: COMPÉTITIONS FIFA (trophy_type_id = 3 ou 4)
-- ============================================================================

-- FIFA Club (trophy_type_id = 3)
UPDATE V2_Competition SET trophy_type_id = 3, country_id = NULL WHERE competition_id = 42743; -- FIFA Club World Cup - Play-In
UPDATE V2_Competition SET trophy_type_id = 3, country_id = NULL WHERE competition_id = 47402; -- FIFA Intercontinental Cup
UPDATE V2_Competition SET trophy_type_id = 3, country_id = NULL WHERE competition_id = 47403; -- FIFA Club World Cup

-- FIFA National Team (trophy_type_id = 4)
UPDATE V2_Competition SET trophy_type_id = 4, country_id = NULL WHERE competition_id = 42741; -- World Cup
UPDATE V2_Competition SET trophy_type_id = 4, country_id = NULL WHERE competition_id = 47386; -- Olympics Men
UPDATE V2_Competition SET trophy_type_id = 4, country_id = NULL WHERE competition_id = 47444; -- World Cup - Qualification South America
UPDATE V2_Competition SET trophy_type_id = 4, country_id = NULL WHERE competition_id = 47457; -- World Cup - Qualification CONCACAF
UPDATE V2_Competition SET trophy_type_id = 4, country_id = NULL WHERE competition_id = 47467; -- World Cup - Qualification Asia
UPDATE V2_Competition SET trophy_type_id = 4, country_id = NULL WHERE competition_id = 47477; -- Confederations Cup
UPDATE V2_Competition SET trophy_type_id = 4, country_id = NULL WHERE competition_id = 47489; -- World Cup - Qualification Africa
UPDATE V2_Competition SET trophy_type_id = 4, country_id = NULL WHERE competition_id = 47574; -- World Cup - Qualification Oceania
UPDATE V2_Competition SET trophy_type_id = 4, country_id = NULL WHERE competition_id = 47655; -- FIFA U20 World Cup
UPDATE V2_Competition SET trophy_type_id = 4, country_id = NULL WHERE competition_id = 47666; -- WC Qualification Asia
UPDATE V2_Competition SET trophy_type_id = 4, country_id = NULL WHERE competition_id = 47670; -- WC Qualification Africa
UPDATE V2_Competition SET trophy_type_id = 4, country_id = NULL WHERE competition_id = 47671; -- WC Qualification CONCACAF
UPDATE V2_Competition SET trophy_type_id = 4, country_id = NULL WHERE competition_id = 47677; -- FIFA U17 World Cup
UPDATE V2_Competition SET trophy_type_id = 4, country_id = NULL WHERE competition_id = 47680; -- WC Qualification Oceania
UPDATE V2_Competition SET trophy_type_id = 4, country_id = NULL WHERE competition_id = 47682; -- Olympics

-- ============================================================================
-- PARTIE 3: COMPÉTITIONS CONTINENTALES - CLUB (trophy_type_id = 5)
-- ============================================================================

-- CONMEBOL
UPDATE V2_Competition SET trophy_type_id = 5, country_id = NULL WHERE competition_id = 47426; -- CONMEBOL Sudamericana
UPDATE V2_Competition SET trophy_type_id = 5, country_id = NULL WHERE competition_id = 47427; -- CONMEBOL Libertadores
UPDATE V2_Competition SET trophy_type_id = 5, country_id = NULL WHERE competition_id = 47609; -- CONMEBOL Recopa

-- CONCACAF
UPDATE V2_Competition SET trophy_type_id = 5, country_id = NULL WHERE competition_id = 47451; -- Leagues Cup
UPDATE V2_Competition SET trophy_type_id = 5, country_id = NULL WHERE competition_id = 47485; -- CONCACAF Champions League
UPDATE V2_Competition SET trophy_type_id = 5, country_id = NULL WHERE competition_id = 47648; -- Concacaf Central American Cup

-- CAF (Africa)
UPDATE V2_Competition SET trophy_type_id = 5, country_id = NULL WHERE competition_id = 47538; -- CAF Champions League
UPDATE V2_Competition SET trophy_type_id = 5, country_id = NULL WHERE competition_id = 47653; -- African Football League

-- AFC (Asia)
UPDATE V2_Competition SET trophy_type_id = 5, country_id = NULL WHERE competition_id = 47378; -- AFC Champions League
UPDATE V2_Competition SET trophy_type_id = 5, country_id = NULL WHERE competition_id = 47442; -- AFC Cup
UPDATE V2_Competition SET trophy_type_id = 5, country_id = NULL WHERE competition_id = 47578; -- ASEAN Club Championship

-- ============================================================================
-- PARTIE 4: COMPÉTITIONS CONTINENTALES - ÉQUIPES NATIONALES (trophy_type_id = 6)
-- ============================================================================

-- CONMEBOL
UPDATE V2_Competition SET trophy_type_id = 6, country_id = NULL WHERE competition_id = 47484; -- Copa America
UPDATE V2_Competition SET trophy_type_id = 6, country_id = NULL WHERE competition_id = 47663; -- CONMEBOL Copa America
UPDATE V2_Competition SET trophy_type_id = 6, country_id = NULL WHERE competition_id = 47694; -- CONMEBOL U17

-- CONCACAF
UPDATE V2_Competition SET trophy_type_id = 6, country_id = NULL WHERE competition_id = 47455; -- Caribbean Cup
UPDATE V2_Competition SET trophy_type_id = 6, country_id = NULL WHERE competition_id = 47456; -- CONCACAF Nations League - Qualification
UPDATE V2_Competition SET trophy_type_id = 6, country_id = NULL WHERE competition_id = 47458; -- CONCACAF Nations League
UPDATE V2_Competition SET trophy_type_id = 6, country_id = NULL WHERE competition_id = 47459; -- CONCACAF Gold Cup
UPDATE V2_Competition SET trophy_type_id = 6, country_id = NULL WHERE competition_id = 47460; -- CONCACAF Gold Cup - Qualification

-- CAF (Africa)
UPDATE V2_Competition SET trophy_type_id = 6, country_id = NULL WHERE competition_id = 47481; -- Africa Cup of Nations

-- AFC (Asia)
UPDATE V2_Competition SET trophy_type_id = 6, country_id = NULL WHERE competition_id = 47374; -- Asian Cup
UPDATE V2_Competition SET trophy_type_id = 6, country_id = NULL WHERE competition_id = 47642; -- Asian Games
UPDATE V2_Competition SET trophy_type_id = 6, country_id = NULL WHERE competition_id = 47688; -- Asian Cup Qualification

-- ============================================================================
-- PARTIE 5: ANGLETERRE (country_id = 213)
-- ============================================================================

UPDATE V2_Competition SET trophy_type_id = 7, country_id = 213 WHERE competition_id = 44804; -- Championship
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 213 WHERE competition_id = 91; -- Championship
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 213 WHERE competition_id = 43498; -- EFL Trophy
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 213 WHERE competition_id = 43513; -- Football League Trophy
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 213 WHERE competition_id = 45725; -- FA Trophy
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 213 WHERE competition_id = 47366; -- FA Cup
UPDATE V2_Competition SET trophy_type_id = 10, country_id = 213 WHERE competition_id = 47381; -- League Cup
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 213 WHERE competition_id = 47390; -- League Two
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 213 WHERE competition_id = 47391; -- National League
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 213 WHERE competition_id = 47392; -- Non League Premier - Southern Central - Play-offs
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 213 WHERE competition_id = 47393; -- National League - North - Play-offs
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 213 WHERE competition_id = 47394; -- National League - South - Play-offs
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 213 WHERE competition_id = 47406; -- League One
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 213 WHERE competition_id = 47407; -- National League - Play-offs
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 213 WHERE competition_id = 47409; -- Premier League Asia Trophy
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 213 WHERE competition_id = 47433; -- Non League Div One - Play-offs
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 213 WHERE competition_id = 47435; -- Non League Premier - Northern - Play-offs
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 213 WHERE competition_id = 47461; -- Premier League 2 Division One
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 213 WHERE competition_id = 47462; -- National League Cup
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 213 WHERE competition_id = 47464; -- Premier League International Cup
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 213 WHERE competition_id = 47465; -- Premier League Cup
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 213 WHERE competition_id = 47509; -- Non League Premier - Northern
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 213 WHERE competition_id = 47540; -- National League - South
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 213 WHERE competition_id = 47603; -- Premier League
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 213 WHERE competition_id = 47657; -- National League N / S
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 213 WHERE competition_id = 47667; -- Non League Premier
UPDATE V2_Competition SET trophy_type_id = 9, country_id = 213 WHERE competition_id = 47686; -- Community Shield
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 213 WHERE competition_id = 47685; -- Premier League Summer Series
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 213 WHERE competition_id = 47695; -- Premier League 2

-- ============================================================================
-- PARTIE 6: ESPAGNE (country_id = 214)
-- ============================================================================

UPDATE V2_Competition SET trophy_type_id = 9, country_id = 214 WHERE competition_id = 47370; -- Super Cup
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 214 WHERE competition_id = 47371; -- Copa del Rey
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 214 WHERE competition_id = 47423; -- Segunda División
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 214 WHERE competition_id = 47428; -- Primera División RFEF - Play Offs
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 214 WHERE competition_id = 47487; -- Primera División RFEF - Group 5
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 214 WHERE competition_id = 47543; -- Segunda División RFEF - Play-offs
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 214 WHERE competition_id = 47545; -- Tercera División RFEF - Group 14
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 214 WHERE competition_id = 47546; -- Tercera División RFEF - Promotion - Play-offs
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 214 WHERE competition_id = 47579; -- Tercera División RFEF - Group 18
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 214 WHERE competition_id = 47626; -- Primera División RFEF - Group 4
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 214 WHERE competition_id = 47632; -- Tercera División RFEF - Group 12
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 214 WHERE competition_id = 47633; -- Segunda División RFEF - Group 5
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 214 WHERE competition_id = 47636; -- Segunda División
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 214 WHERE competition_id = 47649; -- Primera División RFEF - Group 2
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 214 WHERE competition_id = 47678; -- Segunda B
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 214 WHERE competition_id = 47679; -- Tercera Division
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 214 WHERE competition_id = 47691; -- Primera División RFEF

-- ============================================================================
-- PARTIE 7: ALLEMAGNE (country_id = 215)
-- ============================================================================

UPDATE V2_Competition SET trophy_type_id = 8, country_id = 215 WHERE competition_id = 47449; -- DFB Pokal
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 215 WHERE competition_id = 47506; -- 3. Liga
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 215 WHERE competition_id = 47628; -- Regionalliga - West

-- ============================================================================
-- PARTIE 8: ITALIE (country_id = 216)
-- ============================================================================

UPDATE V2_Competition SET trophy_type_id = 7, country_id = 216 WHERE competition_id = 47533; -- Serie C - Girone C
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 216 WHERE competition_id = 47597; -- Campionato Primavera - 1
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 216 WHERE competition_id = 47604; -- Serie A
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 216 WHERE competition_id = 47607; -- Serie B
UPDATE V2_Competition SET trophy_type_id = 9, country_id = 216 WHERE competition_id = 47619; -- Serie C - Supercoppa Lega Finals
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 216 WHERE competition_id = 47639; -- Serie D - Championship Round
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 216 WHERE competition_id = 47640; -- Serie D - Promotion - Play-offs
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 216 WHERE competition_id = 47650; -- Serie C
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 216 WHERE competition_id = 47652; -- Serie D
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 216 WHERE competition_id = 47660; -- Lega Pro 2

-- ============================================================================
-- PARTIE 9: FRANCE (country_id = 217)
-- ============================================================================

UPDATE V2_Competition SET trophy_type_id = 8, country_id = 217 WHERE competition_id = 47412; -- Coupe de France
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 217 WHERE competition_id = 47508; -- Cup
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 217 WHERE competition_id = 47510; -- National 2 - Group D
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 217 WHERE competition_id = 47523; -- National 2 - Group A
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 217 WHERE competition_id = 47524; -- National 3 - Group M
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 217 WHERE competition_id = 47525; -- National 3 - Group G
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 217 WHERE competition_id = 47537; -- Ligue 1
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 217 WHERE competition_id = 47552; -- National 3 - Group J
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 217 WHERE competition_id = 47583; -- National 2 - Group C
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 217 WHERE competition_id = 47621; -- National 1
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 217 WHERE competition_id = 47687; -- National 3

-- ============================================================================
-- PARTIE 10: PORTUGAL (country_id = 218)
-- ============================================================================

UPDATE V2_Competition SET trophy_type_id = 7, country_id = 218 WHERE competition_id = 47601; -- Segunda Liga

-- ============================================================================
-- PARTIE 11: PAYS-BAS (country_id = 219)
-- ============================================================================

UPDATE V2_Competition SET trophy_type_id = 8, country_id = 219 WHERE competition_id = 47469; -- KNVB Beker
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 219 WHERE competition_id = 47553; -- Eerste Divisie
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 219 WHERE competition_id = 47631; -- Tweede Divisie
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 219 WHERE competition_id = 47689; -- Derde Divisie - Relegation Round

-- ============================================================================
-- PARTIE 12: BELGIQUE (country_id = 220)
-- ============================================================================

UPDATE V2_Competition SET trophy_type_id = 7, country_id = 220 WHERE competition_id = 47430; -- Jupiler Pro League
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 220 WHERE competition_id = 47452; -- Challenger Pro League
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 220 WHERE competition_id = 47541; -- First Amateur Division
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 220 WHERE competition_id = 47572; -- Second Amateur Division - Play-offs
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 220 WHERE competition_id = 47654; -- First Division A
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 220 WHERE competition_id = 47668; -- First Division B

-- ============================================================================
-- PARTIE 13: TURQUIE (country_id = 221)
-- ============================================================================

UPDATE V2_Competition SET trophy_type_id = 7, country_id = 221 WHERE competition_id = 47410; -- Süper Lig
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 221 WHERE competition_id = 47411; -- Türkiye Kupası
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 221 WHERE competition_id = 47431; -- 1. Lig
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 221 WHERE competition_id = 47637; -- 2. Lig

-- ============================================================================
-- PARTIE 14: ÉCOSSE (country_id = 222)
-- ============================================================================

UPDATE V2_Competition SET trophy_type_id = 7, country_id = 222 WHERE competition_id = 47380; -- Premiership
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 222 WHERE competition_id = 47418; -- Championship
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 222 WHERE competition_id = 47419; -- Challenge Cup
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 222 WHERE competition_id = 47420; -- FA Cup
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 222 WHERE competition_id = 47692; -- Football League - Highland League

-- ============================================================================
-- PARTIE 15: AUTRICHE (country_id = 223)
-- ============================================================================

UPDATE V2_Competition SET trophy_type_id = 7, country_id = 223 WHERE competition_id = 47504; -- 2. Liga
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 223 WHERE competition_id = 47505; -- Cup
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 223 WHERE competition_id = 47551; -- Bundesliga

-- ============================================================================
-- PARTIE 16: SUISSE (country_id = 224)
-- ============================================================================

UPDATE V2_Competition SET trophy_type_id = 7, country_id = 224 WHERE competition_id = 47416; -- Super League
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 224 WHERE competition_id = 47463; -- Schweizer Cup
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 224 WHERE competition_id = 47596; -- Challenge League
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 224 WHERE competition_id = 47665; -- Schweizer Pokal

-- ============================================================================
-- PARTIE 17: GRÈCE (country_id = 225)
-- ============================================================================

UPDATE V2_Competition SET trophy_type_id = 7, country_id = 225 WHERE competition_id = 47385; -- Super League 1
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 225 WHERE competition_id = 47567; -- Super League 2
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 225 WHERE competition_id = 47568; -- Gamma Ethniki - Group 4

-- ============================================================================
-- PARTIE 18: CROATIE (country_id = 229)
-- ============================================================================

UPDATE V2_Competition SET trophy_type_id = 7, country_id = 229 WHERE competition_id = 47554; -- HNL
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 229 WHERE competition_id = 47555; -- Cup

-- ============================================================================
-- PARTIE 19: POLOGNE (country_id = 231)
-- ============================================================================

UPDATE V2_Competition SET trophy_type_id = 7, country_id = 231 WHERE competition_id = 47588; -- Ekstraklasa
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 231 WHERE competition_id = 47589; -- Cup
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 231 WHERE competition_id = 47590; -- I Liga

-- ============================================================================
-- PARTIE 20: DANEMARK (country_id = 232)
-- ============================================================================

UPDATE V2_Competition SET trophy_type_id = 7, country_id = 232 WHERE competition_id = 47434; -- Superliga
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 232 WHERE competition_id = 47453; -- 1. Division
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 232 WHERE competition_id = 47454; -- DBU Pokalen

-- ============================================================================
-- PARTIE 21: NORVÈGE (country_id = 233)
-- ============================================================================

UPDATE V2_Competition SET trophy_type_id = 7, country_id = 233 WHERE competition_id = 47472; -- Eliteserien
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 233 WHERE competition_id = 47491; -- 1. Division
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 233 WHERE competition_id = 47518; -- NM Cupen
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 233 WHERE competition_id = 47519; -- 2. Division - Group 1
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 233 WHERE competition_id = 47520; -- 2. Division - Group 2
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 233 WHERE competition_id = 47534; -- 2. Division - Play-offs

-- ============================================================================
-- PARTIE 22: SUÈDE (country_id = 234)
-- ============================================================================

UPDATE V2_Competition SET trophy_type_id = 7, country_id = 234 WHERE competition_id = 47468; -- Allsvenskan
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 234 WHERE competition_id = 47470; -- Svenska Cupen
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 234 WHERE competition_id = 47503; -- Superettan

-- ============================================================================
-- PARTIE 23: BRÉSIL (country_id = 235)
-- ============================================================================

UPDATE V2_Competition SET trophy_type_id = 8, country_id = 235 WHERE competition_id = 47606; -- Copa Do Brasil
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 235 WHERE competition_id = 47607; -- Serie B
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 235 WHERE competition_id = 47608; -- Carioca - 1
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 235 WHERE competition_id = 47610; -- Cearense - 1
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 235 WHERE competition_id = 47611; -- Copa do Nordeste
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 235 WHERE competition_id = 47614; -- Amazonense
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 235 WHERE competition_id = 47615; -- Mineiro - 1
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 235 WHERE competition_id = 47616; -- Copa Verde
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 235 WHERE competition_id = 47617; -- Baiano - 1
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 235 WHERE competition_id = 47651; -- Paulista - A3
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 235 WHERE competition_id = 47693; -- Mineiro 1
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 235 WHERE competition_id = 47696; -- Paulista A1
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 235 WHERE competition_id = 47697; -- Paulista A2
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 235 WHERE competition_id = 47698; -- Paulista A3
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 235 WHERE competition_id = 47605; -- Gaúcho - 1

-- Note: 47609 CONMEBOL Recopa est continental, pas brésilien
UPDATE V2_Competition SET trophy_type_id = 5, country_id = NULL WHERE competition_id = 47609; -- CONMEBOL Recopa

-- ============================================================================
-- PARTIE 24: ARGENTINE (country_id = 236)
-- ============================================================================

UPDATE V2_Competition SET trophy_type_id = 7, country_id = 236 WHERE competition_id = 47511; -- Liga Profesional Argentina
UPDATE V2_Competition SET trophy_type_id = 9, country_id = 236 WHERE competition_id = 47598; -- Copa de la Superliga
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 236 WHERE competition_id = 47599; -- Primera Nacional
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 236 WHERE competition_id = 47612; -- Copa de la Liga Profesional
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 236 WHERE competition_id = 47613; -- Primera B
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 236 WHERE competition_id = 47623; -- Torneo Federal A

-- ============================================================================
-- PARTIE 25: MEXIQUE (country_id = 240)
-- ============================================================================

UPDATE V2_Competition SET trophy_type_id = 7, country_id = 240 WHERE competition_id = 47479; -- Liga MX
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 240 WHERE competition_id = 47480; -- Copa MX

-- ============================================================================
-- PARTIE 26: ÉTATS-UNIS (country_id = 241)
-- ============================================================================

UPDATE V2_Competition SET trophy_type_id = 7, country_id = 241 WHERE competition_id = 47384; -- Major League Soccer
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 241 WHERE competition_id = 47446; -- US Open Cup
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 241 WHERE competition_id = 47544; -- USL Championship
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 241 WHERE competition_id = 47561; -- USL League One
UPDATE V2_Competition SET trophy_type_id = 10, country_id = 241 WHERE competition_id = 47562; -- USL League One Cup
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 241 WHERE competition_id = 47563; -- MLS All-Star
UPDATE V2_Competition SET trophy_type_id = 9, country_id = 241 WHERE competition_id = 47564; -- Campeones Cup
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 241 WHERE competition_id = 47569; -- NISA
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 241 WHERE competition_id = 47591; -- MLS Next Pro
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 241 WHERE competition_id = 47672; -- MLS

-- ============================================================================
-- PARTIE 27: JAPON (country_id = 245)
-- ============================================================================

UPDATE V2_Competition SET trophy_type_id = 10, country_id = 245 WHERE competition_id = 47593; -- J-League Cup
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 245 WHERE competition_id = 47629; -- J2 League
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 245 WHERE competition_id = 47643; -- Emperor Cup
UPDATE V2_Competition SET trophy_type_id = 9, country_id = 245 WHERE competition_id = 47644; -- Super Cup

-- ============================================================================
-- PARTIE 28: ARABIE SAOUDITE (country_id = 247)
-- ============================================================================

UPDATE V2_Competition SET trophy_type_id = 7, country_id = 247 WHERE competition_id = 47437; -- Stars League

-- ============================================================================
-- PARTIE 29: AUTRES PAYS
-- ============================================================================

-- Slovaquie (270)
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 270 WHERE competition_id = 47595; -- Cup

-- Bulgarie (282)
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 282 WHERE competition_id = 47684; -- A PFG

-- Roumanie (286)
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 286 WHERE competition_id = 47471; -- Liga I
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 286 WHERE competition_id = 47529; -- Liga II
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 286 WHERE competition_id = 47528; -- Cupa României

-- Chypre (290)
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 290 WHERE competition_id = 47415; -- 1. Division
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 290 WHERE competition_id = 47531; -- Cup

-- Hongrie (294)
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 294 WHERE competition_id = 47382; -- NB I
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 294 WHERE competition_id = 47575; -- NB II
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 294 WHERE competition_id = 47622; -- NB III - Southwest
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 294 WHERE competition_id = 47483; -- Magyar Kupa

-- Slovénie (297)
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 297 WHERE competition_id = 47557; -- 1. SNL
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 297 WHERE competition_id = 47582; -- 2. SNL

-- Islande (302)
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 302 WHERE competition_id = 47432; -- Úrvalsdeild
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 302 WHERE competition_id = 47494; -- 1. Deild
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 302 WHERE competition_id = 47641; -- Reykjavik Cup
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 302 WHERE competition_id = 47662; -- Besta deild
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 302 WHERE competition_id = 47690; -- Meistaradeildin

-- Finlande (303)
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 303 WHERE competition_id = 47473; -- Veikkausliiga
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 303 WHERE competition_id = 47474; -- Suomen Cup
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 303 WHERE competition_id = 47624; -- Kakkonen - Lohko C
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 303 WHERE competition_id = 47625; -- Ykkönen

-- Lettonie (307)
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 307 WHERE competition_id = 47532; -- Virsliga

-- Lituanie (322)
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 322 WHERE competition_id = 47498; -- A Lyga

-- Chine (248)
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 248 WHERE competition_id = 47673; -- CSL

-- Thaïlande (325)
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 325 WHERE competition_id = 47422; -- Thai League 1

-- Iran (301)
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 301 WHERE competition_id = 47441; -- Persian Gulf Pro League

-- Qatar (249)
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 249 WHERE competition_id = 47439; -- Emir Cup
UPDATE V2_Competition SET trophy_type_id = 10, country_id = 249 WHERE competition_id = 47438; -- QSL Cup
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 249 WHERE competition_id = 47535; -- QFA Cup
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 249 WHERE competition_id = 47536; -- Qatar Cup
UPDATE V2_Competition SET trophy_type_id = 9, country_id = 249 WHERE competition_id = 47646; -- Qatar-UAE Super Cup

-- EAU (250)
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 250 WHERE competition_id = 47443; -- Pro League
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 250 WHERE competition_id = 47445; -- Liga Pro

-- Australie (251)
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 251 WHERE competition_id = 47379; -- A-League
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 251 WHERE competition_id = 47539; -- Australia Cup
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 251 WHERE competition_id = 47577; -- Queensland NPL
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 251 WHERE competition_id = 47580; -- Western Australia NPL

-- Afrique du Sud (254)
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 254 WHERE competition_id = 47478; -- Premier Soccer League
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 254 WHERE competition_id = 47669; -- PSL

-- Maroc (253)
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 253 WHERE competition_id = 47627; -- Botola Pro

-- République tchèque (226)
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 226 WHERE competition_id = 47681; -- Czech Liga

-- Serbie (230)
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 230 WHERE competition_id = 47674; -- Prva Liga

-- Israël (278)
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 278 WHERE competition_id = 47526; -- Ligat Ha'al
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 278 WHERE competition_id = 47571; -- Liga Leumit
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 278 WHERE competition_id = 47527; -- State Cup
UPDATE V2_Competition SET trophy_type_id = 10, country_id = 278 WHERE competition_id = 47501; -- Toto Cup Ligat Al

-- Corée du Sud (246)
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 246 WHERE competition_id = 47586; -- K League 1

-- Inde (363)
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 363 WHERE competition_id = 47499; -- Indian Super League
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 363 WHERE competition_id = 47581; -- I-League

-- Paraguay (242)
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 242 WHERE competition_id = 47482; -- Division Profesional - Clausura
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 242 WHERE competition_id = 47521; -- Division Profesional - Apertura
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 242 WHERE competition_id = 47522; -- Division Intermedia
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 242 WHERE competition_id = 47584; -- Copa Paraguay

-- Chili (239)
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 239 WHERE competition_id = 47514; -- Copa Chile
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 239 WHERE competition_id = 47424; -- Primera División - Clausura
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 239 WHERE competition_id = 47425; -- Primera División - Apertura
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 239 WHERE competition_id = 47647; -- Primera División

-- Colombie (238)
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 238 WHERE competition_id = 47576; -- Primera A
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 238 WHERE competition_id = 47618; -- Copa Colombia

-- Honduras (299)
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 299 WHERE competition_id = 47476; -- Liga Nacional

-- Canada (279)
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 279 WHERE competition_id = 47620; -- Canadian Championship

-- Irlande (265)
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 265 WHERE competition_id = 47389; -- FAI Cup
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 265 WHERE competition_id = 47542; -- Premier Division
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 265 WHERE competition_id = 47549; -- Irish Cup (peut être Irlande du Nord aussi)

-- Pays de Galles (268)
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 268 WHERE competition_id = 47630; -- FAW Championship
UPDATE V2_Competition SET trophy_type_id = 8, country_id = 268 WHERE competition_id = 47634; -- Welsh Cup

-- Azerbaïdjan (335)
UPDATE V2_Competition SET trophy_type_id = 7, country_id = 335 WHERE competition_id = 47565; -- Premyer Liqa

-- ============================================================================
-- PARTIE 30: COMPÉTITIONS AMICALES / INTERNATIONALES
-- ============================================================================

UPDATE V2_Competition SET trophy_type_id = 8, country_id = NULL WHERE competition_id = 47397; -- International Champions Cup
UPDATE V2_Competition SET trophy_type_id = 8, country_id = NULL WHERE competition_id = 47398; -- Friendlies
UPDATE V2_Competition SET trophy_type_id = 8, country_id = NULL WHERE competition_id = 47400; -- Friendlies Clubs
UPDATE V2_Competition SET trophy_type_id = 8, country_id = NULL WHERE competition_id = 47447; -- China Cup
UPDATE V2_Competition SET trophy_type_id = 8, country_id = NULL WHERE competition_id = 47645; -- Presidents Cup
UPDATE V2_Competition SET trophy_type_id = 8, country_id = NULL WHERE competition_id = 47661; -- Club Friendlies
UPDATE V2_Competition SET trophy_type_id = 8, country_id = NULL WHERE competition_id = 47683; -- Kirin Cup

-- ============================================================================
-- PARTIE 31: COMPÉTITIONS À CLARIFIER / GÉNÉRIQUES
-- ============================================================================

-- Ces compétitions ont des noms génériques et nécessitent plus d'informations
-- pour déterminer le pays exact. Elles sont marquées comme "Unknown" dans les données source.

UPDATE V2_Competition SET trophy_type_id = 7, country_id = NULL WHERE competition_id = 47404; -- Super Cup (générique)
UPDATE V2_Competition SET trophy_type_id = 7, country_id = NULL WHERE competition_id = 47415; -- 1. Division (pourrait être plusieurs pays)
UPDATE V2_Competition SET trophy_type_id = 7, country_id = NULL WHERE competition_id = 47421; -- Football League - Championship
UPDATE V2_Competition SET trophy_type_id = 7, country_id = NULL WHERE competition_id = 47486; -- Birinci Dasta
UPDATE V2_Competition SET trophy_type_id = 7, country_id = NULL WHERE competition_id = 47488; -- Super League (générique)
UPDATE V2_Competition SET trophy_type_id = 7, country_id = NULL WHERE competition_id = 47493; -- Football League
UPDATE V2_Competition SET trophy_type_id = 8, country_id = NULL WHERE competition_id = 47495; -- Cup (générique)
UPDATE V2_Competition SET trophy_type_id = 7, country_id = NULL WHERE competition_id = 47502; -- First Division
UPDATE V2_Competition SET trophy_type_id = 7, country_id = NULL WHERE competition_id = 47548; -- Premiership (générique)
UPDATE V2_Competition SET trophy_type_id = 10, country_id = NULL WHERE competition_id = 47556; -- League Cup (générique)
UPDATE V2_Competition SET trophy_type_id = 7, country_id = NULL WHERE competition_id = 47560; -- First League
UPDATE V2_Competition SET trophy_type_id = 7, country_id = NULL WHERE competition_id = 47573; -- Second Division
UPDATE V2_Competition SET trophy_type_id = 9, country_id = NULL WHERE competition_id = 47585; -- Supercopa (générique)
UPDATE V2_Competition SET trophy_type_id = 7, country_id = NULL WHERE competition_id = 47594; -- Super Liga
UPDATE V2_Competition SET trophy_type_id = 7, country_id = NULL WHERE competition_id = 47635; -- Division 1

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================

-- Pour vérifier le résultat :
-- SELECT competition_id, competition_name, trophy_type_id, country_id 
-- FROM V2_Competition 
-- WHERE trophy_type_id IS NULL OR country_id IS NULL
-- ORDER BY competition_id;

-- Pour compter les mises à jour :
-- SELECT 
--     trophy_type_id,
--     COUNT(*) as count
-- FROM V2_Competition
-- GROUP BY trophy_type_id
-- ORDER BY trophy_type_id;
