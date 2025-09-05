import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Admin middleware to check permissions
async function checkAdminPermissions(requiredLevel: 'admin' | 'superAdmin' = 'admin') {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return { error: 'Unauthorized', status: 401 }
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id }
  })

  if (!user) {
    return { error: 'User not found', status: 404 }
  }

  if (requiredLevel === 'superAdmin' && !user.isSuperAdmin) {
    return { error: 'Super admin access required', status: 403 }
  }

  if (!user.isAdmin && !user.isSuperAdmin) {
    return { error: 'Admin access required', status: 403 }
  }

  return { user, session }
}

// Get all users (Admin only)
export async function GET(request: NextRequest) {
  try {
    const authCheck = await checkAdminPermissions('admin')
    if ('error' in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const tier = searchParams.get('tier') || ''
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const skip = (page - 1) * limit

    // Build where clause
    const whereClause: any = {}
    
    if (search) {
      whereClause.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (tier && tier !== 'all') {
      whereClause.subscriptionTier = tier.toUpperCase()
    }

    // Get users with pagination
    const [users, totalCount] = await Promise.all([
      db.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          name: true,
          subscriptionTier: true,
          subscriptionStatus: true,
          isAdmin: true,
          isSuperAdmin: true,
          lastLogin: true,
          createdAt: true,
          _count: {
            select: {
              projects: true,
              subscriptions: true
            }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit
      }),
      db.user.count({ where: whereClause })
    ])

    // Log admin action
    await db.adminLog.create({
      data: {
        adminId: authCheck.user.id,
        action: 'VIEW_USERS',
        targetType: 'user_list',
        details: {
          page,
          limit,
          search,
          tier,
          resultCount: users.length
        }
      }
    })

    return NextResponse.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    })

  } catch (error) {
    console.error('Admin get users error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// Update user (Admin only)
export async function PATCH(request: NextRequest) {
  try {
    const authCheck = await checkAdminPermissions('admin')
    if ('error' in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const body = await request.json()
    const { userId, updates } = body

    if (!userId || !updates) {
      return NextResponse.json({ 
        error: 'User ID and updates are required' 
      }, { status: 400 })
    }

    // Prevent non-super-admins from modifying admin privileges
    if ((updates.isAdmin !== undefined || updates.isSuperAdmin !== undefined) && 
        !authCheck.user.isSuperAdmin) {
      return NextResponse.json({ 
        error: 'Super admin access required to modify admin privileges' 
      }, { status: 403 })
    }

    // Update user
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        ...updates,
        updatedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        name: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        isAdmin: true,
        isSuperAdmin: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true
      }
    })

    // Log admin action
    await db.adminLog.create({
      data: {
        adminId: authCheck.user.id,
        action: 'UPDATE_USER',
        targetType: 'user',
        targetId: userId,
        details: {
          updates,
          updatedFields: Object.keys(updates)
        }
      }
    })

    return NextResponse.json({
      success: true,
      user: updatedUser
    })

  } catch (error) {
    console.error('Admin update user error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}