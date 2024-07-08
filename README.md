# Analyse Landuse in OpenStreetMap

This repository contains a Jupyter Notebook and styling for a few MapLibre GL JS maps to
analyse landuse mapping patterns in OpenStreetMap in Germany.

## Loading data

Filter OSM data to avoid import of unnecessary nodes:

```sh
osmium tags-filter -v --progress -o ~/jobs/landuse/europe-filtered.osm.pbf --expressions landuse.osmium europe-latest.osm.pbf
```

Import OSM data into PostgreSQL:

```sh
osm2pgsql -x --slim --style landuse.lua --output flex -d landuse europe-filtered.osm.pbf
```

Load poly file into database:

```sh
wget https://raw.githubusercontent.com/openstreetmap/svn-archive/main/applications/utils/osm-extract/polygons/poly2wkt.pl
echo "name;wkt" > europe-poly.csv
perl poly2wkt.pl < europe.poly | sed -e 's,^,europe;,g' >> europe-poly.csv
ogr2ogr -f PostgreSQL PG:dbname=landuse europe-poly.csv -t_srs EPSG:4326 -s_srs EPSG:4326 -nln clipping_area 
```

Download ocean polygons (split) and load them into the database:

```sh
wget https://osmdata.openstreetmap.de/download/water-polygons-split-4326.zip
unzip water-polygons-split-4326.zip
PG_USE_COPY=YES ogr2ogr -f PostgreSQL PG:dbname=landuse water-polygons-split-4326/water_polygons.shp -gt 50000 -nln water_polygons_split
wget https://osmdata.openstreetmap.de/download/coastlines-split-4326.zip
unzip coastlines-split-4326.zip
PG_USE_COPY=YES ogr2ogr -f PostgreSQL PG:dbname=landuse coastlines-split-4326/lines.shp -gt 50000 -nln coastlines_split
```

Download Nominatim country grid and load it into the databse:

```sh
wget https://nominatim.org/data/country_grid.sql.gz
gzip -dc country_grid.sql.gz | psql -d landuse
```

## Export

You can export the computed results using [Martin](https://maplibre.org/martin/introduction.html). For example, you can install it using Docker.
In this example `config_path` is the `martin` directory in this repository. It will be mounted as `/config` in the Docker container.
The directory `output_dir` will be mounted as `/output`.

```sh
docker run --net=host -v config_path:/config -v output_dir:/output ghcr.io/maplibre/martin --config /config/config.yaml
```

The example above requires access to the database without password via TCP/IP. See the [documentation of Martin](https://maplibre.org/martin/installation.html#docker) if your database requires a password (or you do not want to modify `pg_hba.conf`).

After starting the container, open a terminal in the container `docker container exec -it CONTAINER_ID /bin/bash` and execute the following command:

```sh
martin-cp --config config/config.yaml --source landuse_coverage_per_cell,multipolygonitis_score,roads_landuse_boundary_fraction_per_cell,water --max-zoom 13 --output-file /output/landuse.mbtiles --cache-size 10000 --concurrency 12 --bbox -32.35,34.97,46.31,81.12
```

You can convert the MBTiles file to flat `z/x/y.pbf` tiles using [MB-Util](https://github.com/mapbox/mbutil):

```sh
python3 mb_util landuse.mbtiles landuse-tiles-directory-which-does-not-exist-yet
```

Common pitfalls:

* If Martin cannot find a layer, ensure that
  * the geometry column has an SRID set (`ALTER TABLE table_name ALTER COLUMN geometry_column TYPE geometry(Geometry, 4326); UPDATE table_name SET geometry_column = ST_SetSRID(geometry_column, 4326);`),
  * the geometry column named in the configuration exists,
  * any other columns listed in the configuration exist.
* If Martin complains about missing spatial indexes, you can ignore this if you do not want to export those tables as vector tiles.
* If Martin still failes to export, run `martin-cp --save-config - DATABASE_URL` to auto-discover the tables. Martin will then write its discovered configuration to standard output.

## License

Slides: CC-BY 4.0

Code: WTFPL if not state otherwise

All images and maps contain OpenStreetMap data, licensed unter Open Database License 1.0.
