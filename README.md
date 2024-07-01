# Analyse Landuse in OpenStreetMap

This repository contains a Jupyter Notebook and styling for a few MapLibre GL JS maps to
analyse landuse mapping patterns in OpenStreetMap in Germany.

## Loading data

Import OSM data into PostgreSQL:

```sh
osm2pgsql --slim --flat-nodes /nvme/michael/flat.nodes --style landuse.lua --output flex -d landuse europe.osm.pbf
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
```

## License

Slides: CC-BY 4.0

Code: WTFPL if not state otherwise

All images and maps contain OpenStreetMap data, licensed unter Open Database License 1.0.
