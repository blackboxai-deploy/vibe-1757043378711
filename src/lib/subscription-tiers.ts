// Subscription Tiers Configuration for AnimaGenius
import { SubscriptionTier } from '@prisma/client'

export interface TierLimits {
  price: number
  videosPerMonth: number
  maxDuration: number // seconds, -1 for unlimited
  fileLimit: number // MB
  watermark: boolean
  features: string[]
  priority: number
  apiAccess: boolean
}

export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, TierLimits> = {
  [SubscriptionTier.FREE]: {
    price: 0,
    videosPerMonth: 5,
    maxDuration: 120, // 2 minutes
    fileLimit: 100, // 100MB
    watermark: true,
    features: [
      'basic_templates',
      'standard_ai',
      'community_support',
      'basic_analytics'
    ],
    priority: 1,
    apiAccess: false
  },
  
  [SubscriptionTier.STARTER]: {
    price: 29,
    videosPerMonth: 25,
    maxDuration: 600, // 10 minutes
    fileLimit: 500, // 500MB
    watermark: false,
    features: [
      'premium_templates',
      'advanced_ai',
      'custom_branding',
      'email_support',
      'hd_export',
      'detailed_analytics'
    ],
    priority: 2,
    apiAccess: false
  },
  
  [SubscriptionTier.PRO]: {
    price: 99,
    videosPerMonth: 100,
    maxDuration: 1800, // 30 minutes
    fileLimit: 2048, // 2GB
    watermark: false,
    features: [
      'all_templates',
      'custom_avatars',
      'api_access',
      'priority_support',
      '4k_export',
      'advanced_analytics',
      'team_collaboration',
      'custom_fonts',
      'batch_processing'
    ],
    priority: 3,
    apiAccess: true
  },
  
  [SubscriptionTier.ENTERPRISE]: {
    price: 499,
    videosPerMonth: -1, // unlimited
    maxDuration: -1, // unlimited
    fileLimit: 10240, // 10GB
    watermark: false,
    features: [
      'white_label',
      'dedicated_support',
      'custom_integrations',
      'admin_panel',
      'sso_integration',
      'unlimited_exports',
      'priority_processing',
      'custom_ai_models',
      'dedicated_account_manager',
      'compliance_features',
      'advanced_security'
    ],
    priority: 4,
    apiAccess: true
  }
}

export const PAYPAL_PLAN_IDS = {
  [SubscriptionTier.STARTER]: process.env.PAYPAL_STARTER_PLAN_ID || 'P-STARTER-PLAN',
  [SubscriptionTier.PRO]: process.env.PAYPAL_PRO_PLAN_ID || 'P-PRO-PLAN',
  [SubscriptionTier.ENTERPRISE]: process.env.PAYPAL_ENTERPRISE_PLAN_ID || 'P-ENTERPRISE-PLAN'
}

// Usage calculation helpers
export class SubscriptionService {
  static getTierLimits(tier: SubscriptionTier): TierLimits {
    return SUBSCRIPTION_TIERS[tier]
  }

  static canCreateVideo(tier: SubscriptionTier, currentUsage: number): boolean {
    const limits = this.getTierLimits(tier)
    if (limits.videosPerMonth === -1) return true // unlimited
    return currentUsage < limits.videosPerMonth
  }

  static canUploadFile(tier: SubscriptionTier, fileSizeMB: number): boolean {
    const limits = this.getTierLimits(tier)
    return fileSizeMB <= limits.fileLimit
  }

  static canCreateDuration(tier: SubscriptionTier, durationSeconds: number): boolean {
    const limits = this.getTierLimits(tier)
    if (limits.maxDuration === -1) return true // unlimited
    return durationSeconds <= limits.maxDuration
  }

  static hasFeature(tier: SubscriptionTier, feature: string): boolean {
    const limits = this.getTierLimits(tier)
    return limits.features.includes(feature)
  }

  static getProcessingPriority(tier: SubscriptionTier): number {
    return SUBSCRIPTION_TIERS[tier].priority
  }

  static shouldShowWatermark(tier: SubscriptionTier): boolean {
    return SUBSCRIPTION_TIERS[tier].watermark
  }

  static hasApiAccess(tier: SubscriptionTier): boolean {
    return SUBSCRIPTION_TIERS[tier].apiAccess
  }

  static getMonthlyPrice(tier: SubscriptionTier): number {
    return SUBSCRIPTION_TIERS[tier].price
  }

  static getUpgradeOptions(currentTier: SubscriptionTier): SubscriptionTier[] {
    const currentPriority = SUBSCRIPTION_TIERS[currentTier].priority
    
    return Object.keys(SUBSCRIPTION_TIERS)
      .filter(tier => SUBSCRIPTION_TIERS[tier as SubscriptionTier].priority > currentPriority)
      .map(tier => tier as SubscriptionTier)
  }

