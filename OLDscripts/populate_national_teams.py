import sqlite3
import os

DB_PATH = 'backend/database.sqlite'

# Raw Data (Country, Federation Name, Code, Confederation, Founded Year, Logo URL)
RAW_DATA = [
    ('Afghanistan', 'Afghanistan national football team', 'AFG', 'AFC', None, None),
    ('Albania', 'Albania national football team', 'ALB', 'UEFA', None, None),
    ('Algeria', 'Algeria national football team', 'ALG', 'CAF', None, None),
    ('American Samoa', 'American Samoa national football team', 'ASA', 'OFC', None, None),
    ('Andorra', 'Andorra national football team', 'AND', 'UEFA', None, None),
    ('Angola', 'Angola national football team', 'ANG', 'CAF', None, None),
    ('Anguilla', 'Anguilla national football team', 'AIA', 'CONCACAF', None, None),
    ('Antigua and Barbuda', 'Antigua and Barbuda national football team', 'ATG', 'CONCACAF', None, None),
    ('Argentina', 'Argentina national football team', 'ARG', 'CONMEBOL', 1893, 'https://upload.wikimedia.org/wikipedia/en/c/c1/Argentine_FA_logo.svg'),
    ('Armenia', 'Armenia national football team', 'ARM', 'UEFA', None, None),
    ('Aruba', 'Aruba national football team', 'ARU', 'CONCACAF', None, None),
    ('Australia', 'Australia national football team', 'AUS', 'AFC', 1961, 'https://upload.wikimedia.org/wikipedia/en/8/8b/Football_Australia_logo.svg'),
    ('Austria', 'Austria national football team', 'AUT', 'UEFA', 1904, 'https://upload.wikimedia.org/wikipedia/en/8/84/Austrian_Football_Association_logo.svg'),
    ('Azerbaijan', 'Azerbaijan national football team', 'AZE', 'UEFA', 1992, 'https://upload.wikimedia.org/wikipedia/en/6/63/Azerbaijan_Football_Federations_Association_logo.svg'),
    ('Bahamas', 'Bahamas national football team', 'BAH', 'CONCACAF', None, None),
    ('Bahrain', 'Bahrain national football team', 'BHR', 'AFC', 1957, 'https://upload.wikimedia.org/wikipedia/en/7/7c/Bahrain_Football_Association_logo.svg'),
    ('Bangladesh', 'Bangladesh national football team', 'BAN', 'AFC', 1972, 'https://upload.wikimedia.org/wikipedia/en/5/53/Bangladesh_Football_Federation_logo.svg'),
    ('Barbados', 'Barbados national football team', 'BRB', 'CONCACAF', None, None),
    ('Belarus', 'Belarus national football team', 'BLR', 'UEFA', 1989, 'https://upload.wikimedia.org/wikipedia/en/8/85/Belarus_Football_Federation_logo.svg'),
    ('Belgium', 'Belgium national football team', 'BEL', 'UEFA', 1895, 'https://upload.wikimedia.org/wikipedia/en/9/9e/Royal_Belgian_FA_logo_2019.svg'),
    ('Belize', 'Belize national football team', 'BLZ', 'CONCACAF', None, None),
    ('Benin', 'Benin national football team', 'BEN', 'CAF', 1962, 'https://upload.wikimedia.org/wikipedia/en/3/3e/Benin_Football_Federation_logo.svg'),
    ('Bermuda', 'Bermuda national football team', 'BER', 'CONCACAF', None, None),
    ('Bhutan', 'Bhutan national football team', 'BHU', 'AFC', 1983, 'https://upload.wikimedia.org/wikipedia/en/6/6e/Bhutan_Football_Federation_logo.svg'),
    ('Bolivia', 'Bolivia national football team', 'BOL', 'CONMEBOL', 1925, 'https://upload.wikimedia.org/wikipedia/en/8/8c/Bolivian_Football_Federation_logo.svg'),
    ('Bosnia and Herzegovina', 'Bosnia and Herzegovina national football team', 'BIH', 'UEFA', 1992, 'https://upload.wikimedia.org/wikipedia/en/3/3f/NFSBiH_logo.svg'),
    ('Botswana', 'Botswana national football team', 'BOT', 'CAF', 1966, 'https://upload.wikimedia.org/wikipedia/en/6/6b/Botswana_Football_Association_logo.svg'),
    ('Brazil', 'Brazil national football team', 'BRA', 'CONMEBOL', 1914, 'https://upload.wikimedia.org/wikipedia/en/0/05/CBF_2019.svg'),
    ('Brunei', 'Brunei national football team', 'BRU', 'AFC', 1959, 'https://upload.wikimedia.org/wikipedia/en/3/36/Brunei_Football_Association_logo.svg'),
    ('Bulgaria', 'Bulgaria national football team', 'BUL', 'UEFA', 1923, 'https://upload.wikimedia.org/wikipedia/en/9/9b/Bulgarian_Football_Union_logo.svg'),
    ('Burkina Faso', 'Burkina Faso national football team', 'BFA', 'CAF', 1960, 'https://upload.wikimedia.org/wikipedia/en/4/47/Burkina_Faso_Football_Federation_logo.svg'),
    ('Burundi', 'Burundi national football team', 'BDI', 'CAF', 1948, 'https://upload.wikimedia.org/wikipedia/en/1/14/Federation_de_Football_du_Burundi_logo.svg'),
    ('Cambodia', 'Cambodia national football team', 'CAM', 'AFC', 1933, 'https://upload.wikimedia.org/wikipedia/en/9/9a/Cambodian_Football_Federation_logo.svg'),
    ('Cameroon', 'Cameroon national football team', 'CMR', 'CAF', 1959, 'https://upload.wikimedia.org/wikipedia/en/4/4f/Cameroon_Football_Federation_logo.svg'),
    ('Canada', 'Canada national football team', 'CAN', 'CONCACAF', 1912, 'https://upload.wikimedia.org/wikipedia/en/9/9c/Canada_Soccer_Logo.svg'),
    ('Cape Verde', 'Cape Verde national football team', 'CPV', 'CAF', 1982, 'https://upload.wikimedia.org/wikipedia/en/9/9e/Cape_Verde_Football_Federation_logo.svg'),
    ('Central African Republic', 'Central African Republic national football team', 'CTA', 'CAF', 1961, 'https://upload.wikimedia.org/wikipedia/en/3/3a/Central_African_Republic_Football_Federation_logo.svg'),
    ('Chad', 'Chad national football team', 'CHA', 'CAF', 1962, 'https://upload.wikimedia.org/wikipedia/en/6/6b/Chadian_Football_Federation_logo.svg'),
    ('Chile', 'Chile national football team', 'CHI', 'CONMEBOL', 1895, 'https://upload.wikimedia.org/wikipedia/en/8/8f/FFCh_logo.svg'),
    ('China PR', 'China national football team', 'CHN', 'AFC', 1924, 'https://upload.wikimedia.org/wikipedia/en/6/6f/Chinese_Football_Association_logo.svg'),
    ('Chinese Taipei', 'Chinese Taipei national football team', 'TPE', 'AFC', 1936, 'https://upload.wikimedia.org/wikipedia/en/0/0a/Chinese_Taipei_Football_Association_logo.svg'),
    ('Colombia', 'Colombia national football team', 'COL', 'CONMEBOL', 1924, 'https://upload.wikimedia.org/wikipedia/en/4/46/Colombian_Football_Federation_logo.svg'),
    ('Comoros', 'Comoros national football team', 'COM', 'CAF', 1979, 'https://upload.wikimedia.org/wikipedia/en/2/2d/Comoros_Football_Federation_logo.svg'),
    ('Congo', 'Congo national football team', 'CGO', 'CAF', 1962, 'https://upload.wikimedia.org/wikipedia/en/7/7a/Congo_Football_Federation_logo.svg'),
    ('Costa Rica', 'Costa Rica national football team', 'CRC', 'CONCACAF', 1921, 'https://upload.wikimedia.org/wikipedia/en/8/8b/Costa_Rica_Football_Federation_logo.svg'),
    ('Croatia', 'Croatia national football team', 'CRO', 'UEFA', 1912, 'https://upload.wikimedia.org/wikipedia/en/6/6e/Croatian_Football_Federation_logo.svg'),
    ('Cuba', 'Cuba national football team', 'CUB', 'CONCACAF', 1924, 'https://upload.wikimedia.org/wikipedia/en/8/89/Cuban_Football_Association_logo.svg'),
    ('Curaçao', 'Curaçao national football team', 'CUW', 'CONCACAF', 1921, 'https://upload.wikimedia.org/wikipedia/en/9/9c/Curacao_Football_Federation_logo.svg'),
    ('Cyprus', 'Cyprus national football team', 'CYP', 'UEFA', 1934, 'https://upload.wikimedia.org/wikipedia/en/4/4c/Cyprus_Football_Association_logo.svg'),
    ('Czech Republic', 'Czech Republic national football team', 'CZE', 'UEFA', 1901, 'https://upload.wikimedia.org/wikipedia/en/5/5c/Czech_Football_Association_logo.svg'),
    ('Denmark', 'Denmark national football team', 'DEN', 'UEFA', 1889, 'https://upload.wikimedia.org/wikipedia/en/5/5e/Danish_Football_Association_logo.svg'),
    ('Djibouti', 'Djibouti national football team', 'DJI', 'CAF', 1979, 'https://upload.wikimedia.org/wikipedia/en/5/56/Djibouti_Football_Federation_logo.svg'),
    ('Dominica', 'Dominica national football team', 'DMA', 'CONCACAF', None, None),
    ('Dominican Republic', 'Dominican Republic national football team', 'DOM', 'CONCACAF', 1953, 'https://upload.wikimedia.org/wikipedia/en/8/84/Dominican_Football_Federation_logo.svg'),
    ('Ecuador', 'Ecuador national football team', 'ECU', 'CONMEBOL', 1925, 'https://upload.wikimedia.org/wikipedia/en/6/6f/Ecuadorian_Football_Federation_logo.svg'),
    ('Egypt', 'Egypt national football team', 'EGY', 'CAF', 1921, 'https://upload.wikimedia.org/wikipedia/en/6/6d/Egyptian_Football_Association_logo.svg'),
    ('El Salvador', 'El Salvador national football team', 'SLV', 'CONCACAF', 1935, 'https://upload.wikimedia.org/wikipedia/en/1/1b/Fesfut_logo.svg'),
    ('England', 'England national football team', 'ENG', 'UEFA', 1863, 'https://upload.wikimedia.org/wikipedia/en/b/be/England_crest_2009.svg'),
    ('Equatorial Guinea', 'Equatorial Guinea national football team', 'EQG', 'CAF', 1950, 'https://upload.wikimedia.org/wikipedia/en/6/69/Equatorial_Guinea_Football_Federation_logo.svg'),
    ('Eritrea', 'Eritrea national football team', 'ERI', 'CAF', 1996, 'https://upload.wikimedia.org/wikipedia/en/7/7b/Eritrea_Football_Federation_logo.svg'),
    ('Estonia', 'Estonia national football team', 'EST', 'UEFA', 1921, 'https://upload.wikimedia.org/wikipedia/en/6/6a/Estonian_Football_Association_logo.svg'),
    ('Eswatini', 'Eswatini national football team', 'SWZ', 'CAF', 1968, 'https://upload.wikimedia.org/wikipedia/en/0/0c/Eswatini_Football_Association_logo.svg'),
    ('Ethiopia', 'Ethiopia national football team', 'ETH', 'CAF', 1943, 'https://upload.wikimedia.org/wikipedia/en/1/1b/Ethiopian_Football_Federation_logo.svg'),
    ('Faroe Islands', 'Faroe Islands national football team', 'FRO', 'UEFA', 1979, 'https://upload.wikimedia.org/wikipedia/en/3/3a/Faroe_Islands_Football_Association_logo.svg'),
    ('Fiji', 'Fiji national football team', 'FIJ', 'OFC', 1938, 'https://upload.wikimedia.org/wikipedia/en/6/6e/Fiji_Football_Association_logo.svg'),
    ('Finland', 'Finland national football team', 'FIN', 'UEFA', 1907, 'https://upload.wikimedia.org/wikipedia/en/b/b0/Finnish_Football_Association_logo.svg'),
    ('France', 'France national football team', 'FRA', 'UEFA', 1904, 'https://upload.wikimedia.org/wikipedia/en/c/c3/France_national_football_team_seal.svg'),
    ('Gabon', 'Gabon national football team', 'GAB', 'CAF', 1962, 'https://upload.wikimedia.org/wikipedia/en/0/05/Gabonese_Football_Federation_logo.svg'),
    ('Gambia', 'Gambia national football team', 'GAM', 'CAF', 1952, 'https://upload.wikimedia.org/wikipedia/en/3/36/Gambia_Football_Federation_logo.svg'),
    ('Georgia', 'Georgia national football team', 'GEO', 'UEFA', 1990, 'https://upload.wikimedia.org/wikipedia/en/2/2f/Georgian_Football_Federation_logo.svg'),
    ('Germany', 'Germany national football team', 'GER', 'UEFA', 1908, 'https://upload.wikimedia.org/wikipedia/en/e/e3/DFB_Logo_2017.svg'),
    ('Ghana', 'Ghana national football team', 'GHA', 'CAF', 1957, 'https://upload.wikimedia.org/wikipedia/en/4/4f/Ghana_Football_Association_logo.svg'),
    ('Gibraltar', 'Gibraltar national football team', 'GIB', 'UEFA', 1895, 'https://upload.wikimedia.org/wikipedia/en/0/0f/Gibraltar_Football_Association_logo.svg'),
    ('Greece', 'Greece national football team', 'GRE', 'UEFA', 1926, 'https://upload.wikimedia.org/wikipedia/en/9/9f/Hellenic_Football_Federation_logo.svg'),
    ('Grenada', 'Grenada national football team', 'GRN', 'CONCACAF', None, None),
    ('Guatemala', 'Guatemala national football team', 'GUA', 'CONCACAF', 1919, 'https://upload.wikimedia.org/wikipedia/en/0/0b/Guatemalan_Football_Federation_logo.svg'),
    ('Guinea', 'Guinea national football team', 'GUI', 'CAF', 1960, 'https://upload.wikimedia.org/wikipedia/en/9/93/Guinea_Football_Federation_logo.svg'),
    ('Guinea-Bissau', 'Guinea-Bissau national football team', 'GNB', 'CAF', 1974, 'https://upload.wikimedia.org/wikipedia/en/7/7e/Guinea-Bissau_Football_Federation_logo.svg'),
    ('Guyana', 'Guyana national football team', 'GUY', 'CONCACAF', 1902, 'https://upload.wikimedia.org/wikipedia/en/7/74/Guyana_Football_Federation_logo.svg'),
    ('Haiti', 'Haiti national football team', 'HAI', 'CONCACAF', 1904, 'https://upload.wikimedia.org/wikipedia/en/5/52/Haiti_Football_Federation_logo.svg'),
    ('Honduras', 'Honduras national football team', 'HON', 'CONCACAF', 1951, 'https://upload.wikimedia.org/wikipedia/en/2/2c/Honduran_Football_Federation_logo.svg'),
    ('Hong Kong', 'Hong Kong national football team', 'HKG', 'AFC', 1914, 'https://upload.wikimedia.org/wikipedia/en/7/77/Hong_Kong_Football_Association_logo.svg'),
    ('Hungary', 'Hungary national football team', 'HUN', 'UEFA', 1901, 'https://upload.wikimedia.org/wikipedia/en/9/90/Hungarian_Football_Federation_logo.svg'),
    ('Iceland', 'Iceland national football team', 'ISL', 'UEFA', 1947, 'https://upload.wikimedia.org/wikipedia/en/0/0e/Iceland_Football_Association_logo.svg'),
    ('India', 'India national football team', 'IND', 'AFC', 1937, 'https://upload.wikimedia.org/wikipedia/en/8/89/All_India_Football_Federation_logo.svg'),
    ('Indonesia', 'Indonesia national football team', 'IDN', 'AFC', 1930, 'https://upload.wikimedia.org/wikipedia/en/1/16/Football_Association_of_Indonesia_logo.svg'),
    ('Iran', 'Iran national football team', 'IRN', 'AFC', 1920, 'https://upload.wikimedia.org/wikipedia/en/0/05/Iran_Football_Federation_logo.svg'),
    ('Iraq', 'Iraq national football team', 'IRQ', 'AFC', 1948, 'https://upload.wikimedia.org/wikipedia/en/3/32/Iraq_Football_Association_logo.svg'),
    ('Ireland', 'Republic of Ireland national football team', 'IRL', 'UEFA', 1921, 'https://upload.wikimedia.org/wikipedia/en/5/5f/FAI_logo.svg'),
    ('Israel', 'Israel national football team', 'ISR', 'UEFA', 1928, 'https://upload.wikimedia.org/wikipedia/en/3/35/Israel_Football_Association_logo.svg'),
    ('Italy', 'Italy national football team', 'ITA', 'UEFA', 1898, 'https://upload.wikimedia.org/wikipedia/en/0/03/FIGC_Logo_2017.svg'),
    ('Ivory Coast', 'Ivory Coast national football team', 'CIV', 'CAF', 1960, 'https://upload.wikimedia.org/wikipedia/en/7/7e/Ivory_Coast_Football_Federation_logo.svg'),
    ('Jamaica', 'Jamaica national football team', 'JAM', 'CONCACAF', 1910, 'https://upload.wikimedia.org/wikipedia/en/5/5b/Jamaica_Football_Federation_logo.svg'),
    ('Japan', 'Japan national football team', 'JPN', 'AFC', 1921, 'https://upload.wikimedia.org/wikipedia/en/8/8e/Japan_FA_crest.svg'),
    ('Jordan', 'Jordan national football team', 'JOR', 'AFC', 1949, 'https://upload.wikimedia.org/wikipedia/en/5/55/Jordan_Football_Association_logo.svg'),
    ('Kazakhstan', 'Kazakhstan national football team', 'KAZ', 'UEFA', 1992, 'https://upload.wikimedia.org/wikipedia/en/5/5b/Kazakhstan_Football_Federation_logo.svg'),
    ('Kenya', 'Kenya national football team', 'KEN', 'CAF', 1960, 'https://upload.wikimedia.org/wikipedia/en/6/6d/Kenya_Football_Federation_logo.svg'),
    ('Kuwait', 'Kuwait national football team', 'KUW', 'AFC', 1957, 'https://upload.wikimedia.org/wikipedia/en/3/34/Kuwait_Football_Association_logo.svg'),
    ('Kyrgyzstan', 'Kyrgyzstan national football team', 'KGZ', 'AFC', 1992, 'https://upload.wikimedia.org/wikipedia/en/6/6f/Kyrgyzstan_Football_Union_logo.svg'),
    ('Latvia', 'Latvia national football team', 'LVA', 'UEFA', 1921, 'https://upload.wikimedia.org/wikipedia/en/3/3a/Latvian_Football_Federation_logo.svg'),
    ('Lebanon', 'Lebanon national football team', 'LIB', 'AFC', 1933, 'https://upload.wikimedia.org/wikipedia/en/2/2e/Lebanese_Football_Association_logo.svg'),
    ('Lesotho', 'Lesotho national football team', 'LES', 'CAF', 1932, 'https://upload.wikimedia.org/wikipedia/en/9/9f/Lesotho_Football_Association_logo.svg'),
    ('Liberia', 'Liberia national football team', 'LBR', 'CAF', 1936, 'https://upload.wikimedia.org/wikipedia/en/4/4e/Liberia_Football_Association_logo.svg'),
    ('Libya', 'Libya national football team', 'LBY', 'CAF', 1962, 'https://upload.wikimedia.org/wikipedia/en/7/77/Libyan_Football_Federation_logo.svg'),
    ('Liechtenstein', 'Liechtenstein national football team', 'LIE', 'UEFA', 1934, 'https://upload.wikimedia.org/wikipedia/en/0/0e/Liechtenstein_Football_Association_logo.svg'),
    ('Lithuania', 'Lithuania national football team', 'LTU', 'UEFA', 1922, 'https://upload.wikimedia.org/wikipedia/en/4/4c/Lithuanian_Football_Federation_logo.svg'),
    ('Luxembourg', 'Luxembourg national football team', 'LUX', 'UEFA', 1908, 'https://upload.wikimedia.org/wikipedia/en/4/4c/Luxembourg_Football_Federation_logo.svg'),
    ('Madagascar', 'Madagascar national football team', 'MAD', 'CAF', 1961, 'https://upload.wikimedia.org/wikipedia/en/4/4c/Madagascar_Football_Federation_logo.svg'),
    ('Malawi', 'Malawi national football team', 'MWI', 'CAF', 1966, 'https://upload.wikimedia.org/wikipedia/en/6/63/Malawi_Football_Association_logo.svg'),
    ('Malaysia', 'Malaysia national football team', 'MAS', 'AFC', 1952, 'https://upload.wikimedia.org/wikipedia/en/8/88/Malaysia_Football_Association_logo.svg'),
    ('Maldives', 'Maldives national football team', 'MDV', 'AFC', 1980, 'https://upload.wikimedia.org/wikipedia/en/5/55/Maldives_Football_Association_logo.svg'),
    ('Mali', 'Mali national football team', 'MLI', 'CAF', 1960, 'https://upload.wikimedia.org/wikipedia/en/4/4f/Mali_Football_Federation_logo.svg'),
    ('Malta', 'Malta national football team', 'MLT', 'UEFA', 1900, 'https://upload.wikimedia.org/wikipedia/en/6/6c/Malta_Football_Association_logo.svg'),
    ('Mauritania', 'Mauritania national football team', 'MTN', 'CAF', 1961, 'https://upload.wikimedia.org/wikipedia/en/3/36/Mauritanian_Football_Federation_logo.svg'),
    ('Mauritius', 'Mauritius national football team', 'MRI', 'CAF', 1952, 'https://upload.wikimedia.org/wikipedia/en/0/0b/Mauritius_Football_Association_logo.svg'),
    ('Mexico', 'Mexico national football team', 'MEX', 'CONCACAF', 1927, 'https://upload.wikimedia.org/wikipedia/en/7/7a/Mexican_Football_Federation_logo.svg'),
    ('Moldova', 'Moldova national football team', 'MDA', 'UEFA', 1990, 'https://upload.wikimedia.org/wikipedia/en/7/70/Moldovan_Football_Federation_logo.svg'),
    ('Mongolia', 'Mongolia national football team', 'MNG', 'AFC', 1959, 'https://upload.wikimedia.org/wikipedia/en/4/4a/Mongolian_Football_Federation_logo.svg'),
    ('Montenegro', 'Montenegro national football team', 'MNE', 'UEFA', 1931, 'https://upload.wikimedia.org/wikipedia/en/6/6e/Montenegro_Football_Association_logo.svg'),
    ('Montserrat', 'Montserrat national football team', 'MSR', 'CONCACAF', None, None),
    ('Morocco', 'Morocco national football team', 'MAR', 'CAF', 1956, 'https://upload.wikimedia.org/wikipedia/en/2/2c/Royal_Moroccan_Football_Federation_logo.svg'),
    ('Mozambique', 'Mozambique national football team', 'MOZ', 'CAF', 1976, 'https://upload.wikimedia.org/wikipedia/en/7/7f/Mozambique_Football_Federation_logo.svg'),
    ('Myanmar', 'Myanmar national football team', 'MYA', 'AFC', 1947, 'https://upload.wikimedia.org/wikipedia/en/6/6c/Myanmar_Football_Federation_logo.svg'),
    ('Namibia', 'Namibia national football team', 'NAM', 'CAF', 1990, 'https://upload.wikimedia.org/wikipedia/en/5/5c/Namibia_Football_Association_logo.svg'),
    ('Nepal', 'Nepal national football team', 'NEP', 'AFC', 1951, 'https://upload.wikimedia.org/wikipedia/en/9/93/All_Nepal_Football_Association_logo.svg'),
    ('Netherlands', 'Netherlands national football team', 'NED', 'UEFA', 1889, 'https://upload.wikimedia.org/wikipedia/en/0/04/KNVB_logo.svg'),
    ('New Zealand', 'New Zealand national football team', 'NZL', 'OFC', 1891, 'https://upload.wikimedia.org/wikipedia/en/2/2e/New_Zealand_Football_logo.svg'),
    ('Nicaragua', 'Nicaragua national football team', 'NCA', 'CONCACAF', 1931, 'https://upload.wikimedia.org/wikipedia/en/5/58/FENIFUT_logo.svg'),
    ('Niger', 'Niger national football team', 'NIG', 'CAF', 1960, 'https://upload.wikimedia.org/wikipedia/en/1/1b/Niger_Football_Federation_logo.svg'),
    ('Nigeria', 'Nigeria national football team', 'NGA', 'CAF', 1945, 'https://upload.wikimedia.org/wikipedia/en/3/36/Nigeria_Football_Federation_logo.svg'),
    ('North Macedonia', 'North Macedonia national football team', 'MKD', 'UEFA', 1993, 'https://upload.wikimedia.org/wikipedia/en/4/4b/Macedonian_Football_Federation_logo.svg'),
    ('Northern Ireland', 'Northern Ireland national football team', 'NIR', 'UEFA', 1880, 'https://upload.wikimedia.org/wikipedia/en/4/43/Irish_Football_Association_logo.svg'),
    ('Norway', 'Norway national football team', 'NOR', 'UEFA', 1902, 'https://upload.wikimedia.org/wikipedia/en/0/0c/Norwegian_Football_Federation_logo.svg'),
    ('Oman', 'Oman national football team', 'OMA', 'AFC', 1978, 'https://upload.wikimedia.org/wikipedia/en/5/5b/Oman_Football_Association_logo.svg'),
    ('Pakistan', 'Pakistan national football team', 'PAK', 'AFC', 1947, 'https://upload.wikimedia.org/wikipedia/en/5/5f/Pakistan_Football_Federation_logo.svg'),
    ('Panama', 'Panama national football team', 'PAN', 'CONCACAF', 1937, 'https://upload.wikimedia.org/wikipedia/en/0/0c/Panamanian_Football_Federation_logo.svg'),
    ('Paraguay', 'Paraguay national football team', 'PAR', 'CONMEBOL', 1906, 'https://upload.wikimedia.org/wikipedia/en/8/87/Paraguayan_Football_Association_logo.svg'),
    ('Peru', 'Peru national football team', 'PER', 'CONMEBOL', 1922, 'https://upload.wikimedia.org/wikipedia/en/c/cf/Peruvian_Football_Federation_logo.svg'),
    ('Philippines', 'Philippines national football team', 'PHI', 'AFC', 1907, 'https://upload.wikimedia.org/wikipedia/en/3/3f/Philippine_Football_Federation_logo.svg'),
    ('Poland', 'Poland national football team', 'POL', 'UEFA', 1919, 'https://upload.wikimedia.org/wikipedia/en/1/1e/Polish_Football_Association_logo.svg'),
    ('Portugal', 'Portugal national football team', 'POR', 'UEFA', 1914, 'https://upload.wikimedia.org/wikipedia/en/5/5f/Portuguese_Football_Federation_logo.svg'),
    ('Qatar', 'Qatar national football team', 'QAT', 'AFC', 1960, 'https://upload.wikimedia.org/wikipedia/en/3/3a/Qatar_Football_Association_logo.svg'),
    ('Romania', 'Romania national football team', 'ROU', 'UEFA', 1909, 'https://upload.wikimedia.org/wikipedia/en/3/3a/Romanian_Football_Federation_logo.svg'),
    ('Russia', 'Russia national football team', 'RUS', 'UEFA', 1912, 'https://upload.wikimedia.org/wikipedia/en/0/0d/Russian_Football_Union_logo.svg'),
    ('Rwanda', 'Rwanda national football team', 'RWA', 'CAF', 1972, 'https://upload.wikimedia.org/wikipedia/en/6/6b/Rwanda_Football_Federation_logo.svg'),
    ('Saint Kitts and Nevis', 'Saint Kitts and Nevis national football team', 'SKN', 'CONCACAF', None, None),
    ('Saint Lucia', 'Saint Lucia national football team', 'LCA', 'CONCACAF', None, None),
    ('Saint Vincent and the Grenadines', 'Saint Vincent and the Grenadines national football team', 'VIN', 'CONCACAF', None, None),
    ('San Marino', 'San Marino national football team', 'SMR', 'UEFA', 1931, 'https://upload.wikimedia.org/wikipedia/en/6/6f/San_Marino_Football_Federation_logo.svg'),
    ('São Tomé and Príncipe', 'São Tomé and Príncipe national football team', 'STP', 'CAF', 1975, 'https://upload.wikimedia.org/wikipedia/en/2/2f/Sao_Tome_and_Principe_Football_Federation_logo.svg'),
    ('Saudi Arabia', 'Saudi Arabia national football team', 'KSA', 'AFC', 1956, 'https://upload.wikimedia.org/wikipedia/en/6/6e/Saudi_Arabian_Football_Federation_logo.svg'),
    ('Scotland', 'Scotland national football team', 'SCO', 'UEFA', 1873, 'https://upload.wikimedia.org/wikipedia/en/8/8c/Scotland_national_football_team_logo_2014.svg'),
    ('Senegal', 'Senegal national football team', 'SEN', 'CAF', 1960, 'https://upload.wikimedia.org/wikipedia/en/4/45/Senegalese_Football_Federation_logo.svg'),
    ('Serbia', 'Serbia national football team', 'SRB', 'UEFA', 1919, 'https://upload.wikimedia.org/wikipedia/en/9/9e/Football_Association_of_Serbia_logo.svg'),
    ('Seychelles', 'Seychelles national football team', 'SEY', 'CAF', 1979, 'https://upload.wikimedia.org/wikipedia/en/6/6e/Seychelles_Football_Federation_logo.svg'),
    ('Sierra Leone', 'Sierra Leone national football team', 'SLE', 'CAF', 1960, 'https://upload.wikimedia.org/wikipedia/en/7/7f/Sierra_Leone_Football_Association_logo.svg'),
    ('Singapore', 'Singapore national football team', 'SIN', 'AFC', 1892, 'https://upload.wikimedia.org/wikipedia/en/4/4e/Football_Association_of_Singapore_logo.svg'),
    ('Slovakia', 'Slovakia national football team', 'SVK', 'UEFA', 1938, 'https://upload.wikimedia.org/wikipedia/en/6/6d/Slovak_Football_Association_logo.svg'),
    ('Slovenia', 'Slovenia national football team', 'SVN', 'UEFA', 1920, 'https://upload.wikimedia.org/wikipedia/en/5/5b/Football_Association_of_Slovenia_logo.svg'),
    ('Solomon Islands', 'Solomon Islands national football team', 'SOL', 'OFC', 1978, 'https://upload.wikimedia.org/wikipedia/en/2/2e/Solomon_Islands_Football_Federation_logo.svg'),
    ('Somalia', 'Somalia national football team', 'SOM', 'CAF', 1951, 'https://upload.wikimedia.org/wikipedia/en/8/8c/Somali_Football_Federation_logo.svg'),
    ('South Africa', 'South Africa national football team', 'RSA', 'CAF', 1892, 'https://upload.wikimedia.org/wikipedia/en/1/16/South_African_Football_Association_logo.svg'),
    ('South Sudan', 'South Sudan national football team', 'SSD', 'CAF', 2011, 'https://upload.wikimedia.org/wikipedia/en/0/0f/South_Sudan_Football_Association_logo.svg'),
    ('Spain', 'Spain national football team', 'ESP', 'UEFA', 1909, 'https://upload.wikimedia.org/wikipedia/en/3/31/Spain_National_Football_Team_badge.svg'),
    ('Sri Lanka', 'Sri Lanka national football team', 'SRI', 'AFC', 1939, 'https://upload.wikimedia.org/wikipedia/en/2/2e/Sri_Lanka_Football_Federation_logo.svg'),
    ('Sudan', 'Sudan national football team', 'SDN', 'CAF', 1936, 'https://upload.wikimedia.org/wikipedia/en/1/1b/Sudan_Football_Association_logo.svg'),
    ('Suriname', 'Suriname national football team', 'SUR', 'CONCACAF', 1920, 'https://upload.wikimedia.org/wikipedia/en/5/5a/Surinamese_Football_Association_logo.svg'),
    ('Sweden', 'Sweden national football team', 'SWE', 'UEFA', 1904, 'https://upload.wikimedia.org/wikipedia/en/6/6b/Swedish_Football_Association_logo.svg'),
    ('Switzerland', 'Switzerland national football team', 'SUI', 'UEFA', 1895, 'https://upload.wikimedia.org/wikipedia/en/5/5c/Swiss_Football_Association_logo.svg'),
    ('Syria', 'Syria national football team', 'SYR', 'AFC', 1936, 'https://upload.wikimedia.org/wikipedia/en/5/5c/Syrian_Arab_Football_Association_logo.svg'),
    ('Tajikistan', 'Tajikistan national football team', 'TJK', 'AFC', 1992, 'https://upload.wikimedia.org/wikipedia/en/1/18/Tajikistan_Football_Federation_logo.svg'),
    ('Tanzania', 'Tanzania national football team', 'TAN', 'CAF', 1930, 'https://upload.wikimedia.org/wikipedia/en/0/02/Tanzania_Football_Federation_logo.svg'),
    ('Thailand', 'Thailand national football team', 'THA', 'AFC', 1916, 'https://upload.wikimedia.org/wikipedia/en/1/18/Football_Association_of_Thailand_logo.svg'),
    ('Togo', 'Togo national football team', 'TOG', 'CAF', 1960, 'https://upload.wikimedia.org/wikipedia/en/7/7e/Togolese_Football_Federation_logo.svg'),
    ('Trinidad and Tobago', 'Trinidad and Tobago national football team', 'TRI', 'CONCACAF', 1908, 'https://upload.wikimedia.org/wikipedia/en/6/6b/Trinidad_and_Tobago_Football_Association_logo.svg'),
    ('Tunisia', 'Tunisia national football team', 'TUN', 'CAF', 1957, 'https://upload.wikimedia.org/wikipedia/en/3/3b/Tunisian_Football_Federation_logo.svg'),
    ('Turkey', 'Turkey national football team', 'TUR', 'UEFA', 1923, 'https://upload.wikimedia.org/wikipedia/en/7/78/Turkish_Football_Federation_logo.svg'),
    ('Turkmenistan', 'Turkmenistan national football team', 'TKM', 'AFC', 1992, 'https://upload.wikimedia.org/wikipedia/en/6/6a/Turkmenistan_Football_Federation_logo.svg'),
    ('Uganda', 'Uganda national football team', 'UGA', 'CAF', 1924, 'https://upload.wikimedia.org/wikipedia/en/6/6a/Federation_of_Uganda_Football_Associations_logo.svg'),
    ('Ukraine', 'Ukraine national football team', 'UKR', 'UEFA', 1991, 'https://upload.wikimedia.org/wikipedia/en/3/3c/Ukrainian_Association_of_Football_logo.svg'),
    ('United Arab Emirates', 'United Arab Emirates national football team', 'UAE', 'AFC', 1971, 'https://upload.wikimedia.org/wikipedia/en/7/7a/UAE_Football_Association_logo.svg'),
    ('United States', 'United States national football team', 'USA', 'CONCACAF', 1913, 'https://upload.wikimedia.org/wikipedia/en/3/3f/United_States_Soccer_Federation_logo.svg'),
    ('Uruguay', 'Uruguay national football team', 'URU', 'CONMEBOL', 1900, 'https://upload.wikimedia.org/wikipedia/en/f/f1/Uruguay_Football_Association_logo.svg'),
    ('Uzbekistan', 'Uzbekistan national football team', 'UZB', 'AFC', 1992, 'https://upload.wikimedia.org/wikipedia/en/0/0b/Uzbekistan_Football_Association_logo.svg'),
    ('Vanuatu', 'Vanuatu national football team', 'VAN', 'OFC', 1934, 'https://upload.wikimedia.org/wikipedia/en/4/4f/Vanuatu_Football_Federation_logo.svg'),
    ('Venezuela', 'Venezuela national football team', 'VEN', 'CONMEBOL', 1926, 'https://upload.wikimedia.org/wikipedia/en/7/7f/Venezuelan_Football_Federation_logo.svg'),
    ('Vietnam', 'Vietnam national football team', 'VIE', 'AFC', 1960, 'https://upload.wikimedia.org/wikipedia/en/4/4f/Vietnam_Football_Federation_logo.svg'),
    ('Wales', 'Wales national football team', 'WAL', 'UEFA', 1876, 'https://upload.wikimedia.org/wikipedia/en/4/43/Wales_national_football_team_logo.svg'),
    ('Yemen', 'Yemen national football team', 'YEM', 'AFC', 1962, 'https://upload.wikimedia.org/wikipedia/en/7/7c/Yemen_Football_Association_logo.svg'),
    ('Zambia', 'Zambia national football team', 'ZAM', 'CAF', 1929, 'https://upload.wikimedia.org/wikipedia/en/3/3f/Zambia_Football_Association_logo.svg'),
    ('Zimbabwe', 'Zimbabwe national football team', 'ZIM', 'CAF', 1965, 'https://upload.wikimedia.org/wikipedia/en/1/1f/Zimbabwe_Football_Association_logo.svg')
]

