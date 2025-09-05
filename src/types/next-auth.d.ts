import { SubscriptionTier } from '@prisma/client'
import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      subscriptionTier: SubscriptionTier
      isAdmin: boolean
      isSuperAdmin: boolean
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    image?: string | null
    subscriptionTier: SubscriptionTier
    isAdmin: boolean
    isSuperAdmin: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    subscriptionTier: SubscriptionTier
    isAdmin: boolean
    isSuperAdmin: boolean
  }
}