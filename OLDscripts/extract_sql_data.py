import re
import os

countries = ['england', 'germany', 'italy', 'portugal']

for country in countries:
    sql_file = f"scripts/import_club_trophies_{country}.sql"
    out_file = f"scripts/{country}_data_clean.txt"
    
    if not os.path.exists(sql_file):
        print(f"Skipping {country} (file not found)")
        continue
        
    print(f"Processing {country}...")
    
    with open(sql_file, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Regex to find VALUES (...), (...);
    # It looks for "INSERT INTO temp_trophy_import ... VALUES" then captures the content until ";"
    match = re.search(r"INSERT INTO temp_trophy_import\s+\([^)]+\)\s+VALUES\s+(.*?);", content, re.DOTALL)
    
    if match:
        values_block = match.group(1)
        # Split by ), ( to get individual rows approximately
        # This is a bit fragile if fields contain ), ( but usually they don't in this dataset
        # A better regex for individual tuples: \('([^']*)',\s*'([^']*)',\s*'([^']*)'\)
        
        tuples = re.findall(r"\('([^']*)',\s*'([^']*)',\s*'([^']*)'\)", values_block)
        
        with open(out_file, 'w', encoding='utf-8') as out:
            for club, comp, season in tuples:
                out.write(f"{club}\t{comp}\t{season}\n")
                
        print(f"  -> Extracted {len(tuples)} rows to {out_file}")
    else:
        print(f"  -> No data found in {sql_file}")
