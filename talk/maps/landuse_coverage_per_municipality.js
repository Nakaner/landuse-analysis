'use strict';

function round(value, decimals) {
    return Math.round(value * (10 ** decimals)) / (10 ** decimals);
}

function buildLabel(properties) {
    var fraction = "n/a";
    if (properties.hasOwnProperty('area_size') && properties.hasOwnProperty('city_area')) {
        fraction = round((properties.area_size / properties.city_area) * 100, 1)
    }
    const p1 = document.createElement("p");
    const p2 = document.createElement("p");
    p1.appendChild(document.createTextNode(properties.city_name));
    p2.appendChild(document.createTextNode(fraction + ' %'));
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
    //style: "https://www.michreichert.de/projects/land-analysis/landuse_coverage_per_municipality.json", // stylesheet location
    center: [9.09,48.98],
    zoom: 7,
});
map.on('load', () => {
    map.addSource('landuse-analysis', {
      'type': 'vector',
      'tiles': ['https://michreichert.de/projects/land-analysis/{z}/{x}/{y}.pbf']
    });
    map.addLayer({
        "id": "landuse_coverage_per_municipality",
        "type": "fill",
        "source": "landuse-analysis",
        "source-layer": "landuse_coverage_per_municipality",
        "filter": ["all"],
        "layout": {"visibility": "visible"},
        "paint": {
            "fill-color": [
                "interpolate-hcl",
                ["linear"],
                ["/", ["get", "area_size"], ["get", "city_area"]],
                0.2,
                "#2c7bb6",
                0.46,
                "#abd9e9",
                0.61,
                "#ffffbf",
                0.77,
                "#fdae61",
                1,
                "#d7191c"
            ],
            "fill-opacity": 1
        }
    });
    map.addLayer({
        "id": "landuse_coverage_per_municipality_outline",
        "type": "line",
        "source": "landuse-analysis",
        "source-layer": "landuse_coverage_per_municipality",
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
    map.on('click', 'landuse_coverage_per_municipality', (e) => {
        new maplibregl.Popup()
            .setLngLat(e.lngLat)
            .setDOMContent(buildLabel(e.features[0].properties))
            .addTo(map);
    });
    map.on('mouseenter', 'landuse_coverage_per_municipality', () => {
        map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'landuse_coverage_per_municipality', () => {
        map.getCanvas().style.cursor = '';
    });
});
