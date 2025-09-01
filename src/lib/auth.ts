import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) ,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        otp: { label: 'OTP', type: 'text' },
        name: { label: 'Name', type: 'text' },
        type: { label: 'Type', type: 'text' }, // 'signup' or 'signin'
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.otp) {
          console.log('❌ Missing email or OTP')
          return null
        }

        const cleanEmail = credentials.email.toLowerCase().trim()
        const cleanOtp = credentials.otp.replace(/\s/g, '').trim()
        const authType = credentials.type || 'signin'

        console.log('🔍 Auth attempt:', {
          email: cleanEmail,
          otp: cleanOtp,
          type: authType
        })

        // Verify OTP
        const otpCode = await prisma.otpCode.findFirst({
          where: {
            email: cleanEmail,
            code: cleanOtp,
            expires: { gt: new Date() }
          },
          orderBy: { createdAt: 'desc' }
        })

        if (!otpCode) {
          console.log('❌ Invalid or expired OTP for:', cleanEmail)
          return null
        }

        console.log('✅ Valid OTP found')

        // Mark OTP as verified
        await prisma.otpCode.update({
          where: { id: otpCode.id },
          data: { verified: true },
        })

        // Find or handle user based on auth type
        let user = await prisma.user.findUnique({
          where: { email: cleanEmail },
        })

        if (authType === 'signup') {
          // For signup, create or update user
          if (!user) {
            user = await prisma.user.create({
              data: {
                email: cleanEmail,
                name: credentials.name || null,
                emailVerified: new Date(),
              },
            })
            console.log('✅ New user created:', user.id)
          } else {
            // Update existing user
            user = await prisma.user.update({
              where: { id: user.id },
              data: {
                name: credentials.name || user.name,
                emailVerified: new Date(),
              },
            })
            console.log('✅ Existing user updated:', user.id)
          }
        } else {
          // For signin, user must exist
          if (!user) {
            console.log('❌ User not found for signin:', cleanEmail)
            return null
          }
          
          // Update email verification
          user = await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: new Date() },
          })
          console.log('✅ User signed in:', user.id)
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    newUser: '/auth/signup',
  },
  debug: process.env.NODE_ENV === 'development',
}