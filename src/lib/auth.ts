import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from "@auth/prisma-adapter"
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from './db'
import bcrypt from 'bcryptjs'
import { SubscriptionTier } from '@prisma/client'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as any,
  session: {
    strategy: 'jwt',
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        
        const user = await db.user.findUnique({
          where: { email: credentials.email }
        })
        
        if (!user || !user.password_hash) return null
        
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password_hash
        )
        
        if (!isPasswordValid) return null
        
        // Update last login
        await db.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() }
        })
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          subscriptionTier: user.subscriptionTier,
          isAdmin: user.isAdmin,
          isSuperAdmin: user.isSuperAdmin,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.subscriptionTier = user.subscriptionTier
        token.isAdmin = user.isAdmin
        token.isSuperAdmin = user.isSuperAdmin
      }
      
      // Handle session updates
      if (trigger === 'update' && session) {
        token = { ...token, ...session }
      }
      
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.subscriptionTier = token.subscriptionTier as SubscriptionTier
        session.user.isAdmin = token.isAdmin as boolean
        session.user.isSuperAdmin = token.isSuperAdmin as boolean
      }
      
      return session
    },
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        try {
          // Check if user exists
          const existingUser = await db.user.findUnique({
            where: { email: user.email! }
          })
          
          if (!existingUser) {
            // Create new user for Google OAuth
            await db.user.create({
              data: {
                email: user.email!,
                name: user.name || '',
                image: user.image,
                subscriptionTier: SubscriptionTier.FREE,
                emailVerified: new Date(),
              }
            })
          } else {
            // Update last login for existing users
            await db.user.update({
              where: { email: user.email! },
              data: { lastLogin: new Date() }
            })
          }
          
          return true
        } catch (error) {
          console.error('Error during Google sign in:', error)
          return false
        }
      }
      
      return true
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET,
}