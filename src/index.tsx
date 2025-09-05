import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-pages'

type Bindings = {
  DB: D1Database
  KV: KVNamespace
  R2: R2Bucket
  OPENAI_API_KEY?: string
}

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS
app.use('/api/*', cors())

// Serve static files
app.use('/static/*', serveStatic())

// ===================
// API Routes
// ===================

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'healthy', service: 'SafeAging Home API' })
})

// Analyze room photo for hazards
app.post('/api/analyze-room', async (c) => {
  const { env } = c
  const formData = await c.req.formData()
  const image = formData.get('image') as File
  const roomType = formData.get('roomType') as string
  const userId = formData.get('userId') as string || '1' // Default for demo

  if (!image) {
    return c.json({ error: 'No image provided' }, 400)
  }

  try {
    // Store image in R2 (in production)
    const imageKey = `assessments/${userId}/${Date.now()}-${roomType}.jpg`
    // await env.R2.put(imageKey, await image.arrayBuffer())

    // Mock AI analysis for demo (replace with real OpenAI Vision API)
    const hazards = analyzeRoomHazards(roomType)
    
    // Calculate risk score
    const riskScore = calculateRiskScore(hazards)

    // Store assessment in D1
    const assessment = await env.DB.prepare(`
      INSERT INTO assessments (user_id, room_type, image_url, hazards_detected, risk_score, ai_analysis, status)
      VALUES (?, ?, ?, ?, ?, ?, 'analyzed')
    `).bind(
      userId,
      roomType,
      imageKey,
      JSON.stringify(hazards),
      riskScore,
      JSON.stringify({ hazards, recommendations: getRecommendations(hazards) }),
    ).run()

    return c.json({
      assessmentId: assessment.meta.last_row_id,
      roomType,
      hazards,
      riskScore,
      recommendations: getRecommendations(hazards),
      imageUrl: imageKey
    })
  } catch (error) {
    console.error('Analysis error:', error)
    return c.json({ error: 'Failed to analyze image' }, 500)
  }
})

// Get user's assessments
app.get('/api/assessments/:userId', async (c) => {
  const { env } = c
  const userId = c.req.param('userId')

  const assessments = await env.DB.prepare(`
    SELECT * FROM assessments 
    WHERE user_id = ? 
    ORDER BY created_at DESC
  `).bind(userId).all()

  return c.json({ assessments: assessments.results })
})

// Generate safety plan based on assessments
app.post('/api/generate-plan', async (c) => {
  const { env } = c
  const { userId, assessmentIds } = await c.req.json()

  // Get assessments
  const assessments = await env.DB.prepare(`
    SELECT * FROM assessments 
    WHERE user_id = ? AND id IN (${assessmentIds.join(',')})
  `).bind(userId).all()

  // Generate phased plan
  const plans = generateSafetyPlans(assessments.results)

  // Store plans in database
  for (const plan of plans) {
    await env.DB.prepare(`
      INSERT INTO safety_plans (user_id, phase, title, tasks, progress, status)
      VALUES (?, ?, ?, ?, 0, 'active')
    `).bind(userId, plan.phase, plan.title, JSON.stringify(plan.tasks)).run()
  }

  return c.json({ plans })
})

// Get user's safety plans
app.get('/api/plans/:userId', async (c) => {
  const { env } = c
  const userId = c.req.param('userId')

  const plans = await env.DB.prepare(`
    SELECT * FROM safety_plans 
    WHERE user_id = ? 
    ORDER BY phase ASC
  `).bind(userId).all()

  return c.json({ plans: plans.results })
})

