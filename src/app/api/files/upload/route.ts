import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { FileProcessor } from '@/lib/file-processors'
import { SubscriptionService } from '@/lib/subscription-tiers'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Check file size limits based on user's subscription tier
    const fileSizeMB = file.size / (1024 * 1024)
    if (!SubscriptionService.canUploadFile(user.subscriptionTier, fileSizeMB)) {
      const limits = SubscriptionService.getTierLimits(user.subscriptionTier)
      return NextResponse.json({ 
        error: `File size exceeds limit. Maximum allowed: ${limits.fileLimit}MB` 
      }, { status: 413 })
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Process the file
    const processingResult = await FileProcessor.process(buffer, file.name, file.type)
    
    if (!processingResult.success) {
      return NextResponse.json({ 
        error: `File processing failed: ${processingResult.error}` 
      }, { status: 422 })
    }

    // Create project record
    const project = await db.project.create({
      data: {
        id: uuidv4(),
        userId: user.id,
        title: file.name.split('.')[0] || 'Untitled Project',
        originalFileName: file.name,
        originalFileType: file.type,
        originalFileSize: file.size,
        extractedContent: processingResult.extractedData || {},
        status: 'DRAFT',
        processingStatus: 'COMPLETED'
      }
    })

    // Log usage metrics
    await db.usageMetric.create({
      data: {
        userId: user.id,
        action: 'FILE_UPLOAD',
        resourceType: 'file',
        resourceId: project.id,
        metadata: {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          processingTime: processingResult.metadata?.processingTime
        }
      }
    })

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        title: project.title,
        status: project.status,
        processingStatus: project.processingStatus,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        extractedContent: processingResult.content,
        metadata: processingResult.metadata
      }
    })

  } catch (error) {
    console.error('File upload error:', error)
    return NextResponse.json({ 
      error: 'Internal server error during file upload' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's projects
    const projects = await db.project.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        title: true,
        status: true,
        processingStatus: true,
        originalFileName: true,
        originalFileType: true,
        originalFileSize: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      success: true,
      projects
    })

  } catch (error) {
    console.error('Get projects error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}