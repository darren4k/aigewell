import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
}

const ptotApi = new Hono<{ Bindings: Bindings }>()

// ================================
// PT/OT Evaluation API Endpoints
// ================================

// Get all assessment templates
ptotApi.get('/templates', async (c) => {
  const { env } = c
  
  const templates = await env.DB.prepare(`
    SELECT * FROM assessment_templates 
    ORDER BY category, name
  `).all()
  
  return c.json({ templates: templates.results })
})

// Create new professional evaluation
ptotApi.post('/evaluations', async (c) => {
  const { env } = c
  const data = await c.req.json()
  
  const result = await env.DB.prepare(`
    INSERT INTO professional_evaluations (
      patient_id, provider_id, evaluation_type, chief_complaint,
      medical_history, medications, living_situation, home_environment
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    data.patientId,
    data.providerId,
    data.evaluationType || 'initial',
    data.chiefComplaint,
    data.medicalHistory,
    JSON.stringify(data.medications || []),
    data.livingSituation,
    JSON.stringify(data.homeEnvironment || {})
  ).run()
  
  return c.json({ 
    evaluationId: result.meta.last_row_id,
    success: true 
  })
})

// Get evaluation by ID with all assessments
ptotApi.get('/evaluations/:id', async (c) => {
  const { env } = c
  const evaluationId = c.req.param('id')
  
  // Get main evaluation
  const evaluation = await env.DB.prepare(`
    SELECT e.*, 
           u1.name as patient_name,
           u2.name as provider_name
    FROM professional_evaluations e
    JOIN users u1 ON e.patient_id = u1.id
    JOIN users u2 ON e.provider_id = u2.id
    WHERE e.id = ?
  `).bind(evaluationId).first()
  
  // Get all assessment scores
  const scores = await env.DB.prepare(`
    SELECT * FROM assessment_scores 
    WHERE evaluation_id = ?
  `).bind(evaluationId).all()
  
  // Get specific assessments if they exist
  const bergBalance = await env.DB.prepare(`
    SELECT * FROM berg_balance_items WHERE evaluation_id = ?
  `).bind(evaluationId).first()
  
  const tugTest = await env.DB.prepare(`
    SELECT * FROM tug_test_results WHERE evaluation_id = ?
  `).bind(evaluationId).first()
  
  const tinetti = await env.DB.prepare(`
    SELECT * FROM tinetti_assessment WHERE evaluation_id = ?
  `).bind(evaluationId).first()
  
  const adl = await env.DB.prepare(`
    SELECT * FROM adl_assessment WHERE evaluation_id = ?
  `).bind(evaluationId).first()
  
  const homeSafety = await env.DB.prepare(`
    SELECT * FROM home_safety_checklist WHERE evaluation_id = ?
  `).bind(evaluationId).first()
  
  // Get recommendations
  const recommendations = await env.DB.prepare(`
    SELECT * FROM clinical_recommendations 
    WHERE evaluation_id = ?
    ORDER BY priority, category
  `).bind(evaluationId).all()
  
  return c.json({
    evaluation,
    assessmentScores: scores.results,
    bergBalance,
    tugTest,
    tinetti,
    adl,
    homeSafety,
    recommendations: recommendations.results
  })
})

// Submit Berg Balance Scale assessment
ptotApi.post('/evaluations/:id/berg-balance', async (c) => {
  const { env } = c
  const evaluationId = c.req.param('id')
  const data = await c.req.json()
  
  // Calculate total score
  const items = [
    data.sittingToStanding, data.standingUnsupported, data.sittingUnsupported,
    data.standingToSitting, data.transfers, data.standingEyesClosed,
    data.standingFeetTogether, data.reachingForward, data.pickingUpObject,
    data.turningLookBehind, data.turning360, data.placingFootOnStool,
    data.standingOneFootFront, data.standingOnOneLeg
  ]
  const totalScore = items.reduce((sum, score) => sum + (score || 0), 0)
  
  // Determine fall risk
  let fallRisk = 'low'
  if (totalScore <= 20) fallRisk = 'high'
  else if (totalScore <= 40) fallRisk = 'medium'
  
  // Insert Berg Balance results
  await env.DB.prepare(`
    INSERT INTO berg_balance_items (
      evaluation_id, sitting_to_standing, standing_unsupported, sitting_unsupported,
      standing_to_sitting, transfers, standing_eyes_closed, standing_feet_together,
      reaching_forward, picking_up_object, turning_look_behind, turning_360,
      placing_foot_on_stool, standing_one_foot_front, standing_on_one_leg,
      total_score, fall_risk
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    evaluationId, ...items, totalScore, fallRisk
  ).run()
  
  // Record in assessment_scores
  await env.DB.prepare(`
    INSERT INTO assessment_scores (
      evaluation_id, template_id, assessment_name, raw_score,
      normalized_score, risk_category, assessment_data
    ) VALUES (?, 1, 'Berg Balance Scale', ?, ?, ?, ?)
  `).bind(
    evaluationId,
    totalScore,
    Math.round((totalScore / 56) * 100),
    fallRisk,
    JSON.stringify(data)
  ).run()
  
  // Generate recommendations based on score
  const recommendations = generateBergRecommendations(totalScore, fallRisk)
  for (const rec of recommendations) {
    await env.DB.prepare(`
      INSERT INTO clinical_recommendations (
        evaluation_id, category, priority, recommendation, rationale,
        implementation_timeline
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      evaluationId,
      rec.category,
      rec.priority,
      rec.recommendation,
      rec.rationale,
      rec.timeline
    ).run()
  }
  
  return c.json({ 
    totalScore,
    fallRisk,
    recommendations,
    success: true 
  })
})

// Submit TUG Test results
ptotApi.post('/evaluations/:id/tug-test', async (c) => {
  const { env } = c
  const evaluationId = c.req.param('id')
  const data = await c.req.json()
  
  // Calculate average time
  const times = [data.trial1, data.trial2, data.trial3].filter(t => t > 0)
  const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length
  
  // Determine fall risk based on time
  let fallRisk = 'low'
  if (avgTime > 14) fallRisk = 'high'
  else if (avgTime >= 10) fallRisk = 'moderate'
  
  await env.DB.prepare(`
    INSERT INTO tug_test_results (
      evaluation_id, trial1_time, trial2_time, trial3_time,
      average_time, assistive_device, fall_risk, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    evaluationId,
    data.trial1,
    data.trial2,
    data.trial3,
    avgTime,
    data.assistiveDevice || 'none',
    fallRisk,
    data.notes
  ).run()
  
  // Record in assessment_scores
  await env.DB.prepare(`
    INSERT INTO assessment_scores (
      evaluation_id, template_id, assessment_name, raw_score,
      normalized_score, risk_category, assessment_data
    ) VALUES (?, 2, 'Timed Up and Go', ?, ?, ?, ?)
  `).bind(
    evaluationId,
    avgTime,
    Math.max(0, Math.round((1 - avgTime/30) * 100)), // Normalize inversely
    fallRisk,
    JSON.stringify(data)
  ).run()
  
  return c.json({ 
    averageTime: avgTime,
    fallRisk,
    success: true 
  })
})

// Submit Tinetti Assessment
ptotApi.post('/evaluations/:id/tinetti', async (c) => {
  const { env } = c
  const evaluationId = c.req.param('id')
  const data = await c.req.json()
  
  // Calculate scores
  const balanceScore = data.balanceItems.reduce((sum: number, score: number) => sum + score, 0)
  const gaitScore = data.gaitItems.reduce((sum: number, score: number) => sum + score, 0)
  const totalScore = balanceScore + gaitScore
  
  // Determine fall risk
  let fallRisk = 'low'
  if (totalScore < 19) fallRisk = 'high'
  else if (totalScore <= 23) fallRisk = 'moderate'
  
  await env.DB.prepare(`
    INSERT INTO tinetti_assessment (
      evaluation_id, balance_score, gait_score, total_score, fall_risk
    ) VALUES (?, ?, ?, ?, ?)
  `).bind(
    evaluationId,
    balanceScore,
    gaitScore,
    totalScore,
    fallRisk
  ).run()
  
  return c.json({ 
    balanceScore,
    gaitScore,
    totalScore,
    fallRisk,
    success: true 
  })
})

// Submit ADL Assessment
ptotApi.post('/evaluations/:id/adl', async (c) => {
  const { env } = c
  const evaluationId = c.req.param('id')
  const data = await c.req.json()
  
  // Calculate total score
  const totalScore = Object.values(data.scores).reduce((sum: number, score: any) => sum + score, 0)
  
  // Determine independence level
  let independenceLevel = 'independent'
  if (totalScore < 20) independenceLevel = 'dependent'
  else if (totalScore < 28) independenceLevel = 'supervised'
  
  await env.DB.prepare(`
    INSERT INTO adl_assessment (
      evaluation_id, bathing, dressing, toileting, transferring,
      continence, feeding, walking, stairs, medication_management,
      shopping, meal_preparation, housekeeping, laundry,
      transportation, telephone_use, finance_management,
      total_score, independence_level
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    evaluationId,
    data.scores.bathing,
    data.scores.dressing,
    data.scores.toileting,
    data.scores.transferring,
    data.scores.continence,
    data.scores.feeding,
    data.scores.walking,
    data.scores.stairs,
    data.scores.medicationManagement,
    data.scores.shopping,
    data.scores.mealPreparation,
    data.scores.housekeeping,
    data.scores.laundry,
    data.scores.transportation,
    data.scores.telephoneUse,
    data.scores.financeManagement,
    totalScore,
    independenceLevel
  ).run()
  
  return c.json({ 
    totalScore,
    independenceLevel,
    success: true 
  })
})

// Submit Home Safety Checklist
ptotApi.post('/evaluations/:id/home-safety', async (c) => {
  const { env } = c
  const evaluationId = c.req.param('id')
  const data = await c.req.json()
  
  // Count total hazards
  const hazardCount = Object.values(data.items).filter((v: any) => 
    v === 'inadequate' || v === 'needs_improvement'
  ).length
  
  // Generate priority modifications
  const priorities = generateHomeSafetyPriorities(data.items)
  
  await env.DB.prepare(`
    INSERT INTO home_safety_checklist (
      evaluation_id, entrance_lighting, entrance_steps_condition,
      entrance_handrails, pathway_clearance, rug_security,
      grab_bars_toilet, grab_bars_shower, non_slip_surfaces,
      bathroom_lighting, bed_height, nightlight_present,
      stair_lighting, handrails_both_sides, total_hazards,
      priority_modifications, estimated_modification_cost
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    evaluationId,
    data.items.entranceLighting,
    data.items.entranceSteps,
    data.items.entranceHandrails,
    data.items.pathwayClearance,
    data.items.rugSecurity,
    data.items.grabBarsToilet,
    data.items.grabBarsShower,
    data.items.nonSlipSurfaces,
    data.items.bathroomLighting,
    data.items.bedHeight,
    data.items.nightlight,
    data.items.stairLighting,
    data.items.handrailsBothSides,
    hazardCount,
    JSON.stringify(priorities),
    calculateModificationCost(priorities)
  ).run()
  
  return c.json({ 
    totalHazards: hazardCount,
    priorities,
    estimatedCost: calculateModificationCost(priorities),
    success: true 
  })
})

// Generate comprehensive evaluation report
ptotApi.get('/evaluations/:id/report', async (c) => {
  const { env } = c
  const evaluationId = c.req.param('id')
  
  // Get all evaluation data
  const evalData = await ptotApi.request(`/evaluations/${evaluationId}`, {
    headers: c.req.headers
  }, env)
  const evaluation = await evalData.json()
  
  // Calculate overall risk score
  const overallRisk = calculateOverallRisk(evaluation)
  
  // Update evaluation with overall risk
  await env.DB.prepare(`
    UPDATE professional_evaluations 
    SET overall_risk_level = ?, status = 'completed'
    WHERE id = ?
  `).bind(overallRisk, evaluationId).run()
  
  return c.json({
    ...evaluation,
    overallRisk,
    reportGenerated: new Date().toISOString()
  })
})

// Get provider's evaluations
ptotApi.get('/providers/:providerId/evaluations', async (c) => {
  const { env } = c
  const providerId = c.req.param('providerId')
  
  const evaluations = await env.DB.prepare(`
    SELECT e.*, u.name as patient_name
    FROM professional_evaluations e
    JOIN users u ON e.patient_id = u.id
    WHERE e.provider_id = ?
    ORDER BY e.evaluation_date DESC
  `).bind(providerId).all()
  
  return c.json({ evaluations: evaluations.results })
})

// ================================
// Helper Functions
// ================================

function generateBergRecommendations(score: number, risk: string) {
  const recommendations = []
  
  if (risk === 'high') {
    recommendations.push({
      category: 'equipment',
      priority: 'critical',
      recommendation: 'Immediate walker or rollator prescription',
      rationale: 'Berg Balance Score <21 indicates high fall risk requiring assistive device',
      timeline: 'immediate'
    })
    recommendations.push({
      category: 'medical',
      priority: 'critical',
      recommendation: 'Refer to neurologist for comprehensive evaluation',
      rationale: 'Severe balance impairment requires medical investigation',
      timeline: '1_week'
    })
    recommendations.push({
      category: 'environmental',
      priority: 'critical',
      recommendation: 'Install grab bars in bathroom and bedroom',
      rationale: 'Environmental modifications critical for high fall risk patients',
      timeline: 'immediate'
    })
  } else if (risk === 'medium') {
    recommendations.push({
      category: 'exercise',
      priority: 'high',
      recommendation: 'Enroll in supervised balance training program',
      rationale: 'Evidence shows balance training reduces fall risk by 30%',
      timeline: '1_week'
    })
    recommendations.push({
      category: 'equipment',
      priority: 'medium',
      recommendation: 'Consider single-point cane for outdoor ambulation',
      rationale: 'Moderate balance impairment benefits from occasional support',
      timeline: '1_month'
    })
  }
  
  recommendations.push({
    category: 'education',
    priority: 'medium',
    recommendation: 'Fall prevention education for patient and family',
    rationale: 'Education improves awareness and compliance with safety measures',
    timeline: '1_week'
  })
  
  return recommendations
}

function generateHomeSafetyPriorities(items: any) {
  const priorities = []
  
  if (items.grabBarsToilet === 'inadequate') {
    priorities.push({
      item: 'Toilet grab bars',
      priority: 'critical',
      estimatedCost: 150
    })
  }
  
  if (items.nonSlipSurfaces === 'inadequate') {
    priorities.push({
      item: 'Non-slip bath mat',
      priority: 'critical',
      estimatedCost: 30
    })
  }
  
  if (items.stairLighting === 'inadequate') {
    priorities.push({
      item: 'Stair lighting improvement',
      priority: 'high',
      estimatedCost: 200
    })
  }
  
  if (items.nightlight === 'inadequate') {
    priorities.push({
      item: 'Motion-activated nightlights',
      priority: 'medium',
      estimatedCost: 40
    })
  }
  
  return priorities
}

function calculateModificationCost(priorities: any[]) {
  return priorities.reduce((sum, p) => sum + p.estimatedCost, 0)
}

function calculateOverallRisk(evaluation: any) {
  const risks = []
  
  if (evaluation.bergBalance?.fall_risk) risks.push(evaluation.bergBalance.fall_risk)
  if (evaluation.tugTest?.fall_risk) risks.push(evaluation.tugTest.fall_risk)
  if (evaluation.tinetti?.fall_risk) risks.push(evaluation.tinetti.fall_risk)
  
  const highCount = risks.filter(r => r === 'high').length
  const medCount = risks.filter(r => r === 'medium' || r === 'moderate').length
  
  if (highCount >= 2) return 'critical'
  if (highCount >= 1) return 'high'
  if (medCount >= 2) return 'moderate'
  return 'low'
}

export default ptotApi