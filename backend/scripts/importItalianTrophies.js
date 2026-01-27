
import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import { CLUB_MAPPINGS } from '../src/utils/clubMappings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '..', 'database.sqlite');

const ITALIAN_TROPHIES = [
    // AC Milan
    { team: 'AC Milan', trophy: 'Serie A', season: '1901' },
    { team: 'AC Milan', trophy: 'Serie A', season: '1906' },
    { team: 'AC Milan', trophy: 'Serie A', season: '1907' },
    { team: 'AC Milan', trophy: 'Serie A', season: '1950–51' },
    { team: 'AC Milan', trophy: 'Serie A', season: '1954–55' },
    { team: 'AC Milan', trophy: 'Serie A', season: '1956–57' },
    { team: 'AC Milan', trophy: 'Serie A', season: '1958–59' },
    { team: 'AC Milan', trophy: 'Serie A', season: '1961–62' },
    { team: 'AC Milan', trophy: 'Serie A', season: '1967–68' },
    { team: 'AC Milan', trophy: 'Serie A', season: '1978–79' },
    { team: 'AC Milan', trophy: 'Serie A', season: '1987–88' },
    { team: 'AC Milan', trophy: 'Serie A', season: '1991–92' },
    { team: 'AC Milan', trophy: 'Serie A', season: '1992–93' },
    { team: 'AC Milan', trophy: 'Serie A', season: '1993–94' },
    { team: 'AC Milan', trophy: 'Serie A', season: '1995–96' },
    { team: 'AC Milan', trophy: 'Serie A', season: '1998–99' },
    { team: 'AC Milan', trophy: 'Serie A', season: '2003–04' },
    { team: 'AC Milan', trophy: 'Serie A', season: '2010–11' },
    { team: 'AC Milan', trophy: 'Serie A', season: '2021–22' },
    { team: 'AC Milan', trophy: 'Coppa Italia', season: '1966–67' },
    { team: 'AC Milan', trophy: 'Coppa Italia', season: '1971–72' },
    { team: 'AC Milan', trophy: 'Coppa Italia', season: '1972–73' },
    { team: 'AC Milan', trophy: 'Coppa Italia', season: '1976–77' },
    { team: 'AC Milan', trophy: 'Coppa Italia', season: '2002–03' },
    { team: 'AC Milan', trophy: 'Supercoppa Italiana', season: '1988' },
    { team: 'AC Milan', trophy: 'Supercoppa Italiana', season: '1992' },
    { team: 'AC Milan', trophy: 'Supercoppa Italiana', season: '1993' },
    { team: 'AC Milan', trophy: 'Supercoppa Italiana', season: '1994' },
    { team: 'AC Milan', trophy: 'Supercoppa Italiana', season: '2004' },
    { team: 'AC Milan', trophy: 'Supercoppa Italiana', season: '2011' },
    { team: 'AC Milan', trophy: 'Champions League', season: '1962–63' },
    { team: 'AC Milan', trophy: 'Champions League', season: '1968–69' },
    { team: 'AC Milan', trophy: 'Champions League', season: '1988–89' },
    { team: 'AC Milan', trophy: 'Champions League', season: '1989–90' },
    { team: 'AC Milan', trophy: 'Champions League', season: '1993–94' },
    { team: 'AC Milan', trophy: 'Champions League', season: '2002–03' },
    { team: 'AC Milan', trophy: 'Champions League', season: '2006–07' },
    { team: 'AC Milan', trophy: 'Cup Winners Cup', season: '1967–68' },
    { team: 'AC Milan', trophy: 'Cup Winners Cup', season: '1972–73' },
    { team: 'AC Milan', trophy: 'UEFA Super Cup', season: '1989' },
    { team: 'AC Milan', trophy: 'UEFA Super Cup', season: '1990' },
    { team: 'AC Milan', trophy: 'UEFA Super Cup', season: '1994' },
    { team: 'AC Milan', trophy: 'UEFA Super Cup', season: '2003' },
    { team: 'AC Milan', trophy: 'UEFA Super Cup', season: '2007' },
    { team: 'AC Milan', trophy: 'Intercontinental Cup', season: '1969' },
    { team: 'AC Milan', trophy: 'Intercontinental Cup', season: '1989' },
    { team: 'AC Milan', trophy: 'Intercontinental Cup', season: '1990' },
    { team: 'AC Milan', trophy: 'FIFA Club World Cup', season: '2007' },

    // Atalanta BC
    { team: 'Atalanta BC', trophy: 'Coppa Italia', season: '1962–63' },
    { team: 'Atalanta BC', trophy: 'Serie B', season: '1927–28' },
    { team: 'Atalanta BC', trophy: 'Serie B', season: '1939–40' },
    { team: 'Atalanta BC', trophy: 'Serie B', season: '1958–59' },
    { team: 'Atalanta BC', trophy: 'Serie B', season: '1983–84' },
    { team: 'Atalanta BC', trophy: 'Serie B', season: '2005–06' },

    // Bologna FC
    { team: 'Bologna FC', trophy: 'Serie A', season: '1924–25' },
    { team: 'Bologna FC', trophy: 'Serie A', season: '1928–29' },
    { team: 'Bologna FC', trophy: 'Serie A', season: '1935–36' },
    { team: 'Bologna FC', trophy: 'Serie A', season: '1936–37' },
    { team: 'Bologna FC', trophy: 'Serie A', season: '1938–39' },
    { team: 'Bologna FC', trophy: 'Serie A', season: '1940–41' },
    { team: 'Bologna FC', trophy: 'Serie A', season: '1963–64' },
    { team: 'Bologna FC', trophy: 'Coppa Italia', season: '1969–70' },
    { team: 'Bologna FC', trophy: 'Coppa Italia', season: '1973–74' },
    { team: 'Bologna FC', trophy: 'Mitropa Cup', season: '1932' },
    { team: 'Bologna FC', trophy: 'Mitropa Cup', season: '1934' },

    // Cagliari Calcio
    { team: 'Cagliari Calcio', trophy: 'Serie A', season: '1969–70' },
    { team: 'Cagliari Calcio', trophy: 'Coppa Italia', season: '1968–69' },
    { team: 'Cagliari Calcio', trophy: 'Serie B', season: '1951–52' },
    { team: 'Cagliari Calcio', trophy: 'Serie B', season: '1963–64' },
    { team: 'Cagliari Calcio', trophy: 'Serie B', season: '2015–16' },

    // Como 1907
    { team: 'Como 1907', trophy: 'Serie B', season: '1948–49' },
    { team: 'Como 1907', trophy: 'Serie C', season: '1978–79' },
    { team: 'Como 1907', trophy: 'Serie C', season: '2020–21' },

    // US Cremonese
    { team: 'US Cremonese', trophy: 'Serie B', season: '1935–36' },
    { team: 'US Cremonese', trophy: 'Serie B', season: '1983–84' },
    { team: 'US Cremonese', trophy: 'Serie C', season: '1941–42' },
    { team: 'US Cremonese', trophy: 'Serie C', season: '1966–67' },

    // ACF Fiorentina
    { team: 'ACF Fiorentina', trophy: 'Serie A', season: '1955–56' },
    { team: 'ACF Fiorentina', trophy: 'Serie A', season: '1968–69' },
    { team: 'ACF Fiorentina', trophy: 'Coppa Italia', season: '1939–40' },
    { team: 'ACF Fiorentina', trophy: 'Coppa Italia', season: '1960–61' },
    { team: 'ACF Fiorentina', trophy: 'Coppa Italia', season: '1965–66' },
    { team: 'ACF Fiorentina', trophy: 'Coppa Italia', season: '1974–75' },
    { team: 'ACF Fiorentina', trophy: 'Coppa Italia', season: '1995–96' },
    { team: 'ACF Fiorentina', trophy: 'Coppa Italia', season: '2000–01' },
    { team: 'ACF Fiorentina', trophy: 'Supercoppa Italiana', season: '1996' },

    // Genoa CFC
    { team: 'Genoa CFC', trophy: 'Serie A', season: '1898' },
    { team: 'Genoa CFC', trophy: 'Serie A', season: '1899' },
    { team: 'Genoa CFC', trophy: 'Serie A', season: '1900' },
    { team: 'Genoa CFC', trophy: 'Serie A', season: '1901' },
    { team: 'Genoa CFC', trophy: 'Serie A', season: '1902' },
    { team: 'Genoa CFC', trophy: 'Serie A', season: '1903' },
    { team: 'Genoa CFC', trophy: 'Serie A', season: '1904' },
    { team: 'Genoa CFC', trophy: 'Serie A', season: '1914–15' },
    { team: 'Genoa CFC', trophy: 'Serie A', season: '1922–23' },
    { team: 'Genoa CFC', trophy: 'Coppa Italia', season: '1936–37' },
    { team: 'Genoa CFC', trophy: 'Serie B', season: '1934–35' },
    { team: 'Genoa CFC', trophy: 'Serie B', season: '1952–53' },
    { team: 'Genoa CFC', trophy: 'Serie B', season: '1961–62' },
    { team: 'Genoa CFC', trophy: 'Serie B', season: '1988–89' },

    // Hellas Verona
    { team: 'Hellas Verona', trophy: 'Serie A', season: '1984–85' },
    { team: 'Hellas Verona', trophy: 'Serie B', season: '1956–57' },
    { team: 'Hellas Verona', trophy: 'Serie B', season: '1981–82' },
    { team: 'Hellas Verona', trophy: 'Serie B', season: '2018–19' },

    // Inter Milan
    { team: 'Inter Milan', trophy: 'Serie A', season: '1909–10' },
    { team: 'Inter Milan', trophy: 'Serie A', season: '1919–20' },
    { team: 'Inter Milan', trophy: 'Serie A', season: '1929–30' },
    { team: 'Inter Milan', trophy: 'Serie A', season: '1937–38' },
    { team: 'Inter Milan', trophy: 'Serie A', season: '1939–40' },
    { team: 'Inter Milan', trophy: 'Serie A', season: '1952–53' },
    { team: 'Inter Milan', trophy: 'Serie A', season: '1953–54' },
    { team: 'Inter Milan', trophy: 'Serie A', season: '1962–63' },
    { team: 'Inter Milan', trophy: 'Serie A', season: '1964–65' },
    { team: 'Inter Milan', trophy: 'Serie A', season: '1965–66' },
    { team: 'Inter Milan', trophy: 'Serie A', season: '1970–71' },
    { team: 'Inter Milan', trophy: 'Serie A', season: '1979–80' },
    { team: 'Inter Milan', trophy: 'Serie A', season: '1988–89' },
    { team: 'Inter Milan', trophy: 'Serie A', season: '2005–06' },
    { team: 'Inter Milan', trophy: 'Serie A', season: '2006–07' },
    { team: 'Inter Milan', trophy: 'Serie A', season: '2007–08' },
    { team: 'Inter Milan', trophy: 'Serie A', season: '2008–09' },
    { team: 'Inter Milan', trophy: 'Serie A', season: '2009–10' },
    { team: 'Inter Milan', trophy: 'Serie A', season: '2020–21' },
    { team: 'Inter Milan', trophy: 'Coppa Italia', season: '1938–39' },
    { team: 'Inter Milan', trophy: 'Coppa Italia', season: '1976–77' },
    { team: 'Inter Milan', trophy: 'Coppa Italia', season: '1977–78' },
    { team: 'Inter Milan', trophy: 'Coppa Italia', season: '1981–82' },
    { team: 'Inter Milan', trophy: 'Coppa Italia', season: '2004–05' },
    { team: 'Inter Milan', trophy: 'Coppa Italia', season: '2005–06' },
    { team: 'Inter Milan', trophy: 'Coppa Italia', season: '2009–10' },
    { team: 'Inter Milan', trophy: 'Coppa Italia', season: '2010–11' },
    { team: 'Inter Milan', trophy: 'Supercoppa Italiana', season: '1989' },
    { team: 'Inter Milan', trophy: 'Supercoppa Italiana', season: '2005' },
    { team: 'Inter Milan', trophy: 'Supercoppa Italiana', season: '2006' },
    { team: 'Inter Milan', trophy: 'Supercoppa Italiana', season: '2008' },
    { team: 'Inter Milan', trophy: 'Supercoppa Italiana', season: '2010' },
    { team: 'Inter Milan', trophy: 'Champions League', season: '1963–64' },
    { team: 'Inter Milan', trophy: 'Champions League', season: '1964–65' },
    { team: 'Inter Milan', trophy: 'Champions League', season: '2009–10' },
    { team: 'Inter Milan', trophy: 'Intercontinental Cup', season: '1964' },
    { team: 'Inter Milan', trophy: 'Intercontinental Cup', season: '1965' },
    { team: 'Inter Milan', trophy: 'UEFA Cup', season: '1990–91' },
    { team: 'Inter Milan', trophy: 'UEFA Cup', season: '1993–94' },
    { team: 'Inter Milan', trophy: 'UEFA Cup', season: '1997–98' },

    // Juventus
    { team: 'Juventus', trophy: 'Serie A', season: '1905' },
    { team: 'Juventus', trophy: 'Serie A', season: '1925–26' },
    { team: 'Juventus', trophy: 'Serie A', season: '1930–31' },
    { team: 'Juventus', trophy: 'Serie A', season: '1931–32' },
    { team: 'Juventus', trophy: 'Serie A', season: '1932–33' },
    { team: 'Juventus', trophy: 'Serie A', season: '1933–34' },
    { team: 'Juventus', trophy: 'Serie A', season: '1934–35' },
    { team: 'Juventus', trophy: 'Serie A', season: '1949–50' },
    { team: 'Juventus', trophy: 'Serie A', season: '1951–52' },
    { team: 'Juventus', trophy: 'Serie A', season: '1957–58' },
    { team: 'Juventus', trophy: 'Serie A', season: '1959–60' },
    { team: 'Juventus', trophy: 'Serie A', season: '1960–61' },
    { team: 'Juventus', trophy: 'Serie A', season: '1966–67' },
    { team: 'Juventus', trophy: 'Serie A', season: '1971–72' },
    { team: 'Juventus', trophy: 'Serie A', season: '1972–73' },
    { team: 'Juventus', trophy: 'Serie A', season: '1974–75' },
    { team: 'Juventus', trophy: 'Serie A', season: '1976–77' },
    { team: 'Juventus', trophy: 'Serie A', season: '1977–78' },
    { team: 'Juventus', trophy: 'Serie A', season: '1980–81' },
    { team: 'Juventus', trophy: 'Serie A', season: '1981–82' },
    { team: 'Juventus', trophy: 'Serie A', season: '1983–84' },
    { team: 'Juventus', trophy: 'Serie A', season: '1985–86' },
    { team: 'Juventus', trophy: 'Serie A', season: '1994–95' },
    { team: 'Juventus', trophy: 'Serie A', season: '1996–97' },
    { team: 'Juventus', trophy: 'Serie A', season: '1997–98' },
    { team: 'Juventus', trophy: 'Serie A', season: '2001–02' },
    { team: 'Juventus', trophy: 'Serie A', season: '2002–03' },
    { team: 'Juventus', trophy: 'Serie A', season: '2011–12' },
    { team: 'Juventus', trophy: 'Serie A', season: '2012–13' },
    { team: 'Juventus', trophy: 'Serie A', season: '2013–14' },
    { team: 'Juventus', trophy: 'Serie A', season: '2014–15' },
    { team: 'Juventus', trophy: 'Serie A', season: '2015–16' },
    { team: 'Juventus', trophy: 'Serie A', season: '2016–17' },
    { team: 'Juventus', trophy: 'Serie A', season: '2017–18' },
    { team: 'Juventus', trophy: 'Serie A', season: '2018–19' },
    { team: 'Juventus', trophy: 'Serie A', season: '2019–20' },
    { team: 'Juventus', trophy: 'Coppa Italia', season: '1937–38' },
    { team: 'Juventus', trophy: 'Coppa Italia', season: '1941–42' },
    { team: 'Juventus', trophy: 'Coppa Italia', season: '1958–59' },
    { team: 'Juventus', trophy: 'Coppa Italia', season: '1959–60' },
    { team: 'Juventus', trophy: 'Coppa Italia', season: '1964–65' },
    { team: 'Juventus', trophy: 'Coppa Italia', season: '1978–79' },
    { team: 'Juventus', trophy: 'Coppa Italia', season: '1982–83' },
    { team: 'Juventus', trophy: 'Coppa Italia', season: '1989–90' },
    { team: 'Juventus', trophy: 'Coppa Italia', season: '1994–95' },
    { team: 'Juventus', trophy: 'Coppa Italia', season: '2014–15' },
    { team: 'Juventus', trophy: 'Coppa Italia', season: '2015–16' },
    { team: 'Juventus', trophy: 'Coppa Italia', season: '2016–17' },
    { team: 'Juventus', trophy: 'Coppa Italia', season: '2017–18' },
    { team: 'Juventus', trophy: 'Supercoppa Italiana', season: '1984' },
    { team: 'Juventus', trophy: 'Supercoppa Italiana', season: '1995' },
    { team: 'Juventus', trophy: 'Supercoppa Italiana', season: '1997' },
    { team: 'Juventus', trophy: 'Supercoppa Italiana', season: '2002' },
    { team: 'Juventus', trophy: 'Supercoppa Italiana', season: '2003' },
    { team: 'Juventus', trophy: 'Supercoppa Italiana', season: '2012' },
    { team: 'Juventus', trophy: 'Supercoppa Italiana', season: '2013' },
    { team: 'Juventus', trophy: 'Supercoppa Italiana', season: '2015' },
    { team: 'Juventus', trophy: 'Champions League', season: '1984–85' },
    { team: 'Juventus', trophy: 'Champions League', season: '1995–96' },
    { team: 'Juventus', trophy: 'UEFA Cup', season: '1976–77' },
    { team: 'Juventus', trophy: 'UEFA Cup', season: '1989–90' },
    { team: 'Juventus', trophy: 'Cup Winners Cup', season: '1983–84' },
    { team: 'Juventus', trophy: 'UEFA Super Cup', season: '1984' },
    { team: 'Juventus', trophy: 'Intercontinental Cup', season: '1985' },
    { team: 'Juventus', trophy: 'Intertoto Cup', season: '1999' },

    // SS Lazio
    { team: 'SS Lazio', trophy: 'Serie A', season: '1973–74' },
    { team: 'SS Lazio', trophy: 'Serie A', season: '1999–2000' },
    { team: 'SS Lazio', trophy: 'Coppa Italia', season: '1957–58' },
    { team: 'SS Lazio', trophy: 'Coppa Italia', season: '1997–98' },
    { team: 'SS Lazio', trophy: 'Coppa Italia', season: '1999–2000' },
    { team: 'SS Lazio', trophy: 'Coppa Italia', season: '2003–04' },
    { team: 'SS Lazio', trophy: 'Coppa Italia', season: '2008–09' },
    { team: 'SS Lazio', trophy: 'Coppa Italia', season: '2018–19' },
    { team: 'SS Lazio', trophy: 'Supercoppa Italiana', season: '1998' },
    { team: 'SS Lazio', trophy: 'Supercoppa Italiana', season: '2000' },
    { team: 'SS Lazio', trophy: 'Supercoppa Italiana', season: '2009' },
    { team: 'SS Lazio', trophy: 'Supercoppa Italiana', season: '2017' },
    { team: 'SS Lazio', trophy: 'Cup Winners Cup', season: '1998–99' },
    { team: 'SS Lazio', trophy: 'UEFA Super Cup', season: '1999' },

    // US Lecce
    { team: 'US Lecce', trophy: 'Serie B', season: '1984–85' },
    { team: 'US Lecce', trophy: 'Serie B', season: '1987–88' },
    { team: 'US Lecce', trophy: 'Serie B', season: '2009–10' },
    { team: 'US Lecce', trophy: 'Serie C', season: '1975–76' },
    { team: 'US Lecce', trophy: 'Serie C', season: '1980–81' },
    { team: 'US Lecce', trophy: 'Serie C', season: '1995–96' },

    // SSC Napoli
    { team: 'SSC Napoli', trophy: 'Serie A', season: '1986–87' },
    { team: 'SSC Napoli', trophy: 'Serie A', season: '1989–90' },
    { team: 'SSC Napoli', trophy: 'Serie A', season: '2022–23' },
    { team: 'SSC Napoli', trophy: 'Coppa Italia', season: '1961–62' },
    { team: 'SSC Napoli', trophy: 'Coppa Italia', season: '1975–76' },
    { team: 'SSC Napoli', trophy: 'Coppa Italia', season: '1986–87' },
    { team: 'SSC Napoli', trophy: 'Coppa Italia', season: '2011–12' },
    { team: 'SSC Napoli', trophy: 'Coppa Italia', season: '2013–14' },
    { team: 'SSC Napoli', trophy: 'Supercoppa Italiana', season: '1990' },
    { team: 'SSC Napoli', trophy: 'Supercoppa Italiana', season: '2014' },
    { team: 'SSC Napoli', trophy: 'UEFA Cup', season: '1988–89' },

    // Parma Calcio
    { team: 'Parma Calcio', trophy: 'Coppa Italia', season: '1991–92' },
    { team: 'Parma Calcio', trophy: 'Coppa Italia', season: '1998–99' },
    { team: 'Parma Calcio', trophy: 'Coppa Italia', season: '2001–02' },
    { team: 'Parma Calcio', trophy: 'Supercoppa Italiana', season: '1999' },
    { team: 'Parma Calcio', trophy: 'Cup Winners Cup', season: '1992–93' },
    { team: 'Parma Calcio', trophy: 'UEFA Cup', season: '1994–95' },
    { team: 'Parma Calcio', trophy: 'UEFA Cup', season: '1998–99' },
    { team: 'Parma Calcio', trophy: 'UEFA Super Cup', season: '1993' },
    { team: 'Parma Calcio', trophy: 'Serie B', season: '1978–79' },
    { team: 'Parma Calcio', trophy: 'Serie B', season: '1983–84' },
    { team: 'Parma Calcio', trophy: 'Serie B', season: '1985–86' },

    // Pisa SC
    { team: 'Pisa SC', trophy: 'Serie B', season: '1984–85' },
    { team: 'Pisa SC', trophy: 'Serie B', season: '1990–91' },
    { team: 'Pisa SC', trophy: 'Serie C', season: '1968–69' },
    { team: 'Pisa SC', trophy: 'Serie C', season: '1974–75' },

    // AS Roma
    { team: 'AS Roma', trophy: 'Serie A', season: '1941–42' },
    { team: 'AS Roma', trophy: 'Serie A', season: '1982–83' },
    { team: 'AS Roma', trophy: 'Serie A', season: '2000–01' },
    { team: 'AS Roma', trophy: 'Coppa Italia', season: '1963–64' },
    { team: 'AS Roma', trophy: 'Coppa Italia', season: '1968–69' },
    { team: 'AS Roma', trophy: 'Coppa Italia', season: '1979–80' },
    { team: 'AS Roma', trophy: 'Coppa Italia', season: '1980–81' },
    { team: 'AS Roma', trophy: 'Coppa Italia', season: '1983–84' },
    { team: 'AS Roma', trophy: 'Coppa Italia', season: '1985–86' },
    { team: 'AS Roma', trophy: 'Coppa Italia', season: '1990–91' },
    { team: 'AS Roma', trophy: 'Coppa Italia', season: '2006–07' },
    { team: 'AS Roma', trophy: 'Coppa Italia', season: '2007–08' },
    { team: 'AS Roma', trophy: 'Supercoppa Italiana', season: '2001' },
    { team: 'AS Roma', trophy: 'Supercoppa Italiana', season: '2007' },

    // US Sassuolo
    { team: 'US Sassuolo', trophy: 'Serie B', season: '2012–13' },
    { team: 'US Sassuolo', trophy: 'Serie C', season: '2007–08' },
    { team: 'US Sassuolo', trophy: 'Serie C', season: '2006–07' },

    // Torino FC
    { team: 'Torino FC', trophy: 'Serie A', season: '1927–28' },
    { team: 'Torino FC', trophy: 'Serie A', season: '1942–43' },
    { team: 'Torino FC', trophy: 'Serie A', season: '1945–46' },
    { team: 'Torino FC', trophy: 'Serie A', season: '1946–47' },
    { team: 'Torino FC', trophy: 'Serie A', season: '1947–48' },
    { team: 'Torino FC', trophy: 'Serie A', season: '1948–49' },
    { team: 'Torino FC', trophy: 'Serie A', season: '1949–50' },
    { team: 'Torino FC', trophy: 'Coppa Italia', season: '1935–36' },
    { team: 'Torino FC', trophy: 'Coppa Italia', season: '1942–43' },
    { team: 'Torino FC', trophy: 'Coppa Italia', season: '1967–68' },
    { team: 'Torino FC', trophy: 'Coppa Italia', season: '1970–71' },
    { team: 'Torino FC', trophy: 'Coppa Italia', season: '1992–93' },
    { team: 'Torino FC', trophy: 'Supercoppa Italiana', season: '1993' },

    // Udinese Calcio
    { team: 'Udinese Calcio', trophy: 'Serie B', season: '1955–56' },
    { team: 'Udinese Calcio', trophy: 'Serie B', season: '1978–79' },
    { team: 'Udinese Calcio', trophy: 'Serie B', season: '2000–01' },
    { team: 'Udinese Calcio', trophy: 'Coppa Italia', season: '1937–38' },
];

