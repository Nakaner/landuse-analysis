-- SPDX-License-Identifier: FTWPL

local tables = {}

tables.water_lines = osm2pgsql.define_way_table('water_lines', {
    { column = 'waterway',    type = 'text' },
    { column = 'tunnel',    type = 'bool' },
    { column = 'bridge',    type = 'bool' },
    { column = 'layer',    type = 'smallint' },
    { column = 'tags',    type = 'hstore' },
    { column = 'geom',    type = 'linestring', projection = 4326 },
})

tables.street_polygons = osm2pgsql.define_area_table('street_polygons', {
    { column = 'highway',    type = 'text' },
    { column = 'service',    type = 'text' },
    { column = 'surface',    type = 'text' },
    { column = 'tracktype',    type = 'text' },
    { column = 'tunnel',    type = 'bool' },
    { column = 'bridge',    type = 'bool' },
    { column = 'layer',    type = 'smallint' },
    { column = 'tags',    type = 'hstore' },
    { column = 'geom',    type = 'geometry', projection = 4326 },
})

tables.streets = osm2pgsql.define_way_table('streets', {
    { column = 'bridge',    type = 'bool' },
    { column = 'highway',    type = 'text' },
    { column = 'railway',    type = 'text' },
    { column = 'service',    type = 'text' },
    { column = 'surface',    type = 'text' },
    { column = 'tracktype',    type = 'text' },
    { column = 'tunnel',    type = 'bool' },
    { column = 'layer',    type = 'smallint' },
    { column = 'tags',    type = 'hstore' },
    { column = 'geom',    type = 'linestring', projection = 4326 },
})

tables.land = osm2pgsql.define_area_table('land', {
    { column = 'feature',    type = 'text' },
    { column = 'tags',    type = 'hstore' },
    { column = 'geom',    type = 'geometry', projection = 4326 },
    { column = 'area',    type = 'real' },
    { column = 'mp_outer_way_count', type = 'integer' },
})

tables.admin_boundaries = osm2pgsql.define_area_table('admin_boundaries', {
    { column = 'admin_level',    type = 'smallint' },
    { column = 'name',    type = 'text' },
    { column = 'tags',    type = 'hstore' },
    { column = 'geom',    type = 'geometry', projection = 4326 },
})

-- A table listing all OSM values accepted for a given OSM key.
-- This is implemented by using the OSM values as keys in the Lua table and assigning the value true to them.
function Set(list)
    local set = {}
    for _, l in ipairs(list) do set[l] = true end
    return set
end

-- Management of accepted key-value pairs for the "land" table.
-- We write only whitelisted tags to the database.
land_amenity_values = Set { "police", "fire_station", "prison", "nursing_home",
    "grave_yard", "recycling", "university", "school", "college",
    "hospital", "clinic" }
land_leisure_values = Set { "playground", "dog_park", "sports_centre", "water_park",
    "golf_course", "stadium", "ice_rink" }
land_tourism_values = Set { "camp_site", "caravan_site", "zoo", "theme_park" }
land_man_made_values = Set { "wastewater_plant", "water_works" }
highway_values = Set { "motorway", "motorway_link", "trunk", "trunk_link", "primary", "primary_link", "secondary", "secondary_link", "tertiary", "tertiary_link", "unclassified", "residential", "service", "road", "living_street", "pedestrian", "track", "path", "footway", "cycleway", "bridleway", "steps", "construction", "busway", "bus_guideway" }
railway_values = Set { "rail", "narrow_gauge", "subway", "light_rail", "tram", "monorail", "funicular", "construction", "disused", "abandoned", "razed" }
unwanted_natural_values = Set { "bay", "strait", "mountain_range", "crater_rim", "peninsula", "valley" }
unwanted_landuse_values = Set { "winter_sports" }
unwanted_military_values = Set { "danger_area", "nuclear_explosion_site", "office" }

-- Check if provided OSM tag value is accepted. If true, return it. If false, return nil.
---- We return an empty string because Tilemaker cannot write NULL values into vector tiles.
function valueAcceptedOrNil(set, osm_value)
    if set[osm_value] then
        return osm_value
    end
    return nil
end

-- Return the input tag value. If it is listed in the provided set, nil will be returned.
function drop_unwanted_values(value, unwanted_set)
    if unwanted_set[value] then
        return nil
    end
    return value
end

function nilToEmptyStr(arg)
    if arg == nil then
        return ""
    end
    return arg
end

-- Convert layer tag to a number between -7 and +7, defaults to 0.
function layerNumeric(way)
    local layer = tonumber(way.tags.layer)
    if not (layer == nil) then
        if layer > 7 then
            layer = 7
        elseif layer < -7 then
            layer = -7
        end
        return layer
    end
    return 0
end

function yesToBool(value)
    if value == "yes" then
        return true
    end
    return false
end

-- Return first argument which is not nil.
function coalesce(landuse, waterway, natural, military, amenity, tourism, man_made, leisure)
    local arg = {landuse, waterway, natural, military, amenity, tourism, man_made, leisure}
    for i=1,8 do
        if arg[i] then
            return arg[i]
        end
    end
    return nil
end

