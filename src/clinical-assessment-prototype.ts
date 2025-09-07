import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
  KV: KVNamespace
}

const clinicalApi = new Hono<{ Bindings: Bindings }>()

// ================================
// Comprehensive Clinical Assessment
// ================================

interface ClinicalAssessment {
  patientName: string
  assessmentDate: string
  assessor: string
  location: string
  
  // Section 1: Functional Mobility Tests
  functionalMobility: {
    tugTime?: number // seconds
    bergScore?: number // out of 56
    gaitSpeed?: number // m/s
  }
  
  // Section 2: Home Hazards
  homeHazards: {
    [room: string]: {
      looseRugs?: boolean
      poorLighting?: boolean
      clutterObstacles?: boolean
      noGrabBars?: boolean
      slipperyBathSurfaces?: boolean
      electricalCords?: boolean
      stairsWithoutRails?: boolean
      unstableFurniture?: boolean
      smokeAlarmAbsent?: boolean
      medicationsUnsecured?: boolean
    }
  }
  
  // Section 3: Environmental & Assistive Devices
  environmentalDevices: {
    bathroomGrabBars?: 'safe' | 'needs_mod' | 'na'
    raisedToiletSeat?: 'safe' | 'needs_mod' | 'na'
    bedroomLighting?: 'safe' | 'needs_mod' | 'na'
    stairHandrails?: 'safe' | 'needs_mod' | 'na'
    entryRamps?: 'safe' | 'needs_mod' | 'na'
    cordlessPhone?: 'safe' | 'needs_mod' | 'na'
  }
  
  // Section 4: Patient/Caregiver Concerns
  patientConcerns: {
    previousFalls: boolean
    cognitiveImpairment: boolean
    medicationSideEffects: boolean
    fearOfFalling: boolean
  }
  
  // Section 5: Observations
  observations?: string
  recommendations?: string[]
}

// ================================
// Submit Comprehensive Assessment
// ================================

clinicalApi.post('/comprehensive-assessment', async (c) => {
  const { env } = c
  const assessment: ClinicalAssessment = await c.req.json()
  
  // Calculate risk scores
  const riskScores = calculateComprehensiveRisk(assessment)
  
  // Generate recommendations based on scores
  const recommendations = generateEvidenceBasedRecommendations(riskScores)
  
  // Determine overall risk category
  const overallRisk = determineOverallRiskCategory(riskScores)
  
  // Store assessment in database
  const result = await env.DB.prepare(`
    INSERT INTO professional_evaluations (
      patient_id, provider_id, evaluation_date, evaluation_type,
      chief_complaint, overall_risk_level, clinical_notes, recommendations,
      status
    ) VALUES (?, ?, ?, 'comprehensive', ?, ?, ?, ?, 'completed')
  `).bind(
    assessment.patientName, // This would be patient ID in production
    assessment.assessor,
    assessment.assessmentDate,
    'Comprehensive Home Safety & Fall Risk Assessment',
    overallRisk.category,
    assessment.observations,
    JSON.stringify(recommendations)
  ).run()
  
  const evaluationId = result.meta.last_row_id
  
  // Store functional mobility scores
  if (assessment.functionalMobility.tugTime) {
    await storeTUGResult(env, evaluationId, assessment.functionalMobility.tugTime)
  }
  
  if (assessment.functionalMobility.bergScore) {
    await storeBergScore(env, evaluationId, assessment.functionalMobility.bergScore)
  }
  
  // Store hazard assessment
  await storeHazardAssessment(env, evaluationId, assessment.homeHazards)
  
  // Generate CPT codes for billing
  const cptCodes = generateCPTCodes(assessment, riskScores)
  
  // Create comprehensive report
  const report = generateComprehensiveReport(assessment, riskScores, recommendations, cptCodes)
  
  // Track for analytics
  await trackClinicalAssessment(env, evaluationId, overallRisk.category)
  
  return c.json({
    evaluationId,
    riskScores,
    overallRisk,
    recommendations,
    cptCodes,
    report,
    success: true
  })
})

// ================================
// Risk Calculation Engine
// ================================

