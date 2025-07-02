class Earthquake {
  constructor(feature) {
    this.mag = feature.properties.mag;
    this.place = feature.properties.place;
    this.time = new Date(feature.properties.time).toLocaleString();
    this.coords = [
      feature.geometry.coordinates[1],
      feature.geometry.coordinates[0]
    ];
  }

  getPopupContent() {
    return `<strong>${this.place}</strong><br>Magnitude: ${this.mag}<br>${this.time}`;
  }
}

class EarthquakeMap {
  constructor(mapId) {
    // Restrict map to a single world
    const worldBounds = [[-85, -180], [85, 180]];
    this.map = L.map(mapId, {
      worldCopyJump: false,
      maxBounds: worldBounds,
      maxBoundsViscosity: 1.0,
      minZoom: 2
    }).setView([20, 0], 2);
    this.tileLayers = {
      'Reset': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { noWrap: true }),
      'Dark': L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { noWrap: true }),
      // Esri World Imagery for Satellite
      'Satellite': L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        noWrap: true,
        detectRetina: true,
        attribution: 'Tiles © Esri — Source: Esri, Earthstar Geographics'
      })


    };
    this.currentTileLayer = this.tileLayers['Reset'].addTo(this.map);
    this.earthquakeData = [];
    this.earthquakeMarkers = [];
    this.currentMagnitude = 'All';
    this.currentDepth = 'All';
    this.currentTime = 'all_day';
    this.bufferZoneLayer = null;
    this.showBufferZones = false;
    this.initFilters();
  }

  async loadEarthquakes(timePeriod = 'all_day') {
    this.showLoading(true);
    let url;
    switch (timePeriod) {
      case 'hour':
        url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson';
        break;
      case 'day':
        url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';
        break;
      case 'week':
        url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson';
        break;
      case 'month':
        url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson';
        break;
      default:
        url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';
    }
    try {
      const res = await fetch(url);
      const data = await res.json();
      this.earthquakeData = data.features;
      this.applyFilters();
    } catch (err) {
      console.error('Failed to fetch earthquake data:', err);
    } finally {
      this.showLoading(false);
    }
  }

  clearMap() {
    this.earthquakeMarkers.forEach(marker => this.map.removeLayer(marker));
    this.earthquakeMarkers = [];
    if (this.bufferZoneLayer) {
      this.map.removeLayer(this.bufferZoneLayer);
      this.bufferZoneLayer = null;
    }
  }

  applyFilters() {
    this.clearMap();
    let filtered = this.earthquakeData;
    // Magnitude filter
    if (this.currentMagnitude !== 'All') {
      const minMag = parseInt(this.currentMagnitude);
      filtered = filtered.filter(f => f.properties.mag >= minMag);
    }
    // Depth filter
    if (this.currentDepth !== 'All') {
      filtered = filtered.filter(f => {
        const depth = f.geometry.coordinates[2];
        if (this.currentDepth === 'Shallow') return depth < 70;
        if (this.currentDepth === 'Moderate') return depth >= 70 && depth < 300;
        if (this.currentDepth === 'Deep') return depth >= 300;
        return true;
      });
    }
    this.plotEarthquakes(filtered);
  }

  plotEarthquakes(features) {
    features.forEach(feature => {
      const quake = new Earthquake(feature);
      const marker = L.circle(quake.coords, {
        radius: quake.mag * 20000,
        color: 'red'
      })
      .bindPopup(quake.getPopupContent())
      .addTo(this.map);
      this.earthquakeMarkers.push(marker);
    });
    if (this.showBufferZones) {
      this.addBufferZones(features);
    }
  }

  addBufferZones(features) {
    if (this.bufferZoneLayer) {
      this.map.removeLayer(this.bufferZoneLayer);
      this.bufferZoneLayer = null;
    }
    const bufferGroup = L.layerGroup();
    features.forEach(feature => {
      const coords = [feature.geometry.coordinates[1], feature.geometry.coordinates[0]];
      const buffer = L.circle(coords, {
        radius: 100000, // 100km buffer
        color: 'blue',
        fill: false
      });
      bufferGroup.addLayer(buffer);
    });
    bufferGroup.addTo(this.map);
    this.bufferZoneLayer = bufferGroup;
  }

  toggleBufferZones() {
    this.showBufferZones = !this.showBufferZones;
    this.applyFilters();
  }

  initFilters() {
    // Magnitude
    const magSelect = document.getElementById('magnitude');
    if (magSelect) {
      magSelect.addEventListener('change', (e) => {
        this.currentMagnitude = e.target.value;
        this.applyFilters();
      });
    }
    // Depth
    const depthSelect = document.getElementById('depth');
    if (depthSelect) {
      depthSelect.addEventListener('change', (e) => {
        this.currentDepth = e.target.value;
        this.applyFilters();
      });
    }
    // Time period buttons
    const timeButtons = [
      { selector: 'Last 100 Quakes', period: 'last100' },
      { selector: 'Last Hour', period: 'hour' },
      { selector: 'Last Day', period: 'day' },
      { selector: 'Last Week', period: 'week' },
      { selector: 'Last Month', period: 'month' },
      { selector: '20 Years, Mag 5+', period: '20years5plus' }
    ];
    timeButtons.forEach(btn => {
      const el = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === btn.selector);
      if (el) {
        el.addEventListener('click', () => {
          this.currentTime = btn.period;
          if (btn.period === 'last100') {
            this.loadLast100Quakes();
          } else if (btn.period === '20years5plus') {
            this.load20YearsMag5Plus();
          } else {
            this.loadEarthquakes(btn.period);
          }
        });
      }
    });
    // Map style
    const styleSelect = document.getElementById('style');
    if (styleSelect) {
      styleSelect.addEventListener('change', (e) => {
        const style = e.target.value;
        if (this.currentTileLayer) this.map.removeLayer(this.currentTileLayer);
        this.currentTileLayer = this.tileLayers[style] || this.tileLayers['Reset'];
        this.currentTileLayer.addTo(this.map);
      });
    }
    // Buffer Zone (100km)
    const bufferBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Buffer Zone (100km)');
    if (bufferBtn) {
      bufferBtn.addEventListener('click', () => {
        this.toggleBufferZones();
      });
    }
  }

  async loadLast100Quakes() {
    this.showLoading(true);
    const url = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&limit=100&orderby=time';
    try {
      const res = await fetch(url);
      const data = await res.json();
      this.earthquakeData = data.features;
      this.applyFilters();
    } catch (err) {
      console.error('Failed to fetch last 100 earthquakes:', err);
    } finally {
      this.showLoading(false);
    }
  }

  async load20YearsMag5Plus() {
    this.showLoading(true);
    try {
      // Calculate dates properly
      const now = new Date();
      const endDate = now.toISOString();
      
      // Create start date 20 years ago
      const startDate = new Date(now.getFullYear() - 20, now.getMonth(), now.getDate());
      const startDateISO = startDate.toISOString();
      
      // USGS API URL for 20 years of M5+ earthquakes
      const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${startDateISO}&endtime=${endDate}&minmagnitude=5&orderby=time`;
      
      console.log('Fetching 20 years M5+ data from:', url);
      
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      console.log(`Fetched ${data.features.length} M5+ earthquakes from the last 20 years`);
      
      this.earthquakeData = data.features;
      this.applyFilters();
    } catch (err) {
      console.error('Failed to fetch 20 years M5+ earthquakes:', err);
      // Fallback to a smaller dataset if the 20-year query fails
      console.log('Falling back to last 30 days M5+ earthquakes...');
      await this.loadEarthquakes('month');
    } finally {
      this.showLoading(false);
    }
  }

  showLoading(show) {
    const el = document.getElementById('loading-indicator');
    if (el) el.style.display = show ? '' : 'none';
  }
}

// Run on page load
document.addEventListener('DOMContentLoaded', () => {
  const eqMap = new EarthquakeMap('map');
  eqMap.loadEarthquakes();
});

