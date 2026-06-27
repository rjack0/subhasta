const STORAGE_KEY = 'areascout.state.v1'
const DEFAULT_QUERY = 'Los Angeles, CA'
const DEFAULT_CENTER = [-118.2437, 34.0522]
const DEFAULT_RADIUS = 1800
const MAX_RADIUS = 5000

const GROUP_COLORS = {
  all: '#abff02',
  food: '#ff8a3d',
  groceries: '#ffd166',
  transit: '#54d3ff',
  schools: '#b794f4',
  health: '#f472b6',
  parks: '#4ade80',
  housing: '#facc15',
  other: '#9ca3af'
}

const CATEGORY_DEFS = {
  all: {
    label: 'All tagged places',
    clauses: [
      'nwr["amenity"](around:{radius},{lat},{lng});',
      'nwr["shop"](around:{radius},{lat},{lng});',
      'nwr["office"](around:{radius},{lat},{lng});',
      'nwr["leisure"](around:{radius},{lat},{lng});',
      'nwr["tourism"](around:{radius},{lat},{lng});',
      'nwr["public_transport"](around:{radius},{lat},{lng});',
      'nwr["railway"](around:{radius},{lat},{lng});',
      'nwr["craft"](around:{radius},{lat},{lng});'
    ]
  },
  food: {
    label: 'Food & drink',
    clauses: [
      'nwr["amenity"~"cafe|restaurant|bar|fast_food|pub|biergarten|food_court"](around:{radius},{lat},{lng});'
    ]
  },
  groceries: {
    label: 'Groceries',
    clauses: [
      'nwr["shop"~"supermarket|convenience|greengrocer|bakery|deli"](around:{radius},{lat},{lng});'
    ]
  },
  transit: {
    label: 'Transit',
    clauses: [
      'nwr["public_transport"](around:{radius},{lat},{lng});',
      'nwr["railway"~"station|tram_stop|halt|subway_entrance"](around:{radius},{lat},{lng});',
      'nwr["amenity"="bus_station"](around:{radius},{lat},{lng});'
    ]
  },
  schools: {
    label: 'Schools',
    clauses: [
      'nwr["amenity"~"school|college|university|kindergarten|language_school"](around:{radius},{lat},{lng});'
    ]
  },
  health: {
    label: 'Health',
    clauses: [
      'nwr["amenity"~"hospital|clinic|doctors|dentist|pharmacy"](around:{radius},{lat},{lng});'
    ]
  },
  parks: {
    label: 'Parks',
    clauses: [
      'nwr["leisure"~"park|playground|pitch|garden"](around:{radius},{lat},{lng});',
      'nwr["natural"~"wood|scrub|grassland|heath"](around:{radius},{lat},{lng});'
    ]
  },
  housing: {
    label: 'Housing stock',
    clauses: [
      'nwr["building"~"apartments|house|detached|semidetached_house|terrace|residential"](around:{radius},{lat},{lng});'
    ]
  }
}