async function importItalianTrophies() {
    const SQL = await initSqlJs();
    const buffer = readFileSync(dbPath);
    const db = new SQL.Database(buffer);

    try {
        db.exec("BEGIN TRANSACTION");
        console.log("🏆 Starting Italian Trophies Import...");

        let addedCount = 0;
        let skippedCount = 0;

        for (const record of ITALIAN_TROPHIES) {
            // 1. Normalize Team Name
            const normalizedTeamName = CLUB_MAPPINGS[record.team] || record.team;

            // 2. Find Team in DB (in Clubs table)
            let team = null;
            const teamsRes = db.exec("SELECT id FROM clubs WHERE name = ?", [normalizedTeamName]);
            if (teamsRes.length > 0) {
                team = { id: teamsRes[0].values[0][0] };
            } else {
                console.warn(`⚠️ Team not found: ${record.team} (Normalized: ${normalizedTeamName}) - Skipping trophy`);
                skippedCount++;
                continue;
            }

            // 3. Normalize Trophy Type
            let trophyType = 'Italy'; // Default for visual sorting
            if (record.trophy.includes('Serie A') || record.trophy.includes('Serie B') || record.trophy.includes('Serie C')) {
                trophyType = 'championship';
            }
            if (record.trophy.includes('Coppa Italia') || record.trophy.includes('Supercoppa')) {
                trophyType = 'national_cup';
            }
            if (record.trophy.includes('Champions League') ||
                record.trophy.includes('European Cup') ||
                record.trophy.includes('Cup Winners') ||
                record.trophy.includes('UEFA Cup') ||
                record.trophy.includes('UEFA Super Cup') ||
                record.trophy.includes('Intertoto') ||
                record.trophy.includes('Mitropa')) {
                trophyType = 'international_cup';
            }
            if (record.trophy.includes('Intercontinental') || record.trophy.includes('Club World Cup')) {
                trophyType = 'international_cup';
            }

            // 4. Get or Create Trophy
            let trophyId;
            const trophyRes = db.exec("SELECT id FROM trophies WHERE name = ?", [record.trophy]);
            if (trophyRes.length > 0) {
                trophyId = trophyRes[0].values[0][0];
            } else {
                let categoryType = 'Italy';
                if (trophyType === 'international_cup') {
                    if (record.trophy.includes('Intercontinental') || record.trophy.includes('Club World Cup')) {
                        categoryType = 'World';
                    } else {
                        categoryType = 'Europe';
                    }
                }

                db.run("INSERT INTO trophies (name, type) VALUES (?, ?)", [record.trophy, categoryType]);
                trophyId = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
            }

            // 5. Get or Create Season
            let seasonId;
            let seasonLabel = record.season.replace('–', '/');
            if (seasonLabel.match(/^\d{4}.\d{2}$/)) {
                const parts = seasonLabel.split(/[/-]/);
                if (parts[1].length === 2) {
                    const prefix = parts[0].substring(0, 2);
                    seasonLabel = `${parts[0]}/${prefix}${parts[1]}`;
                }
            }

            const seasonRes = db.exec("SELECT id FROM seasons WHERE label = ?", [seasonLabel]);
            if (seasonRes.length > 0) {
                seasonId = seasonRes[0].values[0][0];
            } else {
                // If label is just Year (1995), use it. If range, use first year.
                const year = parseInt(seasonLabel.substring(0, 4));
                db.run("INSERT INTO seasons (label, year) VALUES (?, ?)", [seasonLabel, year]);
                seasonId = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
            }

            // 6. Insert Team Trophy
            try {
                // Place 1 for winner
                db.run("INSERT OR IGNORE INTO team_trophies (team_id, trophy_id, season_id, place) VALUES (?, ?, ?, ?)", [team.id, trophyId, seasonId, 1]);
                if (db.getRowsModified() > 0) addedCount++;
                else skippedCount++;
            } catch (e) {
                console.error(`Error inserting trophy for ${normalizedTeamName}:`, e);
            }
        }

        db.exec("COMMIT");
        const data = db.export();
        writeFileSync(dbPath, data);
        console.log(`\n🎉 Import Completed! Added: ${addedCount}, Skipped/Duplicate: ${skippedCount}`);

    } catch (err) {
        console.error("❌ Fatal Error:", err);
        db.exec("ROLLBACK");
    } finally {
        db.close();
    }
}

importItalianTrophies();
