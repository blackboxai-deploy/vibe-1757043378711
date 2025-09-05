import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { paypalService } from '@/lib/paypal'
import { SubscriptionTier } from '@prisma/client'
import { PAYPAL_PLAN_IDS } from '@/lib/subscription-tiers'

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { tier, returnUrl, cancelUrl } = body

    // Validate tier
    if (!tier || !Object.values(SubscriptionTier).includes(tier)) {
      return NextResponse.json({ error: 'Invalid subscription tier' }, { status: 400 })
    }

    if (tier === SubscriptionTier.FREE) {
      return NextResponse.json({ error: 'Cannot create PayPal subscription for free tier' }, { status: 400 })
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { subscriptions: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user already has an active subscription
    const activeSubscription = user.subscriptions.find(sub => 
      sub.status === 'ACTIVE' || sub.status === 'PENDING'
    )

    if (activeSubscription) {
      return NextResponse.json({ 
        error: 'User already has an active subscription. Cancel existing subscription first.' 
      }, { status: 409 })
    }

    // Get PayPal plan ID
    const planId = PAYPAL_PLAN_IDS[tier as keyof typeof PAYPAL_PLAN_IDS]
    if (!planId) {
      return NextResponse.json({ error: 'Plan not configured' }, { status: 500 })
    }

    // Create PayPal subscription
    const paypalSubscription = await paypalService.createSubscription(
      planId,
      user.email,
      user.name || 'User',
      returnUrl || `${process.env.NEXTAUTH_URL}/dashboard?success=subscription`,
      cancelUrl || `${process.env.NEXTAUTH_URL}/pricing?cancelled=subscription`
    )

    if (!paypalSubscription) {
      return NextResponse.json({ error: 'Failed to create PayPal subscription' }, { status: 500 })
    }

    // Store subscription in database (pending status)
    const subscription = await db.subscription.create({
      data: {
        userId: user.id,
        paypalSubscriptionId: paypalSubscription.id,
        planId: planId,
        status: 'PENDING',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        amount: paypalService.getTierPrice(tier),
        currency: 'USD'
      }
    })

    // Log usage metrics
    await db.usageMetric.create({
      data: {
        userId: user.id,
        action: 'ADMIN_ACTION',
        resourceType: 'subscription',
        resourceId: subscription.id,
        metadata: {
          action: 'subscription_creation_initiated',
          tier,
          planId,
          paypalSubscriptionId: paypalSubscription.id
        }
      }
    })

    // Extract approval URL from PayPal response
    const approvalUrl = paypalSubscription.links?.find(
      (link: any) => link.rel === 'approve'
    )?.href

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      paypalSubscriptionId: paypalSubscription.id,
      approvalUrl,
      tier,
      amount: paypalService.getTierPrice(tier)
    })

  } catch (error) {
    console.error('Subscription creation error:', error)
    return NextResponse.json({ 
      error: 'Internal server error during subscription creation' 
    }, { status: 500 })
  }
}

// Get user's current subscription
export async function GET() {
  try {
    // Get user session
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's current subscription
    const subscription = await db.subscription.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ['ACTIVE', 'PENDING'] }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (!subscription) {
      return NextResponse.json({
        success: true,
        subscription: null,
        tier: SubscriptionTier.FREE
      })
    }

    // Get PayPal subscription details
    try {
      const paypalSubscription = await paypalService.getSubscription(
        subscription.paypalSubscriptionId
      )

      return NextResponse.json({
        success: true,
        subscription: {
          id: subscription.id,
          tier: paypalService.getTierFromPlanId(subscription.planId),
          status: subscription.status,
          amount: subscription.amount,
          currency: subscription.currency,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd
        },
        paypalStatus: paypalSubscription.status
      })
    } catch (paypalError) {
      // Return database subscription info even if PayPal fails
      return NextResponse.json({
        success: true,
        subscription: {
          id: subscription.id,
          tier: paypalService.getTierFromPlanId(subscription.planId),
          status: subscription.status,
          amount: subscription.amount,
          currency: subscription.currency,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd
        },
        paypalError: 'Could not fetch PayPal status'
      })
    }

  } catch (error) {
    console.error('Get subscription error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}