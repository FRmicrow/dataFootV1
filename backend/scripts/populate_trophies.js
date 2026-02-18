
import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'database.sqlite');

const trophyData = [
    { team: "Arsenal", trophy: "Championnat d’Angleterre", year: "1930–31" },
    { team: "Arsenal", trophy: "Championnat d’Angleterre", year: "1932–33" },
    { team: "Arsenal", trophy: "Championnat d’Angleterre", year: "1933–34" },
    { team: "Arsenal", trophy: "Championnat d’Angleterre", year: "1934–35" },
    { team: "Arsenal", trophy: "Championnat d’Angleterre", year: "1937–38" },
    { team: "Arsenal", trophy: "Championnat d’Angleterre", year: "1947–48" },
    { team: "Arsenal", trophy: "Championnat d’Angleterre", year: "1952–53" },
    { team: "Arsenal", trophy: "Championnat d’Angleterre", year: "1970–71" },
    { team: "Arsenal", trophy: "Championnat d’Angleterre", year: "1988–89" },
    { team: "Arsenal", trophy: "Championnat d’Angleterre", year: "1990–91" },
    { team: "Arsenal", trophy: "Championnat d’Angleterre", year: "1997–98" },
    { team: "Arsenal", trophy: "Championnat d’Angleterre", year: "2001–02" },
    { team: "Arsenal", trophy: "Championnat d’Angleterre", year: "2003–04" },
    { team: "Arsenal", trophy: "FA Cup", year: "1929–30" },
    { team: "Arsenal", trophy: "FA Cup", year: "1935–36" },
    { team: "Arsenal", trophy: "FA Cup", year: "1949–50" },
    { team: "Arsenal", trophy: "FA Cup", year: "1970–71" },
    { team: "Arsenal", trophy: "FA Cup", year: "1978–79" },
    { team: "Arsenal", trophy: "FA Cup", year: "1992–93" },
    { team: "Arsenal", trophy: "FA Cup", year: "1997–98" },
    { team: "Arsenal", trophy: "FA Cup", year: "2001–02" },
    { team: "Arsenal", trophy: "FA Cup", year: "2002–03" },
    { team: "Arsenal", trophy: "FA Cup", year: "2004–05" },
    { team: "Arsenal", trophy: "FA Cup", year: "2013–14" },
    { team: "Arsenal", trophy: "FA Cup", year: "2014–15" },
    { team: "Arsenal", trophy: "FA Cup", year: "2016–17" },
    { team: "Arsenal", trophy: "FA Cup", year: "2019–20" },
    { team: "Arsenal", trophy: "League Cup", year: "1986–87" },
    { team: "Arsenal", trophy: "League Cup", year: "1992–93" },
    { team: "Arsenal", trophy: "FA Community Shield", year: "1930" },
    { team: "Arsenal", trophy: "FA Community Shield", year: "1931" },
    { team: "Arsenal", trophy: "FA Community Shield", year: "1933" },
    { team: "Arsenal", trophy: "FA Community Shield", year: "1934" },
    { team: "Arsenal", trophy: "FA Community Shield", year: "1938" },
    { team: "Arsenal", trophy: "FA Community Shield", year: "1948" },
    { team: "Arsenal", trophy: "FA Community Shield", year: "1953" },
    { team: "Arsenal", trophy: "FA Community Shield", year: "1991" },
    { team: "Arsenal", trophy: "FA Community Shield", year: "1998" },
    { team: "Arsenal", trophy: "FA Community Shield", year: "1999" },
    { team: "Arsenal", trophy: "FA Community Shield", year: "2002" },
    { team: "Arsenal", trophy: "FA Community Shield", year: "2004" },
    { team: "Arsenal", trophy: "FA Community Shield", year: "2014" },
    { team: "Arsenal", trophy: "FA Community Shield", year: "2015" },
    { team: "Arsenal", trophy: "FA Community Shield", year: "2017" },
    { team: "Arsenal", trophy: "FA Community Shield", year: "2020" },
    { team: "Arsenal", trophy: "FA Community Shield", year: "2023" },
    { team: "Arsenal", trophy: "Coupe des villes de foires (Inter-Cities Fairs Cup)", year: "1970" },
    { team: "Arsenal", trophy: "Coupe des coupes (UEFA Cup Winners’ Cup)", year: "1994" },
    { team: "Aston Villa", trophy: "Football League First Division / Championnat d’Angleterre", year: "1893–94" },
    { team: "Aston Villa", trophy: "Football League First Division / Championnat d’Angleterre", year: "1895–96" },
    { team: "Aston Villa", trophy: "Football League First Division / Championnat d’Angleterre", year: "1896–97" },
    { team: "Aston Villa", trophy: "Football League First Division / Championnat d’Angleterre", year: "1898–99" },
    { team: "Aston Villa", trophy: "Football League First Division / Championnat d’Angleterre", year: "1899–00" },
    { team: "Aston Villa", trophy: "Football League First Division / Championnat d’Angleterre", year: "1909–10" },
    { team: "Aston Villa", trophy: "Football League First Division / Championnat d’Angleterre", year: "1980–81" },
    { team: "Aston Villa", trophy: "FA Cup", year: "1886–87" },
    { team: "Aston Villa", trophy: "FA Cup", year: "1894–95" },
    { team: "Aston Villa", trophy: "FA Cup", year: "1896–97" },
    { team: "Aston Villa", trophy: "FA Cup", year: "1904–05" },
    { team: "Aston Villa", trophy: "FA Cup", year: "1912–13" },
    { team: "Aston Villa", trophy: "FA Cup", year: "1919–20" },
    { team: "Aston Villa", trophy: "FA Cup", year: "1956–57" },
    { team: "Aston Villa", trophy: "League Cup (Football League Cup / EFL Cup)", year: "1960–61" },
    { team: "Aston Villa", trophy: "League Cup (Football League Cup / EFL Cup)", year: "1974–75" },
    { team: "Aston Villa", trophy: "League Cup (Football League Cup / EFL Cup)", year: "1976–77" },
    { team: "Aston Villa", trophy: "League Cup (Football League Cup / EFL Cup)", year: "1993–94" },
    { team: "Aston Villa", trophy: "League Cup (Football League Cup / EFL Cup)", year: "1995–96" },
    { team: "Aston Villa", trophy: "FA Community Shield / English Supercup", year: "1981" },
    { team: "Aston Villa", trophy: "European Cup / Ligue des champions (UEFA Champions League)", year: "1981–82" },
    { team: "Aston Villa", trophy: "UEFA Super Cup", year: "1982–83" },
    { team: "Aston Villa", trophy: "UEFA Intertoto Cup", year: "2001" },
    { team: "Brighton & Hove Albion", trophy: "FA Charity Shield / Community Shield", year: "1910" },
    { team: "Brighton & Hove Albion", trophy: "Football League Third Division South / League One (championnat tiers 3)", year: "1957–58" },
    { team: "Brighton & Hove Albion", trophy: "Football League Fourth Division / League Two (championnat tiers 4)", year: "1964–65" },
    { team: "Brighton & Hove Albion", trophy: "Football League Second Division / Championship (championnat tiers 2) – Runners‑up", year: "1978–79" },
    { team: "Brighton & Hove Albion", trophy: "Football League Third Division / League One (championnat tiers 3)", year: "2001–02" },
    { team: "Brighton & Hove Albion", trophy: "Football League Fourth Division / League Two (championnat tiers 4)", year: "2000–01" },
    { team: "Brighton & Hove Albion", trophy: "Football League One (championnat tiers 3)", year: "2010–11" },
    { team: "Brighton & Hove Albion", trophy: "Football League Second Division / Championship (championnat tiers 2) – Runners‑up", year: "2016–17" },
    { team: "Burnley", trophy: "Championnat d’Angleterre (Premier League / First Division)", year: "1920–21" },
    { team: "Burnley", trophy: "Championnat d’Angleterre (Premier League / First Division)", year: "1959–60" },
    { team: "Burnley", trophy: "Championship / Division Two (niveau 2)", year: "1897–98" },
    { team: "Burnley", trophy: "Championship / Division Two (niveau 2)", year: "1972–73" },
    { team: "Burnley", trophy: "Championship / Division Two (niveau 2)", year: "2015–16" },
    { team: "Burnley", trophy: "Championship / Division Two (niveau 2)", year: "2022–23" },
    { team: "Burnley", trophy: "Third Division / League One (niveau 3)", year: "1981–82" },
    { team: "Burnley", trophy: "Fourth Division / League Two (niveau 4)", year: "1991–92" },
    { team: "Burnley", trophy: "FA Cup", year: "1913–14" },
    { team: "Burnley", trophy: "FA Charity Shield / Community Shield", year: "1960 (partagé)" },
    { team: "Burnley", trophy: "FA Charity Shield / Community Shield", year: "1973" },
    { team: "Burnley", trophy: "Anglo‑Scottish Cup", year: "1978–79" },
    { team: "Chelsea", trophy: "Premier League / First Division", year: "1954–55" },
    { team: "Chelsea", trophy: "Premier League", year: "2004–05" },
    { team: "Chelsea", trophy: "Premier League", year: "2005–06" },
    { team: "Chelsea", trophy: "Premier League", year: "2009–10" },
    { team: "Chelsea", trophy: "Premier League", year: "2014–15" },
    { team: "Chelsea", trophy: "Premier League", year: "2016–17" },
    { team: "Chelsea", trophy: "Second Division / Championship", year: "1983–84" },
    { team: "Chelsea", trophy: "Second Division / Championship", year: "1988–89" },
    { team: "Chelsea", trophy: "FA Cup", year: "1969–70" },
    { team: "Chelsea", trophy: "FA Cup", year: "1996–97" },
    { team: "Chelsea", trophy: "FA Cup", year: "1999–2000" },
    { team: "Chelsea", trophy: "FA Cup", year: "2006–07" },
    { team: "Chelsea", trophy: "FA Cup", year: "2008–09" },
    { team: "Chelsea", trophy: "FA Cup", year: "2009–10" },
    { team: "Chelsea", trophy: "FA Cup", year: "2011–12" },
    { team: "Chelsea", trophy: "FA Cup", year: "2017–18" },
    { team: "Chelsea", trophy: "League Cup (EFL Cup)", year: "1964–65" },
    { team: "Chelsea", trophy: "League Cup (EFL Cup)", year: "1997–98" },
    { team: "Chelsea", trophy: "League Cup (EFL Cup)", year: "2004–05" },
    { team: "Chelsea", trophy: "League Cup (EFL Cup)", year: "2006–07" },
    { team: "Chelsea", trophy: "League Cup (EFL Cup)", year: "2014–15" },
    { team: "Chelsea", trophy: "FA Community Shield", year: "1955" },
    { team: "Chelsea", trophy: "FA Community Shield", year: "2000" },
    { team: "Chelsea", trophy: "FA Community Shield", year: "2005" },
    { team: "Chelsea", trophy: "FA Community Shield", year: "2009" },
    { team: "Chelsea", trophy: "UEFA Champions League", year: "2011–12" },
    { team: "Chelsea", trophy: "UEFA Champions League", year: "2020–21" },
    { team: "Chelsea", trophy: "UEFA Europa League", year: "2012–13" },
    { team: "Chelsea", trophy: "UEFA Europa League", year: "2018–19" },
    { team: "Chelsea", trophy: "UEFA Europa Conference League", year: "2024–25" },
    { team: "Chelsea", trophy: "UEFA Cup Winners’ Cup", year: "1970–71" },
    { team: "Chelsea", trophy: "UEFA Cup Winners’ Cup", year: "1997–98" },
    { team: "Chelsea", trophy: "UEFA Super Cup", year: "1998" },
    { team: "Chelsea", trophy: "UEFA Super Cup", year: "2021" },
    { team: "Chelsea", trophy: "FIFA Club World Cup", year: "2021" },
    { team: "Chelsea", trophy: "FIFA Club World Cup", year: "2025" },
    { team: "Crystal Palace", trophy: "English Second Division / EFL Championship (Champions)", year: "1978–79" },
    { team: "Crystal Palace", trophy: "English Second Division / EFL Championship (Champions)", year: "1993–94" },
    { team: "Crystal Palace", trophy: "English Third Division South (Champions)", year: "1920–21" },
    { team: "Crystal Palace", trophy: "FA Cup", year: "2024–25" },
    { team: "Crystal Palace", trophy: "FA Community Shield", year: "2025" },
    { team: "Crystal Palace", trophy: "Full Members' Cup", year: "1990–91" },
    { team: "Everton", trophy: "Championnat d’Angleterre / First Division", year: "1890–91" },
    { team: "Everton", trophy: "Championnat d’Angleterre / First Division", year: "1914–15" },
    { team: "Everton", trophy: "Championnat d’Angleterre / First Division", year: "1927–28" },
    { team: "Everton", trophy: "Championnat d’Angleterre / First Division", year: "1931–32" },
    { team: "Everton", trophy: "Championnat d’Angleterre / First Division", year: "1938–39" },
    { team: "Everton", trophy: "Championnat d’Angleterre / First Division", year: "1962–63" },
    { team: "Everton", trophy: "Championnat d’Angleterre / First Division", year: "1969–70" },
    { team: "Everton", trophy: "Championnat d’Angleterre / First Division", year: "1984–85" },
    { team: "Everton", trophy: "Championnat d’Angleterre / First Division", year: "1986–87" },
    { team: "Everton", trophy: "FA Cup", year: "1905–06" },
    { team: "Everton", trophy: "FA Cup", year: "1932–33" },
    { team: "Everton", trophy: "FA Cup", year: "1965–66" },
    { team: "Everton", trophy: "FA Cup", year: "1983–84" },
    { team: "Everton", trophy: "FA Cup", year: "1994–95" },
    { team: "Everton", trophy: "Second Division (championnat niveau 2)", year: "1930–31" },
    { team: "Everton", trophy: "FA Charity Shield / Community Shield", year: "1928" },
    { team: "Everton", trophy: "FA Charity Shield / Community Shield", year: "1932" },
    { team: "Everton", trophy: "FA Charity Shield / Community Shield", year: "1963" },
    { team: "Everton", trophy: "FA Charity Shield / Community Shield", year: "1970" },
    { team: "Everton", trophy: "FA Charity Shield / Community Shield", year: "1984" },
    { team: "Everton", trophy: "FA Charity Shield / Community Shield", year: "1985" },
    { team: "Everton", trophy: "FA Charity Shield / Community Shield", year: "1986 (shared)" },
    { team: "Everton", trophy: "FA Charity Shield / Community Shield", year: "1987" },
    { team: "Everton", trophy: "FA Charity Shield / Community Shield", year: "1995" },
    { team: "Everton", trophy: "European Cup Winners’ Cup (UEFA)", year: "1984–85" },
    { team: "Fulham", trophy: "Football League Second Division / Championship (championnat niveau 2)", year: "1948–49" },
    { team: "Fulham", trophy: "Football League Second Division / Championship (championnat niveau 2)", year: "2000–01" },
    { team: "Fulham", trophy: "Football League Second Division / Championship (championnat niveau 2)", year: "2021–22" },
    { team: "Fulham", trophy: "Football League Third Division / League One (championnat niveau 3)", year: "1931–32" },
    { team: "Fulham", trophy: "Football League Third Division / League One (championnat niveau 3)", year: "1998–99" },
    { team: "Fulham", trophy: "UEFA Intertoto Cup (compétition européenne officielle)", year: "2002" },
    { team: "Leeds United", trophy: "Championnat d’Angleterre / First Division", year: "1968–69" },
    { team: "Leeds United", trophy: "Championnat d’Angleterre / First Division", year: "1973–74" },
    { team: "Leeds United", trophy: "Championnat d’Angleterre / First Division", year: "1991–92" },
    { team: "Leeds United", trophy: "Championnat d’Angleterre de deuxième division / Championship", year: "1923–24" },
    { team: "Leeds United", trophy: "Championnat d’Angleterre de deuxième division / Championship", year: "1963–64" },
    { team: "Leeds United", trophy: "Championnat d’Angleterre de deuxième division / Championship", year: "1989–90" },
    { team: "Leeds United", trophy: "Championnat d’Angleterre de deuxième division / Championship", year: "2019–20" },
    { team: "Leeds United", trophy: "Championnat d’Angleterre de deuxième division / Championship", year: "2024–25" },
    { team: "Leeds United", trophy: "FA Cup", year: "1971–72" },
    { team: "Leeds United", trophy: "Football League Cup", year: "1967–68" },
    { team: "Leeds United", trophy: "FA Charity Shield", year: "1969" },
    { team: "Leeds United", trophy: "FA Charity Shield", year: "1992" },
    { team: "Leeds United", trophy: "Inter‑Cities Fairs Cup", year: "1967–68" },
    { team: "Leeds United", trophy: "Inter‑Cities Fairs Cup", year: "1970–71" },
    { team: "Liverpool", trophy: "Premier League / First Division", year: "1900–01" },
    { team: "Liverpool", trophy: "Premier League / First Division", year: "1905–06" },
    { team: "Liverpool", trophy: "Premier League / First Division", year: "1921–22" },
    { team: "Liverpool", trophy: "Premier League / First Division", year: "1922–23" },
    { team: "Liverpool", trophy: "Premier League / First Division", year: "1946–47" },
    { team: "Liverpool", trophy: "Premier League / First Division", year: "1963–64" },
    { team: "Liverpool", trophy: "Premier League / First Division", year: "1965–66" },
    { team: "Liverpool", trophy: "Premier League / First Division", year: "1972–73" },
    { team: "Liverpool", trophy: "Premier League / First Division", year: "1975–76" },
    { team: "Liverpool", trophy: "Premier League / First Division", year: "1976–77" },
    { team: "Liverpool", trophy: "Premier League / First Division", year: "1978–79" },
    { team: "Liverpool", trophy: "Premier League / First Division", year: "1979–80" },
    { team: "Liverpool", trophy: "Premier League / First Division", year: "1981–82" },
    { team: "Liverpool", trophy: "Premier League / First Division", year: "1982–83" },
    { team: "Liverpool", trophy: "Premier League / First Division", year: "1983–84" },
    { team: "Liverpool", trophy: "Premier League / First Division", year: "1985–86" },
    { team: "Liverpool", trophy: "Premier League / First Division", year: "1987–88" },
    { team: "Liverpool", trophy: "Premier League / First Division", year: "1989–90" },
    { team: "Liverpool", trophy: "Premier League", year: "2019–20" },
    { team: "Liverpool", trophy: "Premier League", year: "2024–25" },
    { team: "Liverpool", trophy: "FA Cup", year: "1964–65" },
    { team: "Liverpool", trophy: "FA Cup", year: "1973–74" },
    { team: "Liverpool", trophy: "FA Cup", year: "1985–86" },
    { team: "Liverpool", trophy: "FA Cup", year: "1988–89" },
    { team: "Liverpool", trophy: "FA Cup", year: "1991–92" },
    { team: "Liverpool", trophy: "FA Cup", year: "2000–01" },
    { team: "Liverpool", trophy: "FA Cup", year: "2005–06" },
    { team: "Liverpool", trophy: "FA Cup", year: "2021–22" },
    { team: "Liverpool", trophy: "EFL Cup / League Cup", year: "1980–81" },
    { team: "Liverpool", trophy: "EFL Cup / League Cup", year: "1981–82" },
    { team: "Liverpool", trophy: "EFL Cup / League Cup", year: "1982–83" },
    { team: "Liverpool", trophy: "EFL Cup / League Cup", year: "1983–84" },
    { team: "Liverpool", trophy: "EFL Cup / League Cup", year: "1994–95" },
    { team: "Liverpool", trophy: "EFL Cup / League Cup", year: "2000–01" },
    { team: "Liverpool", trophy: "EFL Cup / League Cup", year: "2002–03" },
    { team: "Liverpool", trophy: "EFL Cup / League Cup", year: "2011–12" },
    { team: "Liverpool", trophy: "EFL Cup / League Cup", year: "2021–22" },
    { team: "Liverpool", trophy: "EFL Cup / League Cup", year: "2023–24" },
    { team: "Liverpool", trophy: "UEFA Champions League / European Cup", year: "1976–77" },
    { team: "Liverpool", trophy: "UEFA Champions League / European Cup", year: "1977–78" },
    { team: "Liverpool", trophy: "UEFA Champions League / European Cup", year: "1980–81" },
    { team: "Liverpool", trophy: "UEFA Champions League / European Cup", year: "1983–84" },
    { team: "Liverpool", trophy: "UEFA Champions League / European Cup", year: "2004–05" },
    { team: "Liverpool", trophy: "UEFA Champions League / European Cup", year: "2018–19" },
    { team: "Liverpool", trophy: "UEFA Europa League / UEFA Cup", year: "1972–73" },
    { team: "Liverpool", trophy: "UEFA Europa League / UEFA Cup", year: "1975–76" },
    { team: "Liverpool", trophy: "UEFA Europa League / UEFA Cup", year: "2000–01" },
    { team: "Liverpool", trophy: "UEFA Super Cup", year: "1977" },
    { team: "Liverpool", trophy: "UEFA Super Cup", year: "2001" },
    { team: "Liverpool", trophy: "UEFA Super Cup", year: "2005" },
    { team: "Liverpool", trophy: "UEFA Super Cup", year: "2019" },
    { team: "Liverpool", trophy: "FIFA Club World Cup", year: "2019" },
    { team: "Liverpool", trophy: "FA Community Shield (Charity Shield)", year: "1964" },
    { team: "Liverpool", trophy: "FA Community Shield (Charity Shield)", year: "1965" },
    { team: "Liverpool", trophy: "FA Community Shield (Charity Shield)", year: "1966" },
    { team: "Liverpool", trophy: "FA Community Shield (Charity Shield)", year: "1974" },
    { team: "Liverpool", trophy: "FA Community Shield (Charity Shield)", year: "1976" },
    { team: "Liverpool", trophy: "FA Community Shield (Charity Shield)", year: "1977" },
    { team: "Liverpool", trophy: "FA Community Shield (Charity Shield)", year: "1979" },
    { team: "Liverpool", trophy: "FA Community Shield (Charity Shield)", year: "1980" },
    { team: "Liverpool", trophy: "FA Community Shield (Charity Shield)", year: "1982" },
    { team: "Liverpool", trophy: "FA Community Shield (Charity Shield)", year: "1986" },
    { team: "Liverpool", trophy: "FA Community Shield (Charity Shield)", year: "1988" },
    { team: "Liverpool", trophy: "FA Community Shield (Charity Shield)", year: "1989" },
    { team: "Liverpool", trophy: "FA Community Shield (Charity Shield)", year: "1990" },
    { team: "Liverpool", trophy: "FA Community Shield (Charity Shield)", year: "2001" },
    { team: "Liverpool", trophy: "FA Community Shield (Charity Shield)", year: "2006" },
    { team: "Liverpool", trophy: "FA Community Shield (Charity Shield)", year: "2022" },
    { team: "Manchester City", trophy: "Championnat d’Angleterre / Premier League", year: "1936–37" },
    { team: "Manchester City", trophy: "Championnat d’Angleterre / Premier League", year: "1967–68" },
    { team: "Manchester City", trophy: "Championnat d’Angleterre / Premier League", year: "2011–12" },
    { team: "Manchester City", trophy: "Championnat d’Angleterre / Premier League", year: "2013–14" },
    { team: "Manchester City", trophy: "Championnat d’Angleterre / Premier League", year: "2017–18" },
    { team: "Manchester City", trophy: "Championnat d’Angleterre / Premier League", year: "2018–19" },
    { team: "Manchester City", trophy: "Championnat d’Angleterre / Premier League", year: "2020–21" },
    { team: "Manchester City", trophy: "Championnat d’Angleterre / Premier League", year: "2021–22" },
    { team: "Manchester City", trophy: "Championnat d’Angleterre / Premier League", year: "2022–23" },
    { team: "Manchester City", trophy: "Championnat d’Angleterre / Premier League", year: "2023–24" },
    { team: "Manchester City", trophy: "FA Cup", year: "1903–04" },
    { team: "Manchester City", trophy: "FA Cup", year: "1933–34" },
    { team: "Manchester City", trophy: "FA Cup", year: "1955–56" },
    { team: "Manchester City", trophy: "FA Cup", year: "1968–69" },
    { team: "Manchester City", trophy: "FA Cup", year: "2010–11" },
    { team: "Manchester City", trophy: "FA Cup", year: "2018–19" },
    { team: "Manchester City", trophy: "FA Cup", year: "2022–23" },
    { team: "Manchester City", trophy: "League Cup (EFL Cup)", year: "1969–70" },
    { team: "Manchester City", trophy: "League Cup (EFL Cup)", year: "1975–76" },
    { team: "Manchester City", trophy: "League Cup (EFL Cup)", year: "2013–14" },
    { team: "Manchester City", trophy: "League Cup (EFL Cup)", year: "2015–16" },
    { team: "Manchester City", trophy: "League Cup (EFL Cup)", year: "2017–18" },
    { team: "Manchester City", trophy: "League Cup (EFL Cup)", year: "2018–19" },
    { team: "Manchester City", trophy: "League Cup (EFL Cup)", year: "2019–20" },
    { team: "Manchester City", trophy: "League Cup (EFL Cup)", year: "2020–21" },
    { team: "Manchester City", trophy: "FA Community/Charity Shield", year: "1937" },
    { team: "Manchester City", trophy: "FA Community/Charity Shield", year: "1968" },
    { team: "Manchester City", trophy: "FA Community/Charity Shield", year: "1972" },
    { team: "Manchester City", trophy: "FA Community/Charity Shield", year: "2012" },
    { team: "Manchester City", trophy: "FA Community/Charity Shield", year: "2018" },
    { team: "Manchester City", trophy: "FA Community/Charity Shield", year: "2019" },
    { team: "Manchester City", trophy: "FA Community/Charity Shield", year: "2024" },
    { team: "Manchester City", trophy: "European Cup Winners’ Cup", year: "1969–70" },
    { team: "Manchester City", trophy: "UEFA Champions League", year: "2022–23" },
    { team: "Manchester City", trophy: "UEFA Super Cup", year: "2023" },
    { team: "Manchester City", trophy: "FIFA Club World Cup", year: "2023" },
    { team: "Manchester United", trophy: "Championnat d’Angleterre / First Division / Premier League", year: "1907–08" },
    { team: "Manchester United", trophy: "Championnat d’Angleterre / First Division / Premier League", year: "1910–11" },
    { team: "Manchester United", trophy: "Championnat d’Angleterre / First Division / Premier League", year: "1951–52" },
    { team: "Manchester United", trophy: "Championnat d’Angleterre / First Division / Premier League", year: "1955–56" },
    { team: "Manchester United", trophy: "Championnat d’Angleterre / First Division / Premier League", year: "1956–57" },
    { team: "Manchester United", trophy: "Championnat d’Angleterre / First Division / Premier League", year: "1964–65" },
    { team: "Manchester United", trophy: "Championnat d’Angleterre / First Division / Premier League", year: "1966–67" },
    { team: "Manchester United", trophy: "Premier League", year: "1992–93" },
    { team: "Manchester United", trophy: "Premier League", year: "1993–94" },
    { team: "Manchester United", trophy: "Premier League", year: "1995–96" },
    { team: "Manchester United", trophy: "Premier League", year: "1996–97" },
    { team: "Manchester United", trophy: "Premier League", year: "1998–99" },
    { team: "Manchester United", trophy: "Premier League", year: "1999–2000" },
    { team: "Manchester United", trophy: "Premier League", year: "2000–01" },
    { team: "Manchester United", trophy: "Premier League", year: "2002–03" },
    { team: "Manchester United", trophy: "Premier League", year: "2006–07" },
    { team: "Manchester United", trophy: "Premier League", year: "2007–08" },
    { team: "Manchester United", trophy: "Premier League", year: "2008–09" },
    { team: "Manchester United", trophy: "Premier League", year: "2010–11" },
    { team: "Manchester United", trophy: "Premier League", year: "2012–13" },
    { team: "Manchester United", trophy: "Second Division (championnat niveau 2)", year: "1935–36" },
    { team: "Manchester United", trophy: "Second Division (championnat niveau 2)", year: "1974–75" },
    { team: "Manchester United", trophy: "FA Cup", year: "1908–09" },
    { team: "Manchester United", trophy: "FA Cup", year: "1947–48" },
    { team: "Manchester United", trophy: "FA Cup", year: "1962–63" },
    { team: "Manchester United", trophy: "FA Cup", year: "1976–77" },
    { team: "Manchester United", trophy: "FA Cup", year: "1982–83" },
    { team: "Manchester United", trophy: "FA Cup", year: "1984–85" },
    { team: "Manchester United", trophy: "FA Cup", year: "1989–90" },
    { team: "Manchester United", trophy: "FA Cup", year: "1993–94" },
    { team: "Manchester United", trophy: "FA Cup", year: "1995–96" },
    { team: "Manchester United", trophy: "FA Cup", year: "1998–99" },
    { team: "Manchester United", trophy: "FA Cup", year: "2003–04" },
    { team: "Manchester United", trophy: "FA Cup", year: "2015–16" },
    { team: "Manchester United", trophy: "FA Cup", year: "2023–24" },
    { team: "Manchester United", trophy: "Football League Cup / EFL Cup", year: "1991–92" },
    { team: "Manchester United", trophy: "Football League Cup / EFL Cup", year: "2005–06" },
    { team: "Manchester United", trophy: "Football League Cup / EFL Cup", year: "2008–09" },
    { team: "Manchester United", trophy: "Football League Cup / EFL Cup", year: "2009–10" },
    { team: "Manchester United", trophy: "Football League Cup / EFL Cup", year: "2016–17" },
    { team: "Manchester United", trophy: "Football League Cup / EFL Cup", year: "2022–23" },
    { team: "Manchester United", trophy: "FA Community Shield", year: "1908" },
    { team: "Manchester United", trophy: "FA Community Shield", year: "1911" },
    { team: "Manchester United", trophy: "FA Community Shield", year: "1952" },
    { team: "Manchester United", trophy: "FA Community Shield", year: "1956" },
    { team: "Manchester United", trophy: "FA Community Shield", year: "1957" },
    { team: "Manchester United", trophy: "FA Community Shield", year: "1965" },
    { team: "Manchester United", trophy: "FA Community Shield", year: "1967" },
    { team: "Manchester United", trophy: "FA Community Shield", year: "1977" },
    { team: "Manchester United", trophy: "FA Community Shield", year: "1983" },
    { team: "Manchester United", trophy: "FA Community Shield", year: "1990" },
    { team: "Manchester United", trophy: "FA Community Shield", year: "1993" },
    { team: "Manchester United", trophy: "FA Community Shield", year: "1994" },
    { team: "Manchester United", trophy: "FA Community Shield", year: "1996" },
    { team: "Manchester United", trophy: "FA Community Shield", year: "1997" },
    { team: "Manchester United", trophy: "FA Community Shield", year: "2003" },
    { team: "Manchester United", trophy: "FA Community Shield", year: "2007" },
    { team: "Manchester United", trophy: "FA Community Shield", year: "2008" },
    { team: "Manchester United", trophy: "FA Community Shield", year: "2010" },
    { team: "Manchester United", trophy: "FA Community Shield", year: "2011" },
    { team: "Manchester United", trophy: "FA Community Shield", year: "2013" },
    { team: "Manchester United", trophy: "FA Community Shield", year: "2016" },
    { team: "Manchester United", trophy: "UEFA Champions League / European Cup", year: "1967–68" },
    { team: "Manchester United", trophy: "UEFA Champions League / European Cup", year: "1998–99" },
    { team: "Manchester United", trophy: "UEFA Champions League / European Cup", year: "2007–08" },
    { team: "Manchester United", trophy: "UEFA Europa League", year: "2016–17" },
    { team: "Manchester United", trophy: "UEFA Cup Winners’ Cup", year: "1990–91" },
    { team: "Manchester United", trophy: "UEFA Super Cup", year: "1991" },
    { team: "Manchester United", trophy: "FIFA Club World Cup", year: "2008" },
    { team: "Manchester United", trophy: "Intercontinental Cup", year: "1999" },
    { team: "Newcastle United", trophy: "Championnat d’Angleterre / First Division", year: "1904–05" },
    { team: "Newcastle United", trophy: "Championnat d’Angleterre / First Division", year: "1906–07" },
    { team: "Newcastle United", trophy: "Championnat d’Angleterre / First Division", year: "1908–09" },
    { team: "Newcastle United", trophy: "Championnat d’Angleterre / First Division", year: "1926–27" },
    { team: "Newcastle United", trophy: "FA Cup", year: "1909–10" },
    { team: "Newcastle United", trophy: "FA Cup", year: "1923–24" },
    { team: "Newcastle United", trophy: "FA Cup", year: "1931–32" },
    { team: "Newcastle United", trophy: "FA Cup", year: "1950–51" },
    { team: "Newcastle United", trophy: "FA Cup", year: "1951–52" },
    { team: "Newcastle United", trophy: "FA Cup", year: "1954–55" },
    { team: "Newcastle United", trophy: "Football League Cup / EFL Cup", year: "2024–25" },
    { team: "Newcastle United", trophy: "FA Charity Shield", year: "1909" },
    { team: "Newcastle United", trophy: "Inter‑Cities Fairs Cup", year: "1968–69" },
    { team: "Nottingham Forest", trophy: "Championnat d’Angleterre / First Division", year: "1977–78" },
    { team: "Nottingham Forest", trophy: "FA Cup", year: "1897–98" },
    { team: "Nottingham Forest", trophy: "FA Cup", year: "1958–59" },
    { team: "Nottingham Forest", trophy: "Football League Cup (EFL Cup)", year: "1977–78" },
    { team: "Nottingham Forest", trophy: "Football League Cup (EFL Cup)", year: "1978–79" },
    { team: "Nottingham Forest", trophy: "Football League Cup (EFL Cup)", year: "1988–89" },
    { team: "Nottingham Forest", trophy: "Football League Cup (EFL Cup)", year: "1989–90" },
    { team: "Nottingham Forest", trophy: "FA Charity Shield / FA Community Shield", year: "1978" },
    { team: "Nottingham Forest", trophy: "UEFA Champions League / European Cup", year: "1978–79" },
    { team: "Nottingham Forest", trophy: "UEFA Champions League / European Cup", year: "1979–80" },
    { team: "Nottingham Forest", trophy: "UEFA Super Cup", year: "1979" },
    { team: "Sunderland", trophy: "English First Division (championnat d’Angleterre)", year: "1891–92" },
    { team: "Sunderland", trophy: "English First Division (championnat d’Angleterre)", year: "1892–93" },
    { team: "Sunderland", trophy: "English First Division (championnat d’Angleterre)", year: "1894–95" },
    { team: "Sunderland", trophy: "English First Division (championnat d’Angleterre)", year: "1901–02" },
    { team: "Sunderland", trophy: "English First Division (championnat d’Angleterre)", year: "1912–13" },
    { team: "Sunderland", trophy: "English First Division (championnat d’Angleterre)", year: "1935–36" },
    { team: "Sunderland", trophy: "FA Cup", year: "1936–37" },
    { team: "Sunderland", trophy: "FA Cup", year: "1972–73" },
    { team: "Sunderland", trophy: "English Second Division / Championship (championnat niveau 2)", year: "1975–76" },
    { team: "Sunderland", trophy: "English Second Division / Championship (championnat niveau 2)", year: "1995–96" },
    { team: "Sunderland", trophy: "English Second Division / Championship (championnat niveau 2)", year: "1998–99" },
    { team: "Sunderland", trophy: "English Second Division / Championship (championnat niveau 2)", year: "2004–05" },
    { team: "Sunderland", trophy: "English Second Division / Championship (championnat niveau 2)", year: "2006–07" },
    { team: "Sunderland", trophy: "English Third Division / League One (championnat niveau 3)", year: "1987–88" },
    { team: "Sunderland", trophy: "Football League Trophy", year: "2020–21" },
    { team: "Sunderland", trophy: "FA Charity Shield", year: "1936" },
    { team: "Tottenham Hotspur", trophy: "Championnat d’Angleterre / First Division", year: "1950–51" },
    { team: "Tottenham Hotspur", trophy: "Championnat d’Angleterre / First Division", year: "1960–61" },
    { team: "Tottenham Hotspur", trophy: "FA Cup", year: "1900–01" },
    { team: "Tottenham Hotspur", trophy: "FA Cup", year: "1920–21" },
    { team: "Tottenham Hotspur", trophy: "FA Cup", year: "1960–61" },
    { team: "Tottenham Hotspur", trophy: "FA Cup", year: "1961–62" },
    { team: "Tottenham Hotspur", trophy: "FA Cup", year: "1966–67" },
    { team: "Tottenham Hotspur", trophy: "FA Cup", year: "1980–81" },
    { team: "Tottenham Hotspur", trophy: "FA Cup", year: "1981–82" },
    { team: "Tottenham Hotspur", trophy: "FA Cup", year: "1990–91" },
    { team: "Tottenham Hotspur", trophy: "Football League Cup / EFL Cup", year: "1970–71" },
    { team: "Tottenham Hotspur", trophy: "Football League Cup / EFL Cup", year: "1972–73" },
    { team: "Tottenham Hotspur", trophy: "Football League Cup / EFL Cup", year: "1998–99" },
    { team: "Tottenham Hotspur", trophy: "Football League Cup / EFL Cup", year: "2007–08" },
    { team: "Tottenham Hotspur", trophy: "FA Community Shield / Charity Shield", year: "1921" },
    { team: "Tottenham Hotspur", trophy: "FA Community Shield / Charity Shield", year: "1951" },
    { team: "Tottenham Hotspur", trophy: "FA Community Shield / Charity Shield", year: "1961" },
    { team: "Tottenham Hotspur", trophy: "FA Community Shield / Charity Shield", year: "1962" },
    { team: "Tottenham Hotspur", trophy: "FA Community Shield / Charity Shield", year: "1967" },
    { team: "Tottenham Hotspur", trophy: "FA Community Shield / Charity Shield", year: "1981" },
    { team: "Tottenham Hotspur", trophy: "FA Community Shield / Charity Shield", year: "1991" },
    { team: "Tottenham Hotspur", trophy: "UEFA Cup Winners’ Cup", year: "1962–63" },
    { team: "Tottenham Hotspur", trophy: "UEFA Cup / UEFA Europa League", year: "1971–72" },
    { team: "Tottenham Hotspur", trophy: "UEFA Cup / UEFA Europa League", year: "1983–84" },
    { team: "Tottenham Hotspur", trophy: "UEFA Cup / UEFA Europa League", year: "2024–25" },
    { team: "West Ham United", trophy: "FA Cup", year: "1963–64" },
    { team: "West Ham United", trophy: "FA Cup", year: "1974–75" },
    { team: "West Ham United", trophy: "FA Cup", year: "1979–80" },
    { team: "West Ham United", trophy: "FA Charity Shield", year: "1964 (partagé)" },
    { team: "West Ham United", trophy: "Football League Second Division / Championship (championnat niveau 2)", year: "1957–58" },
    { team: "West Ham United", trophy: "Football League Second Division / Championship (championnat niveau 2)", year: "1980–81" },
    { team: "West Ham United", trophy: "UEFA Cup Winners’ Cup", year: "1964–65" },
    { team: "West Ham United", trophy: "UEFA Intertoto Cup", year: "1998–99" },
    { team: "West Ham United", trophy: "UEFA Europa Conference League", year: "2022–23" },
    { team: "Wolverhampton Wanderers", trophy: "Championnat d’Angleterre / First Division", year: "1953–54" },
    { team: "Wolverhampton Wanderers", trophy: "Championnat d’Angleterre / First Division", year: "1957–58" },
    { team: "Wolverhampton Wanderers", trophy: "Championnat d’Angleterre / First Division", year: "1958–59" },
    { team: "Wolverhampton Wanderers", trophy: "FA Cup", year: "1892–93" },
    { team: "Wolverhampton Wanderers", trophy: "FA Cup", year: "1907–08" },
    { team: "Wolverhampton Wanderers", trophy: "FA Cup", year: "1948–49" },
    { team: "Wolverhampton Wanderers", trophy: "FA Cup", year: "1959–60" },
    { team: "Wolverhampton Wanderers", trophy: "Football League Cup / League Cup", year: "1973–74" },
    { team: "Wolverhampton Wanderers", trophy: "Football League Cup / League Cup", year: "1979–80" },
    { team: "Wolverhampton Wanderers", trophy: "FA Charity Shield / Community Shield", year: "1949" },
    { team: "Wolverhampton Wanderers", trophy: "FA Charity Shield / Community Shield", year: "1954" },
    { team: "Wolverhampton Wanderers", trophy: "FA Charity Shield / Community Shield", year: "1959" },
    { team: "Wolverhampton Wanderers", trophy: "FA Charity Shield / Community Shield", year: "1960" },
    { team: "Wolverhampton Wanderers", trophy: "Championship / Second Division", year: "1931–32" },
    { team: "Wolverhampton Wanderers", trophy: "Championship / Second Division", year: "1976–77" },
    { team: "Wolverhampton Wanderers", trophy: "Championship / Second Division", year: "2008–09" },
    { team: "Wolverhampton Wanderers", trophy: "Championship / Second Division", year: "2017–18" }
];