const DEMO_RESULTS = [
  {
    id: 'demo/1',
    name: 'Grand Central Market',
    lat: 34.05081,
    lng: -118.24811,
    group: 'food',
    category: 'Food & drink',
    kind: 'marketplace',
    address: '317 S Broadway, Los Angeles, CA',
    source: 'Demo fallback',
    tags: { amenity: 'marketplace', operator: 'Grand Central Market' }
  },
  {
    id: 'demo/2',
    name: 'Pershing Square Station',
    lat: 34.04854,
    lng: -118.25154,
    group: 'transit',
    category: 'Transit',
    kind: 'subway station',
    address: '500 S Hill St, Los Angeles, CA',
    source: 'Demo fallback',
    tags: { railway: 'station', public_transport: 'station' }
  },
  {
    id: 'demo/3',
    name: 'The Broad',
    lat: 34.05444,
    lng: -118.25092,
    group: 'other',
    category: 'All tagged places',
    kind: 'museum',
    address: '221 S Grand Ave, Los Angeles, CA',
    source: 'Demo fallback',
    tags: { tourism: 'museum', amenity: 'arts_centre' }
  },
  {
    id: 'demo/4',
    name: 'Whole Foods Market',
    lat: 34.0488,
    lng: -118.2544,
    group: 'groceries',
    category: 'Groceries',
    kind: 'supermarket',
    address: '788 S Grand Ave, Los Angeles, CA',
    source: 'Demo fallback',
    tags: { shop: 'supermarket' }
  },
  {
    id: 'demo/5',
    name: 'Los Angeles Central Library',
    lat: 34.05056,
    lng: -118.25511,
    group: 'schools',
    category: 'Schools',
    kind: 'library',
    address: '630 W 5th St, Los Angeles, CA',
    source: 'Demo fallback',
    tags: { amenity: 'library' }
  },
  {
    id: 'demo/6',
    name: 'California Hospital Medical Center',
    lat: 34.0607,
    lng: -118.2689,
    group: 'health',
    category: 'Health',
    kind: 'hospital',
    address: '1401 S Grand Ave, Los Angeles, CA',
    source: 'Demo fallback',
    tags: { amenity: 'hospital' }
  },
  {
    id: 'demo/7',
    name: 'Grand Hope Park',
    lat: 34.04599,
    lng: -118.2629,
    group: 'parks',
    category: 'Parks',
    kind: 'park',
    address: '919 S Hope St, Los Angeles, CA',
    source: 'Demo fallback',
    tags: { leisure: 'park' }
  },
  {
    id: 'demo/8',
    name: 'The Beaudry',
    lat: 34.05491,
    lng: -118.26342,
    group: 'housing',
    category: 'Housing stock',
    kind: 'apartments',
    address: '960 W 7th St, Los Angeles, CA',
    source: 'Demo fallback',
    tags: { building: 'apartments' }
  }
]

const state = {
  query: DEFAULT_QUERY,
  category: 'all',
  radius: DEFAULT_RADIUS,
  areaLabel: DEFAULT_QUERY,
  center: DEFAULT_CENTER,
  results: [],
  selectedId: null,
  loading: false,
  sourceMode: 'live',
  map: null,
  toastTimer: null
}

const refs = {}

function $(id) {
  return document.getElementById(id)
}

function toRad(value) {
  return (value * Math.PI) / 180
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function formatDistance(meters) {
  if (!Number.isFinite(meters)) return 'n/a'
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(meters >= 10000 ? 0 : 1)} km`
}

function formatCoords(lat, lng) {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}

function haversineMeters(a, b) {
  const [lng1, lat1] = a
  const [lng2, lat2] = b
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const aa =
    sinLat * sinLat +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sinLng * sinLng
  return 6371000 * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa))
}

function titleCase(value) {
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

function inferGroup(tags = {}) {
  const amenity = tags.amenity || ''
  const shop = tags.shop || ''
  const leisure = tags.leisure || ''
  const railway = tags.railway || ''
  const building = tags.building || ''

  if (['cafe', 'restaurant', 'bar', 'fast_food', 'pub', 'biergarten', 'food_court', 'marketplace'].includes(amenity)) {
    return 'food'
  }
  if (['supermarket', 'convenience', 'greengrocer', 'bakery', 'deli', 'mall'].includes(shop)) {
    return 'groceries'
  }
  if (
    ['school', 'college', 'university', 'kindergarten', 'language_school', 'library'].includes(amenity)
  ) {
    return 'schools'
  }
  if (['hospital', 'clinic', 'doctors', 'dentist', 'pharmacy'].includes(amenity)) {
    return 'health'
  }
  if (['park', 'playground', 'pitch', 'garden'].includes(leisure)) {
    return 'parks'
  }
  if (
    ['station', 'tram_stop', 'halt', 'subway_entrance'].includes(railway) ||
    amenity === 'bus_station' ||
    tags.public_transport
  ) {
    return 'transit'
  }
  if (
    ['apartments', 'house', 'detached', 'semidetached_house', 'terrace', 'residential'].includes(building)
  ) {
    return 'housing'
  }
  return 'other'
}

function inferKind(tags = {}) {
  return (
    tags.amenity ||
    tags.shop ||
    tags.leisure ||
    tags.railway ||
    tags.building ||
    tags.office ||
    tags.tourism ||
    'tagged place'
  )
}

function formatAddress(tags = {}) {
  const line1 = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ')
  const line2 = [tags['addr:city'], tags['addr:state']].filter(Boolean).join(', ')
  return [line1, line2].filter(Boolean).join(', ')
}

function prettyLabelFromTags(tags = {}) {
  return titleCase(inferKind(tags))
}

function decodeOverpassElement(element) {
  const lat = element.lat ?? element.center?.lat
  const lng = element.lon ?? element.center?.lon
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null
  }

  const tags = element.tags ?? {}
  const group = inferGroup(tags)
  return {
    id: `${element.type}/${element.id}`,
    osmType: element.type,
    osmId: element.id,
    name: tags.name || prettyLabelFromTags(tags),
    kind: inferKind(tags),
    group,
    category: group === 'other' ? 'All tagged places' : CATEGORY_DEFS[group]?.label || 'All tagged places',
    address: formatAddress(tags) || 'Address not tagged',
    lat,
    lng,
    source: 'Live lookup',
    tags,
    url: `https://www.openstreetmap.org/${element.type}/${element.id}`
  }
}