  static getDowngradeOptions(currentTier: SubscriptionTier): SubscriptionTier[] {
    const currentPriority = SUBSCRIPTION_TIERS[currentTier].priority
    
    return Object.keys(SUBSCRIPTION_TIERS)
      .filter(tier => SUBSCRIPTION_TIERS[tier as SubscriptionTier].priority < currentPriority)
      .map(tier => tier as SubscriptionTier)
  }

  static calculateProratedAmount(
    fromTier: SubscriptionTier, 
    toTier: SubscriptionTier, 
    daysRemaining: number
  ): number {
    const fromPrice = this.getMonthlyPrice(fromTier)
    const toPrice = this.getMonthlyPrice(toTier)
    const dailyDifference = (toPrice - fromPrice) / 30
    
    return Math.max(0, dailyDifference * daysRemaining)
  }

  static getRemainingVideos(tier: SubscriptionTier, usedVideos: number): number {
    const limits = this.getTierLimits(tier)
    if (limits.videosPerMonth === -1) return -1 // unlimited
    return Math.max(0, limits.videosPerMonth - usedVideos)
  }

  static getRemainingDuration(tier: SubscriptionTier, usedDuration: number): number {
    const limits = this.getTierLimits(tier)
    if (limits.maxDuration === -1) return -1 // unlimited
    return Math.max(0, limits.maxDuration - usedDuration)
  }

  static getUsagePercentage(tier: SubscriptionTier, usedAmount: number, type: 'videos' | 'duration'): number {
    const limits = this.getTierLimits(tier)
    const limit = type === 'videos' ? limits.videosPerMonth : limits.maxDuration
    
    if (limit === -1) return 0 // unlimited usage shows as 0%
    return Math.min(100, (usedAmount / limit) * 100)
  }

  static isUsageAtLimit(tier: SubscriptionTier, usedAmount: number, type: 'videos' | 'duration'): boolean {
    const limits = this.getTierLimits(tier)
    const limit = type === 'videos' ? limits.videosPerMonth : limits.maxDuration
    
    if (limit === -1) return false // unlimited never at limit
    return usedAmount >= limit
  }

  static getNextBillingDate(subscriptionStart: Date): Date {
    const nextMonth = new Date(subscriptionStart)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    return nextMonth
  }
}

// Feature flags for different tiers
export const TIER_FEATURES = {
  // Template access
  BASIC_TEMPLATES: [SubscriptionTier.FREE, SubscriptionTier.STARTER, SubscriptionTier.PRO, SubscriptionTier.ENTERPRISE],
  PREMIUM_TEMPLATES: [SubscriptionTier.STARTER, SubscriptionTier.PRO, SubscriptionTier.ENTERPRISE],
  ALL_TEMPLATES: [SubscriptionTier.PRO, SubscriptionTier.ENTERPRISE],
  
  // AI capabilities
  STANDARD_AI: [SubscriptionTier.FREE, SubscriptionTier.STARTER, SubscriptionTier.PRO, SubscriptionTier.ENTERPRISE],
  ADVANCED_AI: [SubscriptionTier.STARTER, SubscriptionTier.PRO, SubscriptionTier.ENTERPRISE],
  CUSTOM_AI_MODELS: [SubscriptionTier.ENTERPRISE],
  
  // Export quality
  HD_EXPORT: [SubscriptionTier.STARTER, SubscriptionTier.PRO, SubscriptionTier.ENTERPRISE],
  UHD_4K_EXPORT: [SubscriptionTier.PRO, SubscriptionTier.ENTERPRISE],
  
  // Business features
  API_ACCESS: [SubscriptionTier.PRO, SubscriptionTier.ENTERPRISE],
  WHITE_LABEL: [SubscriptionTier.ENTERPRISE],
  SSO_INTEGRATION: [SubscriptionTier.ENTERPRISE],
  TEAM_COLLABORATION: [SubscriptionTier.PRO, SubscriptionTier.ENTERPRISE],
  
  // Support levels
  COMMUNITY_SUPPORT: [SubscriptionTier.FREE, SubscriptionTier.STARTER, SubscriptionTier.PRO, SubscriptionTier.ENTERPRISE],
  EMAIL_SUPPORT: [SubscriptionTier.STARTER, SubscriptionTier.PRO, SubscriptionTier.ENTERPRISE],
  PRIORITY_SUPPORT: [SubscriptionTier.PRO, SubscriptionTier.ENTERPRISE],
  DEDICATED_SUPPORT: [SubscriptionTier.ENTERPRISE]
} as const

export type FeatureKey = keyof typeof TIER_FEATURES