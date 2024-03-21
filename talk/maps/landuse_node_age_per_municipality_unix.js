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
    const p1 = document.createElement("p");
    const p2 = document.createElement("p");
    p1.appendChild(document.createTextNode(properties.name));
    p2.appendChild(document.createTextNode(date));
    const div = document.createElement("div");
    div.appendChild(p1);
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
    style: "versatiles-style/neutrino.de.json",
    center: [9.09,48.98],
    zoom: 7,
});
var start = 1230764400;
var end = 1710871053;
var step = (end - start) / 4;
map.on('load', () => {
    map.addSource('landuse-analysis', {
      'type': 'vector',
      'tiles': ['https://michreichert.de/projects/land-analysis/{z}/{x}/{y}.pbf']
    });
    map.addLayer({
        "id": "landuse_node_age_per_municipality_unix",
        "type": "fill",
        "source": "landuse-analysis",
        "source-layer": "landuse_node_age_per_municipality_unix",
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
        "id": "landuse_node_age_per_municipality_unix_outline",
        "type": "line",
        "source": "landuse-analysis",
        "source-layer": "landuse_node_age_per_municipality_unix",
        "minzoom": 6.5,
        "filter": ["all"],
        "layout": {
            "visibility": "visible",
            "line-cap": "round",
            "line-join": "round",
        },
        "paint": {
            "line-color": "rgb(30, 30, 30)",
            "line-width": 0.5
        }
    });
    map.on('click', 'landuse_node_age_per_municipality_unix', (e) => {
        new maplibregl.Popup()
            .setLngLat(e.lngLat)
            .setDOMContent(buildLabel(e.features[0].properties))
            .addTo(map);
    });
    map.on('mouseenter', 'landuse_node_age_per_municipality_unix', () => {
        map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'landuse_node_age_per_municipality_unix', () => {
        map.getCanvas().style.cursor = '';
    });
});
