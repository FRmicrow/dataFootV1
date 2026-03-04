-- Mapping des compétitions de football par pays
-- Basé sur le fichier fourni avec les IDs de compétition

-- Table de mapping: competition_id -> country
-- Format: (competition_id, competition_name, country, region)

-- INTERNATIONAL COMPETITIONS
-- 47481, 47653, 23, 24, etc. - Compétitions africaines → Multiple African countries
-- 28, 47374, 47688, 47642 - Compétitions asiatiques → Multiple Asian countries
-- 19, 47485, 47459, 47460, 21, 47458, 47456 - CONCACAF → North/Central America & Caribbean
-- 47663, 47427, 47609, 47426, 15, 16, 17 - CONMEBOL → South America
-- 1, 2, 3, 4, 5, 6, 7, 8, 9 - UEFA → Europe
-- 12, 42741, 47489, 47467, 47457, 42147, 47574, 47444 - World Cup → International
-- 11, 13, 47402, 47403, 42743 - FIFA → International

-- ENGLAND (UK)
INSERT INTO competition_country_mapping VALUES
(30, 'Premier League', 'England', 'Europe'),
(31, 'English Football League Championship', 'England', 'Europe'),
(91, 'Championship', 'England', 'Europe'),
(44804, 'Championship', 'England', 'Europe'),
(32, 'FA Cup', 'England', 'Europe'),
(47366, 'FA Cup', 'England', 'Europe'),
(34, 'FA Community Shield', 'England', 'Europe'),
(47686, 'Community Shield', 'England', 'Europe'),
(33, 'EFL Cup', 'England', 'Europe'),
(78, 'EFL League One', 'England', 'Europe'),
(47406, 'League One', 'England', 'Europe'),
(79, 'EFL League Two', 'England', 'Europe'),
(47390, 'League Two', 'England', 'Europe'),
(43498, 'EFL Trophy', 'England', 'Europe'),
(43513, 'Football League Trophy', 'England', 'Europe'),
(45725, 'FA Trophy', 'England', 'Europe'),
(80, 'Football League Third Division', 'England', 'Europe'),
(81, 'Full Members Cup', 'England', 'Europe'),
(47391, 'National League', 'England', 'Europe'),
(47393, 'National League - North - Play-offs', 'England', 'Europe'),
(47407, 'National League - Play-offs', 'England', 'Europe'),
(47540, 'National League - South', 'England', 'Europe'),
(47394, 'National League - South - Play-offs', 'England', 'Europe'),
(47657, 'National League N / S', 'England', 'Europe'),
(47667, 'Non League Premier', 'England', 'Europe'),
(47509, 'Non League Premier - Northern', 'England', 'Europe'),
(47435, 'Non League Premier - Northern - Play-offs', 'England', 'Europe'),
(47392, 'Non League Premier - Southern Central - Play-offs', 'England', 'Europe'),
(47433, 'Non League Div One - Play-offs', 'England', 'Europe'),
(47695, 'Premier League 2', 'England', 'Europe'),
(47461, 'Premier League 2 Division One', 'England', 'Europe'),
(47465, 'Premier League Cup', 'England', 'Europe'),
(47464, 'Premier League International Cup', 'England', 'Europe'),
(47409, 'Premier League Asia Trophy', 'England', 'Europe'),
(47685, 'Premier League Summer Series', 'England', 'Europe');

-- SPAIN
INSERT INTO competition_country_mapping VALUES
(35, 'La Liga', 'Spain', 'Europe'),
(36, 'Copa del Rey', 'Spain', 'Europe'),
(47371, 'Copa del Rey', 'Spain', 'Europe'),
(37, 'Supercopa de España', 'Spain', 'Europe'),
(47678, 'Segunda B', 'Spain', 'Europe'),
(47423, 'Segunda División', 'Spain', 'Europe'),
(47636, 'Segunda División', 'Spain', 'Europe'),
(47691, 'Primera División RFEF', 'Spain', 'Europe'),
(47649, 'Primera División RFEF - Group 2', 'Spain', 'Europe'),
(47626, 'Primera División RFEF - Group 4', 'Spain', 'Europe'),
(47487, 'Primera División RFEF - Group 5', 'Spain', 'Europe'),
(47428, 'Primera División RFEF - Play Offs', 'Spain', 'Europe'),
(47633, 'Segunda División RFEF - Group 5', 'Spain', 'Europe'),
(47543, 'Segunda División RFEF - Play-offs', 'Spain', 'Europe'),
(47679, 'Tercera Division', 'Spain', 'Europe'),
(47632, 'Tercera División RFEF - Group 12', 'Spain', 'Europe'),
(47545, 'Tercera División RFEF - Group 14', 'Spain', 'Europe'),
(47579, 'Tercera División RFEF - Group 18', 'Spain', 'Europe'),
(47546, 'Tercera División RFEF - Promotion - Play-offs', 'Spain', 'Europe');