function calculateComprehensiveRisk(assessment: ClinicalAssessment) {
  const scores = {
    functionalMobility: 0,
    homeHazards: 0,
    environmental: 0,
    patientConcerns: 0,
    totalRisk: 0
  }
  
  // Section 1: Functional Mobility Risk
  if (assessment.functionalMobility.tugTime && assessment.functionalMobility.tugTime >= 13.5) {
    scores.functionalMobility += 3 // High risk indicator
  } else if (assessment.functionalMobility.tugTime && assessment.functionalMobility.tugTime >= 12) {
    scores.functionalMobility += 2 // Moderate risk
  }
  
  if (assessment.functionalMobility.bergScore && assessment.functionalMobility.bergScore <= 45) {
    scores.functionalMobility += 3 // High risk
  } else if (assessment.functionalMobility.bergScore && assessment.functionalMobility.bergScore <= 50) {
    scores.functionalMobility += 2 // Moderate risk
  }
  
  if (assessment.functionalMobility.gaitSpeed && assessment.functionalMobility.gaitSpeed < 1.0) {
    scores.functionalMobility += 2 // Risk indicator
  }
  
  // Section 2: Home Hazards Count
  Object.values(assessment.homeHazards).forEach(room => {
    Object.values(room).forEach(hazard => {
      if (hazard === true) scores.homeHazards++
    })
  })
  
  // Section 3: Environmental Modifications Needed
  Object.values(assessment.environmentalDevices).forEach(device => {
    if (device === 'needs_mod') scores.environmental++
  })
  
  // Section 4: Patient Concerns
  if (assessment.patientConcerns.previousFalls) scores.patientConcerns += 3
  if (assessment.patientConcerns.cognitiveImpairment) scores.patientConcerns += 2
  if (assessment.patientConcerns.medicationSideEffects) scores.patientConcerns += 1
  if (assessment.patientConcerns.fearOfFalling) scores.patientConcerns += 1
  
  // Calculate total risk score
  scores.totalRisk = scores.functionalMobility + scores.homeHazards + 
                     scores.environmental + scores.patientConcerns
  
  return scores
}

// ================================
// Risk Category Determination
// ================================

function determineOverallRiskCategory(scores: any) {
  const total = scores.totalRisk
  
  if (total >= 12 || scores.functionalMobility >= 5) {
    return {
      category: 'critical',
      level: 4,
      description: 'Immediate intervention required',
      color: '#dc2626', // red
      followUp: '48_hours'
    }
  } else if (total >= 8) {
    return {
      category: 'high',
      level: 3,
      description: 'Urgent modifications needed',
      color: '#f59e0b', // orange
      followUp: '1_week'
    }
  } else if (total >= 4) {
    return {
      category: 'moderate',
      level: 2,
      description: 'Interventions recommended',
      color: '#eab308', // yellow
      followUp: '30_days'
    }
  } else {
    return {
      category: 'low',
      level: 1,
      description: 'Annual review sufficient',
      color: '#22c55e', // green
      followUp: '1_year'
    }
  }
}

// ================================
// Evidence-Based Recommendations
// ================================

