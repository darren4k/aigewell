import { Hono } from 'hono'
import { sign, verify } from 'hono/jwt'
import { setCookie, getCookie } from 'hono/cookie'
import { HTTPException } from 'hono/http-exception'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}

const auth = new Hono<{ Bindings: Bindings }>()

// User types for healthcare platform
export interface User {
  id: number
  email: string
  firstName: string
  lastName: string
  phone?: string
  role: 'patient' | 'caregiver' | 'provider'
  providerType?: 'pt' | 'ot' | 'physician' | 'nurse'
  licenseNumber?: string
  specialties?: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AuthToken {
  userId: number
  email: string
  role: string
  exp: number
}

// Password hashing utilities
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hashedInput = await hashPassword(password)
  return hashedInput === hash
}

// Generate JWT token
async function generateToken(user: User, secret: string): Promise<string> {
  const payload: AuthToken = {
    userId: user.id,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  }
  return await sign(payload, secret)
}

// Verify JWT token
async function verifyToken(token: string, secret: string): Promise<AuthToken | null> {
  try {
    return await verify(token, secret) as AuthToken
  } catch {
    return null
  }
}

// Middleware to require authentication
export function requireAuth() {
  return async (c: any, next: any) => {
    const token = getCookie(c, 'auth_token') || c.req.header('Authorization')?.replace('Bearer ', '')
    
    if (!token) {
      throw new HTTPException(401, { message: 'Authentication required' })
    }

    const payload = await verifyToken(token, c.env.JWT_SECRET)
    if (!payload) {
      throw new HTTPException(401, { message: 'Invalid token' })
    }

    // Add user info to context
    c.set('user', payload)
    await next()
  }
}

// Middleware to require specific roles
export function requireRole(allowedRoles: string[]) {
  return async (c: any, next: any) => {
    const user = c.get('user') as AuthToken
    if (!user || !allowedRoles.includes(user.role)) {
      throw new HTTPException(403, { message: 'Insufficient permissions' })
    }
    await next()
  }
}

// Register new user
auth.post('/register', async (c) => {
  const { env } = c
  const { 
    email, 
    password, 
    firstName, 
    lastName, 
    phone,
    role = 'patient',
    providerType,
    licenseNumber,
    specialties 
  } = await c.req.json()

  // Validate required fields
  if (!email || !password || !firstName || !lastName) {
    return c.json({ error: 'Missing required fields' }, 400)
  }

  // Validate healthcare provider fields
  if (role === 'provider' && (!providerType || !licenseNumber)) {
    return c.json({ error: 'Healthcare providers must provide license information' }, 400)
  }

  // Check if user already exists
  const existingUser = await env.DB.prepare(`
    SELECT id FROM users WHERE email = ?
  `).bind(email).first()

  if (existingUser) {
    return c.json({ error: 'User already exists' }, 409)
  }

  // Hash password
  const hashedPassword = await hashPassword(password)

  try {
    // Create user account
    const result = await env.DB.prepare(`
      INSERT INTO users (
        email, password_hash, first_name, last_name, phone, 
        role, provider_type, license_number, specialties, 
        is_active, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
    `).bind(
      email, 
      hashedPassword, 
      firstName, 
      lastName, 
      phone || null,
      role,
      providerType || null,
      licenseNumber || null,
      specialties ? JSON.stringify(specialties) : null
    ).run()

    const userId = result.meta.last_row_id

    // Get complete user record
    const user = await env.DB.prepare(`
      SELECT * FROM users WHERE id = ?
    `).bind(userId).first() as any

    if (!user) {
      return c.json({ error: 'Failed to create user' }, 500)
    }

    // Generate JWT token
    const token = await generateToken({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      role: user.role,
      providerType: user.provider_type,
      licenseNumber: user.license_number,
      specialties: user.specialties ? JSON.parse(user.specialties) : [],
      isActive: user.is_active,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    }, env.JWT_SECRET)

    // Set secure cookie
    setCookie(c, 'auth_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      maxAge: 24 * 60 * 60 // 24 hours
    })

    // Return user info (without password)
    return c.json({
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        role: user.role,
        providerType: user.provider_type,
        licenseNumber: user.license_number,
        specialties: user.specialties ? JSON.parse(user.specialties) : []
      },
      token
    })

  } catch (error) {
    console.error('Registration error:', error)
    return c.json({ error: 'Failed to create account' }, 500)
  }
})

