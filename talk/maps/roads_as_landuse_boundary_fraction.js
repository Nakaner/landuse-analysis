'use strict';

function round(value, decimals) {
    return Math.round(value * (10 ** decimals)) / (10 ** decimals);
}

function buildLabel(properties) {
    var fraction = "n/a";
    if (properties.hasOwnProperty('road_as_landuse_boundary_fraction')) {
        fraction = round(properties.roads_as_landuse_boundary_fraction * 100, 1)
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
        "id": "roads_landuse_boundary_fraction_per_city",
        "type": "fill",
        "source": "landuse-analysis",
        "source-layer": "roads_landuse_boundary_fraction_per_city",
        "filter": ["all"],
        "layout": {"visibility": "visible"},
        "paint": {
            "fill-color": [
                "interpolate-hcl",
                ["linear"],
                ["get", "roads_as_landuse_boundary_fraction"],
                0.0,
                "#2c7bb6",
                0.175,
                "#abd9e9",
                0.35,
                "#ffffbf",
                0.525,
                "#fdae61",
                0.7,
                "#d7191c"
            ],
            "fill-opacity": 1
        }
    });
    map.addLayer({
        "id": "roads_landuse_boundary_fraction_per_city_outline",
        "type": "line",
        "source": "landuse-analysis",
        "source-layer": "roads_landuse_boundary_fraction_per_city",
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
    map.on('click', 'roads_landuse_boundary_fraction_per_city', (e) => {
        new maplibregl.Popup()
            .setLngLat(e.lngLat)
            .setDOMContent(buildLabel(e.features[0].properties))
            .addTo(map);
    });
    map.on('mouseenter', 'roads_landuse_boundary_fraction_per_city', () => {
        map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'roads_landuse_boundary_fraction_per_city', () => {
        map.getCanvas().style.cursor = '';
    });
});