function makeGeoJson(results) {
  return {
    type: 'FeatureCollection',
    features: results.map((result) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [result.lng, result.lat]
      },
      properties: {
        id: result.id,
        name: result.name,
        group: result.group,
        kind: result.kind,
        category: result.category,
        address: result.address
      }
    }))
  }
}

function getSearchRadius() {
  return clamp(Number(refs.radiusInput.value || DEFAULT_RADIUS), 800, MAX_RADIUS)
}

function getSelectedCategoryDefinition() {
  return CATEGORY_DEFS[state.category] || CATEGORY_DEFS.all
}

function persistState() {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        query: state.query,
        category: state.category,
        radius: state.radius,
        center: state.center,
        areaLabel: state.areaLabel
      })
    )
  } catch {
    // localStorage may be disabled.
  }
}

function restoreState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (typeof parsed.query === 'string') state.query = parsed.query
    if (typeof parsed.category === 'string' && CATEGORY_DEFS[parsed.category]) state.category = parsed.category
    if (Number.isFinite(parsed.radius)) state.radius = clamp(parsed.radius, 800, MAX_RADIUS)
    if (Array.isArray(parsed.center) && parsed.center.length === 2) {
      const [lng, lat] = parsed.center
      if (Number.isFinite(lng) && Number.isFinite(lat)) state.center = [lng, lat]
    }
    if (typeof parsed.areaLabel === 'string' && parsed.areaLabel) state.areaLabel = parsed.areaLabel
  } catch {
    // Ignore malformed storage.
  }
}

function setLoading(isLoading, message) {
  state.loading = isLoading
  refs.statusPill.textContent = message || (isLoading ? 'Loading' : 'Ready')
  refs.statusPill.classList.toggle('loading', isLoading)
  refs.statusPill.classList.toggle('error', false)
  refs.searchButton.disabled = isLoading
  refs.recenterButton.disabled = isLoading
  refs.radiusInput.disabled = isLoading
}

function setError(message) {
  refs.statusPill.textContent = message
  refs.statusPill.classList.remove('loading')
  refs.statusPill.classList.add('error')
  refs.searchButton.disabled = false
  refs.recenterButton.disabled = false
  refs.radiusInput.disabled = false
}

function showToast(message) {
  refs.toast.textContent = message
  refs.toast.classList.add('visible')
  window.clearTimeout(state.toastTimer)
  state.toastTimer = window.setTimeout(() => {
    refs.toast.classList.remove('visible')
  }, 2200)
}

function renderScopeChips() {
  refs.scopeChips.innerHTML = ''
  for (const [key, definition] of Object.entries(CATEGORY_DEFS)) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'chip-button'
    button.dataset.category = key
    button.innerHTML = `<div><strong>${definition.label}</strong><span>${key === 'all' ? 'Broad sweep' : 'Focused filter'}</span></div>`
    button.addEventListener('click', async () => {
      if (state.category === key) return
      state.category = key
      syncScopeUI()
      persistState()
      await runSearch()
    })
    refs.scopeChips.appendChild(button)
  }
  syncScopeUI()
}

