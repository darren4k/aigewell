import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
  KV: KVNamespace
}

const standardizedApi = new Hono<{ Bindings: Bindings }>()

// ================================
// Home FAST Assessment
// ================================

standardizedApi.post('/home-fast', async (c) => {
  const { env } = c
  const data = await c.req.json()
  
  // Calculate total score (1 point for each "yes")
  const items = [
    data.walkwaysClear, data.floorCoveringsSecure, data.matsSecure, data.floorSurfacesNonslip,
    data.furnitureStable, data.furnitureAppropriateHeight, data.bedAppropriateHeight,
    data.adequateLightingIndoors, data.adequateLightingOutdoors, data.accessibleSwitches, data.nightLightsAvailable,
    data.toiletAppropriateHeight, data.grabRailsToilet, data.grabRailsShower, data.nonslipShowerSurface,
    data.itemsReachable, data.stepLadderAvailable,
    data.indoorStairsRails, data.outdoorStairsRails, data.stairsEdgesVisible, data.stairsInGoodRepair,
    data.mobilityAidsAppropriate, data.mobilityAidsGoodRepair, data.petHazardsManaged, data.footwearAppropriate
  ]
  
  const totalScore = items.filter(item => item === true).length
  
  // Determine risk level
  let riskLevel = 'low'
  if (totalScore < 15) riskLevel = 'high'
  else if (totalScore < 20) riskLevel = 'moderate'
  
  // Store assessment
  const result = await env.DB.prepare(`
    INSERT INTO home_fast_assessment (
      evaluation_id, user_id, walkways_clear, floor_coverings_secure, mats_secure,
      floor_surfaces_nonslip, furniture_stable, furniture_appropriate_height,
      bed_appropriate_height, adequate_lighting_indoors, adequate_lighting_outdoors,
      accessible_switches, night_lights_available, toilet_appropriate_height,
      grab_rails_toilet, grab_rails_shower, nonslip_shower_surface,
      items_reachable, step_ladder_available, indoor_stairs_rails,
      outdoor_stairs_rails, stairs_edges_visible, stairs_in_good_repair,
      mobility_aids_appropriate, mobility_aids_good_repair, pet_hazards_managed,
      footwear_appropriate, total_score, risk_level, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    data.evaluationId,
    data.userId,
    ...items,
    totalScore,
    riskLevel,
    data.notes
  ).run()
  
  // Generate recommendations
  const recommendations = generateHomeFASTRecommendations(items, riskLevel)
  
  // Track analytics
  await trackAnalytics(env, data.userId, 'assessment_completed', 'safety', {
    assessmentType: 'HOME_FAST',
    score: totalScore,
    riskLevel
  })
  
  return c.json({
    assessmentId: result.meta.last_row_id,
    totalScore,
    riskLevel,
    recommendations,
    success: true
  })
})

// ================================
// HSSAT Assessment
// ================================

standardizedApi.post('/hssat', async (c) => {
  const { env } = c
  const data = await c.req.json()
  
  // Count all safety items (65 total possible)
  const sections = {
    entrance: 10,
    stairs: 8,
    living: 7,
    kitchen: 12,
    bedroom: 8,
    bathroom: 14,
    general: 6
  }
  
  let totalScore = 0
  let priorityHazards = []
  
  // Calculate scores by section
  Object.keys(sections).forEach(section => {
    const sectionData = data[section] || {}
    const sectionScore = Object.values(sectionData).filter(v => v === true).length
    totalScore += sectionScore
    
    // Identify critical missing items
    if (section === 'bathroom' && !sectionData.grabBarsToilet) {
      priorityHazards.push({ item: 'Toilet grab bars', priority: 'critical' })
    }
    if (section === 'stairs' && !sectionData.handrailsBoth) {
      priorityHazards.push({ item: 'Stair handrails on both sides', priority: 'critical' })
    }
    if (section === 'entrance' && !sectionData.wellLit) {
      priorityHazards.push({ item: 'Entrance lighting', priority: 'high' })
    }
  })
  
  const percentageSafe = (totalScore / 65) * 100
  
  // Store assessment
  const result = await env.DB.prepare(`
    INSERT INTO hssat_assessment (
      evaluation_id, user_id, total_score, percentage_safe,
      priority_hazards, entrance_well_lit, entrance_handrail,
      stairs_handrails_both, bathroom_grab_bars_toilet,
      bathroom_grab_bars_tub, kitchen_items_reachable
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    data.evaluationId,
    data.userId,
    totalScore,
    percentageSafe,
    JSON.stringify(priorityHazards),
    data.entrance?.wellLit,
    data.entrance?.handrail,
    data.stairs?.handrailsBoth,
    data.bathroom?.grabBarsToilet,
    data.bathroom?.grabBarsTub,
    data.kitchen?.itemsReachable
  ).run()
  
  return c.json({
    assessmentId: result.meta.last_row_id,
    totalScore,
    percentageSafe,
    priorityHazards,
    safetyLevel: percentageSafe > 80 ? 'safe' : percentageSafe > 60 ? 'moderate' : 'unsafe',
    success: true
  })
})

// ================================
// CDC STEADI Assessment
// ================================

standardizedApi.post('/cdc-steadi', async (c) => {
  const { env } = c
  const data = await c.req.json()
  
  // Calculate Stay Independent score
  const questions = [
    data.fallenPastYear,
    data.feelUnsteady,
    data.worryAboutFalling,
    data.needHandsToStand,
    data.useMobilityAid,
    data.steadyWalking,
    data.needRailStairs,
    data.rushToToilet,
    data.lostFeelingFeet,
    data.takeMedicationDizzy,
    data.takeSleepMedication,
    data.feelSadDepressed
  ]
  
  const totalScore = questions.reduce((sum, q) => sum + (q || 0), 0)
  
  // Determine risk category
  let riskCategory = 'low'
  if (totalScore >= 8) riskCategory = 'high'
  else if (totalScore >= 4) riskCategory = 'moderate'
  
  // Store assessment
  const result = await env.DB.prepare(`
    INSERT INTO steadi_assessment (
      evaluation_id, user_id, fallen_past_year, feel_unsteady,
      worry_about_falling, need_hands_to_stand, use_mobility_aid,
      steady_walking, need_rail_stairs, rush_to_toilet,
      lost_feeling_feet, take_medication_dizzy, take_sleep_medication,
      feel_sad_depressed, total_score, risk_category,
      tug_test_seconds, chair_stand_test_count, four_stage_balance_score,
      exercise_program, medication_adjustment, vision_correction,
      home_modification
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    data.evaluationId,
    data.userId,
    ...questions,
    totalScore,
    riskCategory,
    data.tugTestSeconds,
    data.chairStandCount,
    data.fourStageBalance,
    data.exerciseProgram,
    data.medicationAdjustment,
    data.visionCorrection,
    data.homeModification
  ).run()
  
  // Generate STEADI algorithm recommendations
  const interventions = generateSTEADIInterventions(riskCategory, data)
  
  // HIPAA audit log
  await logHIPAAEvent(env, data.userId, 'create', 'fall_risk_assessment', result.meta.last_row_id)
  
  return c.json({
    assessmentId: result.meta.last_row_id,
    totalScore,
    riskCategory,
    interventions,
    success: true
  })
})

// ================================
// Morse Fall Scale
// ================================

standardizedApi.post('/morse-fall-scale', async (c) => {
  const { env } = c
  const data = await c.req.json()
  
  // Calculate Morse score
  const scores = {
    historyOfFalling: data.historyOfFalling ? 25 : 0,
    secondaryDiagnosis: data.secondaryDiagnosis ? 15 : 0,
    ambulatoryAid: data.ambulatoryAid || 0, // 0, 15, or 30
    ivTherapy: data.ivTherapy ? 20 : 0,
    gaitTransferring: data.gaitTransferring || 0, // 0, 10, or 20
    mentalStatus: data.mentalStatus || 0 // 0 or 15
  }
  
  const totalScore = Object.values(scores).reduce((sum, s) => sum + s, 0)
  
  // Determine risk level
  let riskLevel = 'low'
  if (totalScore >= 45) riskLevel = 'high'
  else if (totalScore >= 25) riskLevel = 'moderate'
  
  // Generate interventions based on risk
  const interventions = generateMorseInterventions(riskLevel, scores)
  
  // Store assessment
  const result = await env.DB.prepare(`
    INSERT INTO morse_fall_scale (
      evaluation_id, user_id, history_of_falling, secondary_diagnosis,
      ambulatory_aid, iv_therapy, gait_transferring, mental_status,
      total_score, risk_level, interventions_implemented
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    data.evaluationId,
    data.userId,
    scores.historyOfFalling,
    scores.secondaryDiagnosis,
    scores.ambulatoryAid,
    scores.ivTherapy,
    scores.gaitTransferring,
    scores.mentalStatus,
    totalScore,
    riskLevel,
    JSON.stringify(interventions)
  ).run()
  
  return c.json({
    assessmentId: result.meta.last_row_id,
    totalScore,
    riskLevel,
    interventions,
    success: true
  })
})

// ================================
// Export Functions
// ================================

standardizedApi.get('/export/:evaluationId', async (c) => {
  const { env } = c
  const evaluationId = c.req.param('evaluationId')
  const format = c.req.query('format') || 'pdf'
  
  // Gather all assessment data
  const evaluation = await env.DB.prepare(`
    SELECT * FROM professional_evaluations WHERE id = ?
  `).bind(evaluationId).first()
  
  const homeFast = await env.DB.prepare(`
    SELECT * FROM home_fast_assessment WHERE evaluation_id = ?
  `).bind(evaluationId).first()
  
  const hssat = await env.DB.prepare(`
    SELECT * FROM hssat_assessment WHERE evaluation_id = ?
  `).bind(evaluationId).first()
  
  const steadi = await env.DB.prepare(`
    SELECT * FROM steadi_assessment WHERE evaluation_id = ?
  `).bind(evaluationId).first()
  
  const morse = await env.DB.prepare(`
    SELECT * FROM morse_fall_scale WHERE evaluation_id = ?
  `).bind(evaluationId).first()
  
  // Generate report data
  const reportData = {
    evaluation,
    assessments: {
      homeFast,
      hssat,
      steadi,
      morse
    },
    generatedAt: new Date().toISOString(),
    format
  }
  
  // Track export
  await env.DB.prepare(`
    INSERT INTO export_history (evaluation_id, export_type, exported_by, file_name, metadata)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    evaluationId,
    format.toUpperCase(),
    c.req.header('user-id') || 1,
    `evaluation_${evaluationId}_${Date.now()}.${format}`,
    JSON.stringify(reportData)
  ).run()
  
  // HIPAA audit
  await logHIPAAEvent(env, c.req.header('user-id') || 1, 'export', 'evaluation', evaluationId)
  
  if (format === 'json') {
    return c.json(reportData)
  } else if (format === 'csv') {
    return c.text(generateCSVReport(reportData), 200, {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="evaluation_${evaluationId}.csv"`
    })
  } else {
    // For PDF, return HTML that can be converted client-side
    return c.html(generateHTMLReport(reportData))
  }
})

