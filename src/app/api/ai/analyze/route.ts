import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { AIService } from '@/lib/ai'

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { projectId } = body

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

    // Extract content from project
    const extractedContent = project.extractedContent as any
    const content = extractedContent?.content || extractedContent?.rawText || ''
    
    if (!content) {
      return NextResponse.json({ 
        error: 'No content available for analysis' 
      }, { status: 400 })
    }

    // Update project status
    await db.project.update({
      where: { id: projectId },
      data: { processingStatus: 'ANALYZING' }
    })

    // Analyze content using AI
    const analysisResult = await AIService.analyzeContent(
      content, 
      project.originalFileType || 'document'
    )

    if (!analysisResult.success) {
      await db.project.update({
        where: { id: projectId },
        data: { processingStatus: 'FAILED' }
      })

      return NextResponse.json({ 
        error: `Analysis failed: ${analysisResult.error}` 
      }, { status: 500 })
    }

    // Update project with analysis results
    await db.project.update({
      where: { id: projectId },
      data: {
        extractedContent: {
          ...extractedContent,
          analysis: analysisResult.data
        },
        processingStatus: 'COMPLETED'
      }
    })

    // Log usage metrics
    await db.usageMetric.create({
      data: {
        userId: session.user.id,
        action: 'AI_PROCESSING',
        resourceType: 'analysis',
        resourceId: projectId,
        metadata: {
          analysisType: 'content_analysis',
          contentLength: content.length
        }
      }
    })

    return NextResponse.json({
      success: true,
      analysis: analysisResult.data,
      projectId
    })

  } catch (error) {
    console.error('AI analysis error:', error)
    return NextResponse.json({ 
      error: 'Internal server error during analysis' 
    }, { status: 500 })
  }
}