/**
 * Cost monitoring and billing system
 * Tracks usage costs and enforces quotas
 */

import { prisma } from '@foleio/database';
import { Currency } from '@/lib/currency/currency';

export interface UsageRecord {
  userId: string;
  type: 'UPLOAD' | 'STORAGE' | 'BANDWIDTH' | 'TRANSCODING';
  provider: string;
  amount: number;
  cost: number;
  metadata?: Record<string, any>;
}

export interface CostEstimate {
  storage: number;
  bandwidth: number;
  processing: number;
  total: number;
}

export interface QuotaCheck {
  allowed: boolean;
  currentUsage: number;
  limit: number;
  resetDate?: Date;
}

export class CostMonitor {
  // Cost rates per provider (in USD per unit)
  private readonly COST_RATES = {
    mux: {
      upload: 0.000015,    // $0.015 per GB uploaded
      storage: 0.000023,   // $0.023 per GB per month
      bandwidth: 0.000036, // $0.036 per GB served
      transcoding: 0.000015 // $0.015 per minute
    },
    r2: {
      upload: 0.000036,    // $0.036 per GB uploaded
      storage: 0.000023,   // $0.023 per GB per month
      bandwidth: 0.000036  // $0.036 per GB served
    },
    paystack: {
      transaction: 0.015,  // 1.5% transaction fee
      transfer: 0.01        // 1% transfer fee (minimum 10 NGN)
    }
  };

  // User quotas by plan
  private readonly USER_QUOTAS = {
    FREE: {
      storage: 5 * 1024 * 1024 * 1024,      // 5GB
      bandwidth: 50 * 1024 * 1024 * 1024,   // 50GB
      uploads: 10                            // 10 uploads per month
    },
    PRO: {
      storage: 100 * 1024 * 1024 * 1024,    // 100GB
      bandwidth: 1024 * 1024 * 1024 * 1024, // 1TB
      uploads: 1000                          // 1000 uploads per month
    },
    ENTERPRISE: {
      storage: 1024 * 1024 * 1024 * 1024,   // 1TB
      bandwidth: 10 * 1024 * 1024 * 1024 * 1024, // 10TB
      uploads: -1                            // Unlimited
    }
  };

  async estimateUploadCost(
    fileSize: number,
    contentType: 'video' | 'image',
    userId: string
  ): Promise<CostEstimate> {
    const provider = contentType === 'video' ? 'mux' : 'r2';

    // Estimate storage cost (30 days average retention)
    const storageCost = (fileSize / (1024 * 1024 * 1024)) * this.COST_RATES[provider].storage * 30;

    // Estimate bandwidth cost (assume 100 views per piece of content)
    const avgViewSize = contentType === 'video' ? fileSize * 0.3 : fileSize; // Videos stream partial, images full
    const bandwidthCost = (avgViewSize * 100) / (1024 * 1024 * 1024) * this.COST_RATES[provider].bandwidth;

    // Estimate processing cost
    let processingCost = 0;
    if (contentType === 'video') {
      const durationMinutes = await this.estimateVideoDuration(fileSize);
      processingCost = durationMinutes * this.COST_RATES.mux.transcoding;
    }

    const total = storageCost + bandwidthCost + processingCost;

    return {
      storage: storageCost,
      bandwidth: bandwidthCost,
      processing: processingCost,
      total
    };
  }