def get_continent(confed):
    mapping = {
        'UEFA': 'Europe',
        'CAF': 'Africa',
        'AFC': 'Asia',
        'CONMEBOL': 'Americas', # South America
        'CONCACAF': 'Americas', # North/Central America
        'OFC': 'Oceania'
    }
    return mapping.get(confed, 'Unknown')

def get_or_create_country(cursor, country_name, code, confed):
    # Check cache/db first (case insensitive?)
    cursor.execute("SELECT country_id FROM V2_countries WHERE country_name = ?", (country_name,))
    row = cursor.fetchone()
    if row:
        return row[0]
        
    # Create
    print(f"  ✨ Creating country: {country_name}")
    continent = get_continent(confed)
    
    # Use code from data if available, else generate
    if not code:
        code = country_name[:3].upper()
    
    # Check if code exists to avoid unique constraint?
    # For now, just insert
    try:
        cursor.execute("""
            INSERT INTO V2_countries (country_name, country_code, continent)
            VALUES (?, ?, ?)
        """, (country_name, code, continent))
        return cursor.lastrowid
    except sqlite3.Error as e:
        print(f"  ❌ Failed to create country {country_name}: {e}")
        return None

def main():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # print("Dropping old V2_national_teams table...")
    # cursor.execute("DROP TABLE IF EXISTS V2_national_teams")

    print("Ensuring V2_national_teams table exists...")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS V2_national_teams (
        national_team_id INTEGER PRIMARY KEY AUTOINCREMENT,
        country_id INTEGER,
        federation_name TEXT,
        code TEXT,
        confederation_name TEXT,
        founded_year INTEGER,
        national_logo TEXT,
        FOREIGN KEY(country_id) REFERENCES V2_countries(country_id)
    );
    """)

    print(f"Processing {len(RAW_DATA)} entries...")
    
    inserted_count = 0
    updated_count = 0
    
    for row in RAW_DATA:
        country_name, fed_name, code, confed, year, logo = row
        
        c_id = get_or_create_country(cursor, country_name, code, confed)
        
        if not c_id:
            print(f"  ⚠️  Skipping {country_name}: Could not resolve country ID.")
            continue
        
        # Check if exists
        cursor.execute("SELECT national_team_id FROM V2_national_teams WHERE country_id = ?", (c_id,))
        existing = cursor.fetchone()
        
        if existing:
            # Optional: Update if missing fields?
            # For now, just skip to avoid overwriting API data
            # print(f"  ℹ️  National team for country ID {c_id} already exists. Skipping.")
            continue
        
        cursor.execute("""
            INSERT INTO V2_national_teams (country_id, federation_name, code, confederation_name, founded_year, national_logo)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (c_id, fed_name, code, confed, year, logo))
        inserted_count += 1

    conn.commit()
    conn.close()
    
    print("\n" + "="*40)
    print(f"Import Complete")
    print(f"Inserted: {inserted_count}")
    print("="*40)



if __name__ == "__main__":
    main()