function syncScopeUI() {
  const active = CATEGORY_DEFS[state.category] || CATEGORY_DEFS.all
  refs.scopeLabel.textContent = active.label
  for (const button of refs.scopeChips.querySelectorAll('button')) {
    button.classList.toggle('active', button.dataset.category === state.category)
  }
  for (const item of refs.legendList.querySelectorAll('.legend-item')) {
    item.classList.toggle('active', item.dataset.group === state.category)
  }
}

function renderLegend() {
  const items = [
    ['all', 'All tagged places'],
    ['food', 'Food & drink'],
    ['groceries', 'Groceries'],
    ['transit', 'Transit'],
    ['schools', 'Schools'],
    ['health', 'Health'],
    ['parks', 'Parks'],
    ['housing', 'Housing stock']
  ]

  refs.legendList.innerHTML = ''
  for (const [group, label] of items) {
    const item = document.createElement('div')
    item.className = 'legend-item'
    item.dataset.group = group
    item.innerHTML = `
      <span class="legend-swatch" style="background:${GROUP_COLORS[group] || GROUP_COLORS.other}"></span>
      <strong>${label}</strong>
      <span>${group}</span>
    `
    refs.legendList.appendChild(item)
  }
}

function renderStats() {
  refs.resultsCount.textContent = String(state.results.length)
  refs.dataMode.textContent = state.sourceMode === 'demo' ? 'Demo' : state.loading ? 'Loading' : 'Live'
  refs.areaSummary.textContent = state.areaLabel || state.query || DEFAULT_QUERY
  refs.viewportSummary.textContent = `${formatDistance(state.radius)} radius`
  refs.querySummary.textContent = state.query || DEFAULT_QUERY
  refs.centerSummary.textContent = formatCoords(state.center[1], state.center[0])
  refs.radiusReadout.textContent = state.radius >= 1000 ? `${(state.radius / 1000).toFixed(1)} km` : `${state.radius} m`
}

function renderResults() {
  const sorted = [...state.results].sort((a, b) => a.distance - b.distance)
  refs.resultStrip.innerHTML = ''

  for (const result of sorted.slice(0, 24)) {
    const card = document.createElement('article')
    card.className = 'result-card'
    card.dataset.id = result.id
    card.style.setProperty('--group-color', GROUP_COLORS[result.group] || GROUP_COLORS.other)
    if (result.id === state.selectedId) card.classList.add('active')

    const tags = Object.entries(result.tags)
      .slice(0, 3)
      .map(([key, value]) => `<span class="tag-pill">${titleCase(key)}: ${String(value)}</span>`)
      .join('')

    card.innerHTML = `
      <div class="result-topline">
        <div>
          <p class="result-kind">${result.category}</p>
          <h4 class="result-title">${result.name}</h4>
        </div>
        <p class="result-distance">${formatDistance(result.distance)}</p>
      </div>
      <p class="result-address">${result.address}</p>
      <div class="result-tags">${tags || '<span class="tag-pill">No extra tags</span>'}</div>
    `
    card.addEventListener('click', () => selectResult(result.id, true))
    refs.resultStrip.appendChild(card)
  }

  if (!sorted.length) {
    const empty = document.createElement('div')
    empty.className = 'result-card'
    empty.innerHTML = `
      <div class="result-topline">
        <div>
          <p class="result-kind">No matches yet</p>
          <h4 class="result-title">Search an area to populate the map.</h4>
        </div>
      </div>
      <p class="result-address">Use the area search to pull nearby OSM features into the strip below.</p>
    `
    refs.resultStrip.appendChild(empty)
  }
}

