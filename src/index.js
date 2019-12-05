import mapboxgl from 'mapbox-gl';
/* import loadTopojson from './loadTopojson'; */
import * as queue from 'd3-queue';
import * as request from 'd3-request';
import * as topojson from "topojson-client";
import mobileCheck from './js/mobileCheck';
import getScreenSize from './js/getScreenSize';

var mobile = mobileCheck();
var screenSize = getScreenSize();
var initialZoom
var fontSize
var selectedPolygon

var is_safari = navigator.userAgent.indexOf("Safari") > -1;

if (mobile) {
    // document.getElementById('map').style.height = screenSize[1] + 'px';
    initialZoom = 7.5;
    fontSize = 32;
    document.getElementById('map-overlay').style.fontSize = 32 + 'px';
    document.getElementById('map-overlay').style.left = "9%";
    /* document.getElementsByClassName('floatTL')[0].style.right = '25%'; */
    document.getElementsByClassName('select-css')[0].style.fontSize = '24px';
    document.getElementsByClassName('select-css')[1].style.fontSize = '24px';
    document.getElementsByClassName('select-css')[2].style.fontSize = '24px';
    document.getElementById('mainTitle').style.left = '8%';
    document.getElementById('selectLocation').style.left = '9%';
    document.getElementById('map-overlay').style.bottom = '25%';
} else {
    initialZoom = 7;
    fontSize = 18;
    document.getElementById('map-overlay').style.left = "13.5%";
    document.getElementById('map-overlay').style.bottom = "25%";
    var scale = 'scale(1)';
    document.body.style.webkitTransform = scale; // Chrome, Opera, Safari
    document.body.style.msTransform = scale; // IE 9
    document.body.style.transform = scale;
}

var blankStyle = {
    "version": 8,
    "name": "Blank",
    "center": [0, 0],
    "zoom": 0,
    "sources": {},
    "layers": [{
        "id": "background",
        "type": "background",
        "paint": {
            "background-color": "#ffffff"
        }
    }],
    "id": "blank",
    "glyphs": "http://fonts.openmaptiles.org/{fontstack}/{range}.pbf"
};

var villageURL = './data/village.json',
    townURL = './data/town.json',
    countyURL = './data/county.json',
    townLabelURL = 'https://gist.githubusercontent.com/imdataman/07c49eb3a7049e6ed065ad492710dad3/raw/9507b119481008771020196879e298ab663df2b0/town-label.geojson',
    countyLabelURL = 'https://gist.githubusercontent.com/imdataman/7a84d2a450db032f0a0e3c07bcf45979/raw/21a0393db077a6d4d79f7394820492a9aac0328f/county-label.geojson',
    villageDataURL = "./data/village-data.geojson";

var zoomThreshold = [10, 13];

var hoveredFeature = null;

var selectCounty = document.getElementById("selectCounty")
var selectTown = document.getElementById("selectTown")
var selectVillage = document.getElementById("selectVillage")
var overlay = document.getElementById('map-overlay');
var villageLegend = document.getElementById('villageLegend');
var townLegend = document.getElementById('townLegend');
var countyLegend = document.getElementById('countyLegend');
var loadingGif = document.getElementById('loading');

var map = new mapboxgl.Map({
    container: 'map',
    style: blankStyle,
    center: [120.973882, 23.57565],
    minZoom: 7,
    maxZoom: 14,
    zoom: initialZoom
});

map.addControl(new mapboxgl.NavigationControl({
    showCompass: false
}));

if (navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1 && mobile) {
    document.getElementsByClassName('mapboxgl-ctrl-top-right')[0].style.bottom = '15%';
}