// ================================
// Multi-Caregiver Management
// ================================

standardizedApi.post('/caregivers/invite', async (c) => {
  const { env } = c
  const { seniorId, caregiverEmail, permissionLevel } = await c.req.json()
  
  // Create invitation token
  const token = crypto.randomUUID()
  
  // Store in KV with 7-day expiry
  await env.KV.put(
    `invite:${token}`,
    JSON.stringify({ seniorId, caregiverEmail, permissionLevel }),
    { expirationTtl: 604800 } // 7 days
  )
  
  // Create caregiver permission record
  await env.DB.prepare(`
    INSERT INTO caregiver_permissions (
      caregiver_id, senior_id, permission_level, invitation_status, invitation_sent
    ) VALUES (
      (SELECT id FROM users WHERE email = ?),
      ?, ?, 'pending', CURRENT_TIMESTAMP
    )
  `).bind(caregiverEmail, seniorId, permissionLevel).run()
  
  // Return invitation link
  return c.json({
    invitationLink: `https://aigewell.pages.dev/invite/${token}`,
    expiresIn: '7 days',
    success: true
  })
})

// ================================
// Helper Functions
// ================================

function generateHomeFASTRecommendations(items: boolean[], riskLevel: string) {
  const recommendations = []
  
  if (!items[13]) { // grab_rails_toilet
    recommendations.push({
      priority: 'critical',
      item: 'Install toilet grab bars',
      cost: 150,
      difficulty: 'moderate',
      timeframe: 'immediate'
    })
  }
  
  if (!items[14]) { // grab_rails_shower
    recommendations.push({
      priority: 'critical',
      item: 'Install shower grab bars',
      cost: 200,
      difficulty: 'moderate',
      timeframe: 'immediate'
    })
  }
  
  if (!items[10]) { // night_lights_available
    recommendations.push({
      priority: 'high',
      item: 'Add motion-activated nightlights',
      cost: 40,
      difficulty: 'easy',
      timeframe: '1_week'
    })
  }
  
  return recommendations
}

