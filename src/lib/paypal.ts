// PayPal Integration for AnimaGenius Subscription Management
import { SubscriptionTier } from '@prisma/client'
import { PAYPAL_PLAN_IDS, SUBSCRIPTION_TIERS } from './subscription-tiers'

interface PayPalConfig {
  clientId: string
  clientSecret: string
  environment: 'sandbox' | 'live'
  baseURL: string
}

interface PayPalSubscription {
  id: string
  status: string
  plan_id: string
  subscriber: {
    email_address: string
    name: {
      given_name: string
      surname: string
    }
  }
  billing_info: {
    outstanding_balance: {
      currency_code: string
      value: string
    }
    cycle_executions: Array<{
      tenure_type: string
      sequence: number
      cycles_completed: number
    }>
  }
  create_time: string
  update_time: string
}

interface PayPalWebhookEvent {
  id: string
  event_type: string
  resource_type: string
  summary: string
  resource: any
  create_time: string
}

class PayPalService {
  private config: PayPalConfig

  constructor() {
    this.config = {
      clientId: process.env.PAYPAL_CLIENT_ID || '',
      clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
      environment: (process.env.PAYPAL_ENVIRONMENT as 'sandbox' | 'live') || 'sandbox',
      baseURL: process.env.PAYPAL_ENVIRONMENT === 'live' 
        ? 'https://api.paypal.com' 
        : 'https://api.sandbox.paypal.com'
    }
  }

