import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { AIService } from '@/lib/ai'
import { SubscriptionService } from '@/lib/subscription-tiers'

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { projectId, duration = 60, style = 'professional' } = body

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }

    // Get project and verify ownership
    const project = await db.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get user for subscription check
    const user = await db.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check duration limits based on subscription tier
    if (!SubscriptionService.canCreateDuration(user.subscriptionTier, duration)) {
      const limits = SubscriptionService.getTierLimits(user.subscriptionTier)
      return NextResponse.json({ 
        error: `Duration exceeds limit. Maximum allowed: ${limits.maxDuration} seconds` 
      }, { status: 413 })
    }

    // Extract analysis from project
    const extractedContent = project.extractedContent as any
    const analysis = extractedContent?.analysis
    
    if (!analysis) {
      return NextResponse.json({ 
        error: 'No analysis available. Please analyze the content first.' 
      }, { status: 400 })
    }

    // Update project status
    await db.project.update({
      where: { id: projectId },
      data: { processingStatus: 'GENERATING_SCRIPT' }
    })

    // Generate script using AI
    const scriptResult = await AIService.generateScript(analysis, duration, style)

    if (!scriptResult.success) {
      await db.project.update({
        where: { id: projectId },
        data: { processingStatus: 'FAILED' }
      })

      return NextResponse.json({ 
        error: `Script generation failed: ${scriptResult.error}` 
      }, { status: 500 })
    }

    // Update project with script
    await db.project.update({
      where: { id: projectId },
      data: {
        aiScript: scriptResult.data,
        processingStatus: 'COMPLETED'
      }
    })

    // Log usage metrics
    await db.usageMetric.create({
      data: {
        userId: session.user.id,
        action: 'AI_PROCESSING',
        resourceType: 'script',
        resourceId: projectId,
        metadata: {
          scriptType: 'video_script',
          duration,
          style,
          analysisLength: typeof analysis === 'string' ? analysis.length : JSON.stringify(analysis).length
        }
      }
    })

    return NextResponse.json({
      success: true,
      script: scriptResult.data,
      projectId,
      duration,
      style
    })

  } catch (error) {
    console.error('Script generation error:', error)
    return NextResponse.json({ 
      error: 'Internal server error during script generation' 
    }, { status: 500 })
  }
}