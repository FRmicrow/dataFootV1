
import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '..', 'database.sqlite');

const countriesData = [
    { country: "Algeria", code: "DZ", flag: "https://flagcdn.com/dz.svg", flagSmall: "https://flagcdn.com/256x192/dz.png", continent: "Africa" },
    { country: "Angola", code: "AO", flag: "https://flagcdn.com/ao.svg", flagSmall: "https://flagcdn.com/256x192/ao.png", continent: "Africa" },
    { country: "Benin", code: "BJ", flag: "https://flagcdn.com/bj.svg", flagSmall: "https://flagcdn.com/256x192/bj.png", continent: "Africa" },
    { country: "Botswana", code: "BW", flag: "https://flagcdn.com/bw.svg", flagSmall: "https://flagcdn.com/256x192/bw.png", continent: "Africa" },
    { country: "Burkina Faso", code: "BF", flag: "https://flagcdn.com/bf.svg", flagSmall: "https://flagcdn.com/256x192/bf.png", continent: "Africa" },
    { country: "Burundi", code: "BI", flag: "https://flagcdn.com/bi.svg", flagSmall: "https://flagcdn.com/256x192/bi.png", continent: "Africa" },
    { country: "Cabo Verde", code: "CV", flag: "https://flagcdn.com/cv.svg", flagSmall: "https://flagcdn.com/256x192/cv.png", continent: "Africa" },
    { country: "Cameroon", code: "CM", flag: "https://flagcdn.com/cm.svg", flagSmall: "https://flagcdn.com/256x192/cm.png", continent: "Africa" },
    { country: "Central African Republic", code: "CF", flag: "https://flagcdn.com/cf.svg", flagSmall: "https://flagcdn.com/256x192/cf.png", continent: "Africa" },
    { country: "Chad", code: "TD", flag: "https://flagcdn.com/td.svg", flagSmall: "https://flagcdn.com/256x192/td.png", continent: "Africa" },
    { country: "Comoros", code: "KM", flag: "https://flagcdn.com/km.svg", flagSmall: "https://flagcdn.com/256x192/km.png", continent: "Africa" },
    { country: "Congo", code: "CG", flag: "https://flagcdn.com/cg.svg", flagSmall: "https://flagcdn.com/256x192/cg.png", continent: "Africa" },
    { country: "Congo, Democratic Republic of the", code: "CD", flag: "https://flagcdn.com/cd.svg", flagSmall: "https://flagcdn.com/256x192/cd.png", continent: "Africa" },
    { country: "Djibouti", code: "DJ", flag: "https://flagcdn.com/dj.svg", flagSmall: "https://flagcdn.com/256x192/dj.png", continent: "Africa" },
    { country: "Egypt", code: "EG", flag: "https://flagcdn.com/eg.svg", flagSmall: "https://flagcdn.com/256x192/eg.png", continent: "Africa" },
    { country: "Equatorial Guinea", code: "GQ", flag: "https://flagcdn.com/gq.svg", flagSmall: "https://flagcdn.com/256x192/gq.png", continent: "Africa" },
    { country: "Eritrea", code: "ER", flag: "https://flagcdn.com/er.svg", flagSmall: "https://flagcdn.com/256x192/er.png", continent: "Africa" },
    { country: "Eswatini", code: "SZ", flag: "https://flagcdn.com/sz.svg", flagSmall: "https://flagcdn.com/256x192/sz.png", continent: "Africa" },
    { country: "Ethiopia", code: "ET", flag: "https://flagcdn.com/et.svg", flagSmall: "https://flagcdn.com/256x192/et.png", continent: "Africa" },
    { country: "Gabon", code: "GA", flag: "https://flagcdn.com/ga.svg", flagSmall: "https://flagcdn.com/256x192/ga.png", continent: "Africa" },
    { country: "Gambia", code: "GM", flag: "https://flagcdn.com/gm.svg", flagSmall: "https://flagcdn.com/256x192/gm.png", continent: "Africa" },
    { country: "Ghana", code: "GH", flag: "https://flagcdn.com/gh.svg", flagSmall: "https://flagcdn.com/256x192/gh.png", continent: "Africa" },
    { country: "Guinea", code: "GN", flag: "https://flagcdn.com/gn.svg", flagSmall: "https://flagcdn.com/256x192/gn.png", continent: "Africa" },
    { country: "Guinea-Bissau", code: "GW", flag: "https://flagcdn.com/gw.svg", flagSmall: "https://flagcdn.com/256x192/gw.png", continent: "Africa" },
    { country: "Ivory Coast", code: "CI", flag: "https://flagcdn.com/ci.svg", flagSmall: "https://flagcdn.com/256x192/ci.png", continent: "Africa" },
    { country: "Kenya", code: "KE", flag: "https://flagcdn.com/ke.svg", flagSmall: "https://flagcdn.com/256x192/ke.png", continent: "Africa" },
    { country: "Lesotho", code: "LS", flag: "https://flagcdn.com/ls.svg", flagSmall: "https://flagcdn.com/256x192/ls.png", continent: "Africa" },
    { country: "Liberia", code: "LR", flag: "https://flagcdn.com/lr.svg", flagSmall: "https://flagcdn.com/256x192/lr.png", continent: "Africa" },
    { country: "Libya", code: "LY", flag: "https://flagcdn.com/ly.svg", flagSmall: "https://flagcdn.com/256x192/ly.png", continent: "Africa" },
    { country: "Madagascar", code: "MG", flag: "https://flagcdn.com/mg.svg", flagSmall: "https://flagcdn.com/256x192/mg.png", continent: "Africa" },
    { country: "Malawi", code: "MW", flag: "https://flagcdn.com/mw.svg", flagSmall: "https://flagcdn.com/256x192/mw.png", continent: "Africa" },
    { country: "Mali", code: "ML", flag: "https://flagcdn.com/ml.svg", flagSmall: "https://flagcdn.com/256x192/ml.png", continent: "Africa" },
    { country: "Mauritania", code: "MR", flag: "https://flagcdn.com/mr.svg", flagSmall: "https://flagcdn.com/256x192/mr.png", continent: "Africa" },
    { country: "Mauritius", code: "MU", flag: "https://flagcdn.com/mu.svg", flagSmall: "https://flagcdn.com/256x192/mu.png", continent: "Africa" },
    { country: "Mayotte", code: "YT", flag: "https://flagcdn.com/yt.svg", flagSmall: "https://flagcdn.com/256x192/yt.png", continent: "Africa" },
    { country: "Morocco", code: "MA", flag: "https://flagcdn.com/ma.svg", flagSmall: "https://flagcdn.com/256x192/ma.png", continent: "Africa" },
    { country: "Mozambique", code: "MZ", flag: "https://flagcdn.com/mz.svg", flagSmall: "https://flagcdn.com/256x192/mz.png", continent: "Africa" },
    { country: "Namibia", code: "NA", flag: "https://flagcdn.com/na.svg", flagSmall: "https://flagcdn.com/256x192/na.png", continent: "Africa" },
    { country: "Niger", code: "NE", flag: "https://flagcdn.com/ne.svg", flagSmall: "https://flagcdn.com/256x192/ne.png", continent: "Africa" },
    { country: "Nigeria", code: "NG", flag: "https://flagcdn.com/ng.svg", flagSmall: "https://flagcdn.com/256x192/ng.png", continent: "Africa" },
    { country: "Réunion", code: "RE", flag: "https://flagcdn.com/re.svg", flagSmall: "https://flagcdn.com/256x192/re.png", continent: "Africa" },
    { country: "Rwanda", code: "RW", flag: "https://flagcdn.com/rw.svg", flagSmall: "https://flagcdn.com/256x192/rw.png", continent: "Africa" },
    { country: "Saint Helena", code: "SH", flag: "https://flagcdn.com/sh.svg", flagSmall: "https://flagcdn.com/256x192/sh.png", continent: "Africa" },
    { country: "Saint Kitts and Nevis", code: "KN", flag: "https://flagcdn.com/kn.svg", flagSmall: "https://flagcdn.com/256x192/kn.png", continent: "Africa" },
    { country: "Saint Lucia", code: "LC", flag: "https://flagcdn.com/lc.svg", flagSmall: "https://flagcdn.com/256x192/lc.png", continent: "Africa" },
    { country: "Saint Pierre and Miquelon", code: "PM", flag: "https://flagcdn.com/pm.svg", flagSmall: "https://flagcdn.com/256x192/pm.png", continent: "Africa" },
    { country: "Saint Vincent and the Grenadines", code: "VC", flag: "https://flagcdn.com/vc.svg", flagSmall: "https://flagcdn.com/256x192/vc.png", continent: "Africa" },
    { country: "Samoa", code: "WS", flag: "https://flagcdn.com/ws.svg", flagSmall: "https://flagcdn.com/256x192/ws.png", continent: "Africa" },
    { country: "São Tomé and Príncipe", code: "ST", flag: "https://flagcdn.com/st.svg", flagSmall: "https://flagcdn.com/256x192/st.png", continent: "Africa" },
    { country: "Senegal", code: "SN", flag: "https://flagcdn.com/sn.svg", flagSmall: "https://flagcdn.com/256x192/sn.png", continent: "Africa" },
    { country: "Seychelles", code: "SC", flag: "https://flagcdn.com/sc.svg", flagSmall: "https://flagcdn.com/256x192/sc.png", continent: "Africa" },
    { country: "Sierra Leone", code: "SL", flag: "https://flagcdn.com/sl.svg", flagSmall: "https://flagcdn.com/256x192/sl.png", continent: "Africa" },
    { country: "Somalia", code: "SO", flag: "https://flagcdn.com/so.svg", flagSmall: "https://flagcdn.com/256x192/so.png", continent: "Africa" },
    { country: "South Africa", code: "ZA", flag: "https://flagcdn.com/za.svg", flagSmall: "https://flagcdn.com/256x192/za.png", continent: "Africa" },
    { country: "South Sudan", code: "SS", flag: "https://flagcdn.com/ss.svg", flagSmall: "https://flagcdn.com/256x192/ss.png", continent: "Africa" },
    { country: "Sudan", code: "SD", flag: "https://flagcdn.com/sd.svg", flagSmall: "https://flagcdn.com/256x192/sd.png", continent: "Africa" },
    { country: "Tanzania, United Republic of", code: "TZ", flag: "https://flagcdn.com/tz.svg", flagSmall: "https://flagcdn.com/256x192/tz.png", continent: "Africa" },
    { country: "Togo", code: "TG", flag: "https://flagcdn.com/tg.svg", flagSmall: "https://flagcdn.com/256x192/tg.png", continent: "Africa" },
    { country: "Tunisia", code: "TN", flag: "https://flagcdn.com/tn.svg", flagSmall: "https://flagcdn.com/256x192/tn.png", continent: "Africa" },
    { country: "Uganda", code: "UG", flag: "https://flagcdn.com/ug.svg", flagSmall: "https://flagcdn.com/256x192/ug.png", continent: "Africa" },
    { country: "Western Sahara", code: "EH", flag: "https://flagcdn.com/eh.svg", flagSmall: "https://flagcdn.com/256x192/eh.png", continent: "Africa" },
    { country: "Zambia", code: "ZM", flag: "https://flagcdn.com/zm.svg", flagSmall: "https://flagcdn.com/256x192/zm.png", continent: "Africa" },
    { country: "Zimbabwe", code: "ZW", flag: "https://flagcdn.com/zw.svg", flagSmall: "https://flagcdn.com/256x192/zw.png", continent: "Africa" },
    { country: "Antigua and Barbuda", code: "AG", flag: "https://flagcdn.com/ag.svg", flagSmall: "https://flagcdn.com/256x192/ag.png", continent: "Americas" },
    { country: "Argentina", code: "AR", flag: "https://flagcdn.com/ar.svg", flagSmall: "https://flagcdn.com/256x192/ar.png", continent: "Americas" },
    { country: "Bahamas", code: "BS", flag: "https://flagcdn.com/bs.svg", flagSmall: "https://flagcdn.com/256x192/bs.png", continent: "Americas" },
    { country: "Barbados", code: "BB", flag: "https://flagcdn.com/bb.svg", flagSmall: "https://flagcdn.com/256x192/bb.png", continent: "Americas" },
    { country: "Belize", code: "BZ", flag: "https://flagcdn.com/bz.svg", flagSmall: "https://flagcdn.com/256x192/bz.png", continent: "Americas" },
    { country: "Bolivia", code: "BO", flag: "https://flagcdn.com/bo.svg", flagSmall: "https://flagcdn.com/256x192/bo.png", continent: "Americas" },
    { country: "Brazil", code: "BR", flag: "https://flagcdn.com/br.svg", flagSmall: "https://flagcdn.com/256x192/br.png", continent: "Americas" },
    { country: "Canada", code: "CA", flag: "https://flagcdn.com/ca.svg", flagSmall: "https://flagcdn.com/256x192/ca.png", continent: "Americas" },
    { country: "Chile", code: "CL", flag: "https://flagcdn.com/cl.svg", flagSmall: "https://flagcdn.com/256x192/cl.png", continent: "Americas" },
    { country: "Colombia", code: "CO", flag: "https://flagcdn.com/co.svg", flagSmall: "https://flagcdn.com/256x192/co.png", continent: "Americas" },
    { country: "Costa Rica", code: "CR", flag: "https://flagcdn.com/cr.svg", flagSmall: "https://flagcdn.com/256x192/cr.png", continent: "Americas" },
    { country: "Cuba", code: "CU", flag: "https://flagcdn.com/cu.svg", flagSmall: "https://flagcdn.com/256x192/cu.png", continent: "Americas" },
    { country: "Dominica", code: "DM", flag: "https://flagcdn.com/dm.svg", flagSmall: "https://flagcdn.com/256x192/dm.png", continent: "Americas" },
    { country: "Dominican Republic", code: "DO", flag: "https://flagcdn.com/do.svg", flagSmall: "https://flagcdn.com/256x192/do.png", continent: "Americas" },
    { country: "Ecuador", code: "EC", flag: "https://flagcdn.com/ec.svg", flagSmall: "https://flagcdn.com/256x192/ec.png", continent: "Americas" },
    { country: "El Salvador", code: "SV", flag: "https://flagcdn.com/sv.svg", flagSmall: "https://flagcdn.com/256x192/sv.png", continent: "Americas" },
    { country: "Grenada", code: "GD", flag: "https://flagcdn.com/gd.svg", flagSmall: "https://flagcdn.com/256x192/gd.png", continent: "Americas" },
    { country: "Guatemala", code: "GT", flag: "https://flagcdn.com/gt.svg", flagSmall: "https://flagcdn.com/256x192/gt.png", continent: "Americas" },
    { country: "Guyana", code: "GY", flag: "https://flagcdn.com/gy.svg", flagSmall: "https://flagcdn.com/256x192/gy.png", continent: "Americas" },
    { country: "Haiti", code: "HT", flag: "https://flagcdn.com/ht.svg", flagSmall: "https://flagcdn.com/256x192/ht.png", continent: "Americas" },
    { country: "Honduras", code: "HN", flag: "https://flagcdn.com/hn.svg", flagSmall: "https://flagcdn.com/256x192/hn.png", continent: "Americas" },
    { country: "Jamaica", code: "JM", flag: "https://flagcdn.com/jm.svg", flagSmall: "https://flagcdn.com/256x192/jm.png", continent: "Americas" },
    { country: "Mexico", code: "MX", flag: "https://flagcdn.com/mx.svg", flagSmall: "https://flagcdn.com/256x192/mx.png", continent: "Americas" },
    { country: "Nicaragua", code: "NI", flag: "https://flagcdn.com/ni.svg", flagSmall: "https://flagcdn.com/256x192/ni.png", continent: "Americas" },
    { country: "Panama", code: "PA", flag: "https://flagcdn.com/pa.svg", flagSmall: "https://flagcdn.com/256x192/pa.png", continent: "Americas" },
    { country: "Paraguay", code: "PY", flag: "https://flagcdn.com/py.svg", flagSmall: "https://flagcdn.com/256x192/py.png", continent: "Americas" },
    { country: "Peru", code: "PE", flag: "https://flagcdn.com/pe.svg", flagSmall: "https://flagcdn.com/256x192/pe.png", continent: "Americas" },
    { country: "Saint Kitts and Nevis", code: "KN", flag: "https://flagcdn.com/kn.svg", flagSmall: "https://flagcdn.com/256x192/kn.png", continent: "Americas" },
    { country: "Saint Lucia", code: "LC", flag: "https://flagcdn.com/lc.svg", flagSmall: "https://flagcdn.com/256x192/lc.png", continent: "Americas" },
    { country: "Saint Vincent and the Grenadines", code: "VC", flag: "https://flagcdn.com/vc.svg", flagSmall: "https://flagcdn.com/256x192/vc.png", continent: "Americas" },
    { country: "Suriname", code: "SR", flag: "https://flagcdn.com/sr.svg", flagSmall: "https://flagcdn.com/256x192/sr.png", continent: "Americas" },
    { country: "Trinidad and Tobago", code: "TT", flag: "https://flagcdn.com/tt.svg", flagSmall: "https://flagcdn.com/256x192/tt.png", continent: "Americas" },
    { country: "United States of America", code: "US", flag: "https://flagcdn.com/us.svg", flagSmall: "https://flagcdn.com/256x192/us.png", continent: "Americas" },
    { country: "Uruguay", code: "UY", flag: "https://flagcdn.com/uy.svg", flagSmall: "https://flagcdn.com/256x192/uy.png", continent: "Americas" },
    { country: "Venezuela", code: "VE", flag: "https://flagcdn.com/ve.svg", flagSmall: "https://flagcdn.com/256x192/ve.png", continent: "Americas" },
    { country: "Afghanistan", code: "AF", flag: "https://flagcdn.com/af.svg", flagSmall: "https://flagcdn.com/256x192/af.png", continent: "Asia" },
    { country: "Armenia", code: "AM", flag: "https://flagcdn.com/am.svg", flagSmall: "https://flagcdn.com/256x192/am.png", continent: "Asia" },
    { country: "Azerbaijan", code: "AZ", flag: "https://flagcdn.com/az.svg", flagSmall: "https://flagcdn.com/256x192/az.png", continent: "Asia" },
    { country: "Bahrain", code: "BH", flag: "https://flagcdn.com/bh.svg", flagSmall: "https://flagcdn.com/256x192/bh.png", continent: "Asia" },
    { country: "Bangladesh", code: "BD", flag: "https://flagcdn.com/bd.svg", flagSmall: "https://flagcdn.com/256x192/bd.png", continent: "Asia" },
    { country: "Bhutan", code: "BT", flag: "https://flagcdn.com/bt.svg", flagSmall: "https://flagcdn.com/256x192/bt.png", continent: "Asia" },
    { country: "Brunei Darussalam", code: "BN", flag: "https://flagcdn.com/bn.svg", flagSmall: "https://flagcdn.com/256x192/bn.png", continent: "Asia" },
    { country: "Cambodia", code: "KH", flag: "https://flagcdn.com/kh.svg", flagSmall: "https://flagcdn.com/256x192/kh.png", continent: "Asia" },
    { country: "China", code: "CN", flag: "https://flagcdn.com/cn.svg", flagSmall: "https://flagcdn.com/256x192/cn.png", continent: "Asia" },
    { country: "Georgia", code: "GE", flag: "https://flagcdn.com/ge.svg", flagSmall: "https://flagcdn.com/256x192/ge.png", continent: "Asia" },
    { country: "India", code: "IN", flag: "https://flagcdn.com/in.svg", flagSmall: "https://flagcdn.com/256x192/in.png", continent: "Asia" },
    { country: "Indonesia", code: "ID", flag: "https://flagcdn.com/id.svg", flagSmall: "https://flagcdn.com/256x192/id.png", continent: "Asia" },
    { country: "Iran (Islamic Republic of)", code: "IR", flag: "https://flagcdn.com/ir.svg", flagSmall: "https://flagcdn.com/256x192/ir.png", continent: "Asia" },
    { country: "Iraq", code: "IQ", flag: "https://flagcdn.com/iq.svg", flagSmall: "https://flagcdn.com/256x192/iq.png", continent: "Asia" },
    { country: "Israel", code: "IL", flag: "https://flagcdn.com/il.svg", flagSmall: "https://flagcdn.com/256x192/il.png", continent: "Asia" },
    { country: "Japan", code: "JP", flag: "https://flagcdn.com/jp.svg", flagSmall: "https://flagcdn.com/256x192/jp.png", continent: "Asia" },
    { country: "Jordan", code: "JO", flag: "https://flagcdn.com/jo.svg", flagSmall: "https://flagcdn.com/256x192/jo.png", continent: "Asia" },
    { country: "Kazakhstan", code: "KZ", flag: "https://flagcdn.com/kz.svg", flagSmall: "https://flagcdn.com/256x192/kz.png", continent: "Asia" },
    { country: "Kuwait", code: "KW", flag: "https://flagcdn.com/kw.svg", flagSmall: "https://flagcdn.com/256x192/kw.png", continent: "Asia" },
    { country: "Kyrgyzstan", code: "KG", flag: "https://flagcdn.com/kg.svg", flagSmall: "https://flagcdn.com/256x192/kg.png", continent: "Asia" },
    { country: "Lao People's Democratic Republic", code: "LA", flag: "https://flagcdn.com/la.svg", flagSmall: "https://flagcdn.com/256x192/la.png", continent: "Asia" },
    { country: "Lebanon", code: "LB", flag: "https://flagcdn.com/lb.svg", flagSmall: "https://flagcdn.com/256x192/lb.png", continent: "Asia" },
    { country: "Malaysia", code: "MY", flag: "https://flagcdn.com/my.svg", flagSmall: "https://flagcdn.com/256x192/my.png", continent: "Asia" },
    { country: "Maldives", code: "MV", flag: "https://flagcdn.com/mv.svg", flagSmall: "https://flagcdn.com/256x192/mv.png", continent: "Asia" },
    { country: "Mongolia", code: "MN", flag: "https://flagcdn.com/mn.svg", flagSmall: "https://flagcdn.com/256x192/mn.png", continent: "Asia" },
    { country: "Myanmar", code: "MM", flag: "https://flagcdn.com/mm.svg", flagSmall: "https://flagcdn.com/256x192/mm.png", continent: "Asia" },
    { country: "Nepal", code: "NP", flag: "https://flagcdn.com/np.svg", flagSmall: "https://flagcdn.com/256x192/np.png", continent: "Asia" },
    { country: "North Korea", code: "KP", flag: "https://flagcdn.com/kp.svg", flagSmall: "https://flagcdn.com/256x192/kp.png", continent: "Asia" },
    { country: "Oman", code: "OM", flag: "https://flagcdn.com/om.svg", flagSmall: "https://flagcdn.com/256x192/om.png", continent: "Asia" },
    { country: "Pakistan", code: "PK", flag: "https://flagcdn.com/pk.svg", flagSmall: "https://flagcdn.com/256x192/pk.png", continent: "Asia" },
    { country: "Palestine", code: "PS", flag: "https://flagcdn.com/ps.svg", flagSmall: "https://flagcdn.com/256x192/ps.png", continent: "Asia" },
    { country: "Philippines", code: "PH", flag: "https://flagcdn.com/ph.svg", flagSmall: "https://flagcdn.com/256x192/ph.png", continent: "Asia" },
    { country: "Qatar", code: "QA", flag: "https://flagcdn.com/qa.svg", flagSmall: "https://flagcdn.com/256x192/qa.png", continent: "Asia" },
    { country: "Saudi Arabia", code: "SA", flag: "https://flagcdn.com/sa.svg", flagSmall: "https://flagcdn.com/256x192/sa.png", continent: "Asia" },
    { country: "Singapore", code: "SG", flag: "https://flagcdn.com/sg.svg", flagSmall: "https://flagcdn.com/256x192/sg.png", continent: "Asia" },
    { country: "South Korea", code: "KR", flag: "https://flagcdn.com/kr.svg", flagSmall: "https://flagcdn.com/256x192/kr.png", continent: "Asia" },
    { country: "Sri Lanka", code: "LK", flag: "https://flagcdn.com/lk.svg", flagSmall: "https://flagcdn.com/256x192/lk.png", continent: "Asia" },
    { country: "Syrian Arab Republic", code: "SY", flag: "https://flagcdn.com/sy.svg", flagSmall: "https://flagcdn.com/256x192/sy.png", continent: "Asia" },
    { country: "Taiwan", code: "TW", flag: "https://flagcdn.com/tw.svg", flagSmall: "https://flagcdn.com/256x192/tw.png", continent: "Asia" },
    { country: "Tajikistan", code: "TJ", flag: "https://flagcdn.com/tj.svg", flagSmall: "https://flagcdn.com/256x192/tj.png", continent: "Asia" },
    { country: "Thailand", code: "TH", flag: "https://flagcdn.com/th.svg", flagSmall: "https://flagcdn.com/256x192/th.png", continent: "Asia" },
    { country: "Timor-Leste", code: "TL", flag: "https://flagcdn.com/tl.svg", flagSmall: "https://flagcdn.com/256x192/tl.png", continent: "Asia" },
    { country: "Turkmenistan", code: "TM", flag: "https://flagcdn.com/tm.svg", flagSmall: "https://flagcdn.com/256x192/tm.png", continent: "Asia" },
    { country: "United Arab Emirates", code: "AE", flag: "https://flagcdn.com/ae.svg", flagSmall: "https://flagcdn.com/256x192/ae.png", continent: "Asia" },
    { country: "Uzbekistan", code: "UZ", flag: "https://flagcdn.com/uz.svg", flagSmall: "https://flagcdn.com/256x192/uz.png", continent: "Asia" },
    { country: "Vietnam", code: "VN", flag: "https://flagcdn.com/vn.svg", flagSmall: "https://flagcdn.com/256x192/vn.png", continent: "Asia" },
    { country: "Yemen", code: "YE", flag: "https://flagcdn.com/ye.svg", flagSmall: "https://flagcdn.com/256x192/ye.png", continent: "Asia" },
    { country: "Albania", code: "AL", flag: "https://flagcdn.com/al.svg", flagSmall: "https://flagcdn.com/256x192/al.png", continent: "Europe" },
    { country: "Andorra", code: "AD", flag: "https://flagcdn.com/ad.svg", flagSmall: "https://flagcdn.com/256x192/ad.png", continent: "Europe" },
    { country: "Austria", code: "AT", flag: "https://flagcdn.com/at.svg", flagSmall: "https://flagcdn.com/256x192/at.png", continent: "Europe" },
    { country: "Belarus", code: "BY", flag: "https://flagcdn.com/by.svg", flagSmall: "https://flagcdn.com/256x192/by.png", continent: "Europe" },
    { country: "Belgium", code: "BE", flag: "https://flagcdn.com/be.svg", flagSmall: "https://flagcdn.com/256x192/be.png", continent: "Europe" },
    { country: "Bosnia and Herzegovina", code: "BA", flag: "https://flagcdn.com/ba.svg", flagSmall: "https://flagcdn.com/256x192/ba.png", continent: "Europe" },
    { country: "Bulgaria", code: "BG", flag: "https://flagcdn.com/bg.svg", flagSmall: "https://flagcdn.com/256x192/bg.png", continent: "Europe" },
    { country: "Croatia", code: "HR", flag: "https://flagcdn.com/hr.svg", flagSmall: "https://flagcdn.com/256x192/hr.png", continent: "Europe" },
    { country: "Cyprus", code: "CY", flag: "https://flagcdn.com/cy.svg", flagSmall: "https://flagcdn.com/256x192/cy.png", continent: "Europe" },
    { country: "Czech Republic", code: "CZ", flag: "https://flagcdn.com/cz.svg", flagSmall: "https://flagcdn.com/256x192/cz.png", continent: "Europe" },
    { country: "Denmark", code: "DK", flag: "https://flagcdn.com/dk.svg", flagSmall: "https://flagcdn.com/256x192/dk.png", continent: "Europe" },
    { country: "Estonia", code: "EE", flag: "https://flagcdn.com/ee.svg", flagSmall: "https://flagcdn.com/256x192/ee.png", continent: "Europe" },
    { country: "Faroe Islands", code: "FO", flag: "https://flagcdn.com/fo.svg", flagSmall: "https://flagcdn.com/256x192/fo.png", continent: "Europe" },
    { country: "Finland", code: "FI", flag: "https://flagcdn.com/fi.svg", flagSmall: "https://flagcdn.com/256x192/fi.png", continent: "Europe" },
    { country: "France", code: "FR", flag: "https://flagcdn.com/fr.svg", flagSmall: "https://flagcdn.com/256x192/fr.png", continent: "Europe" },
    { country: "Germany", code: "DE", flag: "https://flagcdn.com/de.svg", flagSmall: "https://flagcdn.com/256x192/de.png", continent: "Europe" },
    { country: "Gibraltar", code: "GI", flag: "https://flagcdn.com/gi.svg", flagSmall: "https://flagcdn.com/256x192/gi.png", continent: "Europe" },
    { country: "Greece", code: "GR", flag: "https://flagcdn.com/gr.svg", flagSmall: "https://flagcdn.com/256x192/gr.png", continent: "Europe" },
    { country: "Greenland", code: "GL", flag: "https://flagcdn.com/gl.svg", flagSmall: "https://flagcdn.com/256x192/gl.png", continent: "Europe" },
    { country: "Guernsey", code: "GG", flag: "https://flagcdn.com/gg.svg", flagSmall: "https://flagcdn.com/256x192/gg.png", continent: "Europe" },
    { country: "Hungary", code: "HU", flag: "https://flagcdn.com/hu.svg", flagSmall: "https://flagcdn.com/256x192/hu.png", continent: "Europe" },
    { country: "Iceland", code: "IS", flag: "https://flagcdn.com/is.svg", flagSmall: "https://flagcdn.com/256x192/is.png", continent: "Europe" },
    { country: "Ireland", code: "IE", flag: "https://flagcdn.com/ie.svg", flagSmall: "https://flagcdn.com/256x192/ie.png", continent: "Europe" },
    { country: "Isle of Man", code: "IM", flag: "https://flagcdn.com/im.svg", flagSmall: "https://flagcdn.com/256x192/im.png", continent: "Europe" },
    { country: "Italy", code: "IT", flag: "https://flagcdn.com/it.svg", flagSmall: "https://flagcdn.com/256x192/it.png", continent: "Europe" },
    { country: "Jersey", code: "JE", flag: "https://flagcdn.com/je.svg", flagSmall: "https://flagcdn.com/256x192/je.png", continent: "Europe" },
    { country: "Kosovo", code: "XK", flag: "https://flagcdn.com/xk.svg", flagSmall: "https://flagcdn.com/256x192/xk.png", continent: "Europe" },
    { country: "Latvia", code: "LV", flag: "https://flagcdn.com/lv.svg", flagSmall: "https://flagcdn.com/256x192/lv.png", continent: "Europe" },
    { country: "Liechtenstein", code: "LI", flag: "https://flagcdn.com/li.svg", flagSmall: "https://flagcdn.com/256x192/li.png", continent: "Europe" },
    { country: "Lithuania", code: "LT", flag: "https://flagcdn.com/lt.svg", flagSmall: "https://flagcdn.com/256x192/lt.png", continent: "Europe" },
    { country: "Luxembourg", code: "LU", flag: "https://flagcdn.com/lu.svg", flagSmall: "https://flagcdn.com/256x192/lu.png", continent: "Europe" },
    { country: "Malta", code: "MT", flag: "https://flagcdn.com/mt.svg", flagSmall: "https://flagcdn.com/256x192/mt.png", continent: "Europe" },
    { country: "Moldova, Republic of", code: "MD", flag: "https://flagcdn.com/md.svg", flagSmall: "https://flagcdn.com/256x192/md.png", continent: "Europe" },
    { country: "Monaco", code: "MC", flag: "https://flagcdn.com/mc.svg", flagSmall: "https://flagcdn.com/256x192/mc.png", continent: "Europe" },
    { country: "Montenegro", code: "ME", flag: "https://flagcdn.com/me.svg", flagSmall: "https://flagcdn.com/256x192/me.png", continent: "Europe" },
    { country: "Netherlands", code: "NL", flag: "https://flagcdn.com/nl.svg", flagSmall: "https://flagcdn.com/256x192/nl.png", continent: "Europe" },
    { country: "North Macedonia", code: "MK", flag: "https://flagcdn.com/mk.svg", flagSmall: "https://flagcdn.com/256x192/mk.png", continent: "Europe" },
    { country: "Norway", code: "NO", flag: "https://flagcdn.com/no.svg", flagSmall: "https://flagcdn.com/256x192/no.png", continent: "Europe" },
    { country: "Poland", code: "PL", flag: "https://flagcdn.com/pl.svg", flagSmall: "https://flagcdn.com/256x192/pl.png", continent: "Europe" },
    { country: "Portugal", code: "PT", flag: "https://flagcdn.com/pt.svg", flagSmall: "https://flagcdn.com/256x192/pt.png", continent: "Europe" },
    { country: "Romania", code: "RO", flag: "https://flagcdn.com/ro.svg", flagSmall: "https://flagcdn.com/256x192/ro.png", continent: "Europe" },
    { country: "Russian Federation", code: "RU", flag: "https://flagcdn.com/ru.svg", flagSmall: "https://flagcdn.com/256x192/ru.png", continent: "Europe" },
    { country: "San Marino", code: "SM", flag: "https://flagcdn.com/sm.svg", flagSmall: "https://flagcdn.com/256x192/sm.png", continent: "Europe" },
    { country: "Serbia", code: "RS", flag: "https://flagcdn.com/rs.svg", flagSmall: "https://flagcdn.com/256x192/rs.png", continent: "Europe" },
    { country: "Slovakia", code: "SK", flag: "https://flagcdn.com/sk.svg", flagSmall: "https://flagcdn.com/256x192/sk.png", continent: "Europe" },
    { country: "Slovenia", code: "SI", flag: "https://flagcdn.com/si.svg", flagSmall: "https://flagcdn.com/256x192/si.png", continent: "Europe" },
    { country: "Spain", code: "ES", flag: "https://flagcdn.com/es.svg", flagSmall: "https://flagcdn.com/256x192/es.png", continent: "Europe" },
    { country: "Svalbard and Jan Mayen", code: "SJ", flag: "https://flagcdn.com/sj.svg", flagSmall: "https://flagcdn.com/256x192/sj.png", continent: "Europe" },
    { country: "Sweden", code: "SE", flag: "https://flagcdn.com/se.svg", flagSmall: "https://flagcdn.com/256x192/se.png", continent: "Europe" },
    { country: "Switzerland", code: "CH", flag: "https://flagcdn.com/ch.svg", flagSmall: "https://flagcdn.com/256x192/ch.png", continent: "Europe" },
    { country: "Ukraine", code: "UA", flag: "https://flagcdn.com/ua.svg", flagSmall: "https://flagcdn.com/256x192/ua.png", continent: "Europe" },
    { country: "United Kingdom of Great Britain and Northern Ireland", code: "GB", flag: "https://flagcdn.com/gb.svg", flagSmall: "https://flagcdn.com/256x192/gb.png", continent: "Europe" },
    { country: "Vatican City", code: "VA", flag: "https://flagcdn.com/va.svg", flagSmall: "https://flagcdn.com/256x192/va.png", continent: "Europe" },
    { country: "Australia", code: "AU", flag: "https://flagcdn.com/au.svg", flagSmall: "https://flagcdn.com/256x192/au.png", continent: "Oceania" },
    { country: "Fiji", code: "FJ", flag: "https://flagcdn.com/fj.svg", flagSmall: "https://flagcdn.com/256x192/fj.png", continent: "Oceania" },
    { country: "Kiribati", code: "KI", flag: "https://flagcdn.com/ki.svg", flagSmall: "https://flagcdn.com/256x192/ki.png", continent: "Oceania" },
    { country: "Marshall Islands", code: "MH", flag: "https://flagcdn.com/mh.svg", flagSmall: "https://flagcdn.com/256x192/mh.png", continent: "Oceania" },
    { country: "Micronesia (Federated States of)", code: "FM", flag: "https://flagcdn.com/fm.svg", flagSmall: "https://flagcdn.com/256x192/fm.png", continent: "Oceania" },
    { country: "Nauru", code: "NR", flag: "https://flagcdn.com/nr.svg", flagSmall: "https://flagcdn.com/256x192/nr.png", continent: "Oceania" },
    { country: "New Zealand", code: "NZ", flag: "https://flagcdn.com/nz.svg", flagSmall: "https://flagcdn.com/256x192/nz.png", continent: "Oceania" },
    { country: "Palau", code: "PW", flag: "https://flagcdn.com/pw.svg", flagSmall: "https://flagcdn.com/256x192/pw.png", continent: "Oceania" },
    { country: "Papua New Guinea", code: "PG", flag: "https://flagcdn.com/pg.svg", flagSmall: "https://flagcdn.com/256x192/pg.png", continent: "Oceania" },
    { country: "Samoa", code: "WS", flag: "https://flagcdn.com/ws.svg", flagSmall: "https://flagcdn.com/256x192/ws.png", continent: "Oceania" },
    { country: "Solomon Islands", code: "SB", flag: "https://flagcdn.com/sb.svg", flagSmall: "https://flagcdn.com/256x192/sb.png", continent: "Oceania" },
    { country: "Tonga", code: "TO", flag: "https://flagcdn.com/to.svg", flagSmall: "https://flagcdn.com/256x192/to.png", continent: "Oceania" },
    { country: "Tuvalu", code: "TV", flag: "https://flagcdn.com/tv.svg", flagSmall: "https://flagcdn.com/256x192/tv.png", continent: "Oceania" },
    { country: "Vanuatu", code: "VU", flag: "https://flagcdn.com/vu.svg", flagSmall: "https://flagcdn.com/256x192/vu.png", continent: "Oceania" }
];