  // Get OAuth access token
  private async getAccessToken(): Promise<string> {
    const auth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')
    
    const response = await fetch(`${this.config.baseURL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials'
    })

    if (!response.ok) {
      throw new Error(`PayPal authentication failed: ${response.statusText}`)
    }

    const data = await response.json()
    return data.access_token
  }

  // Create subscription
  async createSubscription(
    planId: string,
    userEmail: string,
    userName: string,
    returnUrl: string,
    cancelUrl: string
  ): Promise<any> {
    try {
      const accessToken = await this.getAccessToken()
      
      const subscriptionData = {
        plan_id: planId,
        subscriber: {
          name: {
            given_name: userName.split(' ')[0] || userName,
            surname: userName.split(' ').slice(1).join(' ') || 'User'
          },
          email_address: userEmail
        },
        application_context: {
          brand_name: 'AnimaGenius',
          locale: 'en-US',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW',
          payment_method: {
            payer_selected: 'PAYPAL',
            payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED'
          },
          return_url: returnUrl,
          cancel_url: cancelUrl
        }
      }

      const response = await fetch(`${this.config.baseURL}/v1/billing/subscriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(subscriptionData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Subscription creation failed: ${JSON.stringify(errorData)}`)
      }

      return await response.json()
    } catch (error) {
      console.error('PayPal create subscription error:', error)
      throw error
    }
  }

  // Get subscription details
  async getSubscription(subscriptionId: string): Promise<PayPalSubscription> {
    try {
      const accessToken = await this.getAccessToken()
      
      const response = await fetch(`${this.config.baseURL}/v1/billing/subscriptions/${subscriptionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error(`Get subscription failed: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('PayPal get subscription error:', error)
      throw error
    }
  }

  // Cancel subscription
  async cancelSubscription(subscriptionId: string, reason: string = 'User requested cancellation'): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken()
      
      const response = await fetch(`${this.config.baseURL}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: reason
        })
      })

      return response.ok
    } catch (error) {
      console.error('PayPal cancel subscription error:', error)
      throw error
    }
  }

  // Reactivate subscription
  async reactivateSubscription(subscriptionId: string): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken()
      
      const response = await fetch(`${this.config.baseURL}/v1/billing/subscriptions/${subscriptionId}/activate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'Reactivating subscription at user request'
        })
      })

      return response.ok
    } catch (error) {
      console.error('PayPal reactivate subscription error:', error)
      throw error
    }
  }

  // Update subscription (change plan)
  async updateSubscription(
    subscriptionId: string,
    newPlanId: string,
    prorateAmount?: number
  ): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken()
      
      const updateData: any = {
        plan_id: newPlanId,
        proration: true
      }

      if (prorateAmount !== undefined) {
        updateData.proration_amount = {
          currency_code: 'USD',
          value: prorateAmount.toFixed(2)
        }
      }

      const response = await fetch(`${this.config.baseURL}/v1/billing/subscriptions/${subscriptionId}/revise`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      })

      return response.ok
    } catch (error) {
      console.error('PayPal update subscription error:', error)
      throw error
    }
  }

  // Verify webhook signature (security)
  async verifyWebhookSignature(
    webhookId: string,
    headers: any,
    body: string
  ): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken()
      
      const verificationData = {
        auth_algo: headers['paypal-auth-algo'],
        cert_id: headers['paypal-cert-id'],
        transmission_id: headers['paypal-transmission-id'],
        transmission_sig: headers['paypal-transmission-sig'],
        transmission_time: headers['paypal-transmission-time'],
        webhook_id: webhookId,
        webhook_event: JSON.parse(body)
      }

      const response = await fetch(`${this.config.baseURL}/v1/notifications/verify-webhook-signature`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(verificationData)
      })

      if (!response.ok) {
        return false
      }

      const result = await response.json()
      return result.verification_status === 'SUCCESS'
    } catch (error) {
      console.error('PayPal webhook verification error:', error)
      return false
    }
  }

  // Process webhook events
  async processWebhookEvent(event: PayPalWebhookEvent): Promise<any> {
    const { event_type, resource } = event
    
    switch (event_type) {
      case 'BILLING.SUBSCRIPTION.CREATED':
        return this.handleSubscriptionCreated(resource)
      
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        return this.handleSubscriptionActivated(resource)
      
      case 'BILLING.SUBSCRIPTION.CANCELLED':
        return this.handleSubscriptionCancelled(resource)
      
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        return this.handleSubscriptionSuspended(resource)
      
      case 'PAYMENT.SALE.COMPLETED':
        return this.handlePaymentCompleted(resource)
      
      case 'PAYMENT.SALE.DENIED':
        return this.handlePaymentFailed(resource)
      
      default:
        console.log(`Unhandled webhook event: ${event_type}`)
        return { processed: false, event_type }
    }
  }

  private async handleSubscriptionCreated(resource: any) {
    // Update database - subscription created but not yet active
    return {
      action: 'subscription_created',
      subscriptionId: resource.id,
      status: resource.status,
      planId: resource.plan_id
    }
  }

  private async handleSubscriptionActivated(resource: any) {
    // Update database - subscription is now active
    return {
      action: 'subscription_activated',
      subscriptionId: resource.id,
      status: resource.status,
      planId: resource.plan_id
    }
  }

  private async handleSubscriptionCancelled(resource: any) {
    // Update database - subscription cancelled
    return {
      action: 'subscription_cancelled',
      subscriptionId: resource.id,
      status: resource.status
    }
  }

  private async handleSubscriptionSuspended(resource: any) {
    // Update database - subscription suspended (failed payment)
    return {
      action: 'subscription_suspended',
      subscriptionId: resource.id,
      status: resource.status
    }
  }

  private async handlePaymentCompleted(resource: any) {
    // Record successful payment
    return {
      action: 'payment_completed',
      paymentId: resource.id,
      amount: resource.amount,
      subscriptionId: resource.billing_agreement_id
    }
  }

  private async handlePaymentFailed(resource: any) {
    // Handle failed payment
    return {
      action: 'payment_failed',
      paymentId: resource.id,
      subscriptionId: resource.billing_agreement_id
    }
  }

  // Helper methods for tier management
  getTierFromPlanId(planId: string): SubscriptionTier | null {
    for (const [tier, id] of Object.entries(PAYPAL_PLAN_IDS)) {
      if (id === planId) {
        return tier as SubscriptionTier
      }
    }
    return null
  }

  getPlanIdFromTier(tier: SubscriptionTier): string | null {
    return PAYPAL_PLAN_IDS[tier as keyof typeof PAYPAL_PLAN_IDS] || null
  }

  getTierPrice(tier: SubscriptionTier): number {
    return SUBSCRIPTION_TIERS[tier]?.price || 0
  }
}

// Export singleton instance
export const paypalService = new PayPalService()

// Export types and interfaces
export type { PayPalSubscription, PayPalWebhookEvent }