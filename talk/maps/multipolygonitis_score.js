'use strict';

function round(value, decimals) {
    return Math.round(value * (10 ** decimals)) / (10 ** decimals);
}

function buildLabel(properties) {
    var fraction = "n/a";
    if (properties.hasOwnProperty('multipolygon_count') && properties.hasOwnProperty('landuse_count')) {
        fraction = round((properties.multipolygon_count / properties.landuse_count) * 100, 1)
    }
    const p1 = document.createElement("p");
    const p2 = document.createElement("p");
    //p1.appendChild(document.createTextNode(properties.city_name));
    p2.appendChild(document.createTextNode((fraction * 2) + ' %'));
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
    style: "versatiles-style/neutrino.en.json",
    //style: "https://www.michreichert.de/projects/land-analysis-eu/landuse_coverage_per_municipality.json", // stylesheet location
    center: [9.09,48.98],
    zoom: 4,
});
map.on('load', () => {
    map.addSource('landuse-analysis', {
      'type': 'vector',
      'tiles': ['https://michreichert.de/projects/land-analysis-eu/{z}/{x}/{y}.pbf']
    });
    map.addLayer({
        "id": "multipolygonitis_score",
        "type": "fill",
        "source": "landuse-analysis",
        "source-layer": "multipolygonitis_score",
        "filter": ["all"],
        "layout": {"visibility": "visible"},
        "paint": {
            "fill-color": [
                "interpolate-hcl",
                ["linear"],
                ["/", ["number", ["get", "multipolygon_count"]], ["number", ["get", "landuse_count"]]],
                0.0,
                "#2c7bb6",
                0.09,
                "#abd9e9",
                0.17,
                "#ffffbf",
                0.26,
                "#fdae61",
                0.35,
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
    map.on('click', 'multipolygonitis_score', (e) => {
        new maplibregl.Popup()
            .setLngLat(e.lngLat)
            .setDOMContent(buildLabel(e.features[0].properties))
            .addTo(map);
    });
    map.on('mouseenter', 'multipolygonitis_score', () => {
        map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'multipolygonitis_score', () => {
        map.getCanvas().style.cursor = '';
    });
});