-- ITALY
INSERT INTO competition_country_mapping VALUES
(41, 'Serie A', 'Italy', 'Europe'),
(47604, 'Serie A', 'Italy', 'Europe'),
(84, 'Serie B', 'Italy', 'Europe'),
(47607, 'Serie B', 'Italy', 'Europe'),
(85, 'Serie C', 'Italy', 'Europe'),
(47650, 'Serie C', 'Italy', 'Europe'),
(47533, 'Serie C - Girone C', 'Italy', 'Europe'),
(47619, 'Serie C - Supercoppa Lega Finals', 'Italy', 'Europe'),
(47652, 'Serie D', 'Italy', 'Europe'),
(47639, 'Serie D - Championship Round', 'Italy', 'Europe'),
(47640, 'Serie D - Promotion - Play-offs', 'Italy', 'Europe'),
(42, 'Coppa Italia', 'Italy', 'Europe'),
(43, 'Supercoppa Italiana', 'Italy', 'Europe'),
(47597, 'Campionato Primavera - 1', 'Italy', 'Europe');

-- GERMANY
INSERT INTO competition_country_mapping VALUES
(38, 'Bundesliga', 'Germany', 'Europe'),
(47551, 'Bundesliga', 'Germany', 'Europe'),
(82, '2. Bundesliga', 'Germany', 'Europe'),
(47506, '3. Liga', 'Germany', 'Europe'),
(39, 'DFB-Pokal', 'Germany', 'Europe'),
(47449, 'DFB Pokal', 'Germany', 'Europe'),
(40, 'DFL-Supercup', 'Germany', 'Europe'),
(83, 'Regionalliga', 'Germany', 'Europe'),
(47628, 'Regionalliga - West', 'Germany', 'Europe');

-- FRANCE
INSERT INTO competition_country_mapping VALUES
(44, 'Ligue 1', 'France', 'Europe'),
(47537, 'Ligue 1', 'France', 'Europe'),
(76, 'Ligue 2', 'France', 'Europe'),
(45, 'Coupe de France', 'France', 'Europe'),
(47412, 'Coupe de France', 'France', 'Europe'),
(47, 'Coupe de la Ligue', 'France', 'Europe'),
(46, 'Trophée des Champions', 'France', 'Europe'),
(77, 'Coupe Gambardella', 'France', 'Europe'),
(47621, 'National 1', 'France', 'Europe'),
(47523, 'National 2 - Group A', 'France', 'Europe'),
(47583, 'National 2 - Group C', 'France', 'Europe'),
(47510, 'National 2 - Group D', 'France', 'Europe'),
(47687, 'National 3', 'France', 'Europe'),
(47525, 'National 3 - Group G', 'France', 'Europe'),
(47552, 'National 3 - Group J', 'France', 'Europe'),
(47524, 'National 3 - Group M', 'France', 'Europe');

-- PORTUGAL
INSERT INTO competition_country_mapping VALUES
(48, 'Primeira Liga', 'Portugal', 'Europe'),
(86, 'Liga Portugal 2', 'Portugal', 'Europe'),
(49, 'Taça de Portugal', 'Portugal', 'Europe'),
(87, 'Taça da Liga', 'Portugal', 'Europe'),
(50, 'Supertaça Cândido de Oliveira', 'Portugal', 'Europe'),
(47601, 'Segunda Liga', 'Portugal', 'Europe');

-- NETHERLANDS
INSERT INTO competition_country_mapping VALUES
(51, 'Eredivisie', 'Netherlands', 'Europe'),
(47553, 'Eerste Divisie', 'Netherlands', 'Europe'),
(52, 'KNVB Cup', 'Netherlands', 'Europe'),
(47469, 'KNVB Beker', 'Netherlands', 'Europe'),
(53, 'Johan Cruyff Shield', 'Netherlands', 'Europe'),
(47631, 'Tweede Divisie', 'Netherlands', 'Europe'),
(47689, 'Derde Divisie - Relegation Round', 'Netherlands', 'Europe');