map.on('load', function () {
    queue.queue()
        .defer(request.json, countyURL)
        .defer(request.json, townURL)
        .defer(request.json, villageURL)
        .defer(request.json, townLabelURL)
        .defer(request.json, countyLabelURL)
        .defer(request.json, villageDataURL)
        .await(ready);

    function ready(error, county, town, village, townLabel, countyLabel, villageInfo) {
        loadingGif.style.display = "none";

        var countyData = topojson.feature(county, county.objects.county);
        countyData.features.forEach(function (d) {
            d.id = +d.properties.id;
        });
        var townData = topojson.feature(town, town.objects.town);
        townData.features.forEach(function (d) {
            d.id = +d.properties.id;
        });
        var villageData = topojson.feature(village, village.objects.village);
        villageData.features.forEach(function (d) {
            var refomredId = d.properties.id.slice(0, 7) + d.properties.id.slice(9, 12);
            d.properties.id = refomredId;
            d.id = +refomredId;
        });

        map.addLayer({
            "id": "maptiles",
            "type": "raster",
            "source": {
                "type": "raster",
                "tiles": ["tile/{z}/{x}/{y}.png"],
                "minzoom": 7,
                "maxzoom": 14
            }
        });

        map.addSource('county', {
            'type': 'geojson',
            'data': countyData
        });

        map.addLayer({
            'id': 'countyPolygon',
            'source': 'county',
            'maxzoom': zoomThreshold[0],
            'type': 'fill',
            'paint': {
                'fill-color': 'rgba(0, 0, 0, 0)',
                'fill-outline-color': 'rgba(0, 0, 0, 0)'
            }
        });

        map.addLayer({
            'id': 'countySelected',
            'source': 'county',
            'maxzoom': zoomThreshold[0],
            'type': 'line',
            'paint': {
                'line-color': [
                    'case',
                    ['boolean',
                        ['feature-state', 'hover'],
                        false
                    ],
                    'rgba(0, 0, 0, 1)',
                    'rgba(0, 0, 0, 0)'
                ],
                'line-width': [
                    'interpolate', ['linear'],
                    ['zoom'],
                    6, 2,
                    zoomThreshold[0], 3
                ],
            }
        });

        map.addSource('town', {
            'type': 'geojson',
            'data': townData
        });

        map.addLayer({
            'id': 'townPolygon',
            'source': 'town',
            'minzoom': zoomThreshold[0],
            'maxzoom': zoomThreshold[1],
            'type': 'fill',
            'paint': {
                'fill-color': 'rgba(0, 0, 0, 0)',
                'fill-outline-color': 'rgba(0, 0, 0, 0)'
            }
        });

        map.addLayer({
            'id': 'townSelected',
            'source': 'town',
            'minzoom': zoomThreshold[0],
            'maxzoom': zoomThreshold[1],
            'type': 'line',
            'paint': {
                'line-color': [
                    'case',
                    ['boolean',
                        ['feature-state', 'hover'],
                        false
                    ],
                    'rgba(0, 0, 0, 1)',
                    'rgba(0, 0, 0, 0)'
                ],
                'line-width': [
                    'interpolate', ['linear'],
                    ['zoom'],
                    zoomThreshold[0], 3,
                    zoomThreshold[1], 6
                ]
            }
        });

        map.addSource('village', {
            'type': 'geojson',
            'data': villageData
        });

        map.addLayer({
            'id': 'villagePolygon',
            'source': 'village',
            'minzoom': zoomThreshold[1],
            'type': 'fill',
            'paint': {
                'fill-color': 'rgba(0, 0, 0, 0)',
                'fill-outline-color': 'rgba(0, 0, 0, 0)'
            }
        });

        map.addLayer({
            'id': 'villageSelected',
            'source': 'village',
            'minzoom': zoomThreshold[1],
            'type': 'line',
            'paint': {
                'line-color': [
                    'case',
                    ['boolean',
                        ['feature-state', 'hover'],
                        false
                    ],
                    'rgba(0, 0, 0, 1)',
                    'rgba(0, 0, 0, 0)'
                ],
                'line-width': [
                    'interpolate', ['linear'],
                    ['zoom'],
                    zoomThreshold[1], 6,
                    16, 10
                ]
            }
        });

        map.addSource('townLabel', {
            'type': 'geojson',
            'data': townLabel
        });

        map.addLayer({
            'id': 'townText',
            'source': 'townLabel',
            'minzoom': zoomThreshold[0],
            'type': 'symbol',
            "layout": {
                "symbol-placement": "point",
                "text-field": "{TOWNNAME}",
                "text-font": [
                    "Helvetica"
                ],
                "text-size": fontSize,
            },
            "paint": {
                "text-opacity": 0.5
            }
        });

        map.addSource('countyLabel', {
            'type': 'geojson',
            'data': countyLabel
        });

        map.addLayer({
            'id': 'countyText',
            'source': 'countyLabel',
            'maxzoom': zoomThreshold[0],
            'type': 'symbol',
            "layout": {
                "symbol-placement": "point",
                "text-field": "{COUNTYNAME}",
                "text-font": [
                    "Helvetica"
                ],
                "text-size": fontSize
            },
            "paint": {
                "text-opacity": 0.5
            }
        });

        addTooltip('villagePolygon');
        addTooltip('townPolygon');
        addTooltip('countyPolygon');

        selectCounty.addEventListener('change', function () {
            selectTown.innerHTML = '';
            var option = document.createElement("option");
            option.text = "鄉鎮市區";
            option.value = "pending";
            selectTown.appendChild(option);
            var selectedCounty = selectCounty.options[selectCounty.selectedIndex].value;
            var townList = [];
            var selectedVillage = villageInfo.features.filter(function (d) {
                return d.properties.COUNTYNAME == selectedCounty;
            });
            selectedVillage.forEach(function (d) {
                if (!townList.includes(d.properties.TOWNNAME)) {
                    townList.push(d.properties.TOWNNAME);
                    var option = document.createElement("option");
                    option.text = d.properties.TOWNNAME;
                    option.value = d.properties.TOWNNAME;
                    selectTown.appendChild(option);
                }
            });
            selectTown.addEventListener('change', function () {
                var villageList = [];
                selectVillage.innerHTML = '';
                var option = document.createElement("option");
                option.text = "村里";
                option.value = "pending";
                selectVillage.appendChild(option);
                var selectedTown = selectTown.options[selectTown.selectedIndex].value;
                selectedVillage.filter(function (d) {
                        return d.properties.TOWNNAME == selectedTown;
                    })
                    .forEach(function (d) {
                        if (!villageList.includes(d.properties.VILLNAME) && d.properties.VILLNAME !== "") {
                            villageList.push(d.properties.VILLNAME);
                            var option = document.createElement("option");
                            option.text = d.properties.VILLNAME;
                            option.value = d.properties.COUNTYNAME + d.properties.TOWNNAME + d.properties.VILLNAME;
                            selectVillage.appendChild(option);
                        }
                    });
                selectVillage.addEventListener('change', function () {
                    var selectedVillageName = selectVillage.options[selectVillage.selectedIndex].value;
                    var destination = villageData.features.filter(function (d) {
                        return d.properties.name == selectedVillageName;
                    })[0];
                    var bboxInfo = selectedVillage.filter(function (d) {
                        return d.properties.COUNTYNAME + d.properties.TOWNNAME + d.properties.VILLNAME == selectedVillageName;
                    })[0];
                    var boundingBox = [bboxInfo.geometry.coordinates[0][0],
                        bboxInfo.geometry.coordinates[0][2]
                    ];

                    map.fitBounds(boundingBox, {
                        maxZoom: 14
                    });

                    if (hoveredFeature) {
                        map.removeFeatureState(hoveredFeature);
                    }
                    hoveredFeature = {
                        source: "village",
                        id: destination.properties.id
                    };

                    map.setFeatureState(hoveredFeature, {
                        hover: true
                    });

                    var title = destination.properties.name;
                    var blue = +destination.properties.kmt + +destination.properties.pfp;
                    blue = Math.round(blue * 10) / 10;
                    var green = destination.properties.ddp;
                    green = Math.round(green * 10) / 10;

                    overlay.innerHTML = title + "<br/><span>藍營：" + blue + "%</span>" + "<br/><span>綠營：" + green + "%</span>";;
                    overlay.style.display = 'inline-block';
                });
            });
        });
    }
});