function generateSTEADIInterventions(riskCategory: string, data: any) {
  const interventions = []
  
  if (riskCategory === 'high') {
    interventions.push(
      'Refer to fall prevention program',
      'Comprehensive medication review',
      'PT evaluation for gait and balance training',
      'Home safety evaluation by OT'
    )
  } else if (riskCategory === 'moderate') {
    interventions.push(
      'Recommend community exercise program',
      'Review medications for fall risk',
      'Vision screening',
      'Vitamin D supplementation'
    )
  }
  
  if (data.tugTestSeconds > 12) {
    interventions.push('Prescribe assistive device')
  }
  
  return interventions
}

function generateMorseInterventions(riskLevel: string, scores: any) {
  const interventions = []
  
  if (riskLevel === 'high') {
    interventions.push(
      'Implement high fall risk protocol',
      'Bed alarm activation',
      'Hourly rounding',
      'Non-slip footwear required'
    )
  }
  
  if (scores.ambulatoryAid === 30) { // Uses furniture for support
    interventions.push('Provide appropriate walking aid')
  }
  
  if (scores.mentalStatus === 15) { // Forgets limitations
    interventions.push('Cognitive assessment needed', 'Visual cues and reminders')
  }
  
  return interventions
}

function generateCSVReport(data: any) {
  // Generate CSV format
  let csv = 'Assessment Type,Score,Risk Level,Date\n'
  
  if (data.assessments.homeFast) {
    csv += `Home FAST,${data.assessments.homeFast.total_score},${data.assessments.homeFast.risk_level},${data.assessments.homeFast.assessment_date}\n`
  }
  
  if (data.assessments.steadi) {
    csv += `CDC STEADI,${data.assessments.steadi.total_score},${data.assessments.steadi.risk_category},${data.assessments.steadi.assessment_date}\n`
  }
  
  return csv
}

