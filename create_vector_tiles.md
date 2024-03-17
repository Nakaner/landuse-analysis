# Create vector tiles for the maps

* Install Martin: `cargo install martin --locked`
* Run *martin-cp*: `martin-cp -c martin/config.yaml -s landuse_coverage_per_municipality --min-zoom 0 --max-zoom 14 --mbtiles-type flat --bbox 7.51,47.53,10.5,49.8 -p 5 --encoding gzip --concurrency 2 -o tiles/landuse_coverage_per_municipality.mbtiles`
