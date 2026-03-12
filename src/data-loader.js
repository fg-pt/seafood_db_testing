import Papa from 'papaparse';

// Determine base path for data files (works on GitHub Pages and locally)
const BASE = (window.__DATA_BASE || '') + 'data/';

async function loadCSV(filename) {
  const resp = await fetch(BASE + filename);
  if (!resp.ok) throw new Error(`Failed to load ${filename}: ${resp.status}`);
  const text = await resp.text();
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,  // we'll type manually for control
      complete: (result) => resolve(result.data),
      error: (err) => reject(err),
    });
  });
}

function num(v) { if (v === '' || v == null || v === 'None') return null; const n = Number(v); return isNaN(n) ? null : n; }
function bool(v) { return v === 'True' || v === 'true'; }

export async function loadAllData(onProgress) {
  const files = [
    'companies.csv', 'company_species.csv', 'company_countries.csv',
    'assessments.csv', 'iucn.csv', 'env_scores.csv',
    'species_data.csv', 'country_data.csv', 'benchmarks.csv'
  ];

  const raw = {};
  for (let i = 0; i < files.length; i++) {
    if (onProgress) onProgress(files[i], i, files.length);
    raw[files[i]] = await loadCSV(files[i]);
  }

  // Transform into app data structures

  // 1. COMPANIES — array of objects
  const COMPANIES = raw['companies.csv'].map(r => ({
    n: r.name,
    id: r.id,
    co: r.country || null,
    ms: r.main_segment || null,
    seg: {
      feed: bool(r.seg_feed), fishing: bool(r.seg_fishing),
      aquaculture: bool(r.seg_aquaculture), processing: bool(r.seg_processing),
      wholesale: bool(r.seg_wholesale), retail: bool(r.seg_retail),
      foodservice: bool(r.seg_foodservice),
    },
    desc: r.description || null,
    web: r.website || null,
    sd: r.species_disclosure || null,
    rev: num(r.revenue_m),
    mc: num(r.market_cap_m),
    em: num(r.ebit_margin_pct),
    roe: num(r.roe_pct),
    s: {
      transparency: num(r.score_transparency),
      oceanHealth: num(r.score_oceanHealth),
      governance: num(r.score_governance),
      fishingPractices: num(r.score_fishingPractices),
      compliance: num(r.score_compliance),
      stockSustainability: num(r.score_stockSustainability),
    },
    rp: num(r.reporting_precision),
    nc: num(r.n_countries),
    ns: num(r.n_species),
    sp: r.species_clean || null,
    reg: r.regions || null,
  }));

  // 2. SPECIES_MAP — company → [species]
  const SPECIES_MAP = {};
  for (const r of raw['company_species.csv']) {
    if (!SPECIES_MAP[r.company_name]) SPECIES_MAP[r.company_name] = [];
    SPECIES_MAP[r.company_name].push(r.species_name);
  }

  // 3. COUNTRIES_MAP — company → [countries]
  const COUNTRIES_MAP = {};
  for (const r of raw['company_countries.csv']) {
    if (!COUNTRIES_MAP[r.company_name]) COUNTRIES_MAP[r.company_name] = [];
    COUNTRIES_MAP[r.company_name].push(r.country_name);
  }

  // 4. ASSESSMENTS — company → {category: {t: text}}
  const ASSESSMENTS = {};
  for (const r of raw['assessments.csv']) {
    if (!ASSESSMENTS[r.company_name]) ASSESSMENTS[r.company_name] = {};
    ASSESSMENTS[r.company_name][r.category] = { t: r.assessment_text };
  }

  // 5. IUCN — species → {sci, cat, trend}
  const IUCN = {};
  for (const r of raw['iucn.csv']) {
    IUCN[r.species_name] = {
      sci: r.scientific_name || null,
      cat: r.iucn_category || null,
      trend: r.population_trend || null,
    };
  }

  // 6. ENV_SCORES — company → {metric: value}
  const ENV_SCORES = {};
  for (const r of raw['env_scores.csv']) {
    if (!ENV_SCORES[r.company_name]) ENV_SCORES[r.company_name] = {};
    ENV_SCORES[r.company_name][r.metric_name] = num(r.value);
  }

  // 7. SPECIES_DATA — species → {metric: value}
  const SPECIES_DATA = {};
  for (const r of raw['species_data.csv']) {
    if (!SPECIES_DATA[r.species_name]) SPECIES_DATA[r.species_name] = {};
    SPECIES_DATA[r.species_name][r.metric_name] = num(r.value);
  }

  // 8. COUNTRY_DATA — country → {metric: {v, t}}
  const COUNTRY_DATA = {};
  for (const r of raw['country_data.csv']) {
    if (!COUNTRY_DATA[r.country_name]) COUNTRY_DATA[r.country_name] = {};
    COUNTRY_DATA[r.country_name][r.metric_name] = { v: r.value, t: r.value_type };
  }

  // 9. BENCHMARKS — metric → {mean, median, n}
  const BENCHMARKS = {};
  for (const r of raw['benchmarks.csv']) {
    BENCHMARKS[r.metric_name] = { mean: num(r.mean), median: num(r.median), n: num(r.n) };
  }

  return { COMPANIES, SPECIES_MAP, COUNTRIES_MAP, ASSESSMENTS, IUCN, ENV_SCORES, SPECIES_DATA, COUNTRY_DATA, BENCHMARKS };
}