async function runImport() {
    const SQL = await initSqlJs();
    const buffer = readFileSync(dbPath);
    const db = new SQL.Database(buffer);

    try {
        const teams = {};
        const teamRows = db.exec("SELECT id, name FROM teams");
        if (teamRows.length > 0) {
            teamRows[0].values.forEach(row => {
                teams[row[1]] = row[0]; // Name -> ID
            });
        }

        const insertTeam = db.prepare("INSERT INTO teams (name, api_team_id) VALUES (?, ?)");
        const insertTrophy = db.prepare("INSERT OR IGNORE INTO trophies (name, type) VALUES (?, ?)");
        const getTrophyId = db.prepare("SELECT id FROM trophies WHERE name = ?");

        // We need to insert seasons if they don't exist too? Or assume they exist?
        // The previous tables structure: team_trophies(team_id, trophy_id, season_id, place)
        // But wait, the input data has year like "1930-31" or "1930".
        // We need to map this to seasons table.

        // Let's check seasons table structure again: id, label, year
        const insertSeason = db.prepare("INSERT OR IGNORE INTO seasons (label, year) VALUES (?, ?)");
        const getSeasonId = db.prepare("SELECT id FROM seasons WHERE label = ?");

        const insertTeamTrophy = db.prepare(`
      INSERT OR IGNORE INTO team_trophies (team_id, trophy_id, season_id, place) 
      VALUES (?, ?, ?, 'Winner')
    `);

        db.exec("BEGIN TRANSACTION");

        for (const item of trophyData) {
            let teamId = teams[item.team];
            if (!teamId) {
                // Create Fake Team if not found
                // Generate a random high ID to avoid collision with real API IDs (usually < 1000000)
                // Or we just use NULL api_id? The constraint is UNIQUE NOT NULL for api_team_id.
                // So we need a fake ID. Let's start from 900000 + random
                const fakeApiId = 900000 + Math.floor(Math.random() * 100000);
                insertTeam.run([item.team, fakeApiId]);

                // Get the new ID
                const result = db.exec("SELECT last_insert_rowid()");
                teamId = result[0].values[0][0];
                teams[item.team] = teamId;
                console.log(`🆕 Created Team: ${item.team} (ID: ${teamId})`);
            }

            // Handle Season
            let seasonLabel = item.year;
            let seasonYear = parseInt(item.year.split(/–|-/)[0]); // Extract first year part

            insertSeason.run([seasonLabel, seasonYear]);
            getSeasonId.bind([seasonLabel]);
            getSeasonId.step();
            const seasonRow = getSeasonId.getAsObject();
            const seasonId = seasonRow.id;
            getSeasonId.reset();

            // Handle Trophy
            // We can infer type from name keywords usually, but for now generic
            let type = 'League';
            const nameLower = item.trophy.toLowerCase();
            if (nameLower.includes('cup') || nameLower.includes('shield')) type = 'Cup';
            if (nameLower.includes('uefa') || nameLower.includes('european')) type = 'International';

            insertTrophy.run([item.trophy, type]);
            getTrophyId.bind([item.trophy]);
            getTrophyId.step();
            const trophyRow = getTrophyId.getAsObject();
            const trophyId = trophyRow.id;
            getTrophyId.reset();

            // Insert Link
            insertTeamTrophy.run([teamId, trophyId, seasonId]);
            console.log(`✅ Added: ${item.team} - ${item.trophy} (${seasonLabel})`);
        }

        db.exec("COMMIT");

        // Save
        const data = db.export();
        writeFileSync(dbPath, data);
        console.log("🎉 Import completed successfully!");

    } catch (err) {
        console.error("❌ Error during import:", err);
        db.exec("ROLLBACK");
    } finally {
        db.close();
    }
}

runImport();