function renderDetail() {
  const selected = state.results.find((result) => result.id === state.selectedId)
  if (!selected) {
    refs.detailEmpty.hidden = false
    refs.detailCard.hidden = true
    return
  }

  refs.detailEmpty.hidden = true
  refs.detailCard.hidden = false
  refs.detailGroup.textContent = selected.category
  refs.detailName.textContent = selected.name
  refs.detailAddress.textContent = selected.address
  refs.detailDistance.textContent = formatDistance(selected.distance)
  refs.detailCoords.textContent = formatCoords(selected.lat, selected.lng)
  refs.detailCategory.textContent = selected.group
  refs.detailLink.href = selected.url
  refs.detailSource.textContent = selected.source
  refs.detailLink.textContent = 'Open OSM'

  refs.detailTags.innerHTML = ''
  for (const [key, value] of Object.entries(selected.tags)) {
    const pill = document.createElement('span')
    pill.className = 'tag-pill'
    pill.textContent = `${titleCase(key)}: ${String(value)}`
    refs.detailTags.appendChild(pill)
  }

  if (!selected.tags || Object.keys(selected.tags).length === 0) {
    const pill = document.createElement('span')
    pill.className = 'tag-pill'
    pill.textContent = 'No tagged metadata'
    refs.detailTags.appendChild(pill)
  }
}

function updateMapSource() {
  if (!state.map || !state.map.getSource('results')) return
  state.map.getSource('results').setData(makeGeoJson(state.results))
  state.map.setFilter('results-selected', ['==', ['get', 'id'], state.selectedId || ''])
}

function syncUI() {
  refs.areaInput.value = state.query
  refs.radiusInput.value = String(state.radius)
  refs.recenterButton.disabled = state.loading
  syncScopeUI()
  renderStats()
  renderResults()
  renderDetail()
  updateMapSource()
}

function selectResult(id, fromUser = false) {
  state.selectedId = id
  const result = state.results.find((entry) => entry.id === id)
  if (!result) {
    syncUI()
    return
  }

  if (state.map) {
    state.map.easeTo({
      center: [result.lng, result.lat],
      zoom: Math.max(state.map.getZoom(), 15.5),
      duration: 700
    })
  }

  if (fromUser) {
    showToast(result.name)
  }

  syncUI()
}

function updateViewportSummary() {
  if (!state.map) return
  const center = state.map.getCenter()
  refs.centerSummary.textContent = formatCoords(center.lat, center.lng)
  const bounds = state.map.getBounds()
  const span = haversineMeters(
    [bounds.getWest(), bounds.getNorth()],
    [bounds.getEast(), bounds.getSouth()]
  )
  refs.viewportSummary.textContent = `${formatDistance(Math.round(span / 2))} span`
}

function fitMapToArea(bbox) {
  if (!state.map || !bbox) return
  state.map.fitBounds(
    [
      [bbox[2], bbox[0]],
      [bbox[3], bbox[1]]
    ],
    { padding: 90, duration: 900 }
  )
}