function generateHTMLReport(data: any) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Comprehensive Safety Assessment Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #2563eb; }
        .section { margin: 20px 0; padding: 20px; border: 1px solid #e5e7eb; }
        .risk-high { color: #dc2626; font-weight: bold; }
        .risk-moderate { color: #f59e0b; font-weight: bold; }
        .risk-low { color: #10b981; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>Comprehensive Safety Assessment Report</h1>
      <p>Generated: ${data.generatedAt}</p>
      
      ${data.assessments.homeFast ? `
        <div class="section">
          <h2>Home FAST Assessment</h2>
          <p>Score: ${data.assessments.homeFast.total_score}/25</p>
          <p>Risk Level: <span class="risk-${data.assessments.homeFast.risk_level}">${data.assessments.homeFast.risk_level}</span></p>
        </div>
      ` : ''}
      
      ${data.assessments.steadi ? `
        <div class="section">
          <h2>CDC STEADI Assessment</h2>
          <p>Score: ${data.assessments.steadi.total_score}/24</p>
          <p>Risk Category: <span class="risk-${data.assessments.steadi.risk_category}">${data.assessments.steadi.risk_category}</span></p>
        </div>
      ` : ''}
    </body>
    </html>
  `
}

async function trackAnalytics(env: any, userId: number, eventType: string, category: string, data: any) {
  await env.DB.prepare(`
    INSERT INTO analytics_events (user_id, event_type, event_category, event_data, session_id)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    userId,
    eventType,
    category,
    JSON.stringify(data),
    crypto.randomUUID()
  ).run()
}

async function logHIPAAEvent(env: any, userId: number, action: string, resourceType: string, resourceId: number) {
  await env.DB.prepare(`
    INSERT INTO hipaa_audit_log (user_id, action, resource_type, resource_id)
    VALUES (?, ?, ?, ?)
  `).bind(userId, action, resourceType, resourceId).run()
}

export default standardizedApi