/**
 * System monitoring and alerting for Foleio platform
 * Tracks performance metrics, errors, and business KPIs
 */

interface MetricPoint {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp?: Date;
}

interface AlertConfig {
  name: string;
  condition: (metrics: Map<string, number>) => boolean;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cooldownMinutes: number;
}

export class SystemMonitor {
  private metrics = new Map<string, MetricPoint[]>();
  private alerts = new Map<string, Date>(); // Alert name -> last triggered
  private alertConfigs: AlertConfig[] = [];

  constructor() {
    this.initializeAlertConfigs();
    this.startPeriodicCleanup();
  }

  private initializeAlertConfigs() {
    this.alertConfigs = [
      {
        name: 'high-error-rate',
        condition: (metrics) => (metrics.get('errors.total') || 0) > 10,
        message: 'High error rate detected: >10 errors in last 5 minutes',
        severity: 'high',
        cooldownMinutes: 15
      },
      {
        name: 'upload-queue-backlog',
        condition: (metrics) => (metrics.get('queue.media_processing.waiting') || 0) > 50,
        message: 'Upload queue backlog: >50 jobs waiting',
        severity: 'medium',
        cooldownMinutes: 30
      },
      {
        name: 'high-cost-spike',
        condition: (metrics) => (metrics.get('billing.cost.hourly') || 0) > 100,
        message: 'Cost spike detected: >$100 in last hour',
        severity: 'high',
        cooldownMinutes: 60
      },
      {
        name: 'storage-nearing-limit',
        condition: (metrics) => {
          const used = metrics.get('storage.used_gb') || 0;
          const limit = metrics.get('storage.limit_gb') || 100;
          return (used / limit) > 0.9; // 90% usage
        },
        message: 'Storage nearing limit: >90% capacity used',
        severity: 'medium',
        cooldownMinutes: 1440 // 24 hours
      },
      {
        name: 'mux-upload-failures',
        condition: (metrics) => {
          const failures = metrics.get('uploads.mux.failed') || 0;
          const total = metrics.get('uploads.mux.total') || 1;
          return (failures / total) > 0.1; // 10% failure rate
        },
        message: 'Mux upload failure rate >10%',
        severity: 'high',
        cooldownMinutes: 10
      }
    ];
  }

  // Record a metric
  record(name: string, value: number, tags: Record<string, string> = {}) {
    const point: MetricPoint = {
      name,
      value,
      tags,
      timestamp: new Date()
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const points = this.metrics.get(name)!;
    points.push(point);

    // Keep only last 1000 points per metric
    if (points.length > 1000) {
      points.shift();
    }

    // Check for alerts
    this.checkAlerts();
  }

  // Increment a counter metric
  increment(name: string, tags: Record<string, string> = {}) {
    const current = this.getLatestValue(name, tags) || 0;
    this.record(name, current + 1, tags);
  }

  // Record timing (in milliseconds)
  timing(name: string, duration: number, tags: Record<string, string> = {}) {
    this.record(`${name}.duration`, duration, tags);
  }

  // Record gauge value
  gauge(name: string, value: number, tags: Record<string, string> = {}) {
    this.record(name, value, { ...tags, type: 'gauge' });
  }

  // Get latest value for a metric
  getLatestValue(name: string, tags: Record<string, string> = {}): number | null {
    const points = this.metrics.get(name);
    if (!points || points.length === 0) return null;

    // Find most recent point with matching tags
    for (let i = points.length - 1; i >= 0; i--) {
      const point = points[i];
      const tagsMatch = Object.entries(tags).every(
        ([key, value]) => point.tags?.[key] === value
      );

      if (tagsMatch) {
        return point.value;
      }
    }

    return null;
  }

  // Get metrics summary for last N minutes
  getMetricsSummary(minutes: number = 5): Record<string, any> {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    const summary: Record<string, any> = {};

    for (const [name, points] of this.metrics.entries()) {
      const recentPoints = points.filter(p => (p.timestamp || new Date()) > cutoff);

      if (recentPoints.length === 0) continue;

      const values = recentPoints.map(p => p.value);
      summary[name] = {
        count: values.length,
        sum: values.reduce((a, b) => a + b, 0),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        latest: values[values.length - 1]
      };
    }

    return summary;
  }

  // Track upload metrics
  trackUpload(
    userId: string,
    contentType: 'video' | 'image',
    provider: string,
    success: boolean,
    duration?: number,
    fileSize?: number
  ) {
    const tags = { contentType, provider, userId };

    this.increment('uploads.total', tags);
    this.increment(`uploads.${provider}.total`, tags);

    if (success) {
      this.increment('uploads.success', tags);
      this.increment(`uploads.${provider}.success`, tags);
    } else {
      this.increment('uploads.failed', tags);
      this.increment(`uploads.${provider}.failed`, tags);
    }

    if (duration) {
      this.timing('uploads.duration', duration, tags);
    }

    if (fileSize) {
      this.gauge('uploads.file_size', fileSize, tags);
    }
  }

  // Track API metrics
  trackApiCall(
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number,
    userId?: string
  ) {
    const tags = { endpoint, method, statusCode: statusCode.toString(), userId: userId || 'anonymous' };

    this.increment('api.calls.total', tags);

    if (statusCode >= 400) {
      this.increment('api.errors', tags);
    }

    this.timing('api.duration', duration, tags);
  }

