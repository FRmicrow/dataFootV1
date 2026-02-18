import sqlite3
import os
from datetime import datetime

# Path to database
DB_PATH = 'backend/database.sqlite'

# Extended Country Data (Name -> (Code, Flag, FlagSmall, Continent))
# Using only the ones likely to appear or requested by user.
# User provided a large list, copying relevant ones for mapping.
COUNTRY_DATA = {
    'Algeria': ('DZ', 'https://flagcdn.com/dz.svg', 'https://flagcdn.com/256x192/dz.png', 'Africa'),
    'Angola': ('AO', 'https://flagcdn.com/ao.svg', 'https://flagcdn.com/256x192/ao.png', 'Africa'),
    'Benin': ('BJ', 'https://flagcdn.com/bj.svg', 'https://flagcdn.com/256x192/bj.png', 'Africa'),
    'Botswana': ('BW', 'https://flagcdn.com/bw.svg', 'https://flagcdn.com/256x192/bw.png', 'Africa'),
    'Burkina Faso': ('BF', 'https://flagcdn.com/bf.svg', 'https://flagcdn.com/256x192/bf.png', 'Africa'),
    'Burundi': ('BI', 'https://flagcdn.com/bi.svg', 'https://flagcdn.com/256x192/bi.png', 'Africa'),
    'Cabo Verde': ('CV', 'https://flagcdn.com/cv.svg', 'https://flagcdn.com/256x192/cv.png', 'Africa'),
    'Cape Verde': ('CV', 'https://flagcdn.com/cv.svg', 'https://flagcdn.com/256x192/cv.png', 'Africa'), # Alias
    'Cameroon': ('CM', 'https://flagcdn.com/cm.svg', 'https://flagcdn.com/256x192/cm.png', 'Africa'),
    'Central African Republic': ('CF', 'https://flagcdn.com/cf.svg', 'https://flagcdn.com/256x192/cf.png', 'Africa'),
    'Chad': ('TD', 'https://flagcdn.com/td.svg', 'https://flagcdn.com/256x192/td.png', 'Africa'),
    'Comoros': ('KM', 'https://flagcdn.com/km.svg', 'https://flagcdn.com/256x192/km.png', 'Africa'),
    'Congo': ('CG', 'https://flagcdn.com/cg.svg', 'https://flagcdn.com/256x192/cg.png', 'Africa'),
    'Congo, Democratic Republic of the': ('CD', 'https://flagcdn.com/cd.svg', 'https://flagcdn.com/256x192/cd.png', 'Africa'),
    'DR Congo': ('CD', 'https://flagcdn.com/cd.svg', 'https://flagcdn.com/256x192/cd.png', 'Africa'), # Alias
    'Djibouti': ('DJ', 'https://flagcdn.com/dj.svg', 'https://flagcdn.com/256x192/dj.png', 'Africa'),
    'Egypt': ('EG', 'https://flagcdn.com/eg.svg', 'https://flagcdn.com/256x192/eg.png', 'Africa'),
    'Equatorial Guinea': ('GQ', 'https://flagcdn.com/gq.svg', 'https://flagcdn.com/256x192/gq.png', 'Africa'),
    'Eritrea': ('ER', 'https://flagcdn.com/er.svg', 'https://flagcdn.com/256x192/er.png', 'Africa'),
    'Eswatini': ('SZ', 'https://flagcdn.com/sz.svg', 'https://flagcdn.com/256x192/sz.png', 'Africa'),
    'Ethiopia': ('ET', 'https://flagcdn.com/et.svg', 'https://flagcdn.com/256x192/et.png', 'Africa'),
    'Gabon': ('GA', 'https://flagcdn.com/ga.svg', 'https://flagcdn.com/256x192/ga.png', 'Africa'),
    'Gambia': ('GM', 'https://flagcdn.com/gm.svg', 'https://flagcdn.com/256x192/gm.png', 'Africa'),
    'Ghana': ('GH', 'https://flagcdn.com/gh.svg', 'https://flagcdn.com/256x192/gh.png', 'Africa'),
    'Guinea': ('GN', 'https://flagcdn.com/gn.svg', 'https://flagcdn.com/256x192/gn.png', 'Africa'),
    'Guinea-Bissau': ('GW', 'https://flagcdn.com/gw.svg', 'https://flagcdn.com/256x192/gw.png', 'Africa'),
    'Ivory Coast': ('CI', 'https://flagcdn.com/ci.svg', 'https://flagcdn.com/256x192/ci.png', 'Africa'),
    "Côte d'Ivoire": ('CI', 'https://flagcdn.com/ci.svg', 'https://flagcdn.com/256x192/ci.png', 'Africa'), # Alias
    'Kenya': ('KE', 'https://flagcdn.com/ke.svg', 'https://flagcdn.com/256x192/ke.png', 'Africa'),
    'Lesotho': ('LS', 'https://flagcdn.com/ls.svg', 'https://flagcdn.com/256x192/ls.png', 'Africa'),
    'Liberia': ('LR', 'https://flagcdn.com/lr.svg', 'https://flagcdn.com/256x192/lr.png', 'Africa'),
    'Libya': ('LY', 'https://flagcdn.com/ly.svg', 'https://flagcdn.com/256x192/ly.png', 'Africa'),
    'Madagascar': ('MG', 'https://flagcdn.com/mg.svg', 'https://flagcdn.com/256x192/mg.png', 'Africa'),
    'Malawi': ('MW', 'https://flagcdn.com/mw.svg', 'https://flagcdn.com/256x192/mw.png', 'Africa'),
    'Mali': ('ML', 'https://flagcdn.com/ml.svg', 'https://flagcdn.com/256x192/ml.png', 'Africa'),
    'Mauritania': ('MR', 'https://flagcdn.com/mr.svg', 'https://flagcdn.com/256x192/mr.png', 'Africa'),
    'Mauritius': ('MU', 'https://flagcdn.com/mu.svg', 'https://flagcdn.com/256x192/mu.png', 'Africa'),
    'Mayotte': ('YT', 'https://flagcdn.com/yt.svg', 'https://flagcdn.com/256x192/yt.png', 'Africa'),
    'Morocco': ('MA', 'https://flagcdn.com/ma.svg', 'https://flagcdn.com/256x192/ma.png', 'Africa'),
    'Mozambique': ('MZ', 'https://flagcdn.com/mz.svg', 'https://flagcdn.com/256x192/mz.png', 'Africa'),
    'Namibia': ('NA', 'https://flagcdn.com/na.svg', 'https://flagcdn.com/256x192/na.png', 'Africa'),
    'Niger': ('NE', 'https://flagcdn.com/ne.svg', 'https://flagcdn.com/256x192/ne.png', 'Africa'),
    'Nigeria': ('NG', 'https://flagcdn.com/ng.svg', 'https://flagcdn.com/256x192/ng.png', 'Africa'),
    'Réunion': ('RE', 'https://flagcdn.com/re.svg', 'https://flagcdn.com/256x192/re.png', 'Africa'),
    'Rwanda': ('RW', 'https://flagcdn.com/rw.svg', 'https://flagcdn.com/256x192/rw.png', 'Africa'),
    'Saint Helena': ('SH', 'https://flagcdn.com/sh.svg', 'https://flagcdn.com/256x192/sh.png', 'Africa'),
    'Saint Kitts and Nevis': ('KN', 'https://flagcdn.com/kn.svg', 'https://flagcdn.com/256x192/kn.png', 'Africa'),
    'Saint Lucia': ('LC', 'https://flagcdn.com/lc.svg', 'https://flagcdn.com/256x192/lc.png', 'Africa'),
    'Saint Pierre and Miquelon': ('PM', 'https://flagcdn.com/pm.svg', 'https://flagcdn.com/256x192/pm.png', 'Africa'),
    'Saint Vincent and the Grenadines': ('VC', 'https://flagcdn.com/vc.svg', 'https://flagcdn.com/256x192/vc.png', 'Africa'),
    'Samoa': ('WS', 'https://flagcdn.com/ws.svg', 'https://flagcdn.com/256x192/ws.png', 'Africa'),
    'São Tomé and Príncipe': ('ST', 'https://flagcdn.com/st.svg', 'https://flagcdn.com/256x192/st.png', 'Africa'),
    'Senegal': ('SN', 'https://flagcdn.com/sn.svg', 'https://flagcdn.com/256x192/sn.png', 'Africa'),
    'Seychelles': ('SC', 'https://flagcdn.com/sc.svg', 'https://flagcdn.com/256x192/sc.png', 'Africa'),
    'Sierra Leone': ('SL', 'https://flagcdn.com/sl.svg', 'https://flagcdn.com/256x192/sl.png', 'Africa'),
    'Somalia': ('SO', 'https://flagcdn.com/so.svg', 'https://flagcdn.com/256x192/so.png', 'Africa'),
    'South Africa': ('ZA', 'https://flagcdn.com/za.svg', 'https://flagcdn.com/256x192/za.png', 'Africa'),
    'South Sudan': ('SS', 'https://flagcdn.com/ss.svg', 'https://flagcdn.com/256x192/ss.png', 'Africa'),
    'Sudan': ('SD', 'https://flagcdn.com/sd.svg', 'https://flagcdn.com/256x192/sd.png', 'Africa'),
    'Tanzania, United Republic of': ('TZ', 'https://flagcdn.com/tz.svg', 'https://flagcdn.com/256x192/tz.png', 'Africa'),
    'Tanzania': ('TZ', 'https://flagcdn.com/tz.svg', 'https://flagcdn.com/256x192/tz.png', 'Africa'), # Alias
    'Togo': ('TG', 'https://flagcdn.com/tg.svg', 'https://flagcdn.com/256x192/tg.png', 'Africa'),
    'Tunisia': ('TN', 'https://flagcdn.com/tn.svg', 'https://flagcdn.com/256x192/tn.png', 'Africa'),
    'Uganda': ('UG', 'https://flagcdn.com/ug.svg', 'https://flagcdn.com/256x192/ug.png', 'Africa'),
    'Western Sahara': ('EH', 'https://flagcdn.com/eh.svg', 'https://flagcdn.com/256x192/eh.png', 'Africa'),
    'Zambia': ('ZM', 'https://flagcdn.com/zm.svg', 'https://flagcdn.com/256x192/zm.png', 'Africa'),
    'Zimbabwe': ('ZW', 'https://flagcdn.com/zw.svg', 'https://flagcdn.com/256x192/zw.png', 'Africa'),
    'Antigua and Barbuda': ('AG', 'https://flagcdn.com/ag.svg', 'https://flagcdn.com/256x192/ag.png', 'Americas'),
    'Argentina': ('AR', 'https://flagcdn.com/ar.svg', 'https://flagcdn.com/256x192/ar.png', 'Americas'),
    'Bahamas': ('BS', 'https://flagcdn.com/bs.svg', 'https://flagcdn.com/256x192/bs.png', 'Americas'),
    'Barbados': ('BB', 'https://flagcdn.com/bb.svg', 'https://flagcdn.com/256x192/bb.png', 'Americas'),
    'Belize': ('BZ', 'https://flagcdn.com/bz.svg', 'https://flagcdn.com/256x192/bz.png', 'Americas'),
    'Bolivia': ('BO', 'https://flagcdn.com/bo.svg', 'https://flagcdn.com/256x192/bo.png', 'Americas'),
    'Brazil': ('BR', 'https://flagcdn.com/br.svg', 'https://flagcdn.com/256x192/br.png', 'Americas'),
    'Canada': ('CA', 'https://flagcdn.com/ca.svg', 'https://flagcdn.com/256x192/ca.png', 'Americas'),
    'Chile': ('CL', 'https://flagcdn.com/cl.svg', 'https://flagcdn.com/256x192/cl.png', 'Americas'),
    'Colombia': ('CO', 'https://flagcdn.com/co.svg', 'https://flagcdn.com/256x192/co.png', 'Americas'),
    'Costa Rica': ('CR', 'https://flagcdn.com/cr.svg', 'https://flagcdn.com/256x192/cr.png', 'Americas'),
    'Cuba': ('CU', 'https://flagcdn.com/cu.svg', 'https://flagcdn.com/256x192/cu.png', 'Americas'),
    'Dominica': ('DM', 'https://flagcdn.com/dm.svg', 'https://flagcdn.com/256x192/dm.png', 'Americas'),
    'Dominican Republic': ('DO', 'https://flagcdn.com/do.svg', 'https://flagcdn.com/256x192/do.png', 'Americas'),
    'Ecuador': ('EC', 'https://flagcdn.com/ec.svg', 'https://flagcdn.com/256x192/ec.png', 'Americas'),
    'El Salvador': ('SV', 'https://flagcdn.com/sv.svg', 'https://flagcdn.com/256x192/sv.png', 'Americas'),
    'Grenada': ('GD', 'https://flagcdn.com/gd.svg', 'https://flagcdn.com/256x192/gd.png', 'Americas'),
    'Guatemala': ('GT', 'https://flagcdn.com/gt.svg', 'https://flagcdn.com/256x192/gt.png', 'Americas'),
    'Guyana': ('GY', 'https://flagcdn.com/gy.svg', 'https://flagcdn.com/256x192/gy.png', 'Americas'),
    'Haiti': ('HT', 'https://flagcdn.com/ht.svg', 'https://flagcdn.com/256x192/ht.png', 'Americas'),
    'Honduras': ('HN', 'https://flagcdn.com/hn.svg', 'https://flagcdn.com/256x192/hn.png', 'Americas'),
    'Jamaica': ('JM', 'https://flagcdn.com/jm.svg', 'https://flagcdn.com/256x192/jm.png', 'Americas'),
    'Mexico': ('MX', 'https://flagcdn.com/mx.svg', 'https://flagcdn.com/256x192/mx.png', 'Americas'),
    'Nicaragua': ('NI', 'https://flagcdn.com/ni.svg', 'https://flagcdn.com/256x192/ni.png', 'Americas'),
    'Panama': ('PA', 'https://flagcdn.com/pa.svg', 'https://flagcdn.com/256x192/pa.png', 'Americas'),
    'Paraguay': ('PY', 'https://flagcdn.com/py.svg', 'https://flagcdn.com/256x192/py.png', 'Americas'),
    'Peru': ('PE', 'https://flagcdn.com/pe.svg', 'https://flagcdn.com/256x192/pe.png', 'Americas'),
    'Suriname': ('SR', 'https://flagcdn.com/sr.svg', 'https://flagcdn.com/256x192/sr.png', 'Americas'),
    'Trinidad and Tobago': ('TT', 'https://flagcdn.com/tt.svg', 'https://flagcdn.com/256x192/tt.png', 'Americas'),
    'United States of America': ('US', 'https://flagcdn.com/us.svg', 'https://flagcdn.com/256x192/us.png', 'Americas'),
    'USA': ('US', 'https://flagcdn.com/us.svg', 'https://flagcdn.com/256x192/us.png', 'Americas'), # Alias
    'Uruguay': ('UY', 'https://flagcdn.com/uy.svg', 'https://flagcdn.com/256x192/uy.png', 'Americas'),
    'Venezuela': ('VE', 'https://flagcdn.com/ve.svg', 'https://flagcdn.com/256x192/ve.png', 'Americas'),
    'Afghanistan': ('AF', 'https://flagcdn.com/af.svg', 'https://flagcdn.com/256x192/af.png', 'Asia'),
    'Armenia': ('AM', 'https://flagcdn.com/am.svg', 'https://flagcdn.com/256x192/am.png', 'Asia'),
    'Azerbaijan': ('AZ', 'https://flagcdn.com/az.svg', 'https://flagcdn.com/256x192/az.png', 'Asia'),
    'Bahrain': ('BH', 'https://flagcdn.com/bh.svg', 'https://flagcdn.com/256x192/bh.png', 'Asia'),
    'Bangladesh': ('BD', 'https://flagcdn.com/bd.svg', 'https://flagcdn.com/256x192/bd.png', 'Asia'),
    'Bhutan': ('BT', 'https://flagcdn.com/bt.svg', 'https://flagcdn.com/256x192/bt.png', 'Asia'),
    'Brunei Darussalam': ('BN', 'https://flagcdn.com/bn.svg', 'https://flagcdn.com/256x192/bn.png', 'Asia'),
    'Cambodia': ('KH', 'https://flagcdn.com/kh.svg', 'https://flagcdn.com/256x192/kh.png', 'Asia'),
    'China': ('CN', 'https://flagcdn.com/cn.svg', 'https://flagcdn.com/256x192/cn.png', 'Asia'),
    'China PR': ('CN', 'https://flagcdn.com/cn.svg', 'https://flagcdn.com/256x192/cn.png', 'Asia'), # Alias
    'Georgia': ('GE', 'https://flagcdn.com/ge.svg', 'https://flagcdn.com/256x192/ge.png', 'Asia'),
    'India': ('IN', 'https://flagcdn.com/in.svg', 'https://flagcdn.com/256x192/in.png', 'Asia'),
    'Indonesia': ('ID', 'https://flagcdn.com/id.svg', 'https://flagcdn.com/256x192/id.png', 'Asia'),
    'Iran (Islamic Republic of)': ('IR', 'https://flagcdn.com/ir.svg', 'https://flagcdn.com/256x192/ir.png', 'Asia'),
    'Iran': ('IR', 'https://flagcdn.com/ir.svg', 'https://flagcdn.com/256x192/ir.png', 'Asia'), # Alias
    'Iraq': ('IQ', 'https://flagcdn.com/iq.svg', 'https://flagcdn.com/256x192/iq.png', 'Asia'),
    'Israel': ('IL', 'https://flagcdn.com/il.svg', 'https://flagcdn.com/256x192/il.png', 'Asia'),
    'Japan': ('JP', 'https://flagcdn.com/jp.svg', 'https://flagcdn.com/256x192/jp.png', 'Asia'),
    'Jordan': ('JO', 'https://flagcdn.com/jo.svg', 'https://flagcdn.com/256x192/jo.png', 'Asia'),
    'Kazakhstan': ('KZ', 'https://flagcdn.com/kz.svg', 'https://flagcdn.com/256x192/kz.png', 'Asia'),
    'Kuwait': ('KW', 'https://flagcdn.com/kw.svg', 'https://flagcdn.com/256x192/kw.png', 'Asia'),
    'Kyrgyzstan': ('KG', 'https://flagcdn.com/kg.svg', 'https://flagcdn.com/256x192/kg.png', 'Asia'),
    'Lao People\'s Democratic Republic': ('LA', 'https://flagcdn.com/la.svg', 'https://flagcdn.com/256x192/la.png', 'Asia'),
    'Laos': ('LA', 'https://flagcdn.com/la.svg', 'https://flagcdn.com/256x192/la.png', 'Asia'), # Alias
    'Lebanon': ('LB', 'https://flagcdn.com/lb.svg', 'https://flagcdn.com/256x192/lb.png', 'Asia'),
    'Malaysia': ('MY', 'https://flagcdn.com/my.svg', 'https://flagcdn.com/256x192/my.png', 'Asia'),
    'Maldives': ('MV', 'https://flagcdn.com/mv.svg', 'https://flagcdn.com/256x192/mv.png', 'Asia'),
    'Mongolia': ('MN', 'https://flagcdn.com/mn.svg', 'https://flagcdn.com/256x192/mn.png', 'Asia'),
    'Myanmar': ('MM', 'https://flagcdn.com/mm.svg', 'https://flagcdn.com/256x192/mm.png', 'Asia'),
    'Nepal': ('NP', 'https://flagcdn.com/np.svg', 'https://flagcdn.com/256x192/np.png', 'Asia'),
    'North Korea': ('KP', 'https://flagcdn.com/kp.svg', 'https://flagcdn.com/256x192/kp.png', 'Asia'),
    'Korea DPR': ('KP', 'https://flagcdn.com/kp.svg', 'https://flagcdn.com/256x192/kp.png', 'Asia'), # Alias
    'Oman': ('OM', 'https://flagcdn.com/om.svg', 'https://flagcdn.com/256x192/om.png', 'Asia'),
    'Pakistan': ('PK', 'https://flagcdn.com/pk.svg', 'https://flagcdn.com/256x192/pk.png', 'Asia'),
    'Palestine': ('PS', 'https://flagcdn.com/ps.svg', 'https://flagcdn.com/256x192/ps.png', 'Asia'),
    'Philippines': ('PH', 'https://flagcdn.com/ph.svg', 'https://flagcdn.com/256x192/ph.png', 'Asia'),
    'Qatar': ('QA', 'https://flagcdn.com/qa.svg', 'https://flagcdn.com/256x192/qa.png', 'Asia'),
    'Saudi Arabia': ('SA', 'https://flagcdn.com/sa.svg', 'https://flagcdn.com/256x192/sa.png', 'Asia'),
    'Singapore': ('SG', 'https://flagcdn.com/sg.svg', 'https://flagcdn.com/256x192/sg.png', 'Asia'),
    'South Korea': ('KR', 'https://flagcdn.com/kr.svg', 'https://flagcdn.com/256x192/kr.png', 'Asia'),
    'Korea Republic': ('KR', 'https://flagcdn.com/kr.svg', 'https://flagcdn.com/256x192/kr.png', 'Asia'), # Alias
    'Sri Lanka': ('LK', 'https://flagcdn.com/lk.svg', 'https://flagcdn.com/256x192/lk.png', 'Asia'),
    'Syrian Arab Republic': ('SY', 'https://flagcdn.com/sy.svg', 'https://flagcdn.com/256x192/sy.png', 'Asia'),
    'Taiwan': ('TW', 'https://flagcdn.com/tw.svg', 'https://flagcdn.com/256x192/tw.png', 'Asia'),
    'Tajikistan': ('TJ', 'https://flagcdn.com/tj.svg', 'https://flagcdn.com/256x192/tj.png', 'Asia'),
    'Thailand': ('TH', 'https://flagcdn.com/th.svg', 'https://flagcdn.com/256x192/th.png', 'Asia'),
    'Timor-Leste': ('TL', 'https://flagcdn.com/tl.svg', 'https://flagcdn.com/256x192/tl.png', 'Asia'),
    'Turkmenistan': ('TM', 'https://flagcdn.com/tm.svg', 'https://flagcdn.com/256x192/tm.png', 'Asia'),
    'United Arab Emirates': ('AE', 'https://flagcdn.com/ae.svg', 'https://flagcdn.com/256x192/ae.png', 'Asia'),
    'Uzbekistan': ('UZ', 'https://flagcdn.com/uz.svg', 'https://flagcdn.com/256x192/uz.png', 'Asia'),
    'Vietnam': ('VN', 'https://flagcdn.com/vn.svg', 'https://flagcdn.com/256x192/vn.png', 'Asia'),
    'Yemen': ('YE', 'https://flagcdn.com/ye.svg', 'https://flagcdn.com/256x192/ye.png', 'Asia'),
    'Albania': ('AL', 'https://flagcdn.com/al.svg', 'https://flagcdn.com/256x192/al.png', 'Europe'),
    'Andorra': ('AD', 'https://flagcdn.com/ad.svg', 'https://flagcdn.com/256x192/ad.png', 'Europe'),
    'Austria': ('AT', 'https://flagcdn.com/at.svg', 'https://flagcdn.com/256x192/at.png', 'Europe'),
    'Belarus': ('BY', 'https://flagcdn.com/by.svg', 'https://flagcdn.com/256x192/by.png', 'Europe'),
    'Belgium': ('BE', 'https://flagcdn.com/be.svg', 'https://flagcdn.com/256x192/be.png', 'Europe'),
    'Bosnia and Herzegovina': ('BA', 'https://flagcdn.com/ba.svg', 'https://flagcdn.com/256x192/ba.png', 'Europe'),
    'Bulgaria': ('BG', 'https://flagcdn.com/bg.svg', 'https://flagcdn.com/256x192/bg.png', 'Europe'),
    'Croatia': ('HR', 'https://flagcdn.com/hr.svg', 'https://flagcdn.com/256x192/hr.png', 'Europe'),
    'Cyprus': ('CY', 'https://flagcdn.com/cy.svg', 'https://flagcdn.com/256x192/cy.png', 'Europe'),
    'Czech Republic': ('CZ', 'https://flagcdn.com/cz.svg', 'https://flagcdn.com/256x192/cz.png', 'Europe'),
    'Czechia': ('CZ', 'https://flagcdn.com/cz.svg', 'https://flagcdn.com/256x192/cz.png', 'Europe'), # Alias
    'Denmark': ('DK', 'https://flagcdn.com/dk.svg', 'https://flagcdn.com/256x192/dk.png', 'Europe'),
    'Estonia': ('EE', 'https://flagcdn.com/ee.svg', 'https://flagcdn.com/256x192/ee.png', 'Europe'),
    'Faroe Islands': ('FO', 'https://flagcdn.com/fo.svg', 'https://flagcdn.com/256x192/fo.png', 'Europe'),
    'Finland': ('FI', 'https://flagcdn.com/fi.svg', 'https://flagcdn.com/256x192/fi.png', 'Europe'),
    'France': ('FR', 'https://flagcdn.com/fr.svg', 'https://flagcdn.com/256x192/fr.png', 'Europe'),
    'Germany': ('DE', 'https://flagcdn.com/de.svg', 'https://flagcdn.com/256x192/de.png', 'Europe'),
    'Gibraltar': ('GI', 'https://flagcdn.com/gi.svg', 'https://flagcdn.com/256x192/gi.png', 'Europe'),
    'Greece': ('GR', 'https://flagcdn.com/gr.svg', 'https://flagcdn.com/256x192/gr.png', 'Europe'),
    'Hungary': ('HU', 'https://flagcdn.com/hu.svg', 'https://flagcdn.com/256x192/hu.png', 'Europe'),
    'Iceland': ('IS', 'https://flagcdn.com/is.svg', 'https://flagcdn.com/256x192/is.png', 'Europe'),
    'Ireland': ('IE', 'https://flagcdn.com/ie.svg', 'https://flagcdn.com/256x192/ie.png', 'Europe'),
    'Republic of Ireland': ('IE', 'https://flagcdn.com/ie.svg', 'https://flagcdn.com/256x192/ie.png', 'Europe'), # Alias
    'Italy': ('IT', 'https://flagcdn.com/it.svg', 'https://flagcdn.com/256x192/it.png', 'Europe'),
    'Kosovo': ('XK', 'https://flagcdn.com/xk.svg', 'https://flagcdn.com/256x192/xk.png', 'Europe'),
    'Latvia': ('LV', 'https://flagcdn.com/lv.svg', 'https://flagcdn.com/256x192/lv.png', 'Europe'),
    'Liechtenstein': ('LI', 'https://flagcdn.com/li.svg', 'https://flagcdn.com/256x192/li.png', 'Europe'),
    'Lithuania': ('LT', 'https://flagcdn.com/lt.svg', 'https://flagcdn.com/256x192/lt.png', 'Europe'),
    'Luxembourg': ('LU', 'https://flagcdn.com/lu.svg', 'https://flagcdn.com/256x192/lu.png', 'Europe'),
    'Malta': ('MT', 'https://flagcdn.com/mt.svg', 'https://flagcdn.com/256x192/mt.png', 'Europe'),
    'Moldova, Republic of': ('MD', 'https://flagcdn.com/md.svg', 'https://flagcdn.com/256x192/md.png', 'Europe'),
    'Moldova': ('MD', 'https://flagcdn.com/md.svg', 'https://flagcdn.com/256x192/md.png', 'Europe'), # Alias
    'Monaco': ('MC', 'https://flagcdn.com/mc.svg', 'https://flagcdn.com/256x192/mc.png', 'Europe'),
    'Montenegro': ('ME', 'https://flagcdn.com/me.svg', 'https://flagcdn.com/256x192/me.png', 'Europe'),
    'Netherlands': ('NL', 'https://flagcdn.com/nl.svg', 'https://flagcdn.com/256x192/nl.png', 'Europe'),
    'North Macedonia': ('MK', 'https://flagcdn.com/mk.svg', 'https://flagcdn.com/256x192/mk.png', 'Europe'),
    'Norway': ('NO', 'https://flagcdn.com/no.svg', 'https://flagcdn.com/256x192/no.png', 'Europe'),
    'Poland': ('PL', 'https://flagcdn.com/pl.svg', 'https://flagcdn.com/256x192/pl.png', 'Europe'),
    'Portugal': ('PT', 'https://flagcdn.com/pt.svg', 'https://flagcdn.com/256x192/pt.png', 'Europe'),
    'Romania': ('RO', 'https://flagcdn.com/ro.svg', 'https://flagcdn.com/256x192/ro.png', 'Europe'),
    'Russian Federation': ('RU', 'https://flagcdn.com/ru.svg', 'https://flagcdn.com/256x192/ru.png', 'Europe'),
    'Russia': ('RU', 'https://flagcdn.com/ru.svg', 'https://flagcdn.com/256x192/ru.png', 'Europe'), # Alias
    'San Marino': ('SM', 'https://flagcdn.com/sm.svg', 'https://flagcdn.com/256x192/sm.png', 'Europe'),
    'Serbia': ('RS', 'https://flagcdn.com/rs.svg', 'https://flagcdn.com/256x192/rs.png', 'Europe'),
    'Slovakia': ('SK', 'https://flagcdn.com/sk.svg', 'https://flagcdn.com/256x192/sk.png', 'Europe'),
    'Slovenia': ('SI', 'https://flagcdn.com/si.svg', 'https://flagcdn.com/256x192/si.png', 'Europe'),
    'Spain': ('ES', 'https://flagcdn.com/es.svg', 'https://flagcdn.com/256x192/es.png', 'Europe'),
    'Sweden': ('SE', 'https://flagcdn.com/se.svg', 'https://flagcdn.com/256x192/se.png', 'Europe'),
    'Switzerland': ('CH', 'https://flagcdn.com/ch.svg', 'https://flagcdn.com/256x192/ch.png', 'Europe'),
    'Ukraine': ('UA', 'https://flagcdn.com/ua.svg', 'https://flagcdn.com/256x192/ua.png', 'Europe'),
    'United Kingdom': ('GB', 'https://flagcdn.com/gb.svg', 'https://flagcdn.com/256x192/gb.png', 'Europe'),
    'Great Britain': ('GB', 'https://flagcdn.com/gb.svg', 'https://flagcdn.com/256x192/gb.png', 'Europe'),
    'England': ('GB-ENG', 'https://flagcdn.com/gb-eng.svg', 'https://flagcdn.com/256x192/gb-eng.png', 'Europe'),
    'Scotland': ('GB-SCT', 'https://flagcdn.com/gb-sct.svg', 'https://flagcdn.com/256x192/gb-sct.png', 'Europe'),
    'Wales': ('GB-WLS', 'https://flagcdn.com/gb-wls.svg', 'https://flagcdn.com/256x192/gb-wls.png', 'Europe'),
    'Northern Ireland': ('GB-NIR', 'https://flagcdn.com/gb-nir.svg', 'https://flagcdn.com/256x192/gb-nir.png', 'Europe'),
    'Turkey': ('TR', 'https://flagcdn.com/tr.svg', 'https://flagcdn.com/256x192/tr.png', 'Asia'), # Transcontinental
    'Türkiye': ('TR', 'https://flagcdn.com/tr.svg', 'https://flagcdn.com/256x192/tr.png', 'Asia'), # Alias
    'Australia': ('AU', 'https://flagcdn.com/au.svg', 'https://flagcdn.com/256x192/au.png', 'Oceania'),
    'New Zealand': ('NZ', 'https://flagcdn.com/nz.svg', 'https://flagcdn.com/256x192/nz.png', 'Oceania')
}

