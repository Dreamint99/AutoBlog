/**
 * Visa data hub loader — refreshes D1 visa_matrix from passport-index-data.
 * Source: https://github.com/imorte/passport-index-data (MIT License)
 * Data is refreshed weekly; never overwrites good data with a failed fetch.
 */

const DATA_URL = "https://raw.githubusercontent.com/imorte/passport-index-data/main/passport-index.json";
const DATA_DATE = "2026-02-17"; // Last known update date from README
const SOURCE = "https://github.com/imorte/passport-index-data";

// Requirement mapping from source values to our normalized values
const REQ_MAP = {
  "visa free": "visa_free",
  "visa on arrival": "visa_on_arrival",
  "eta": "eta",
  "e-visa": "e_visa",
  "visa required": "visa_required",
  "no admission": "no_admission",
};

// ISO-2 to country name mapping (from the dataset)
const COUNTRIES = {
  AD: "Andorra", AE: "United Arab Emirates", AF: "Afghanistan", AG: "Antigua and Barbuda",
  AL: "Albania", AM: "Armenia", AO: "Angola", AR: "Argentina", AT: "Austria", AU: "Australia",
  AZ: "Azerbaijan", BA: "Bosnia and Herzegovina", BB: "Barbados", BD: "Bangladesh", BE: "Belgium",
  BF: "Burkina Faso", BG: "Bulgaria", BH: "Bahrain", BI: "Burundi", BJ: "Benin", BN: "Brunei",
  BO: "Bolivia", BR: "Brazil", BS: "Bahamas", BT: "Bhutan", BW: "Botswana", BY: "Belarus",
  BZ: "Belize", CA: "Canada", CD: "DR Congo", CF: "Central African Republic", CG: "Republic of the Congo",
  CH: "Switzerland", CI: "Ivory Coast", CL: "Chile", CM: "Cameroon", CN: "China", CO: "Colombia",
  CR: "Costa Rica", CU: "Cuba", CV: "Cape Verde", CY: "Cyprus", CZ: "Czech Republic", DE: "Germany",
  DJ: "Djibouti", DK: "Denmark", DM: "Dominica", DO: "Dominican Republic", DZ: "Algeria",
  EC: "Ecuador", EE: "Estonia", EG: "Egypt", ER: "Eritrea", ES: "Spain", ET: "Ethiopia",
  FI: "Finland", FJ: "Fiji", FM: "Micronesia", FR: "France", GA: "Gabon", GB: "United Kingdom",
  GD: "Grenada", GE: "Georgia", GH: "Ghana", GM: "Gambia", GN: "Guinea", GQ: "Equatorial Guinea",
  GR: "Greece", GT: "Guatemala", GW: "Guinea-Bissau", GY: "Guyana", HK: "Hong Kong",
  HN: "Honduras", HR: "Croatia", HT: "Haiti", HU: "Hungary", ID: "Indonesia", IE: "Ireland",
  IL: "Israel", IN: "India", IQ: "Iraq", IR: "Iran", IS: "Iceland", IT: "Italy", JM: "Jamaica",
  JO: "Jordan", JP: "Japan", KE: "Kenya", KG: "Kyrgyzstan", KH: "Cambodia", KI: "Kiribati",
  KM: "Comoros", KN: "St. Kitts and Nevis", KP: "North Korea", KR: "South Korea", KW: "Kuwait",
  KZ: "Kazakhstan", LA: "Laos", LB: "Lebanon", LC: "St. Lucia", LI: "Liechtenstein",
  LK: "Sri Lanka", LR: "Liberia", LS: "Lesotho", LT: "Lithuania", LU: "Luxembourg", LV: "Latvia",
  LY: "Libya", MA: "Morocco", MC: "Monaco", MD: "Moldova", ME: "Montenegro", MG: "Madagascar",
  MH: "Marshall Islands", MK: "North Macedonia", ML: "Mali", MM: "Myanmar", MN: "Mongolia",
  MO: "Macau", MR: "Mauritania", MT: "Malta", MU: "Mauritius", MV: "Maldives", MW: "Malawi",
  MX: "Mexico", MY: "Malaysia", MZ: "Mozambique", NA: "Namibia", NE: "Niger", NG: "Nigeria",
  NI: "Nicaragua", NL: "Netherlands", NO: "Norway", NP: "Nepal", NR: "Nauru", NZ: "New Zealand",
  OM: "Oman", PA: "Panama", PE: "Peru", PG: "Papua New Guinea", PH: "Philippines", PK: "Pakistan",
  PL: "Poland", PS: "Palestine", PT: "Portugal", PW: "Palau", PY: "Paraguay", QA: "Qatar",
  RO: "Romania", RS: "Serbia", RU: "Russia", RW: "Rwanda", SA: "Saudi Arabia", SB: "Solomon Islands",
  SC: "Seychelles", SD: "Sudan", SE: "Sweden", SG: "Singapore", SI: "Slovenia", SK: "Slovakia",
  SL: "Sierra Leone", SM: "San Marino", SN: "Senegal", SO: "Somalia", SR: "Suriname",
  SS: "South Sudan", ST: "Sao Tome and Principe", SV: "El Salvador", SY: "Syria", SZ: "Eswatini",
  TD: "Chad", TG: "Togo", TH: "Thailand", TJ: "Tajikistan", TL: "Timor-Leste", TM: "Turkmenistan",
  TN: "Tunisia", TO: "Tonga", TR: "Turkey", TT: "Trinidad and Tobago", TV: "Tuvalu", TW: "Taiwan",
  TZ: "Tanzania", UA: "Ukraine", UG: "Uganda", US: "United States", UY: "Uruguay", UZ: "Uzbekistan",
  VA: "Vatican City", VC: "St. Vincent and the Grenadines", VE: "Venezuela", VN: "Vietnam",
  VU: "Vanuatu", WS: "Samoa", XK: "Kosovo", YE: "Yemen", ZA: "South Africa", ZM: "Zambia", ZW: "Zimbabwe"
};