  // Track billing metrics
  trackBilling(cost: number, type: string, userId: string) {
    this.record('billing.cost', cost, { type, userId });
    this.increment('billing.transactions', { type });
  }

  // Track storage metrics
  trackStorage(usedGB: number, totalGB: number, userId?: string) {
    const tags: Record<string, string> = {};
    if (userId) {
      tags.userId = userId;
    }
    this.gauge('storage.used_gb', usedGB, tags);
    this.gauge('storage.limit_gb', totalGB, tags);
    this.gauge('storage.utilization_percent', (usedGB / totalGB) * 100, tags);
  }

  // Track queue metrics
  trackQueueMetrics(queueName: string, stats: { waiting: number; active: number; completed: number; failed: number }) {
    this.gauge(`queue.${queueName}.waiting`, stats.waiting);
    this.gauge(`queue.${queueName}.active`, stats.active);
    this.gauge(`queue.${queueName}.completed`, stats.completed);
    this.gauge(`queue.${queueName}.failed`, stats.failed);
  }

  // Check for alerts
  private checkAlerts() {
    const currentMetrics = new Map<string, number>();

    // Get current values for all metrics
    for (const name of this.metrics.keys()) {
      const latest = this.getLatestValue(name);
      if (latest !== null) {
        currentMetrics.set(name, latest);
      }
    }

    // Check each alert condition
    for (const config of this.alertConfigs) {
      const lastTriggered = this.alerts.get(config.name);
      const now = new Date();

      // Check cooldown
      if (lastTriggered) {
        const cooldownMs = config.cooldownMinutes * 60 * 1000;
        if (now.getTime() - lastTriggered.getTime() < cooldownMs) {
          continue; // Still in cooldown
        }
      }

      // Check condition
      if (config.condition(currentMetrics)) {
        this.triggerAlert(config);
        this.alerts.set(config.name, now);
      }
    }
  }

  private triggerAlert(config: AlertConfig) {
    const alert = {
      name: config.name,
      message: config.message,
      severity: config.severity,
      timestamp: new Date(),
      metrics: this.getMetricsSummary(5) // Last 5 minutes
    };

    console.error(`🚨 ALERT [${config.severity.toUpperCase()}]: ${config.message}`);

    // In production, this would send to monitoring service (DataDog, Sentry, etc.)
    // For now, log to console and could send email/notification

    // TODO: Integrate with external monitoring service
    // this.sendToMonitoringService(alert);
  }

  // Export metrics for external monitoring
  exportMetrics(): Record<string, any> {
    const exported: Record<string, any> = {};

    for (const [name, points] of this.metrics.entries()) {
      exported[name] = points.slice(-10); // Last 10 points
    }

    return exported;
  }

  // Health check
  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    checks: Record<string, boolean>;
    metrics: Record<string, number>;
  } {
    const checks: Record<string, boolean> = {};
    const metrics = this.getMetricsSummary(5);

    // Check error rates
    const errorRate = (metrics['api.errors']?.avg || 0) / (metrics['api.calls.total']?.avg || 1);
    checks['error_rate_acceptable'] = errorRate < 0.05; // <5% errors

    // Check queue health
    const queueWaiting = metrics['queue.media_processing.waiting']?.latest || 0;
    checks['queue_healthy'] = queueWaiting < 100;

    // Check upload success rate
    const uploadSuccess = metrics['uploads.success']?.avg || 0;
    const uploadTotal = metrics['uploads.total']?.avg || 1;
    checks['upload_success_rate'] = (uploadSuccess / uploadTotal) > 0.95; // >95% success

    // Determine overall status
    const criticalChecks = Object.values(checks).filter(v => !v);
    const status = criticalChecks.length > 2 ? 'critical' :
                   criticalChecks.length > 0 ? 'warning' : 'healthy';

    return {
      status,
      checks,
      metrics: Object.fromEntries(
        Object.entries(metrics).map(([k, v]) => [k, v.latest || 0])
      )
    };
  }

  private startPeriodicCleanup() {
    // Clean old metrics every hour
    setInterval(() => {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

      for (const [name, points] of this.metrics.entries()) {
        const recentPoints = points.filter(p => (p.timestamp || new Date()) > cutoff);
        this.metrics.set(name, recentPoints);
      }

      console.log('🧹 Cleaned old metrics data');
    }, 60 * 60 * 1000); // Every hour
  }
}

// Export singleton instance
export const systemMonitor = new SystemMonitor();

// Middleware for tracking API calls
export function createApiTrackingMiddleware() {
  return async (req: Request, res: Response, next: () => void) => {
    const start = Date.now();
    const url = new URL(req.url);
    const method = req.method;
    const endpoint = url.pathname;

    // Track the call
    try {
      await next();
      const duration = Date.now() - start;
      systemMonitor.trackApiCall(endpoint, method, res.status, duration);
    } catch (error) {
      const duration = Date.now() - start;
      systemMonitor.trackApiCall(endpoint, method, 500, duration);
      throw error;
    }
  };
}