function addTooltip(id) {
    if (mobile) {
        map.on('click', id, function (e) {
            // Change the cursor style as a UI indicator.
            map.getCanvas().style.cursor = 'pointer';

            var specificSource = id.slice(0, 4) == "coun" ? "county" : id.slice(0, 4) == "town" ? "town" : "village";

            overlay.innerHTML = '';

            if (hoveredFeature) {
                map.removeFeatureState(hoveredFeature);
            }

            hoveredFeature = {
                source: specificSource,
                id: e.features[0].properties.id
            };

            map.setFeatureState(hoveredFeature, {
                hover: true
            });

            var title = e.features[0].properties.name;
            var blue = +e.features[0].properties.kmt + +e.features[0].properties.pfp;
            blue = Math.round(blue * 10) / 10;
            var green = e.features[0].properties.ddp;
            green = Math.round(green * 10) / 10;

            overlay.innerHTML = title + "<br/><span>藍營：" + blue + "%</span>" + "<br/><span>綠營：" + green + "%</span>";
            overlay.style.display = 'inline-block';
        });
    } else {
        map.on('mousemove', id, function (e) {
            // Change the cursor style as a UI indicator.
            map.getCanvas().style.cursor = 'pointer';

            var specificSource = id.slice(0, 4) == "coun" ? "county" : id.slice(0, 4) == "town" ? "town" : "village";

            overlay.innerHTML = '';

            if (hoveredFeature) {
                map.removeFeatureState(hoveredFeature);
            }

            hoveredFeature = {
                source: specificSource,
                id: e.features[0].properties.id
            }

            map.setFeatureState(hoveredFeature, {
                hover: true
            });

            var title = e.features[0].properties.name;
            var blue = +e.features[0].properties.kmt + +e.features[0].properties.pfp;
            blue = Math.round(blue * 10) / 10;
            var green = e.features[0].properties.ddp;
            green = Math.round(green * 10) / 10;

            overlay.innerHTML = title + "<br/><span>藍營：" + blue + "%</span>" + "<br/><span>綠營：" + green + "%</span>";
            overlay.style.display = 'inline-block';
        });

        map.on('mouseleave', id, function () {
            var specificSource = id.slice(0, 4) == "coun" ? "county" : id.slice(0, 4) == "town" ? "town" : "village";

            if (hoveredFeature) {
                map.removeFeatureState(hoveredFeature);
            }
            hoveredFeature = null;
            map.getCanvas().style.cursor = '';
            overlay.innerHTML = '';
            overlay.style.display = 'none';
        });
    }
}