-- BELGIUM
INSERT INTO competition_country_mapping VALUES
(57, 'Belgian Pro League', 'Belgium', 'Europe'),
(47430, 'Jupiler Pro League', 'Belgium', 'Europe'),
(58, 'Belgian Cup', 'Belgium', 'Europe'),
(47452, 'Challenger Pro League', 'Belgium', 'Europe'),
(47541, 'First Amateur Division', 'Belgium', 'Europe'),
(47654, 'First Division A', 'Belgium', 'Europe'),
(47668, 'First Division B', 'Belgium', 'Europe'),
(47572, 'Second Amateur Division - Play-offs', 'Belgium', 'Europe');

-- SCOTLAND
INSERT INTO competition_country_mapping VALUES
(54, 'Scottish Premiership', 'Scotland', 'Europe'),
(47380, 'Premiership', 'Scotland', 'Europe'),
(55, 'Scottish Cup', 'Scotland', 'Europe'),
(56, 'Scottish League Cup', 'Scotland', 'Europe'),
(47381, 'League Cup', 'Scotland', 'Europe'),
(47418, 'Championship', 'Scotland', 'Europe'),
(47419, 'Challenge Cup', 'Scotland', 'Europe'),
(47420, 'FA Cup', 'Scotland', 'Europe');

-- TURKEY
INSERT INTO competition_country_mapping VALUES
(59, 'Süper Lig', 'Turkey', 'Europe'),
(47410, 'Süper Lig', 'Turkey', 'Europe'),
(60, 'Turkish Cup', 'Turkey', 'Europe'),
(47411, 'Türkiye Kupası', 'Turkey', 'Europe'),
(61, 'Turkish Super Cup', 'Turkey', 'Europe'),
(47431, '1. Lig', 'Turkey', 'Europe'),
(47637, '2. Lig', 'Turkey', 'Europe');

-- BRAZIL
INSERT INTO competition_country_mapping VALUES
(62, 'Campeonato Brasileiro Série A', 'Brazil', 'South America'),
(63, 'Copa do Brasil', 'Brazil', 'South America'),
(47606, 'Copa Do Brasil', 'Brazil', 'South America'),
(47608, 'Carioca - 1', 'Brazil', 'South America'),
(47610, 'Cearense - 1', 'Brazil', 'South America'),
(47614, 'Amazonense', 'Brazil', 'South America'),
(47617, 'Baiano - 1', 'Brazil', 'South America'),
(47605, 'Gaúcho - 1', 'Brazil', 'South America'),
(47615, 'Mineiro - 1', 'Brazil', 'South America'),
(47693, 'Mineiro 1', 'Brazil', 'South America'),
(47611, 'Copa do Nordeste', 'Brazil', 'South America'),
(47616, 'Copa Verde', 'Brazil', 'South America'),
(47651, 'Paulista - A3', 'Brazil', 'South America'),
(47696, 'Paulista A1', 'Brazil', 'South America'),
(47697, 'Paulista A2', 'Brazil', 'South America'),
(47698, 'Paulista A3', 'Brazil', 'South America');

-- ARGENTINA
INSERT INTO competition_country_mapping VALUES
(64, 'Primera División', 'Argentina', 'South America'),
(65, 'Copa Argentina', 'Argentina', 'South America'),
(47511, 'Liga Profesional Argentina', 'Argentina', 'South America'),
(47612, 'Copa de la Liga Profesional', 'Argentina', 'South America'),
(47598, 'Copa de la Superliga', 'Argentina', 'South America'),
(47599, 'Primera Nacional', 'Argentina', 'South America'),
(47613, 'Primera B', 'Argentina', 'South America'),
(47623, 'Torneo Federal A', 'Argentina', 'South America');

-- MEXICO
INSERT INTO competition_country_mapping VALUES
(66, 'Liga MX', 'Mexico', 'North America'),
(47479, 'Liga MX', 'Mexico', 'North America'),
(67, 'Copa MX', 'Mexico', 'North America'),
(47480, 'Copa MX', 'Mexico', 'North America');

