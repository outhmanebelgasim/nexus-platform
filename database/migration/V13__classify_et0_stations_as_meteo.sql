UPDATE stations
SET station_category = 'METEO'
WHERE station_category IS NULL
  AND lower(code) LIKE 'et0\_%' ESCAPE '\';