async function geocodeArea(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&polygon_geojson=0&q=${encodeURIComponent(query)}`
  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!response.ok) {
    throw new Error(`Geocoder returned ${response.status}`)
  }

  const results = await response.json()
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error('No geocoding results')
  }

  const item = results[0]
  const lat = Number(item.lat)
  const lng = Number(item.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('Bad geocoding coordinates')
  }

  const bbox = Array.isArray(item.boundingbox)
    ? item.boundingbox.map((value) => Number(value))
    : null
  return {
    label: item.display_name || query,
    lat,
    lng,
    bbox
  }
}

function buildOverpassQuery(lat, lng, radius, category) {
  const definition = CATEGORY_DEFS[category] || CATEGORY_DEFS.all
  const clauses = definition.clauses
    .map((clause) =>
      clause
        .replaceAll('{lat}', String(lat))
        .replaceAll('{lng}', String(lng))
        .replaceAll('{radius}', String(radius))
    )
    .join('\n')

  return `[out:json][timeout:25];
(
${clauses}
);
out center tags;`
}

async function fetchOverpass(lat, lng, radius, category) {
  const query = buildOverpassQuery(lat, lng, radius, category)
  const body = new URLSearchParams({ data: query })
  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body
  })
  if (!response.ok) {
    throw new Error(`Overpass returned ${response.status}`)
  }
  const data = await response.json()
  if (!data || !Array.isArray(data.elements)) {
    throw new Error('Unexpected Overpass response')
  }
  return data.elements
}

function enrichResults(results, center) {
  return results
    .map((entry) => {
      const distance = haversineMeters(center, [entry.lng, entry.lat])
      return { ...entry, distance }
    })
    .sort((a, b) => a.distance - b.distance)
}

function applyResults(nextResults, sourceMode) {
  state.results = enrichResults(nextResults, [state.center[0], state.center[1]])
  state.sourceMode = sourceMode
  if (!state.results.find((entry) => entry.id === state.selectedId)) {
    state.selectedId = state.results[0]?.id ?? null
  }
  syncUI()
  renderStats()
  renderResults()
  renderDetail()
  updateMapSource()
}

async function runSearch({ keepCenter = false } = {}) {
  const query = refs.areaInput.value.trim()
  if (!query) {
    showToast('Enter an area name')
    return
  }

  state.query = query
  state.radius = getSearchRadius()
  persistState()
  setLoading(true, 'Searching')
  renderStats()

  try {
    const place = await geocodeArea(query)
    state.areaLabel = place.label
    state.center = [place.lng, place.lat]
    refs.areaSummary.textContent = state.areaLabel
    refs.querySummary.textContent = query
    refs.centerSummary.textContent = formatCoords(place.lat, place.lng)

    if (state.map) {
      state.map.easeTo({
        center: [place.lng, place.lat],
        zoom: keepCenter ? state.map.getZoom() : 12.8,
        duration: 900
      })
    }

    if (place.bbox && !keepCenter) {
      fitMapToArea(place.bbox)
    }

    const elements = await fetchOverpass(place.lat, place.lng, state.radius, state.category)
    const decoded = elements.map(decodeOverpassElement).filter(Boolean)
    applyResults(decoded, 'live')
    setLoading(false, `Loaded ${decoded.length} places`)
    showToast(`Loaded ${decoded.length} live places`)
    persistState()
    return
  } catch (error) {
    console.error(error)
    const fallback = DEMO_RESULTS.map((entry) => ({
      ...entry,
      distance: haversineMeters([entry.lng, entry.lat], state.center)
    }))
    applyResults(fallback, 'demo')
    setLoading(false, 'Demo fallback')
    showToast('Live lookup failed, showing demo pins')
    persistState()
  }
}

function initMap() {
  if (typeof window.maplibregl === 'undefined') {
    throw new Error('MapLibre failed to load')
  }

  const map = new window.maplibregl.Map({
    container: refs.map,
    style: {
      version: 8,
      name: 'Carto Dark Matter',
      sources: {
        carto: {
          type: 'raster',
          tiles: [
            'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'
          ],
          tileSize: 256,
          attribution: '&copy; CartoDB'
        }
      },
      layers: [
        {
          id: 'carto-dark',
          type: 'raster',
          source: 'carto'
        }
      ]
    },
    center: state.center,
    zoom: 12.8,
    attributionControl: false
  })

  map.addControl(new window.maplibregl.NavigationControl({ visualizePitch: false }), 'top-right')
  map.addControl(new window.maplibregl.ScaleControl({ maxWidth: 120, unit: 'imperial' }), 'bottom-left')

  map.on('load', () => {
    map.addSource('results', {
      type: 'geojson',
      data: makeGeoJson([]),
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 42
    })

    map.addLayer({
      id: 'results-cluster',
      type: 'circle',
      source: 'results',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#abff02',
        'circle-radius': ['step', ['get', 'point_count'], 14, 15, 20, 40, 28],
        'circle-opacity': 0.24,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#f3efe5'
      }
    })

    map.addLayer({
      id: 'results-cluster-count',
      type: 'symbol',
      source: 'results',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        'text-size': 11
      },
      paint: {
        'text-color': '#081015'
      }
    })

    map.addLayer({
      id: 'results-unclustered',
      type: 'circle',
      source: 'results',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': [
          'match',
          ['get', 'group'],
          'food',
          GROUP_COLORS.food,
          'groceries',
          GROUP_COLORS.groceries,
          'transit',
          GROUP_COLORS.transit,
          'schools',
          GROUP_COLORS.schools,
          'health',
          GROUP_COLORS.health,
          'parks',
          GROUP_COLORS.parks,
          'housing',
          GROUP_COLORS.housing,
          GROUP_COLORS.other
        ],
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 5, 14, 9, 16, 11],
        'circle-opacity': 0.92,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#081015'
      }
    })

    map.addLayer({
      id: 'results-selected',
      type: 'circle',
      source: 'results',
      filter: ['==', ['get', 'id'], ''],
      paint: {
        'circle-color': '#ffffff',
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 10, 14, 15, 16, 18],
        'circle-opacity': 0.05,
        'circle-stroke-width': 3,
        'circle-stroke-color': '#ffffff'
      }
    })

    map.on('click', 'results-cluster', async (event) => {
      const features = map.queryRenderedFeatures(event.point, { layers: ['results-cluster'] })
      const clusterId = features[0]?.properties?.cluster_id
      const source = map.getSource('results')
      if (!source || clusterId == null) return
      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return
        const coords = features[0].geometry.coordinates
        map.easeTo({ center: coords, zoom, duration: 600 })
      })
    })

    map.on('click', 'results-unclustered', (event) => {
      const feature = event.features?.[0]
      if (!feature) return
      const id = feature.properties?.id
      if (typeof id === 'string') {
        selectResult(id, true)
      }
    })

    map.on('mouseenter', 'results-unclustered', () => {
      map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', 'results-unclustered', () => {
      map.getCanvas().style.cursor = ''
    })

    map.on('moveend', () => {
      updateViewportSummary()
    })

    updateViewportSummary()
    updateMapSource()
  })

  state.map = map
}

function bindEvents() {
  refs.areaForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    await runSearch()
  })

  refs.radiusInput.addEventListener('input', () => {
    state.radius = getSearchRadius()
    renderStats()
    persistState()
  })

  refs.recenterButton.addEventListener('click', () => {
    if (!state.map) return
    state.map.easeTo({ center: state.center, zoom: 12.8, duration: 700 })
    showToast('Map recentered')
  })

  refs.copyCoordsButton.addEventListener('click', async () => {
    const selected = state.results.find((result) => result.id === state.selectedId)
    if (!selected) return
    await navigator.clipboard.writeText(formatCoords(selected.lat, selected.lng))
    showToast('Coordinates copied')
  })
}

function hydrateSelectedState() {
  refs.areaInput.value = state.query
  refs.radiusInput.value = String(state.radius)
  refs.areaSummary.textContent = state.areaLabel
  refs.querySummary.textContent = state.query
  refs.centerSummary.textContent = formatCoords(state.center[1], state.center[0])
}

async function bootstrap() {
  refs.areaForm = $('area-form')
  refs.areaInput = $('area-input')
  refs.radiusInput = $('radius-input')
  refs.radiusReadout = $('radius-readout')
  refs.scopeChips = $('scope-chips')
  refs.scopeLabel = $('scope-label')
  refs.legendList = $('legend-list')
  refs.resultsCount = $('results-count')
  refs.dataMode = $('data-mode')
  refs.areaSummary = $('area-summary')
  refs.viewportSummary = $('viewport-summary')
  refs.querySummary = $('query-summary')
  refs.centerSummary = $('center-summary')
  refs.statusPill = $('status-pill')
  refs.searchButton = refs.areaForm.querySelector('button[type="submit"]')
  refs.resultStrip = $('result-strip')
  refs.detailEmpty = $('detail-empty')
  refs.detailCard = $('detail-card')
  refs.detailGroup = $('detail-group')
  refs.detailName = $('detail-name')
  refs.detailAddress = $('detail-address')
  refs.detailDistance = $('detail-distance')
  refs.detailCoords = $('detail-coords')
  refs.detailCategory = $('detail-category')
  refs.detailLink = $('detail-link')
  refs.detailSource = $('detail-source')
  refs.detailTags = $('detail-tags')
  refs.copyCoordsButton = $('copy-coords-button')
  refs.recenterButton = $('recenter-button')
  refs.map = $('map')
  refs.toast = $('toast')

  restoreState()
  hydrateSelectedState()
  renderLegend()
  renderScopeChips()
  bindEvents()
  initMap()
  syncUI()

  await runSearch({ keepCenter: false })
}

window.addEventListener('DOMContentLoaded', () => {
  bootstrap().catch((error) => {
    console.error(error)
    showToast('Failed to initialize the map app')
    setError('Initialization failed')
  })
})