// Population estimates (millions, 2025 approx) for top passport ranking
const POPULATIONS = {
  CN: 1406, IN: 1463, US: 341, ID: 285, PK: 255, NG: 237, BR: 212, BD: 175, RU: 143, JP: 123,
  MX: 131, ET: 135, PH: 116, EG: 118, VN: 101, DE: 83, TR: 85, IR: 92, TH: 71, GB: 69,
  FR: 68, IT: 58, ZA: 64, KR: 51, ES: 49, CO: 53, KE: 57, PL: 36, CA: 41, SA: 36
};

// Top destinations by tourism (approx annual visitors in millions)
const TOP_DESTINATIONS = new Set([
  "FR", "ES", "US", "CN", "IT", "TR", "MX", "TH", "DE", "GB",
  "JP", "AT", "GR", "MY", "PT", "AE", "NL", "SA", "IN", "HK",
  "SG", "ID", "AU", "CA", "PL", "RU", "HR", "HU", "CH", "VN",
  "MA", "CZ", "EG", "KR", "TW", "DK", "IE", "ZA", "NZ", "PH"
]);

// Top passports by population (for indexing rules)
const TOP_PASSPORTS = Object.entries(POPULATIONS)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 50)
  .map(([iso]) => iso);

function slugify(name) {
  return name.toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function refreshVisa(env) {
  const status = { at: new Date().toISOString(), source: SOURCE, dataDate: DATA_DATE };
  
  try {
    // Fetch the JSON data
    const r = await fetch(DATA_URL, {
      signal: AbortSignal.timeout(30000),
      headers: { "user-agent": "VisaPoint/1.0 (+https://visapoint.net/about)" }
    });
    
    if (!r.ok) {
      status.error = `Source fetch failed: ${r.status}`;
      await env.SEO_LOG.put("engine:visa", JSON.stringify(status));
      return status;
    }
    
    const data = await r.json();
    const passports = Object.keys(data);
    
    if (passports.length < 150) {
      status.error = "Unexpected coverage collapse: refusing to replace existing data";
      await env.SEO_LOG.put("engine:visa", JSON.stringify(status));
      return status;
    }
    
    // Process and insert the data
    const now = new Date().toISOString();
    let inserted = 0, updated = 0;
    const jobs = [];
    
    // Insert country metadata
    for (const iso of Object.keys(COUNTRIES)) {
      const name = COUNTRIES[iso];
      const slug = slugify(name);
      const pop = POPULATIONS[iso] || null;
      jobs.push(env.DB.prepare(
        `INSERT INTO visa_countries(iso2, name, slug, population) VALUES(?, ?, ?, ?)
         ON CONFLICT(iso2) DO UPDATE SET name=excluded.name, slug=excluded.slug, population=excluded.population`
      ).bind(iso, name, slug, pop));
    }
    
    // Insert visa matrix data
    for (const passport of passports) {
      const destinations = data[passport];
      for (const [dest, info] of Object.entries(destinations)) {
        if (dest === passport) continue; // Skip own country
        
        const status = info.status || "visa required";
        const req = REQ_MAP[status] || "visa_required";
        const days = typeof info.days === "number" ? info.days : null;
        
        jobs.push(env.DB.prepare(
          `INSERT INTO visa_matrix(passport, destination, requirement, days, source, data_date, updated_at)
           VALUES(?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(passport, destination) DO UPDATE SET
             requirement=excluded.requirement, days=excluded.days, updated_at=excluded.updated_at
           WHERE visa_matrix.requirement!=excluded.requirement OR visa_matrix.days IS NOT excluded.days`
        ).bind(passport, dest, req, days, SOURCE, DATA_DATE, now));
        inserted++;
      }
    }
    
    // Set indexing rules: top 50 passports × top 40 destinations = ~2000 indexed pairs
    // Plus all /visa-free-countries/<passport> pages (~199) are indexed
    for (const passport of TOP_PASSPORTS) {
      // Index all visa-free pages for top passports
      jobs.push(env.DB.prepare(
        `INSERT INTO visa_index_rules(passport, destination, indexed, reason) VALUES(?, NULL, 1, 'Top passport by population')
         ON CONFLICT(passport, destination) DO UPDATE SET indexed=1`
      ).bind(passport));
      
      // Index specific pair pages for top passport × top destination
      for (const dest of TOP_DESTINATIONS) {
        if (dest === passport) continue;
        jobs.push(env.DB.prepare(
          `INSERT INTO visa_index_rules(passport, destination, indexed, reason) VALUES(?, ?, 1, 'Top passport × top destination')
           ON CONFLICT(passport, destination) DO UPDATE SET indexed=1`
        ).bind(passport, dest));
      }
    }
    
    // Execute in batches
    for (let i = 0; i < jobs.length; i += 100) {
      await env.DB.batch(jobs.slice(i, i + 100));
    }
    
    status.passports = passports.length;
    status.pairs = inserted;
    status.indexedPassportPages = TOP_PASSPORTS.length + (passports.length - TOP_PASSPORTS.length); // All visa-free pages indexed
    status.indexedPairPages = TOP_PASSPORTS.length * TOP_DESTINATIONS.size;
    
    await env.SEO_LOG.put("engine:visa", JSON.stringify(status));
    return status;
    
  } catch (e) {
    status.error = String(e);
    await env.SEO_LOG.put("engine:visa", JSON.stringify(status));
    return status;
  }
}

/**
 * Check if a specific pair page should be indexed.
 */
export async function shouldIndexPair(env, passport, destination) {
  const rule = await env.DB.prepare(
    "SELECT indexed FROM visa_index_rules WHERE passport=? AND (destination=? OR destination IS NULL) ORDER BY destination DESC LIMIT 1"
  ).bind(passport, destination).first();
  return rule?.indexed === 1;
}

/**
 * Get passport power ranking (visa-free + VOA + eTA count).
 */
export async function getPassportRanking(env) {
  const { results } = await env.DB.prepare(`
    SELECT 
      m.passport,
      c.name,
      c.slug,
      c.population,
      COUNT(CASE WHEN m.requirement IN ('visa_free', 'visa_on_arrival', 'eta') THEN 1 END) as score,
      COUNT(CASE WHEN m.requirement = 'visa_free' THEN 1 END) as visa_free,
      COUNT(CASE WHEN m.requirement = 'visa_on_arrival' THEN 1 END) as voa,
      COUNT(CASE WHEN m.requirement = 'eta' THEN 1 END) as eta,
      COUNT(CASE WHEN m.requirement = 'e_visa' THEN 1 END) as evisa,
      COUNT(CASE WHEN m.requirement = 'visa_required' THEN 1 END) as required,
      COUNT(CASE WHEN m.requirement = 'no_admission' THEN 1 END) as no_admission
    FROM visa_matrix m
    JOIN visa_countries c ON m.passport = c.iso2
    GROUP BY m.passport
    ORDER BY score DESC, c.name
  `).all();
  
  let rank = 0, lastScore = -1;
  return (results || []).map((r, i) => {
    if (r.score !== lastScore) { rank = i + 1; lastScore = r.score; }
    return { ...r, rank };
  });
}

/**
 * Get visa requirements for a specific passport.
 */
export async function getVisaFreeCountries(env, passport) {
  const { results } = await env.DB.prepare(`
    SELECT 
      m.destination,
      c.name,
      c.slug,
      m.requirement,
      m.days,
      m.data_date
    FROM visa_matrix m
    JOIN visa_countries c ON m.destination = c.iso2
    WHERE m.passport = ?
    ORDER BY 
      CASE m.requirement 
        WHEN 'visa_free' THEN 1 
        WHEN 'visa_on_arrival' THEN 2
        WHEN 'eta' THEN 3
        WHEN 'e_visa' THEN 4
        WHEN 'visa_required' THEN 5
        ELSE 6 
      END,
      c.name
  `).bind(passport).all();
  return results || [];
}

/**
 * Get visa requirement for a specific pair.
 */
export async function getVisaPair(env, passport, destination) {
  return env.DB.prepare(`
    SELECT 
      m.*,
      p.name as passport_name,
      p.slug as passport_slug,
      d.name as destination_name,
      d.slug as destination_slug
    FROM visa_matrix m
    JOIN visa_countries p ON m.passport = p.iso2
    JOIN visa_countries d ON m.destination = d.iso2
    WHERE m.passport = ? AND m.destination = ?
  `).bind(passport, destination).first();
}
