import { getCurrentUser } from './auth'
import { redirect } from 'next/navigation'

export async function requireAuth() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/signup')
  }
  
  if (!user.emailVerified) {
    redirect('/verify?email=' + encodeURIComponent(user.email))
  }
  
  return user
}

export async function optionalAuth() {
  return await getCurrentUser()
}















