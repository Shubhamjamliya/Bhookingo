# National Highway GeoJSON Data

Place the official Indian National Highways GeoJSON file here for one-time bulk import.

## Recommended source (MoRTH / GatiShakti)

Download **INDIA_NATIONAL_HIGHWAY.geojson** (~95 MB):

https://github.com/yashveeeeeeer/india-geodata/releases/tag/infra/national-highways

Save it as:

```
Backend/data/highways/national-highways.geojson
```

Alternative: Bharatlas GatiShakti 2024 snapshot — https://bharatlas.com/view/gs_highways

## Import methods

### 1. CLI (recommended for first setup)

```bash
cd Backend
npm run import:highways
# or with custom path:
npm run import:highways -- /path/to/your/highways.geojson
```

### 2. Admin panel

Go to **Admin → Highway Setup** → upload the `.geojson` file → **Import GeoJSON**.

## Notes

- Import is **idempotent** — re-running upserts by highway ref (e.g. `NH-44`).
- After import, geometry is served from MongoDB only; no external API calls.
- Large GeoJSON files (~100 MB) may take 1–3 minutes to import.
- This directory's `*.geojson` files are gitignored due to size.