def get_db_connection():
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn
    except sqlite3.Error as e:
        print(f"Error connecting to database: {e}")
        return None

def get_or_create_country(cursor, country_name):
    # Check cache/db first
    cursor.execute("SELECT country_id FROM V2_countries WHERE country_name = ?", (country_name,))
    row = cursor.fetchone()
    if row:
        return row['country_id']
        
    # Not found, check our hardcoded map
    data = COUNTRY_DATA.get(country_name)
    if not data:
        # Try to find a match in the keys (aliases already handled in dict)
        return None
        
    code, flag, flag_small, continent = data
    
    print(f"  ✨ Creating country: {country_name}")
    try:
        # Check if country_code exists? 
        cursor.execute("SELECT country_id FROM V2_countries WHERE country_code = ?", (code,))
        existing_code = cursor.fetchone()
        if existing_code:
            # Code exists but name was different? 
            return existing_code['country_id']

        cursor.execute("""
            INSERT INTO V2_countries 
            (country_name, country_code, continent, flag_url, flag_small_url)
            VALUES (?, ?, ?, ?, ?)
        """, (country_name, code, continent, flag, flag_small))
        return cursor.lastrowid
    except sqlite3.Error as e:
        print(f"  ❌ Failed to create country {country_name}: {e}")
        return None

