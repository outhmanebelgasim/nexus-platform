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
assert.match(graphService, /graphMeasurementsParams\(range\)/, "measurement request must send selected range mode");
assert.match(restrictedPage, /parseStationRouteId\(stationId\)/, "station route id must be validated before requests");
assert.match(restrictedPage, /graphService\.currentStationGraphs\(selectedStationId\)/, "station page must request station-scoped graph definitions");
assert.doesNotMatch(restrictedPage, /graphService\.currentGraphs\(category\)/, "station dashboard must not fall back to category-global graphs");
assert.match(restrictedPage, /rangeOptions[\s\S]*ALL_TIME/, "restricted dashboard must expose the All Time range");
assert.match(restrictedPage, /rangeStart=\{result\?\.firstMeasuredAt\}/, "chart must use backend firstMeasuredAt metadata");
assert.match(restrictedPage, /rangeEnd=\{result\?\.lastMeasuredAt\}/, "chart must use backend lastMeasuredAt metadata");
assert.match(restrictedPage, /aggregated:\$\{result\.bucketInterval/, "all-time CSV export must be labeled as aggregated");
assert.doesNotMatch(restrictedPage, /first 5,000 raw points/, "old first-5000 warning must not be rendered");
assert.match(restrictedPage, /Promise\.allSettled/, "measurement loading must be per graph, not all-or-nothing");
assert.match(restrictedPage, /No active graphs have been assigned\./, "empty graph list must use professional empty-state copy");
assert.doesNotMatch(restrictedPage, /Request failed with status code/, "raw Axios errors must not be rendered");

assert.match(usersPage, /graphStationId/, "graph assignment must require a selected station context");
assert.match(usersPage, /const stationId = validGraphStationId \?\? 0/, "assigned graph payload must normalize a validated stationId");
assert.match(usersPage, /stationId,/, "assigned graph payload must contain stationId");
assert.match(usersPage, /variableId/, "assigned graph payload must contain station-specific variable IDs");
assert.match(usersPage, /filterVariablesForGraphStation/, "graph variables must be filtered by selected station");
assert.match(usersPage, /validGraphVariableIds/, "station changes must preserve only valid selected variables");
assert.match(usersPage, /Select a station before choosing graph variables/, "variable selector must be disabled until a station is selected");
assert.match(usersPage, /Password reset/, "edit user modal must expose an administrative password reset section");
assert.match(usersPage, /userService\.resetPassword/, "valid admin password reset must call the dedicated endpoint");
assert.match(usersPage, /newPassword: ""/, "password reset fields must be clearable and optional");
assert.doesNotMatch(usersPage, /\.\.\.\(formMode === "edit" \? \{ password:/, "edit user payload must not include password");
assert.match(read("src/services/userService.ts"), /\/password`, payload\)/, "user service must call a dedicated password endpoint");

assert.match(chart, /onWheel/, "chart must support mouse wheel and trackpad zoom");
assert.match(chart, /setPointerCapture/, "chart must support drag panning");
assert.match(chart, /strokeDasharray="4 4"/, "chart must render a crosshair while tracking the cursor");
assert.match(chart, /Selected measurement/, "chart must expose a persistent selected-measurement panel");
assert.match(chart, /selectNearestFromPointer/, "chart must support touch and pointer selection");
assert.match(chart, /onKeyDown/, "chart must support keyboard timestamp navigation");
assert.match(chart, /No value/, "chart must not convert missing series values to zero");
assert.match(chart, /Timeline navigator/, "chart must render a visible timeline navigator");
assert.match(chart, /Visible range/, "chart must display the active date range");
assert.match(chart, /rangeStart/, "chart must accept explicit backend range start metadata");
assert.match(chart, /rangeEnd/, "chart must accept explicit backend range end metadata");
assert.match(chart, /explicitMinTime/, "visible range must prefer backend range metadata over bucket timestamps");
assert.match(chart, /csvModeLabel/, "CSV export must expose raw or aggregated export mode");
assert.match(chart, /hasRenderableData/, "chart must not render epoch axes when data failed or is empty");
assert.doesNotMatch(chart, /series\.length > 0 \? \([\s\S]*Visible range/, "visible range must not be shown from empty series alone");
assert.match(chart, /Resize \$\{mode\} of visible range/, "timeline navigator must expose resizable range handles");
assert.match(chart, /aspect-\[4\/3\]/, "chart must use a mobile-friendly responsive aspect ratio");
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
