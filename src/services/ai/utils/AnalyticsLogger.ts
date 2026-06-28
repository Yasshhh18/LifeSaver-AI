import type { AnalyticsData } from '../types';

export class AnalyticsLogger {
  private logs: AnalyticsData[] = [];

  logRequest(data: AnalyticsData) {
    this.logs.push(data);
    
    const status = data.success ? '✅ SUCCESS' : '❌ FAILED';
    const cacheStr = data.isCacheHit ? '[CACHE HIT]' : '[API CALL]';
    
    console.log(`[AI Analytics] ${status} | ${data.provider} | ${data.durationMs}ms | ${cacheStr}`);
    
    if (data.error) {
      console.error(`[AI Error] ${data.provider}: ${data.error}`);
    }
  }

  getMetrics() {
    const total = this.logs.length;
    const successful = this.logs.filter(l => l.success).length;
    const failed = total - successful;
    const cacheHits = this.logs.filter(l => l.isCacheHit).length;
    
    return {
      total,
      successful,
      failed,
      cacheHits,
    };
  }
}
