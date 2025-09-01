import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendOTP, generateOTP } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    // Log the raw request for debugging
    const rawBody = await request.text()
    console.log('🔍 Raw request body:', rawBody)
    
    let body
    try {
      body = JSON.parse(rawBody)
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError)
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }
    
    console.log('🔍 Parsed body:', body)
    
    // Basic validation
    if (!body.email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }
    
    if (!body.type) {
      return NextResponse.json(
        { error: 'Type (signup/signin) is required' },
        { status: 400 }
      )
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }
    
    // Validate type
    if (!['signup', 'signin'].includes(body.type)) {
      return NextResponse.json(
        { error: 'Type must be either "signup" or "signin"' },
        { status: 400 }
      )
    }
    
    const { email, name, type } = body
    const normalizedEmail = email.toLowerCase().trim()
    
    console.log(`🔍 Processing ${type} OTP request for:`, normalizedEmail)
    
    // Check if user exists
    let existingUser
    try {
      existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      })
      console.log('🔍 Existing user:', existingUser ? 'FOUND' : 'NOT FOUND')
    } catch (dbError) {
      console.error('❌ Database error finding user:', dbError)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }
    
    if (type === 'signin') {
      // For signin, user must exist
      if (!existingUser) {
        return NextResponse.json(
          { error: 'No account found with this email. Please sign up first.' },
          { status: 404 }
        )
      }
    } else if (type === 'signup') {
      // For signup, check if user already verified
      if (existingUser && existingUser.emailVerified) {
        return NextResponse.json(
          { error: 'Account already exists. Please sign in instead.' },
          { status: 400 }
        )
      }
      
      // Create or update user for signup
      try {
        await prisma.user.upsert({
          where: { email: normalizedEmail },
          update: name ? { name } : {},
          create: {
            email: normalizedEmail,
            name: name || null,
          },
        })
        console.log('✅ User upserted for signup')
      } catch (dbError) {
        console.error('❌ Database error upserting user:', dbError)
        return NextResponse.json(
          { error: 'Failed to create user record' },
          { status: 500 }
        )
      }
    }
    
    // Delete any existing OTP codes for this email
    try {
      const deletedCount = await prisma.otpCode.deleteMany({
        where: { email: normalizedEmail },
      })
      console.log(`🗑️ Deleted ${deletedCount.count} old OTP codes`)
    } catch (dbError) {
      console.error('❌ Error deleting old OTPs:', dbError)
      // Continue anyway, don't fail the request
    }
    
    // Generate new OTP
    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    
    // Save OTP to database
    let otpRecord
    try {
      otpRecord = await prisma.otpCode.create({
        data: {
          code: otp,
          email: normalizedEmail,
          expires: expiresAt,
        },
      })
      console.log('✅ OTP Created:', {
        id: otpRecord.id,
        email: normalizedEmail,
        code: process.env.NODE_ENV === 'development' ? otp : '[HIDDEN]',
        expires: expiresAt,
        type
      })
    } catch (dbError) {
      console.error('❌ Database error creating OTP:', dbError)
      return NextResponse.json(
        { error: 'Failed to generate OTP' },
        { status: 500 }
      )
    }
    
    // Send OTP via email
    try {
      await sendOTP(normalizedEmail, otp)
      console.log('✅ OTP email sent successfully')
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError)
      // Delete the OTP since email failed
      await prisma.otpCode.delete({
        where: { id: otpRecord.id }
      }).catch(() => {})
      
      return NextResponse.json(
        { error: 'Failed to send OTP email. Please check your email address.' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: `OTP sent to ${normalizedEmail}`,
      // Only in development
      debug: process.env.NODE_ENV === 'development' ? { 
        otp,
        expiresAt: expiresAt.toISOString()
      } : undefined
    })
    
  } catch (error) {
    console.error(`❌ Unexpected error in send-otp:`, error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    )
  }
}