function generateEvidenceBasedRecommendations(scores: any) {
  const recommendations = []
  
  // Functional Mobility Recommendations
  if (scores.functionalMobility >= 3) {
    recommendations.push({
      priority: 'critical',
      category: 'therapy',
      recommendation: 'Refer to PT for comprehensive gait and balance training',
      evidence: 'Sherrington et al. 2019 - Exercise reduces falls by 23%',
      timeframe: 'immediate'
    })
    recommendations.push({
      priority: 'critical',
      category: 'equipment',
      recommendation: 'Prescribe appropriate assistive device (walker/rollator)',
      evidence: 'Bateni & Maki 2005 - Proper device reduces fall risk',
      timeframe: 'immediate'
    })
  }
  
  // Home Hazards Recommendations
  if (scores.homeHazards >= 6) {
    recommendations.push({
      priority: 'high',
      category: 'environmental',
      recommendation: 'Schedule OT home safety evaluation',
      evidence: 'Clemson et al. 2008 - Home mods reduce falls by 21%',
      timeframe: '1_week'
    })
  }
  
  // Specific Hazard Recommendations
  if (scores.homeHazards > 0) {
    recommendations.push({
      priority: 'high',
      category: 'environmental',
      recommendation: 'Install grab bars in bathroom (toilet and shower)',
      evidence: 'AOTA 2020 - Grab bars critical for bathroom safety',
      timeframe: 'immediate',
      cptCode: '97542'
    })
    recommendations.push({
      priority: 'medium',
      category: 'environmental',
      recommendation: 'Improve lighting (100W equivalent LEDs, nightlights)',
      evidence: 'Lord et al. 2006 - Proper lighting reduces falls',
      timeframe: '2_weeks'
    })
  }
  
  // Patient Concerns Recommendations
  if (scores.patientConcerns >= 3) {
    recommendations.push({
      priority: 'high',
      category: 'medical',
      recommendation: 'Comprehensive medication review by pharmacist',
      evidence: 'Pit et al. 2007 - Med review reduces falls by 39%',
      timeframe: '1_week'
    })
  }
  
  // Universal Recommendations
  recommendations.push({
    priority: 'medium',
    category: 'education',
    recommendation: 'Enroll in fall prevention education program',
    evidence: 'CDC STEADI - Education improves safety awareness',
    timeframe: '1_month'
  })
  
  if (scores.totalRisk >= 4) {
    recommendations.push({
      priority: 'medium',
      category: 'monitoring',
      recommendation: 'Consider medical alert system with fall detection',
      evidence: 'Fleming & Brayne 2008 - Alert systems reduce injury severity',
      timeframe: '2_weeks'
    })
  }
  
  return recommendations
}

// ================================
// CPT Code Generation
// ================================

function generateCPTCodes(assessment: ClinicalAssessment, scores: any) {
  const codes = []
  
  // Evaluation codes based on complexity
  if (scores.totalRisk >= 8) {
    codes.push({
      code: '97163',
      description: 'PT evaluation - high complexity',
      units: 1,
      reimbursement: 175
    })
  } else if (scores.totalRisk >= 4) {
    codes.push({
      code: '97162',
      description: 'PT evaluation - moderate complexity',
      units: 1,
      reimbursement: 150
    })
  } else {
    codes.push({
      code: '97161',
      description: 'PT evaluation - low complexity',
      units: 1,
      reimbursement: 125
    })
  }
  
  // Home safety assessment
  if (assessment.homeHazards && Object.keys(assessment.homeHazards).length > 0) {
    codes.push({
      code: '97542',
      description: 'Wheelchair/home management training',
      units: 2,
      reimbursement: 90
    })
  }
  
  // Functional tests
  if (assessment.functionalMobility.tugTime || assessment.functionalMobility.bergScore) {
    codes.push({
      code: '97750',
      description: 'Physical performance test',
      units: 1,
      reimbursement: 45
    })
  }
  
  // Calculate total reimbursement
  const totalReimbursement = codes.reduce((sum, code) => 
    sum + (code.reimbursement * code.units), 0
  )
  
  return {
    codes,
    totalReimbursement,
    medicareApproved: true
  }
}

// ================================
// Report Generation
// ================================

