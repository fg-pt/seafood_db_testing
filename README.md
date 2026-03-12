# Planet Tracker — Seafood Database

Interactive web dashboard for exploring sustainability risks across 300 seafood companies, 256 countries, and 624 species.

**[Live Demo →](https://fg-pt.github.io/seafood-dashboard/)** *(update URL after deploying)*

## Features

- **Company Rankings** — sortable table with 5 key environmental metrics (Reporting Precision, FishSource Stock Health, Overfishing Proportion, Unreported Catch, Ocean Health Index), filterable by supply chain segment and country
- **Company Profiles** — sustainability assessment (6 dimensions with traffic-light scoring), environmental metrics vs. benchmark, financials, sourcing countries and species
- **Country Profiles** — Ocean Health Index, fishing sustainability, governance, RFMO memberships, treaties, and linked companies
- **Species Profiles** — FishSource scores, catch data by gear type, IUCN conservation status, and linked companies
- **Portfolio Assessment** — build a custom portfolio of companies and compare aggregate scores against the 300-company benchmark

## Data

All data lives in plain CSV files in the `data/` folder:

| File | Rows | Description |
|------|------|-------------|
| `companies.csv` | 300 | Company profiles, financials, sustainability scores (0–3) |
| `company_species.csv` | 11,578 | Company → species linkage |
| `company_countries.csv` | 937 | Company → sourcing country linkage |
| `assessments.csv` | 1,800 | LLM-generated sustainability assessments per company per category |
| `env_scores.csv` | 5,072 | Environmental metrics per company (FishSource, GFI, OHI, etc.) |
| `species_data.csv` | 7,140 | Catch data and FishSource scores per species |
| `country_data.csv` | 22,940 | Country-level metrics (OHI, governance, treaties, etc.) |
| `iucn.csv` | 489 | IUCN Red List status per species |
| `benchmarks.csv` | 5 | Benchmark averages for key metrics |

To update the dashboard, just edit the CSVs — no code changes needed.

## Deployment

### GitHub Pages (recommended)

1. Push this folder to a GitHub repo
2. Go to **Settings → Pages → Source: Deploy from a branch → main / root**
3. Your dashboard will be live at `https://<username>.github.io/<repo-name>/`

### Local

Open `index.html` in a browser via a local server:

```bash
# Python
python -m http.server 8000

# Node
npx serve .
```

> **Note:** Opening `index.html` directly as a file won't work because `fetch()` requires HTTP. Use any local server.

## Development

To modify the React app:

```bash
npm install
# Edit src/app.jsx or src/data-loader.js
npx esbuild src/app.jsx --bundle --outfile=bundle.js --format=iife --minify
```

## Tech Stack

- **React 18** — UI components
- **Papa Parse** — CSV parsing at runtime
- **esbuild** — bundling
- No backend, no build server, no CDN dependencies — fully self-contained static site.

## Credits

Data: [Planet Tracker](https://planet-tracker.org/) Ocean Database
