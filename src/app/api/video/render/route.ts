import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { AIService } from '@/lib/ai'
import { SubscriptionService } from '@/lib/subscription-tiers'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { projectId, renderSettings = {} } = body

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

    // Get user for subscription and usage checks
    const user = await db.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has available video generation quota
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
    const monthlyUsage = await db.usageMetric.count({
      where: {
        userId: user.id,
        action: 'VIDEO_GENERATION',
        timestamp: {
          gte: new Date(`${currentMonth}-01`)
        }
      }
    })

    if (!SubscriptionService.canCreateVideo(user.subscriptionTier, monthlyUsage)) {
      const limits = SubscriptionService.getTierLimits(user.subscriptionTier)
      return NextResponse.json({ 
        error: `Monthly video limit reached. Your plan allows ${limits.videosPerMonth} videos per month.` 
      }, { status: 429 })
    }

    // Check if project has a script
    const aiScript = project.aiScript as any
    if (!aiScript) {
      return NextResponse.json({ 
        error: 'No script available. Please generate a script first.' 
      }, { status: 400 })
    }

    // Extract script content and duration
    const scriptContent = typeof aiScript === 'string' ? aiScript : JSON.stringify(aiScript)
    const estimatedDuration = renderSettings.duration || 60

    // Check duration limits
    if (!SubscriptionService.canCreateDuration(user.subscriptionTier, estimatedDuration)) {
      const limits = SubscriptionService.getTierLimits(user.subscriptionTier)
      return NextResponse.json({ 
        error: `Duration exceeds limit. Maximum allowed: ${limits.maxDuration} seconds` 
      }, { status: 413 })
    }

    // Update project status
    await db.project.update({
      where: { id: projectId },
      data: { 
        status: 'PROCESSING',
        processingStatus: 'RENDERING'
      }
    })

    // Create render job
    const renderJob = await db.renderJob.create({
      data: {
        id: uuidv4(),
        projectId: projectId,
        provider: 'proprietary', // Default to proprietary rendering
        status: 'QUEUED',
        priority: SubscriptionService.getProcessingPriority(user.subscriptionTier),
        estimatedTime: estimatedDuration,
        renderSettings: {
          ...renderSettings,
          duration: estimatedDuration,
          watermark: SubscriptionService.shouldShowWatermark(user.subscriptionTier),
          quality: renderSettings.quality || (user.subscriptionTier === 'FREE' ? 'HD' : '4K')
        }
      }
    })

    // For demo purposes, we'll use AI video generation
    // In production, this would integrate with actual video rendering services
    try {
      // Generate video using AI service
      const videoResult = await AIService.generateVideo(
        `Create a professional video based on this script: ${scriptContent.substring(0, 1000)}...`,
        estimatedDuration
      )

      if (videoResult.success) {
        // Update project with video URL
        await db.project.update({
          where: { id: projectId },
          data: {
            status: 'COMPLETED',
            processingStatus: 'COMPLETED',
            videoUrl: videoResult.data, // This would be the actual video URL
            videoDuration: estimatedDuration,
            videoFormat: renderSettings.format || 'MP4'
          }
        })

        // Update render job
        await db.renderJob.update({
          where: { id: renderJob.id },
          data: {
            status: 'COMPLETED',
            progress: 100,
            outputUrl: videoResult.data,
            completedAt: new Date(),
            actualTime: estimatedDuration
          }
        })

        // Log successful video generation
        await db.usageMetric.create({
          data: {
            userId: user.id,
            action: 'VIDEO_GENERATION',
            resourceType: 'video',
            resourceId: projectId,
            metadata: {
              renderJobId: renderJob.id,
              duration: estimatedDuration,
              provider: 'proprietary',
              quality: renderSettings.quality || 'HD',
              success: true
            }
          }
        })

        return NextResponse.json({
          success: true,
          renderJobId: renderJob.id,
          projectId,
          videoUrl: videoResult.data,
          duration: estimatedDuration,
          status: 'completed'
        })

      } else {
        // Handle video generation failure
        await db.project.update({
          where: { id: projectId },
          data: {
            status: 'FAILED',
            processingStatus: 'FAILED'
          }
        })

        await db.renderJob.update({
          where: { id: renderJob.id },
          data: {
            status: 'FAILED',
            errorMessage: videoResult.error || 'Video generation failed'
          }
        })

        return NextResponse.json({
          error: `Video generation failed: ${videoResult.error}`
        }, { status: 500 })
      }

    } catch (videoError) {
      console.error('Video generation error:', videoError)
      
      // Update project and render job with error status
      await db.project.update({
        where: { id: projectId },
        data: {
          status: 'FAILED',
          processingStatus: 'FAILED'
        }
      })

      await db.renderJob.update({
        where: { id: renderJob.id },
        data: {
          status: 'FAILED',
          errorMessage: videoError instanceof Error ? videoError.message : 'Unknown error'
        }
      })

      return NextResponse.json({
        error: 'Video generation failed due to technical error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Video render error:', error)
    return NextResponse.json({ 
      error: 'Internal server error during video rendering' 
    }, { status: 500 })
  }
}

// Get render job status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const renderJobId = searchParams.get('renderJobId')
    const projectId = searchParams.get('projectId')

    if (!renderJobId && !projectId) {
      return NextResponse.json({ 
        error: 'Render job ID or project ID required' 
      }, { status: 400 })
    }

    let renderJob
    if (renderJobId) {
      renderJob = await db.renderJob.findFirst({
        where: {
          id: renderJobId,
          project: {
            userId: session.user.id
          }
        },
        include: {
          project: {
            select: {
              id: true,
              title: true,
              status: true
            }
          }
        }
      })
    } else if (projectId) {
      renderJob = await db.renderJob.findFirst({
        where: {
          projectId: projectId,
          project: {
            userId: session.user.id
          }
        },
        orderBy: { createdAt: 'desc' },
        include: {
          project: {
            select: {
              id: true,
              title: true,
              status: true
            }
          }
        }
      })
    }

    if (!renderJob) {
      return NextResponse.json({ error: 'Render job not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      renderJob: {
        id: renderJob.id,
        projectId: renderJob.projectId,
        status: renderJob.status,
        progress: renderJob.progress,
        provider: renderJob.provider,
        estimatedTime: renderJob.estimatedTime,
        actualTime: renderJob.actualTime,
        outputUrl: renderJob.outputUrl,
        errorMessage: renderJob.errorMessage,
        createdAt: renderJob.createdAt,
        startedAt: renderJob.startedAt,
        completedAt: renderJob.completedAt,
        project: renderJob.project
      }
    })

  } catch (error) {
    console.error('Get render job error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}