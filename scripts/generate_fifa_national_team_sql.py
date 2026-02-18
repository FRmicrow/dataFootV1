import csv
import sys
import urllib.parse
import urllib.request

QUERY = """
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX bd: <http://www.bigdata.com/rdf#>
PREFIX wikibase: <http://wikiba.se/ontology#>

SELECT
  ?countryLabel
  (CONCAT(?countryLabel, " national football team") AS ?teamName)
  ?fifaCode
  ?confedShort
  ?foundedYear
  ?logoUrl
WHERE {
  VALUES (?confed ?confedShort) {
    (wd:Q35572  "UEFA")
    (wd:Q182247 "AFC")
    (wd:Q258728 "CAF")
    (wd:Q263433 "CONCACAF")
    (wd:Q615607 "CONMEBOL")
    (wd:Q214950 "OFC")
  }

  ?fed wdt:P31 wd:Q1478443 ;
       wdt:P3441 ?fifaCode ;
       wdt:P17 ?country ;
       wdt:P463 ?confed .

  OPTIONAL { ?fed wdt:P571 ?inception . }
  OPTIONAL { ?fed wdt:P154 ?logo . }

  BIND(IF(BOUND(?inception), YEAR(?inception), "" ) AS ?foundedYear)

  # Commons FilePath URLs are stable and directly usable
  BIND(
    IF(
      BOUND(?logo),
      CONCAT("https://commons.wikimedia.org/wiki/Special:FilePath/", STRAFTER(STR(?logo), "Special:FilePath/")),
      ""
    ) AS ?logoUrl
  )

  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY ?countryLabel
""".strip()

def sql_escape(s: str) -> str:
    return s.replace("\\", "\\\\").replace("'", "''")

def main(out_path: str):
    url = "https://query.wikidata.org/sparql?format=csv&query=" + urllib.parse.quote(QUERY)

    req = urllib.request.Request(
        url,
        headers={"User-Agent": "fifa-sql-generator/1.0 (your-email@example.com)"}
    )

    with urllib.request.urlopen(req) as resp:
        data = resp.read().decode("utf-8")

    rows = list(csv.DictReader(data.splitlines()))
    if not rows:
        raise RuntimeError("No rows returned from Wikidata.")

    with open(out_path, "w", encoding="utf-8") as f:
        f.write("-- Auto-generated from Wikidata\n")
        f.write("INSERT INTO tmp_national_teams VALUES\n")

        values = []
        for r in rows:
            country = r.get("countryLabel","").strip()
            team = r.get("teamName","").strip()
            fifa = r.get("fifaCode","").strip()
            conf = r.get("confedShort","").strip()
            founded = r.get("foundedYear","").strip()
            logo = r.get("logoUrl","").strip()

            founded_sql = "NULL" if founded == "" else str(int(float(founded)))
            logo_sql = "NULL" if logo == "" else f"'{sql_escape(logo)}'"

            values.append(
                f"('{sql_escape(country)}', '{sql_escape(team)}', '{sql_escape(fifa)}', '{sql_escape(conf)}', {founded_sql}, {logo_sql})"
            )

        f.write(",\n".join(values))
        f.write(";\n")

    print(f"Wrote {len(rows)} rows to {out_path}")

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "tmp_national_teams_insert.sql"
    main(out)
