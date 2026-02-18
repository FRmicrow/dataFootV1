
def get_or_create_club(cursor, club_name: str) -> int:
    cursor.execute("SELECT club_id FROM V2_clubs WHERE club_name = ?", (club_name,))
    result = cursor.fetchone()
    if result:
        return result[0]
    
    print(f"  ⚠️  Creating new club: {club_name} (Warning: Country ID will be NULL/Default)")
    # Explicitly set country_id to a valid default (e.g. 1) to avoid NOT NULL constraint failure if schema enforces it
    # Schema says country_id is NOT NULL (notnull=1 in table_info output)
    # Using '1' (which is England in common seeds) or ideally looking up France.
    # Since this import is mixed, let's try to lookup France, defaulting to 1 if not found.
    cursor.execute("SELECT country_id FROM V2_countries WHERE country_name = 'France'")
    fr_res = cursor.fetchone()
    default_cid = fr_res[0] if fr_res else 1
    
    cursor.execute("INSERT INTO V2_clubs (club_name, club_short_name, country_id, is_active) VALUES (?, ?, ?, 1)", (club_name, club_name, default_cid))
    return cursor.lastrowid