def merge_players():
    conn = get_db_connection()
    if not conn:
        return

    cursor = conn.cursor()

    # Get legacy players
    print("Fetching legacy players...")
    cursor.execute("SELECT first_name, last_name, nationality, photo_url FROM players")
    legacy_players = cursor.fetchall()
    
    msg_count = 0
    inserted_count = 0
    skipped_count = 0
    created_countries = 0
    
    print(f"Found {len(legacy_players)} players to process.")
    
    for p in legacy_players:
        first_name = p['first_name']
        last_name = p['last_name']
        nationality_raw = p['nationality']
        photo_url = p['photo_url']
        
        # Determine nationality ID (create if missing)
        country_id = get_or_create_country(cursor, nationality_raw)
        
        if not country_id:
            if msg_count < 20:
                print(f"⚠️  Skipping {first_name} {last_name}: Country '{nationality_raw}' not mapped.")
                msg_count += 1
            skipped_count += 1
            continue
            
        # Check for duplicates in V2_players
        cursor.execute("""
            SELECT player_id FROM V2_players 
            WHERE first_name = ? AND last_name = ?
        """, (first_name, last_name))
        
        if cursor.fetchone():
            skipped_count += 1
            continue
            
        # Insert
        try:
            cursor.execute("""
                INSERT INTO V2_players 
                (first_name, last_name, date_of_birth, nationality_id, photo_url, is_active)
                VALUES (?, ?, '1900-01-01', ?, ?, 1)
            """, (first_name, last_name, country_id, photo_url))
            inserted_count += 1
        except sqlite3.Error as e:
            print(f"❌ Error inserting {first_name} {last_name}: {e}")
            skipped_count += 1

    conn.commit()
    conn.close()
    
    print("\n" + "="*40)
    print(f"Merge Complete")
    print(f"Inserted: {inserted_count}")
    print(f"Skipped (dup/no-country): {skipped_count}")
    print("="*40)

if __name__ == "__main__":
    merge_players()
