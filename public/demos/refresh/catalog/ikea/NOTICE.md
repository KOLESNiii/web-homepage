# IKEA product library

These product images and 3D models were fetched from IKEA's public UK product pages
at the user's request for the SpaceShift demonstration. IKEA names, images and
models belong to their respective owners; they are not SpaceShift originals or
assets released under this project's licence. This project is not affiliated with IKEA.

`frontend/src/data/ikeaCatalog.json` records the product page, original image and model
URLs, fetch time, published dimensions and delivery checks for every selected item.
Prices are GBP snapshots at fetch time; follow the product link for current pricing
and availability. Width and depth follow the model's axes where IKEA labels them
differently. Meshes are normalized through the existing reconstruction pipeline:
metres, +Y up, +Z front, bottom-centred, bounded textures and geometry. Collision
parts remain the project's category templates rather than exact mesh collision shapes.

Refresh from the repository root with:

```sh
uv run --extra reconstruction --with DracoPy==2.2.0 python -m scripts.cache_ikea_library
```

DracoPy is an import-time decoder only; it is not needed to run the application.

The script uses IKEA search and product pages, downloads published models and images,
and writes bundled GLBs, WebP thumbnails and catalog JSON. No API keys, fal calls or
paid services are used. Downloads and resumable selection are cached under
`/tmp/spaceshift-ikea-library`; remove that directory to fetch a fresh snapshot.
The run fails if any category cannot reach its quota; unsupported models, missing
dimensions and inconsistent bounds are skipped, never replaced with proxies.
The application reads only local files and does not contact IKEA to browse or add
these products. IKEA's undocumented endpoints may change and break a future refresh.
