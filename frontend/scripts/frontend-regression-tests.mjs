import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

const restrictedPage = read("src/pages/RestrictedStationsPage.tsx");
const graphService = read("src/services/graphService.ts");
const usersPage = read("src/pages/UsersPage.tsx");
const chart = read("src/components/measurement-chart/MeasurementChart.tsx");
const toolbar = read("src/components/measurement-chart/ChartToolbar.tsx");
const dashboardHelpers = read("src/lib/restrictedStationDashboard.ts");
const chartHelpers = read("src/lib/chartInteraction.ts");

assert.match(graphService, /stationGraphsPath\(stationId\)/, "station graph endpoint must be built from station id");
assert.match(graphService, /graphMeasurementsPath\(stationId, graphId\)/, "measurement endpoint must include station id and graph id");
assert.match(restrictedPage, /parseStationRouteId\(stationId\)/, "station route id must be validated before requests");
assert.match(restrictedPage, /graphService\.currentStationGraphs\(selectedStationId\)/, "station page must request station-scoped graph definitions");
assert.doesNotMatch(restrictedPage, /graphService\.currentGraphs\(category\)/, "station dashboard must not fall back to category-global graphs");
assert.match(restrictedPage, /Promise\.allSettled/, "measurement loading must be per graph, not all-or-nothing");
assert.match(restrictedPage, /No active graphs have been assigned\./, "empty graph list must use professional empty-state copy");
assert.doesNotMatch(restrictedPage, /Request failed with status code/, "raw Axios errors must not be rendered");

assert.match(usersPage, /graphStationId/, "graph assignment must require a selected station context");
assert.match(usersPage, /stationId: validGraphStationId/, "assigned graph payload must contain stationId");
assert.match(usersPage, /variableId/, "assigned graph payload must contain station-specific variable IDs");
assert.match(usersPage, /filterVariablesForGraphStation/, "graph variables must be filtered by selected station");
assert.match(usersPage, /validGraphVariableIds/, "station changes must preserve only valid selected variables");
assert.match(usersPage, /Select a station before choosing graph variables/, "variable selector must be disabled until a station is selected");

assert.match(chart, /onWheel/, "chart must support mouse wheel and trackpad zoom");
assert.match(chart, /setPointerCapture/, "chart must support drag panning");
assert.match(chart, /strokeDasharray="4 4"/, "chart must render a crosshair while tracking the cursor");
assert.match(chart, /Timeline navigator/, "chart must render a visible timeline navigator");
assert.match(chart, /Visible range/, "chart must display the active date range");
assert.match(chart, /Resize \$\{mode\} of visible range/, "timeline navigator must expose resizable range handles");
assert.match(chart, /aspect-\[16\/9\]/, "chart must use a responsive aspect ratio");
assert.match(toolbar, /Scroll left/, "toolbar must include horizontal pan left control");
assert.match(toolbar, /Scroll right/, "toolbar must include horizontal pan right control");

assert.match(dashboardHelpers, /stationGraphsPath/, "restricted dashboard endpoint helper must exist");
assert.match(dashboardHelpers, /filterVariablesForGraphStation/, "station-dependent variable helper must exist");
assert.match(chartHelpers, /nextZoom/, "zoom helper must exist");
assert.match(chartHelpers, /nextPanOffset/, "pan helper must exist");
assert.match(chartHelpers, /nearestTimestamp/, "cursor tracking helper must exist");
assert.match(chartHelpers, /viewportFromPercentages/, "timeline navigator viewport helper must exist");
assert.match(chartHelpers, /zoomAroundTimestamp/, "wheel zoom must preserve its cursor anchor");

console.log("Frontend regression checks passed.");