-- USA
INSERT INTO competition_country_mapping VALUES
(68, 'Major League Soccer', 'USA', 'North America'),
(47384, 'Major League Soccer', 'USA', 'North America'),
(47672, 'MLS', 'USA', 'North America'),
(69, 'US Open Cup', 'USA', 'North America'),
(47446, 'US Open Cup', 'USA', 'North America'),
(47544, 'USL Championship', 'USA', 'North America'),
(47561, 'USL League One', 'USA', 'North America'),
(47562, 'USL League One Cup', 'USA', 'North America'),
(47563, 'MLS All-Star', 'USA', 'North America'),
(47591, 'MLS Next Pro', 'USA', 'North America'),
(47569, 'NISA', 'USA', 'North America'),
(47451, 'Leagues Cup', 'USA/Mexico', 'North America'),
(47564, 'Campeones Cup', 'USA/Mexico', 'North America');

-- SAUDI ARABIA
INSERT INTO competition_country_mapping VALUES
(70, 'Saudi Pro League', 'Saudi Arabia', 'Asia'),
(47437, 'Stars League', 'Saudi Arabia', 'Asia');

-- JAPAN
INSERT INTO competition_country_mapping VALUES
(72, 'J1 League', 'Japan', 'Asia'),
(47629, 'J2 League', 'Japan', 'Asia'),
(73, 'Emperors Cup', 'Japan', 'Asia'),
(47643, 'Emperor Cup', 'Japan', 'Asia'),
(47593, 'J-League Cup', 'Japan', 'Asia'),
(71, 'Kings Cup', 'Japan', 'Asia');

-- AUSTRALIA
INSERT INTO competition_country_mapping VALUES
(47379, 'A-League', 'Australia', 'Oceania'),
(47539, 'Australia Cup', 'Australia', 'Oceania'),
(47577, 'Queensland NPL', 'Australia', 'Oceania'),
(47580, 'Western Australia NPL', 'Australia', 'Oceania');

-- NORWAY
INSERT INTO competition_country_mapping VALUES
(47472, 'Eliteserien', 'Norway', 'Europe'),
(47518, 'NM Cupen', 'Norway', 'Europe');

-- SWEDEN
INSERT INTO competition_country_mapping VALUES
(47468, 'Allsvenskan', 'Sweden', 'Europe'),
(47503, 'Superettan', 'Sweden', 'Europe'),
(47470, 'Svenska Cupen', 'Sweden', 'Europe');

-- DENMARK
INSERT INTO competition_country_mapping VALUES
(47434, 'Superliga', 'Denmark', 'Europe'),
(47454, 'DBU Pokalen', 'Denmark', 'Europe');

-- POLAND
INSERT INTO competition_country_mapping VALUES
(47588, 'Ekstraklasa', 'Poland', 'Europe'),
(47590, 'I Liga', 'Poland', 'Europe');

-- GREECE
INSERT INTO competition_country_mapping VALUES
(47385, 'Super League 1', 'Greece', 'Europe'),
(47567, 'Super League 2', 'Greece', 'Europe'),
(47568, 'Gamma Ethniki - Group 4', 'Greece', 'Europe');

-- SWITZERLAND
INSERT INTO competition_country_mapping VALUES
(47596, 'Challenge League', 'Switzerland', 'Europe'),
(47463, 'Schweizer Cup', 'Switzerland', 'Europe'),
(47665, 'Schweizer Pokal', 'Switzerland', 'Europe');

-- AUSTRIA
INSERT INTO competition_country_mapping VALUES
(47551, 'Bundesliga', 'Austria', 'Europe'); -- Note: duplicate with Germany

-- CZECH REPUBLIC
INSERT INTO competition_country_mapping VALUES
(47681, 'Czech Liga', 'Czech Republic', 'Europe');

-- ROMANIA
INSERT INTO competition_country_mapping VALUES
(47471, 'Liga I', 'Romania', 'Europe'),
(47529, 'Liga II', 'Romania', 'Europe'),
(47528, 'Cupa României', 'Romania', 'Europe');

-- CROATIA
INSERT INTO competition_country_mapping VALUES
(47554, 'HNL', 'Croatia', 'Europe');

-- HUNGARY
INSERT INTO competition_country_mapping VALUES
(47382, 'NB I', 'Hungary', 'Europe'),
(47575, 'NB II', 'Hungary', 'Europe'),
(47622, 'NB III - Southwest', 'Hungary', 'Europe'),
(47483, 'Magyar Kupa', 'Hungary', 'Europe');

