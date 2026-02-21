class PerformanceMetricsCollector {
  constructor(page) {
    this.page = page;
    this.metrics = [];
  }
  
  async startCollection() {
    await this.page.addInitScript(() => {
      window.__perfMetrics = {
        marks: {},
        measures: [],
        resources: []
      };
      
      try {
        const paintObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach(entry => {
            window.__perfMetrics.marks[entry.name] = entry.startTime;
          });
        });
        paintObserver.observe({ type: 'paint', buffered: true });
      } catch (e) {
        console.warn('Paint observer not supported');
      }
      
      try {
        const navObserver = new PerformanceObserver((list) => {
          window.__perfMetrics.navigation = list.getEntries()[0];
        });
        navObserver.observe({ type: 'navigation', buffered: true });
      } catch (e) {
        console.warn('Navigation observer not supported');
      }
      
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          window.__perfMetrics.resources.push(...list.getEntries());
        });
        resourceObserver.observe({ type: 'resource', buffered: true });
      } catch (e) {
        console.warn('Resource observer not supported');
      }
    });
  }
  
  async mark(name) {
    await this.page.evaluate((n) => {
      performance.mark(n);
      window.__perfMetrics.marks[n] = performance.now();
    }, name);
  }
  
  async measure(name, startMark, endMark) {
    await this.page.evaluate((n, s, e) => {
      performance.measure(n, s, e);
      const measure = performance.getEntriesByName(n)[0];
      if (measure) {
        window.__perfMetrics.measures.push(measure);
      }
    }, name, startMark, endMark);
  }
  
  async getMetrics() {
    return await this.page.evaluate(() => window.__perfMetrics);
  }
  
  async getOpenLayersMetrics() {
    return await this.page.evaluate(() => {
      let cogSource = window.cogSource;
      let map = window.olMap;
      
      if (!cogSource && map) {
        const layers = map.getLayers().getArray();
        for (const layer of layers) {
          if (layer.getSource && layer.getSource().getState) {
            const source = layer.getSource();
            if (source.getState && typeof source.getState === 'function') {
              cogSource = source;
              break;
            }
          }
        }
      }
      
      if (!cogSource && !map) {
        return null;
      }
      
      const metrics = {
        hasMap: !!map,
        hasSource: !!cogSource
      };
      
      if (map) {
        const view = map.getView();
        metrics.mapCenter = view.getCenter();
        metrics.mapZoom = view.getZoom();
        metrics.mapResolution = view.getResolution();
      }
      
      if (cogSource) {
        metrics.sourceState = cogSource.getState();
        metrics.tileCacheCount = null;

        if (cogSource.getKeys) {
          metrics.sourceKeys = cogSource.getKeys();
        }
      }
      
      return metrics;
    });
  }
  
  async clearMetrics() {
    await this.page.evaluate(() => {
      window.__perfMetrics = {
        marks: {},
        measures: [],
        resources: []
      };
    });
  }
}

export { PerformanceMetricsCollector };