async function updateV2Countries() {
    const SQL = await initSqlJs();
    const buffer = readFileSync(dbPath);
    const db = new SQL.Database(buffer);

    try {
        db.exec("BEGIN TRANSACTION");

        // 1. Add Columns if they don't exist
        // Note: SQLite doesn't support IF NOT EXISTS for ADD COLUMN nicely in one statement across versions,
        // but we can check PRAGMA table_info or just try and catch.
        // We will try adding them.

        try { db.exec("ALTER TABLE V2_countries ADD COLUMN flag_url TEXT;"); } catch (e) { }
        try { db.exec("ALTER TABLE V2_countries ADD COLUMN flag_small_url TEXT;"); } catch (e) { }
        try { db.exec("ALTER TABLE V2_countries ADD COLUMN continent TEXT;"); } catch (e) { }

        console.log("✅ Schema updated (tables altered).");

        // 2. Insert Data
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO V2_countries (country_name, country_code, flag_url, flag_small_url, continent) 
            VALUES (?, ?, ?, ?, ?)
        `);

        for (const c of countriesData) {
            stmt.run([c.country, c.code, c.flag, c.flagSmall, c.continent]);
        }
        stmt.free();

        console.log(`✅ Inserted/Updated ${countriesData.length} countries.`);

        db.exec("COMMIT");
        const data = db.export();
        writeFileSync(dbPath, data);

    } catch (err) {
        console.error("❌ Fatal Error:", err);
        db.exec("ROLLBACK");
    } finally {
        db.close();
    }
}

updateV2Countries();
