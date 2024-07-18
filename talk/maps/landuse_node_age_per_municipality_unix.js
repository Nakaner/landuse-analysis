'use strict';

function round(value, decimals) {
    return Math.round(value * (10 ** decimals)) / (10 ** decimals);
}

function buildLabel(properties) {
    console.log(Object.getOwnPropertyNames(properties));
    var date = "unknown";
    if (properties.hasOwnProperty('median_timestamp')) {
        date = new Date(properties.median_timestamp * 1000).toDateString()
    }
    const p2 = document.createElement("p");
    p2.appendChild(document.createTextNode(date));
    const div = document.createElement("div");
    div.appendChild(p2);
    return div;
}


var map = new maplibregl.Map({
    container: "map",
    attributionControl: {
      compact: false,
      customAttribution:
        '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap</a>',
    },
    style: "versatiles-style/neutrino.en.json",
    center: [9.09,48.98],
    zoom: 4,
});
var start = 1230764400;
var end = 1710871053;
var step = (end - start) / 4;
map.on('load', () => {
    map.addSource('landuse-analysis', {
      'type': 'vector',
      'tiles': ['https://michreichert.de/projects/land-analysis-eu/{z}/{x}/{y}.pbf']
    });
    map.addLayer({
        "id": "landuse_node_age_per_cell_unix",
        "type": "fill",
        "source": "landuse-analysis",
        "source-layer": "landuse_node_age_per_cell_unix",
        "filter": ["all"],
        "layout": {"visibility": "visible"},
        "paint": {
            "fill-color": [
                "interpolate-hcl",
                ["linear"],
                ["number", ["get", "median_timestamp"]],
                start,
                "#2c7bb6",
                start + step,
                "#abd9e9",
                start + 2 * step,
                "#ffffbf",
                start + 3 * step,
                "#fdae61",
                end,
                "#d7191c"
            ],
            "fill-opacity": 1
        }
    });
    map.addLayer({
        "id": "boundaries",
        "type": "line",
        "source": "versatiles-shortbread",
        "source-layer": "boundaries",
        "filter": [ "all", [ "==", "admin_level", 2 ], [ "!=", "maritime", true ] ],
        "layout": {
            "visibility": "visible",
            "line-cap": "round",
            "line-join": "round",
        },
        "paint": {
            "line-color": "rgb(30, 30, 30)",
            "line-width": 1.5
        }
    });
    map.addLayer({
        "id": "cities-overlay",
        "type": "symbol",
        "source-layer": "place_labels",
        "filter": [ "all", [ "in", "kind", "city", "capital", "state_capital" ] ],
        "layout": {
            "text-field": "{name_en}",
            "text-font": [ "noto_sans_regular" ],
            "text-size": { "stops": [ [ 6, 17 ], [ 10, 20 ] ] }
        },
        "source": "versatiles-shortbread",
        "paint": {
            "icon-color": "#000000",
            "text-color": "#000000",
            "text-halo-color": "#ffffff",
            "text-halo-width": 1,
            "text-halo-blur": 1
        },
        "minzoom": 6
    });
    map.on('click', 'landuse_node_age_per_cell_unix', (e) => {
        new maplibregl.Popup()
            .setLngLat(e.lngLat)
            .setDOMContent(buildLabel(e.features[0].properties))
            .addTo(map);
    });
    map.on('mouseenter', 'landuse_node_age_per_cell_unix', () => {
        map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'landuse_node_age_per_cell_unix', () => {
        map.getCanvas().style.cursor = '';
    });
});