// Login user
auth.post('/login', async (c) => {
  const { env } = c
  const { email, password } = await c.req.json()

  if (!email || !password) {
    return c.json({ error: 'Email and password required' }, 400)
  }

  try {
    // Get user by email
    const user = await env.DB.prepare(`
      SELECT * FROM users WHERE email = ? AND is_active = 1
    `).bind(email).first() as any

    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash)
    if (!isValidPassword) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    // Generate JWT token
    const token = await generateToken({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      role: user.role,
      providerType: user.provider_type,
      licenseNumber: user.license_number,
      specialties: user.specialties ? JSON.parse(user.specialties) : [],
      isActive: user.is_active,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    }, env.JWT_SECRET)

    // Set secure cookie
    setCookie(c, 'auth_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      maxAge: 24 * 60 * 60
    })

    return c.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        role: user.role,
        providerType: user.provider_type,
        licenseNumber: user.license_number,
        specialties: user.specialties ? JSON.parse(user.specialties) : []
      },
      token
    })

  } catch (error) {
    console.error('Login error:', error)
    return c.json({ error: 'Login failed' }, 500)
  }
})

// Get current user profile
auth.get('/profile', requireAuth(), async (c) => {
  const { env } = c
  const currentUser = c.get('user') as AuthToken

  try {
    const user = await env.DB.prepare(`
      SELECT id, email, first_name, last_name, phone, role, 
             provider_type, license_number, specialties, 
             created_at, updated_at
      FROM users WHERE id = ?
    `).bind(currentUser.userId).first() as any

    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        role: user.role,
        providerType: user.provider_type,
        licenseNumber: user.license_number,
        specialties: user.specialties ? JSON.parse(user.specialties) : [],
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }
    })

  } catch (error) {
    console.error('Profile fetch error:', error)
    return c.json({ error: 'Failed to fetch profile' }, 500)
  }
})

// Update user profile
auth.put('/profile', requireAuth(), async (c) => {
  const { env } = c
  const currentUser = c.get('user') as AuthToken
  const updates = await c.req.json()

  // Filter allowed updates
  const allowedFields = ['first_name', 'last_name', 'phone', 'specialties']
  const updateFields = Object.keys(updates).filter(key => allowedFields.includes(key))
  
  if (updateFields.length === 0) {
    return c.json({ error: 'No valid fields to update' }, 400)
  }

  try {
    // Build dynamic update query
    const setClause = updateFields.map(field => `${field} = ?`).join(', ')
    const values = updateFields.map(field => {
      if (field === 'specialties' && Array.isArray(updates[field])) {
        return JSON.stringify(updates[field])
      }
      return updates[field]
    })

    await env.DB.prepare(`
      UPDATE users 
      SET ${setClause}, updated_at = datetime('now')
      WHERE id = ?
    `).bind(...values, currentUser.userId).run()

    // Return updated profile
    const updatedUser = await env.DB.prepare(`
      SELECT id, email, first_name, last_name, phone, role,
             provider_type, license_number, specialties,
             created_at, updated_at
      FROM users WHERE id = ?
    `).bind(currentUser.userId).first() as any

    return c.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        phone: updatedUser.phone,
        role: updatedUser.role,
        providerType: updatedUser.provider_type,
        licenseNumber: updatedUser.license_number,
        specialties: updatedUser.specialties ? JSON.parse(updatedUser.specialties) : []
      }
    })

  } catch (error) {
    console.error('Profile update error:', error)
    return c.json({ error: 'Failed to update profile' }, 500)
  }
})

// Logout user
auth.post('/logout', requireAuth(), async (c) => {
  // Clear auth cookie
  setCookie(c, 'auth_token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    maxAge: 0
  })

  return c.json({ message: 'Logout successful' })
})

// Get user's caregivers (for patients)
auth.get('/caregivers', requireAuth(), async (c) => {
  const { env } = c
  const currentUser = c.get('user') as AuthToken

  if (currentUser.role !== 'patient') {
    return c.json({ error: 'Only patients can view caregivers' }, 403)
  }

  try {
    const caregivers = await env.DB.prepare(`
      SELECT 
        c.id as caregiver_id,
        c.relationship,
        c.permissions,
        c.is_active,
        u.id as user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone
      FROM caregiver_relationships c
      JOIN users u ON c.caregiver_id = u.id
      WHERE c.patient_id = ? AND c.is_active = 1
    `).bind(currentUser.userId).all()

    return c.json({
      caregivers: caregivers.results.map((cg: any) => ({
        id: cg.caregiver_id,
        relationshipId: cg.caregiver_id,
        firstName: cg.first_name,
        lastName: cg.last_name,
        email: cg.email,
        phone: cg.phone,
        relationship: cg.relationship,
        permissions: cg.permissions ? JSON.parse(cg.permissions) : {},
        isActive: cg.is_active
      }))
    })

  } catch (error) {
    console.error('Caregivers fetch error:', error)
    return c.json({ error: 'Failed to fetch caregivers' }, 500)
  }
})

export default auth