// Update plan progress
app.patch('/api/plans/:planId/progress', async (c) => {
  const { env } = c
  const planId = c.req.param('planId')
  const { progress } = await c.req.json()

  await env.DB.prepare(`
    UPDATE safety_plans 
    SET progress = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).bind(progress, planId).run()

  return c.json({ success: true })
})

// Get equipment recommendations
app.get('/api/equipment/:planId', async (c) => {
  const { env } = c
  const planId = c.req.param('planId')

  // Get equipment for this plan (or generate mock data)
  const equipment = getEquipmentRecommendations(planId)

  return c.json({ equipment })
})

// Schedule PT/OT appointment
app.post('/api/appointments', async (c) => {
  const { env } = c
  const appointment = await c.req.json()

  const result = await env.DB.prepare(`
    INSERT INTO appointments (user_id, assessment_id, scheduled_at, type, status, notes)
    VALUES (?, ?, ?, ?, 'scheduled', ?)
  `).bind(
    appointment.userId,
    appointment.assessmentId,
    appointment.scheduledAt,
    appointment.type || 'video',
    appointment.notes
  ).run()

  // Create alert for the appointment
  await env.DB.prepare(`
    INSERT INTO alerts (user_id, type, severity, title, message)
    VALUES (?, 'appointment', 'medium', 'PT/OT Assessment Scheduled', ?)
  `).bind(
    appointment.userId,
    `Your ${appointment.type} assessment is scheduled for ${appointment.scheduledAt}`
  ).run()

  return c.json({ 
    appointmentId: result.meta.last_row_id,
    success: true 
  })
})

// Get user's alerts
app.get('/api/alerts/:userId', async (c) => {
  const { env } = c
  const userId = c.req.param('userId')

  const alerts = await env.DB.prepare(`
    SELECT * FROM alerts 
    WHERE user_id = ? AND is_read = FALSE 
    ORDER BY created_at DESC 
    LIMIT 10
  `).bind(userId).all()

  return c.json({ alerts: alerts.results })
})

// Mark alert as read
app.patch('/api/alerts/:alertId/read', async (c) => {
  const { env } = c
  const alertId = c.req.param('alertId')

  await env.DB.prepare(`
    UPDATE alerts SET is_read = TRUE WHERE id = ?
  `).bind(alertId).run()

  return c.json({ success: true })
})

// Add caregiver
app.post('/api/caregivers', async (c) => {
  const { env } = c
  const { seniorId, caregiverEmail, relationship, alertPreferences } = await c.req.json()

  // Check if caregiver exists
  let caregiver = await env.DB.prepare(`
    SELECT id FROM users WHERE email = ?
  `).bind(caregiverEmail).first()

  // Create caregiver user if doesn't exist
  if (!caregiver) {
    const result = await env.DB.prepare(`
      INSERT INTO users (email, name, role) VALUES (?, ?, 'caregiver')
    `).bind(caregiverEmail, caregiverEmail.split('@')[0], ).run()
    caregiver = { id: result.meta.last_row_id }
  }

  // Create relationship
  await env.DB.prepare(`
    INSERT INTO caregivers (senior_id, caregiver_id, relationship, alert_preferences)
    VALUES (?, ?, ?, ?)
  `).bind(seniorId, caregiver.id, relationship, JSON.stringify(alertPreferences)).run()

  return c.json({ success: true, caregiverId: caregiver.id })
})

// ===================
// Helper Functions
// ===================

function analyzeRoomHazards(roomType: string) {
  // Mock hazard detection - replace with OpenAI Vision API
  const hazardsByRoom: Record<string, any[]> = {
    bathroom: [
      { type: 'slippery_surface', location: 'floor', severity: 'high', confidence: 0.85 },
      { type: 'missing_grab_bar', location: 'shower', severity: 'high', confidence: 0.92 },
      { type: 'poor_lighting', location: 'overall', severity: 'medium', confidence: 0.78 }
    ],
    bedroom: [
      { type: 'cluttered_pathway', location: 'floor', severity: 'medium', confidence: 0.81 },
      { type: 'loose_rug', location: 'bedside', severity: 'high', confidence: 0.88 },
      { type: 'inadequate_lighting', location: 'nightstand', severity: 'medium', confidence: 0.75 }
    ],
    stairs: [
      { type: 'missing_handrail', location: 'left_side', severity: 'critical', confidence: 0.95 },
      { type: 'uneven_steps', location: 'middle', severity: 'high', confidence: 0.83 },
      { type: 'poor_visibility', location: 'bottom', severity: 'high', confidence: 0.87 }
    ],
    kitchen: [
      { type: 'items_out_of_reach', location: 'upper_cabinets', severity: 'medium', confidence: 0.79 },
      { type: 'slippery_floor', location: 'sink_area', severity: 'medium', confidence: 0.76 },
      { type: 'sharp_corners', location: 'counter', severity: 'low', confidence: 0.72 }
    ],
    living_room: [
      { type: 'trip_hazard', location: 'cables', severity: 'medium', confidence: 0.84 },
      { type: 'unstable_furniture', location: 'coffee_table', severity: 'low', confidence: 0.71 },
      { type: 'poor_lighting', location: 'reading_area', severity: 'low', confidence: 0.73 }
    ]
  }

  return hazardsByRoom[roomType] || []
}

function calculateRiskScore(hazards: any[]): number {
  const severityScores = { critical: 10, high: 7, medium: 4, low: 2 }
  if (hazards.length === 0) return 1
  
  const totalScore = hazards.reduce((sum, h) => 
    sum + (severityScores[h.severity as keyof typeof severityScores] || 0) * h.confidence, 0
  )
  
  return Math.min(10, Math.round(totalScore / hazards.length))
}

function getRecommendations(hazards: any[]) {
  const recommendations: Record<string, string> = {
    slippery_surface: 'Install non-slip mats or apply anti-slip coating',
    missing_grab_bar: 'Install grab bars for support',
    poor_lighting: 'Add brighter LED lights or motion-activated lighting',
    cluttered_pathway: 'Clear walkways and organize items',
    loose_rug: 'Secure rug with non-slip backing or remove',
    inadequate_lighting: 'Add nightlights or bedside lamps',
    missing_handrail: 'Install sturdy handrails on both sides',
    uneven_steps: 'Mark step edges with high-contrast tape',
    items_out_of_reach: 'Reorganize frequently used items to lower shelves',
    trip_hazard: 'Secure cables with cord covers or reroute',
    unstable_furniture: 'Secure or replace unstable furniture',
    sharp_corners: 'Add corner guards or padding'
  }

  return hazards.map(h => ({
    hazard: h.type,
    recommendation: recommendations[h.type] || 'Consult with PT/OT for specific recommendations',
    priority: h.severity
  }))
}

function generateSafetyPlans(assessments: any[]) {
  // Analyze all hazards and create phased plans
  const allHazards = assessments.flatMap(a => JSON.parse(a.hazards_detected || '[]'))
  
  return [
    {
      phase: 1,
      title: 'Essential Safety Modifications',
      tasks: [
        { task: 'Install grab bars in bathroom', completed: false, priority: 'high' },
        { task: 'Add non-slip mats in wet areas', completed: false, priority: 'high' },
        { task: 'Clear walkways of clutter', completed: false, priority: 'medium' },
        { task: 'Improve lighting in dark areas', completed: false, priority: 'medium' },
        { task: 'Secure loose rugs', completed: false, priority: 'high' }
      ]
    },
    {
      phase: 2,
      title: 'Smart Technology & Monitoring',
      tasks: [
        { task: 'Install motion-activated lighting', completed: false, priority: 'medium' },
        { task: 'Set up medical alert system', completed: false, priority: 'high' },
        { task: 'Add smart door sensors', completed: false, priority: 'low' },
        { task: 'Install fall detection devices', completed: false, priority: 'high' }
      ]
    },
    {
      phase: 3,
      title: 'Ongoing Support & Optimization',
      tasks: [
        { task: 'Set up regular PT/OT check-ins', completed: false, priority: 'medium' },
        { task: 'Join local senior exercise program', completed: false, priority: 'low' },
        { task: 'Establish caregiver communication system', completed: false, priority: 'medium' },
        { task: 'Review and update safety plan quarterly', completed: false, priority: 'medium' }
      ]
    }
  ]
}

function getEquipmentRecommendations(planId: string) {
  // Mock equipment recommendations
  return [
    {
      name: 'Adjustable Grab Bar Set',
      category: 'grab_bar',
      description: 'Suction-cup grab bars for bathroom safety',
      price: 49.99,
      link: 'https://example.com/grab-bars',
      priority: 'essential'
    },
    {
      name: 'Motion Sensor Night Lights (4-pack)',
      category: 'lighting',
      description: 'Automatic LED lights for hallways and bathrooms',
      price: 29.99,
      link: 'https://example.com/night-lights',
      priority: 'recommended'
    },
    {
      name: 'Medical Alert System with Fall Detection',
      category: 'medical_alert',
      description: '24/7 monitoring with automatic fall detection',
      price: 39.99,
      link: 'https://example.com/medical-alert',
      priority: 'essential'
    },
    {
      name: 'Non-Slip Bath Mat',
      category: 'bathroom',
      description: 'Extra-long anti-slip mat with suction cups',
      price: 24.99,
      link: 'https://example.com/bath-mat',
      priority: 'essential'
    }
  ]
}

// ===================
// Main HTML Page
// ===================

app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SafeAging Home - AI-Powered Home Safety Assessment</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          .gradient-bg {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .card-hover:hover {
            transform: translateY(-4px);
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          }
        </style>
    </head>
    <body class="bg-gray-50">
        <div id="app"></div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

export default app