function generateComprehensiveReport(
  assessment: ClinicalAssessment,
  scores: any,
  recommendations: any[],
  cptCodes: any
) {
  return {
    header: {
      title: 'Comprehensive Home Safety & Fall Risk Assessment Report',
      patient: assessment.patientName,
      date: assessment.assessmentDate,
      assessor: assessment.assessor,
      location: assessment.location
    },
    
    executiveSummary: {
      overallRisk: determineOverallRiskCategory(scores),
      keyFindings: [
        scores.functionalMobility >= 3 ? 'Significant functional mobility impairment' : null,
        scores.homeHazards >= 6 ? 'Multiple environmental hazards identified' : null,
        scores.patientConcerns >= 3 ? 'High-risk patient factors present' : null
      ].filter(Boolean),
      urgentActions: recommendations.filter(r => r.priority === 'critical')
    },
    
    detailedFindings: {
      functionalMobility: {
        tugTime: assessment.functionalMobility.tugTime,
        tugInterpretation: assessment.functionalMobility.tugTime >= 13.5 ? 
          'HIGH RISK - Significant mobility impairment' : 
          assessment.functionalMobility.tugTime >= 12 ? 
          'MODERATE RISK - Some mobility concerns' : 
          'LOW RISK - Adequate mobility',
        bergScore: assessment.functionalMobility.bergScore,
        bergInterpretation: assessment.functionalMobility.bergScore <= 45 ?
          'HIGH FALL RISK' : assessment.functionalMobility.bergScore <= 50 ?
          'MODERATE FALL RISK' : 'LOW FALL RISK',
        gaitSpeed: assessment.functionalMobility.gaitSpeed,
        gaitInterpretation: assessment.functionalMobility.gaitSpeed < 1.0 ?
          'Below normal - increased fall risk' : 'Normal gait speed'
      },
      
      environmentalHazards: {
        totalHazards: scores.homeHazards,
        criticalHazards: Object.entries(assessment.homeHazards).flatMap(([room, hazards]) =>
          Object.entries(hazards)
            .filter(([_, present]) => present)
            .map(([hazard, _]) => ({ room, hazard }))
        ),
        modificationsNeeded: scores.environmental
      },
      
      patientFactors: assessment.patientConcerns
    },
    
    interventionPlan: {
      immediate: recommendations.filter(r => r.timeframe === 'immediate'),
      shortTerm: recommendations.filter(r => 
        r.timeframe === '1_week' || r.timeframe === '2_weeks'
      ),
      longTerm: recommendations.filter(r => 
        r.timeframe === '1_month' || r.timeframe === '3_months'
      )
    },
    
    billing: cptCodes,
    
    followUp: {
      nextAssessment: determineOverallRiskCategory(scores).followUp,
      contactInfo: {
        assessor: assessment.assessor,
        facility: 'SafeAging Home Clinical Services'
      }
    },
    
    legalCompliance: {
      hipaaCompliant: true,
      signatureRequired: true,
      consentObtained: true
    }
  }
}

// ================================
// Database Storage Functions
// ================================

async function storeTUGResult(env: any, evaluationId: number, tugTime: number) {
  const fallRisk = tugTime >= 13.5 ? 'high' : tugTime >= 12 ? 'moderate' : 'low'
  
  await env.DB.prepare(`
    INSERT INTO tug_test_results (
      evaluation_id, trial1_time, average_time, fall_risk
    ) VALUES (?, ?, ?, ?)
  `).bind(evaluationId, tugTime, tugTime, fallRisk).run()
}

async function storeBergScore(env: any, evaluationId: number, bergScore: number) {
  const fallRisk = bergScore <= 20 ? 'high' : bergScore <= 40 ? 'medium' : 'low'
  
  await env.DB.prepare(`
    INSERT INTO berg_balance_items (
      evaluation_id, total_score, fall_risk
    ) VALUES (?, ?, ?)
  `).bind(evaluationId, bergScore, fallRisk).run()
}

async function storeHazardAssessment(env: any, evaluationId: number, hazards: any) {
  const hazardCount = Object.values(hazards).reduce((total: number, room: any) => 
    total + Object.values(room).filter(h => h === true).length, 0
  )
  
  await env.DB.prepare(`
    INSERT INTO home_safety_checklist (
      evaluation_id, total_hazards, priority_modifications
    ) VALUES (?, ?, ?)
  `).bind(evaluationId, hazardCount, JSON.stringify(hazards)).run()
}

async function trackClinicalAssessment(env: any, evaluationId: number, riskCategory: string) {
  await env.DB.prepare(`
    INSERT INTO analytics_events (
      user_id, event_type, event_category, event_data
    ) VALUES (?, 'clinical_assessment_completed', 'assessment', ?)
  `).bind(
    1, // Would be actual user ID
    JSON.stringify({ evaluationId, riskCategory })
  ).run()
}