-- SLOVENIA
INSERT INTO competition_country_mapping VALUES
(47557, '1. SNL', 'Slovenia', 'Europe'),
(47582, '2. SNL', 'Slovenia', 'Europe');

-- SERBIA
INSERT INTO competition_country_mapping VALUES
(47674, 'Prva Liga', 'Serbia', 'Europe');

-- ISRAEL
INSERT INTO competition_country_mapping VALUES
(47526, 'Ligat Ha\'al', 'Israel', 'Asia'),
(47571, 'Liga Leumit', 'Israel', 'Asia'),
(47527, 'State Cup', 'Israel', 'Asia'),
(47501, 'Toto Cup Ligat Al', 'Israel', 'Asia');

-- SOUTH KOREA
INSERT INTO competition_country_mapping VALUES
(47586, 'K League 1', 'South Korea', 'Asia');

-- INDIA
INSERT INTO competition_country_mapping VALUES
(47499, 'Indian Super League', 'India', 'Asia'),
(47581, 'I-League', 'India', 'Asia');

-- CHINA
INSERT INTO competition_country_mapping VALUES
(47673, 'CSL', 'China', 'Asia');

-- THAILAND
INSERT INTO competition_country_mapping VALUES
(47422, 'Thai League 1', 'Thailand', 'Asia');

-- IRAN
INSERT INTO competition_country_mapping VALUES
(47441, 'Persian Gulf Pro League', 'Iran', 'Asia');

-- QATAR
INSERT INTO competition_country_mapping VALUES
(47439, 'Emir Cup', 'Qatar', 'Asia'),
(47438, 'QSL Cup', 'Qatar', 'Asia'),
(47535, 'QFA Cup', 'Qatar', 'Asia'),
(47536, 'Qatar Cup', 'Qatar', 'Asia'),
(47646, 'Qatar-UAE Super Cup', 'Qatar', 'Asia');

-- UAE
INSERT INTO competition_country_mapping VALUES
(47445, 'Liga Pro', 'UAE', 'Asia'),
(47443, 'Pro League', 'UAE', 'Asia');

-- SOUTH AFRICA
INSERT INTO competition_country_mapping VALUES
(47478, 'Premier Soccer League', 'South Africa', 'Africa'),
(47669, 'PSL', 'South Africa', 'Africa');

-- MOROCCO
INSERT INTO competition_country_mapping VALUES
(47627, 'Botola Pro', 'Morocco', 'Africa');

-- BULGARIA
INSERT INTO competition_country_mapping VALUES
(47684, 'A PFG', 'Bulgaria', 'Europe');

-- FINLAND
INSERT INTO competition_country_mapping VALUES
(47473, 'Veikkausliiga', 'Finland', 'Europe'),
(47474, 'Suomen Cup', 'Finland', 'Europe'),
(47625, 'Ykkönen', 'Finland', 'Europe'),
(47624, 'Kakkonen - Lohko C', 'Finland', 'Europe');

-- ICELAND
INSERT INTO competition_country_mapping VALUES
(47432, 'Úrvalsdeild', 'Iceland', 'Europe'),
(47662, 'Besta deild', 'Iceland', 'Europe'),
(47690, 'Meistaradeildin', 'Iceland', 'Europe'),
(47641, 'Reykjavik Cup', 'Iceland', 'Europe');

-- AZERBAIJAN
INSERT INTO competition_country_mapping VALUES
(47565, 'Premyer Liqa', 'Azerbaijan', 'Europe');

-- LATVIA
INSERT INTO competition_country_mapping VALUES
(47532, 'Virsliga', 'Latvia', 'Europe');

-- LITHUANIA
INSERT INTO competition_country_mapping VALUES
(47498, 'A Lyga', 'Lithuania', 'Europe');

-- FAROE ISLANDS
INSERT INTO competition_country_mapping VALUES
(47494, '1. Deild', 'Faroe Islands', 'Europe');

-- PARAGUAY
INSERT INTO competition_country_mapping VALUES
(47522, 'Division Intermedia', 'Paraguay', 'South America'),
(47521, 'Division Profesional - Apertura', 'Paraguay', 'South America'),
(47482, 'Division Profesional - Clausura', 'Paraguay', 'South America'),
(47584, 'Copa Paraguay', 'Paraguay', 'South America');