function osm2pgsql.process_way(object)
    if osm2pgsql.stage == 2 then
        return
    end
    local area_tag = object.tags.area
    -- Way/Relation is explicitly tagged as area.
    local area_yes = (area_tag == "yes")
    -- Boolean flags for closed ways in cases where features can be mapped as line or area
    -- If closed ways are assumed to be polygons by default except tagged with area=no
    local is_area = (area_yes or (object.is_closed and (area_tag ~= "no" or area_tag == nil)))
    -- If closed ways are assumed to be rings by default except tagged with area=yes, type=multipolygon or type=boundary
    local is_area_default_linear = area_yes

    if not is_area and object.tags.waterway then
        process_water_lines(object)
    end
    if not is_area_default_linear and (object.tags.highway or object.tags.railway or object.tags.aeroway) then
        process_streets(object)
    end
    if is_area then
        process_area(object, false)
    end
    if is_area_default_linear then
        process_street_polygons(object)
    end
end

function osm2pgsql.process_relation(object)
    local rel_type = object.tags.type
    if rel_type == "multipolygon" or rel_type == "boundary" then
        process_area(object, true)
        process_area_default_linear(object)
    end
end

function process_area_default_linear(object)
    -- Layer street_polygons
    if object.tags.highway then
        process_street_polygons(object)
    end
end

function process_area(object, is_relation)
    process_land(object, is_relation)
    process_admin_boundary(object)
end

function process_admin_boundary(obj)
    if obj.type ~= "relation" then
        return
    end
    local boundary = obj.tags.boundary
    local admin_level = obj.tags.admin_level
    if boundary ~= "administrative" or not admin_level then
        return
    end
    local al = tonumber(admin_level)
    if not al or al > 8 or al < 2 then
        return
    end
    row = {
        admin_level = al,
        name = obj.tags.name,
        tags = obj.tags,
        geom = { create = "area" }
    }
    tables.admin_boundaries:add_row(row)
end

function process_land(obj, is_relation)
    local landuse = drop_unwanted_values(obj.tags.landuse, unwanted_landuse_values)
    local waterway = obj.tags.waterway
    local natural = drop_unwanted_values(obj.tags.natural, unwanted_natural_values)
    local military = drop_unwanted_values(obj.tags.military, unwanted_military_values)
    local amenity = valueAcceptedOrNil(land_amenity_values, obj.tags.amenity)
    local tourism = valueAcceptedOrNil(land_tourism_values, obj.tags.tourism)
    local man_made = valueAcceptedOrNil(land_man_made_values, obj.tags.man_made)
    local leisure = valueAcceptedOrNil(land_leisure_values, obj.tags.leisure)
    local feature = coalesce(landuse, waterway, natural, military, amenity, tourism, man_made, leisure)
    if feature ~= nil then
        local outer_way_member_count = 0
        if is_relation then
            for _, member in ipairs(obj.members) do
                if member.type == 'w' and member.role == "outer" then
                    outer_way_member_count = outer_way_member_count + 1
                end
            end
        end
        row = {
            feature = feature,
            tags = obj.tags,
            geom = { create = "area" },
            mp_outer_way_count = outer_way_member_count,
            area = obj:as_multipolygon():spherical_area(),
        }
        tables.land:add_row(row)
    end
end

function process_streets(way)
    local highway = valueAcceptedOrNil(highway_values, way.tags.highway)
    local railway = valueAcceptedOrNil(railway_values, way.tags.railway)
    local surface = way.tags.surface
    local tracktype = way.tags.tracktype
    local tunnelBool = toTunnelBool(way.tags.tunnel, way.tags.covered)
    local covered = way.tags.covered
    local service = way.tags.service
    local bridgeBool = toBridgeBool(way.tags.bridge)
    if not highway and not railway then
        return
    end
    local layer = tonumber(way.tags.layer)
    if layer == nil then
        layer = 0
    end
    local row = {
        highway = highway,
        railway = railway,
        surface = surface,
        tracktype = tracktype,
        tunnel = tunnelBool,
        covered = covered,
        service = service,
        bridge = bridgeBool,
        layer = layer,
        tags = way.tags,
        geom = { create = "line" }
    }
    tables.streets:add_row(row)
end

function process_street_polygons(way)
    local highway = way.tags.highway
    local surface = way.tags.surface
    local service = way.tags.service
    local kind = nil
    local mz = inf_zoom
    if highway ~= "pedestrian" and highway ~= "service" then
        return
    end
    local row = {
        highway = highway,
        surface = surface,
        tunnel = tunnelBool,
        covered = covered,
        service = service,
        bridge = bridgeBool,
        layer = layer,
        tags = way.tags,
        geom = { create = 'area' }
    }
    tables.street_polygons:add_row(row)
end

function toTunnelBool(tunnel, covered)
    if tunnel == "yes" or tunnel == "building_passage" or covered == "yes" then
        return true
    end
    return false
end

function toBridgeBool(bridge)
    if bridge == "yes" or bridge == "viaduct" or bridge == "boardwalk" or bridge == "cantilever" or bridge == "covered" or bridge == "low_water_crossing" or bridge == "movable" or bridge == "trestle" then
        return true
    end
    return false
end

function process_water_lines(way)
    if way.is_closed then
        return
    end
    local waterway = way.tags.waterway
    if waterway == "river" or waterway == "canal" or waterway == "canal" or waterway == "drain" or waterway == "stream" or waterway == "ditch" then
        local tunnel = toTunnelBool(way.tags.tunnel, way.tags.covered)
        local bridge = toBridgeBool(way.tags.bridge)
        local layer = layerNumeric(way)
        tables.water_lines:add_row({
            waterway = waterway,
            tunnel = tunnel,
            bridge = bridge,
            layer = layer,
            tags = way.tags,
            geom = { create = 'line' }
        })
    end
end