  async checkUserQuota(
    userId: string,
    quotaType: 'storage' | 'bandwidth' | 'uploads',
    additionalUsage: number = 0
  ): Promise<QuotaCheck> {
    try {
      const user: any = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          createdAt: true
        }
      });

      if (!user) {
        return { allowed: false, currentUsage: 0, limit: 0 };
      }

      const plan = ((user as any).plan as keyof typeof this.USER_QUOTAS) || 'FREE';
      const planLimits = this.USER_QUOTAS[plan];
      const limit = planLimits[quotaType];

      // Unlimited for enterprise
      if (limit === -1) {
        return { allowed: true, currentUsage: 0, limit: -1 };
      }

      // Calculate current usage for the month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const usageRecords = await prisma.usageRecord.findMany({
        where: {
          userId,
          type: quotaType.toUpperCase() as any,
          createdAt: {
            gte: startOfMonth
          }
        },
        select: {
          amount: true
        }
      });

      const currentUsage = usageRecords.reduce((sum, record) => sum + record.amount, 0);
      const totalUsage = currentUsage + additionalUsage;

      return {
        allowed: totalUsage <= limit,
        currentUsage,
        limit,
        resetDate: new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 1)
      };
    } catch (error) {
      console.error('Error checking user quota:', error);
      // Allow upload on error to avoid blocking users
      return { allowed: true, currentUsage: 0, limit: -1 };
    }
  }

  async trackUsage(record: UsageRecord): Promise<void> {
    try {
      await prisma.usageRecord.create({
        data: {
          userId: record.userId,
          type: record.type,
          provider: record.provider,
          amount: record.amount,
          cost: record.cost,
          metadata: record.metadata || {},
          createdAt: new Date()
        }
      });

      // Check for alerts
      await this.checkUsageAlerts(record.userId, record.cost);
    } catch (error) {
      console.error('Error tracking usage:', error);
      // Don't throw - logging failure shouldn't break uploads
    }
  }

  async deductFromBalance(userId: string, amount: Currency): Promise<boolean> {
    try {
      // Get current balance
      const user: any = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true }
      });

      if (!user) return false;

      const currentBalance = Currency.fromMinor(BigInt((user as any).balance ?? 0));
      if (amount.greaterThan(currentBalance)) {
        return false; // Insufficient funds
      }

      // Deduct from balance
      const newBalance = currentBalance.subtract(amount);
      await (prisma.user as any).update({
        where: { id: userId },
        data: { balance: newBalance.amount }
      });

      return true;
    } catch (error) {
      console.error('Error deducting from balance:', error);
      return false;
    }
  }

  async refundToBalance(userId: string, amount: Currency): Promise<void> {
    try {
      const user: any = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true }
      });

      if (!user) return;

      const currentBalance = Currency.fromMinor(BigInt((user as any).balance ?? 0));
      const newBalance = currentBalance.add(amount);

      await (prisma.user as any).update({
        where: { id: userId },
        data: { balance: newBalance.amount }
      });
    } catch (error) {
      console.error('Error refunding to balance:', error);
    }
  }

  private async checkUsageAlerts(userId: string, recentCost: number): Promise<void> {
    try {
      // Check daily spending
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const dailyUsage = await prisma.usageRecord.aggregate({
        where: {
          userId,
          createdAt: {
            gte: today,
            lt: tomorrow
          }
        },
        _sum: {
          cost: true
        }
      });

      const dailyTotal = (dailyUsage._sum.cost || 0) + recentCost;

      // Alert thresholds
      if (dailyTotal > 10) { // $10 daily limit
        console.warn(`⚠️ High daily usage alert for user ${userId}: $${dailyTotal.toFixed(2)}`);
        // TODO: Send email notification
      }

      // Check monthly spending
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const monthlyUsage = await prisma.usageRecord.aggregate({
        where: {
          userId,
          createdAt: {
            gte: startOfMonth
          }
        },
        _sum: {
          cost: true
        }
      });

      const monthlyTotal = (monthlyUsage._sum.cost || 0) + recentCost;

      if (monthlyTotal > 50) { // $50 monthly limit
        console.warn(`🚨 High monthly usage alert for user ${userId}: $${monthlyTotal.toFixed(2)}`);
        // TODO: Send email notification and potentially suspend uploads
      }
    } catch (error) {
      console.error('Error checking usage alerts:', error);
    }
  }

  private async estimateVideoDuration(fileSize: number): Promise<number> {
    // Rough estimation: assume 50MB/minute for HD video
    const bytesPerMinute = 50 * 1024 * 1024;
    return Math.max(1, fileSize / bytesPerMinute);
  }
}

// Export singleton instance
export const costMonitor = new CostMonitor();
