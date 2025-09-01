export interface User {
  id: string
  name?: string
  email?: string
  image?: string
  emailVerified?: Date
}

export interface Note {
  id: string
  title: string
  content: string
  userId: string
  createdAt: Date
  updatedAt: Date
}

export interface SignupData {
  name: string
  email: string
  password: string
}

export interface LoginData {
  email: string
  password: string
}

export interface OTPData {
  email: string
  otp: string
}