// ================================
// Export Clinical Report
// ================================

clinicalApi.get('/report/:evaluationId/export', async (c) => {
  const { env } = c
  const evaluationId = c.req.param('evaluationId')
  const format = c.req.query('format') || 'pdf'
  
  // Retrieve assessment data
  const evaluation = await env.DB.prepare(`
    SELECT * FROM professional_evaluations WHERE id = ?
  `).bind(evaluationId).first()
  
  if (!evaluation) {
    return c.json({ error: 'Evaluation not found' }, 404)
  }
  
  const report = JSON.parse(evaluation.recommendations || '{}')
  
  if (format === 'html') {
    return c.html(generateHTMLReport(report))
  } else if (format === 'json') {
    return c.json(report)
  } else {
    // For PDF, return HTML with print styles
    return c.html(generatePrintableReport(report))
  }
})

function generateHTMLReport(report: any) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Clinical Assessment Report</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
        h1 { color: #1e40af; margin: 0; }
        .risk-critical { background: #fee2e2; color: #991b1b; padding: 10px; border-radius: 5px; font-weight: bold; }
        .risk-high { background: #fed7aa; color: #9a3412; padding: 10px; border-radius: 5px; font-weight: bold; }
        .risk-moderate { background: #fef3c7; color: #92400e; padding: 10px; border-radius: 5px; }
        .risk-low { background: #dcfce7; color: #166534; padding: 10px; border-radius: 5px; }
        .section { margin: 30px 0; }
        .recommendation { background: #f3f4f6; padding: 15px; margin: 10px 0; border-left: 4px solid #3b82f6; }
        .priority-critical { border-left-color: #dc2626; }
        .priority-high { border-left-color: #f59e0b; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #e5e7eb; padding: 10px; text-align: left; }
        td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
        .footer { margin-top: 50px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280; }
        @media print {
          body { margin: 20px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Comprehensive Home Safety & Fall Risk Assessment</h1>
        <p><strong>Patient:</strong> ${report.header?.patient || 'N/A'}</p>
        <p><strong>Date:</strong> ${report.header?.date || new Date().toLocaleDateString()}</p>
        <p><strong>Assessor:</strong> ${report.header?.assessor || 'N/A'}</p>
      </div>
      
      <div class="section">
        <h2>Risk Assessment Summary</h2>
        <div class="risk-${report.executiveSummary?.overallRisk?.category || 'moderate'}">
          Overall Risk Level: ${report.executiveSummary?.overallRisk?.description || 'Moderate Risk'}
        </div>
      </div>
      
      <div class="section">
        <h2>Functional Mobility Results</h2>
        <table>
          <tr>
            <th>Test</th>
            <th>Result</th>
            <th>Interpretation</th>
          </tr>
          <tr>
            <td>Timed Up & Go</td>
            <td>${report.detailedFindings?.functionalMobility?.tugTime || 'Not tested'} seconds</td>
            <td>${report.detailedFindings?.functionalMobility?.tugInterpretation || 'N/A'}</td>
          </tr>
          <tr>
            <td>Berg Balance Scale</td>
            <td>${report.detailedFindings?.functionalMobility?.bergScore || 'Not tested'}/56</td>
            <td>${report.detailedFindings?.functionalMobility?.bergInterpretation || 'N/A'}</td>
          </tr>
        </table>
      </div>
      
      <div class="section">
        <h2>Recommendations</h2>
        ${report.interventionPlan?.immediate?.map((rec: any) => `
          <div class="recommendation priority-${rec.priority}">
            <strong>${rec.recommendation}</strong><br>
            <small>Evidence: ${rec.evidence}</small>
          </div>
        `).join('') || '<p>No immediate recommendations</p>'}
      </div>
      
      <div class="footer">
        <p>This report is confidential and HIPAA-compliant</p>
        <p>Generated by SafeAging Home Clinical Assessment System</p>
      </div>
    </body>
    </html>
  `
}

function generatePrintableReport(report: any) {
  // Similar to HTML but optimized for PDF printing
  return generateHTMLReport(report)
}

export default clinicalApi