-- CHILE
INSERT INTO competition_country_mapping VALUES
(47514, 'Copa Chile', 'Chile', 'South America'),
(47647, 'Primera División', 'Chile', 'South America'),
(47425, 'Primera División - Apertura', 'Chile', 'South America'),
(47424, 'Primera División - Clausura', 'Chile', 'South America');

-- COLOMBIA
INSERT INTO competition_country_mapping VALUES
(47618, 'Copa Colombia', 'Colombia', 'South America'),
(47576, 'Primera A', 'Colombia', 'South America');

-- HONDURAS
INSERT INTO competition_country_mapping VALUES
(47476, 'Liga Nacional', 'Honduras', 'Central America');

-- CANADA
INSERT INTO competition_country_mapping VALUES
(47620, 'Canadian Championship', 'Canada', 'North America');

-- IRELAND
INSERT INTO competition_country_mapping VALUES
(47389, 'FAI Cup', 'Ireland', 'Europe'),
(47549, 'Irish Cup', 'Ireland/Northern Ireland', 'Europe'),
(47542, 'Premier Division', 'Ireland', 'Europe');

-- WALES
INSERT INTO competition_country_mapping VALUES
(47630, 'FAW Championship', 'Wales', 'Europe'),
(47634, 'Welsh Cup', 'Wales', 'Europe');

-- VARIOUS DIVISIONS/LEAGUES (Multiple countries or unclear)
INSERT INTO competition_country_mapping VALUES
(47415, '1. Division', 'Various', 'Europe'),
(47453, '1. Division', 'Various', 'Europe'),
(47491, '1. Division', 'Various', 'Europe'),
(47519, '2. Division - Group 1', 'Various', 'Europe'),
(47520, '2. Division - Group 2', 'Various', 'Europe'),
(47534, '2. Division - Play-offs', 'Various', 'Europe'),
(47504, '2. Liga', 'Various', 'Europe'),
(47502, 'First Division', 'Various', 'Europe'),
(47560, 'First League', 'Various', 'Europe'),
(47573, 'Second Division', 'Various', 'Europe'),
(47603, 'Premier League', 'Various', 'Multiple'),
(47548, 'Premiership', 'Various', 'Multiple'),
(47416, 'Super League', 'Various', 'Multiple'),
(47488, 'Super League', 'Various', 'Multiple'),
(47594, 'Super Liga', 'Various', 'Multiple'),
(47585, 'Supercopa', 'Various', 'Multiple');

-- CUPS (Generic or Multi-country)
INSERT INTO competition_country_mapping VALUES
(47495, 'Cup', 'Various', 'Multiple'),
(47505, 'Cup', 'Various', 'Multiple'),
(47508, 'Cup', 'Various', 'Multiple'),
(47531, 'Cup', 'Various', 'Multiple'),
(47555, 'Cup', 'Various', 'Multiple'),
(47589, 'Cup', 'Various', 'Multiple'),
(47595, 'Cup', 'Various', 'Multiple'),
(47370, 'Super Cup', 'Various', 'Multiple'),
(47404, 'Super Cup', 'Various', 'Multiple'),
(47644, 'Super Cup', 'Various', 'Multiple'),
(47556, 'League Cup', 'Various', 'Multiple'),
(47462, 'National League Cup', 'Various', 'Multiple');

-- FRIENDLIES & SPECIAL TOURNAMENTS
INSERT INTO competition_country_mapping VALUES
(47398, 'Friendlies', 'International', 'Multiple'),
(47400, 'Friendlies Clubs', 'International', 'Multiple'),
(47661, 'Club Friendlies', 'International', 'Multiple'),
(47397, 'International Champions Cup', 'International', 'Multiple'),
(47645, 'Presidents Cup', 'International', 'Multiple'),
(47447, 'China Cup', 'China', 'Asia'),
(47455, 'Caribbean Cup', 'Caribbean', 'North America'),
(47683, 'Kirin Cup', 'Japan', 'Asia');

-- UNKNOWN/UNCLEAR LEAGUES
INSERT INTO competition_country_mapping VALUES
(47493, 'Football League', 'Unknown', 'Unknown'),
(47421, 'Football League - Championship', 'Unknown', 'Unknown'),
(47692, 'Football League - Highland League', 'Scotland', 'Europe'),
(47486, 'Birinci Dasta', 'Unknown', 'Unknown');
