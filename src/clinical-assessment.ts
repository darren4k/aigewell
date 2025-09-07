import { Hono } from 'hono'

type Bindings = {
  DB?: D1Database
  KV?: KVNamespace
  R2?: R2Bucket
  OPENAI_API_KEY?: string
}

const clinicalApi = new Hono<{ Bindings: Bindings }>()

// Get all assessment templates
clinicalApi.get('/templates', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM clinical_assessment_templates ORDER BY category, name
    `).all()
    
    return c.json({ templates: results })
  } catch (error) {
    return c.json({ error: 'Failed to fetch templates' }, 500)
  }
})

// Create new clinical evaluation
clinicalApi.post('/evaluations', async (c) => {
  const { patient_name, patient_dob, assessor_name, assessor_license, location, notes } = await c.req.json()
  
  try {
    const { meta } = await c.env.DB.prepare(`
      INSERT INTO clinical_evaluations (patient_name, patient_dob, assessor_name, assessor_license, location, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(patient_name, patient_dob, assessor_name, assessor_license, location, notes).run()
    
    return c.json({ evaluation_id: meta.last_row_id, success: true })
  } catch (error) {
    return c.json({ error: 'Failed to create evaluation' }, 500)
  }
})

// Get evaluation details
clinicalApi.get('/evaluations/:id', async (c) => {
  const evaluationId = c.req.param('id')
  
  try {
    // Get main evaluation
    const evaluation = await c.env.DB.prepare(`
      SELECT * FROM clinical_evaluations WHERE id = ?
    `).bind(evaluationId).first()
    
    if (!evaluation) {
      return c.json({ error: 'Evaluation not found' }, 404)
    }
    
    // Get functional tests
    const { results: functionalTests } = await c.env.DB.prepare(`
      SELECT * FROM functional_mobility_tests WHERE evaluation_id = ?
    `).bind(evaluationId).all()
    
    // Get hazards
    const { results: hazards } = await c.env.DB.prepare(`
      SELECT * FROM home_hazards_checklist WHERE evaluation_id = ?
    `).bind(evaluationId).all()
    
    // Get environmental assessment
    const { results: environmental } = await c.env.DB.prepare(`
      SELECT * FROM environmental_assessment WHERE evaluation_id = ?
    `).bind(evaluationId).all()
    
    // Get recommendations
    const { results: recommendations } = await c.env.DB.prepare(`
      SELECT * FROM clinical_recommendations WHERE evaluation_id = ? ORDER BY priority_level
    `).bind(evaluationId).all()
    
    return c.json({
      evaluation,
      functional_tests: functionalTests,
      hazards,
      environmental,
      recommendations
    })
  } catch (error) {
    return c.json({ error: 'Failed to fetch evaluation' }, 500)
  }
})

// Submit functional mobility test results
clinicalApi.post('/evaluations/:id/functional-tests', async (c) => {
  const evaluationId = c.req.param('id')
  const tests = await c.req.json()
  
  try {
    for (const test of tests) {
      const { test_name, result_value, result_unit, notes } = test
      
      // Calculate risk level based on test
      let risk_level = 'normal'
      if (test_name === 'TUG') {
        risk_level = result_value >= 13.5 ? 'high_risk' : result_value >= 10 ? 'mild_risk' : 'normal'
      } else if (test_name === 'Berg Balance Scale') {
        risk_level = result_value <= 20 ? 'high_risk' : result_value <= 40 ? 'moderate_risk' : 'low_risk'
      }
      
      await c.env.DB.prepare(`
        INSERT INTO functional_mobility_tests (evaluation_id, test_name, result_value, result_unit, risk_level, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(evaluationId, test_name, result_value, result_unit, risk_level, notes).run()
    }
    
    // Update overall risk score
    await updateOverallRiskScore(c.env.DB, evaluationId)
    
    return c.json({ success: true })
  } catch (error) {
    return c.json({ error: 'Failed to save functional tests' }, 500)
  }
})

// Submit home hazards checklist
clinicalApi.post('/evaluations/:id/hazards', async (c) => {
  const evaluationId = c.req.param('id')
  const hazards = await c.req.json()
  
  try {
    for (const hazard of hazards) {
      const { room_type, hazard_item, is_present, priority_level, recommendation, cost_estimate } = hazard
      
      await c.env.DB.prepare(`
        INSERT INTO home_hazards_checklist (evaluation_id, room_type, hazard_item, is_present, priority_level, recommendation, cost_estimate)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(evaluationId, room_type, hazard_item, is_present, priority_level, recommendation, cost_estimate).run()
    }
    
    await updateOverallRiskScore(c.env.DB, evaluationId)
    return c.json({ success: true })
  } catch (error) {
    return c.json({ error: 'Failed to save hazards' }, 500)
  }
})

// Submit environmental assessment
clinicalApi.post('/evaluations/:id/environmental', async (c) => {
  const evaluationId = c.req.param('id')
  const assessments = await c.req.json()
  
  try {
    for (const assessment of assessments) {
      const { device_category, device_name, status, recommendation, cpt_code } = assessment
      
      await c.env.DB.prepare(`
        INSERT INTO environmental_assessment (evaluation_id, device_category, device_name, status, recommendation, cpt_code)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(evaluationId, device_category, device_name, status, recommendation, cpt_code).run()
    }
    
    await updateOverallRiskScore(c.env.DB, evaluationId)
    return c.json({ success: true })
  } catch (error) {
    return c.json({ error: 'Failed to save environmental assessment' }, 500)
  }
})

// Generate comprehensive report
clinicalApi.get('/evaluations/:id/report', async (c) => {
  const evaluationId = c.req.param('id')
  
  try {
    const evaluation = await c.env.DB.prepare(`
      SELECT * FROM clinical_evaluations WHERE id = ?
    `).bind(evaluationId).first()
    
    if (!evaluation) {
      return c.json({ error: 'Evaluation not found' }, 404)
    }
    
    // Generate recommendations based on assessment results
    await generateClinicalRecommendations(c.env.DB, evaluationId)
    
    // Get updated evaluation with recommendations
    const { results: recommendations } = await c.env.DB.prepare(`
      SELECT * FROM clinical_recommendations WHERE evaluation_id = ? ORDER BY priority_level DESC
    `).bind(evaluationId).all()
    
    // Calculate total reimbursement
    const totalReimbursement = calculateReimbursement(recommendations)
    
    const report = {
      evaluation,
      recommendations,
      total_reimbursement: totalReimbursement,
      generated_at: new Date().toISOString()
    }
    
    return c.json({ report })
  } catch (error) {
    return c.json({ error: 'Failed to generate report' }, 500)
  }
})

// Export evaluation as PDF
clinicalApi.get('/evaluations/:id/export/pdf', async (c) => {
  const evaluationId = c.req.param('id')
  
  try {
    const evaluation = await c.env.DB.prepare(`
      SELECT * FROM clinical_evaluations WHERE id = ?
    `).bind(evaluationId).first()
    
    if (!evaluation) {
      return c.json({ error: 'Evaluation not found' }, 404)
    }
    
    // Generate PDF content (simplified HTML for now)
    const pdfHtml = await generatePDFReport(c.env.DB, evaluationId)
    
    return c.html(pdfHtml, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="clinical-assessment-${evaluationId}.html"`
      }
    })
  } catch (error) {
    return c.json({ error: 'Failed to export PDF' }, 500)
  }
})

// Helper function to update overall risk score
async function updateOverallRiskScore(db: D1Database, evaluationId: string) {
  try {
    // Count hazards
    const hazardCount = await db.prepare(`
      SELECT COUNT(*) as count FROM home_hazards_checklist 
      WHERE evaluation_id = ? AND is_present = 1
    `).bind(evaluationId).first()
    
    // Count environmental issues
    const envCount = await db.prepare(`
      SELECT COUNT(*) as count FROM environmental_assessment 
      WHERE evaluation_id = ? AND status = 'needs_modification'
    `).bind(evaluationId).first()
    
    // Check functional test risks
    const functionalRisk = await db.prepare(`
      SELECT COUNT(*) as count FROM functional_mobility_tests 
      WHERE evaluation_id = ? AND risk_level IN ('high_risk', 'moderate_risk')
    `).bind(evaluationId).first()
    
    const totalScore = (hazardCount?.count || 0) + (envCount?.count || 0) + (functionalRisk?.count || 0) * 2
    
    let riskCategory = 'low'
    if (totalScore >= 12) riskCategory = 'critical'
    else if (totalScore >= 8) riskCategory = 'high'
    else if (totalScore >= 4) riskCategory = 'moderate'
    
    await db.prepare(`
      UPDATE clinical_evaluations 
      SET total_risk_score = ?, risk_category = ? 
      WHERE id = ?
    `).bind(totalScore, riskCategory, evaluationId).run()
    
  } catch (error) {
    console.error('Failed to update risk score:', error)
  }
}

// Generate clinical recommendations based on assessment results
async function generateClinicalRecommendations(db: D1Database, evaluationId: string) {
  try {
    // Clear existing recommendations
    await db.prepare(`
      DELETE FROM clinical_recommendations WHERE evaluation_id = ?
    `).bind(evaluationId).run()
    
    // Get hazards and generate recommendations
    const { results: hazards } = await db.prepare(`
      SELECT * FROM home_hazards_checklist WHERE evaluation_id = ? AND is_present = 1
    `).bind(evaluationId).all()
    
    for (const hazard of hazards) {
      let recommendation = ''
      let cpt_code = '97542'
      let timeframe = '30_days'
      
      if (hazard.hazard_item.includes('grab bars')) {
        recommendation = 'Install grab bars in bathroom near toilet and shower/tub'
        cpt_code = '97542'
      } else if (hazard.hazard_item.includes('lighting')) {
        recommendation = 'Improve lighting with LED bulbs and motion sensors'
        timeframe = '1_week'
      } else if (hazard.hazard_item.includes('rugs')) {
        recommendation = 'Remove loose rugs or secure with non-slip backing'
        timeframe = 'immediate'
      }
      
      await db.prepare(`
        INSERT INTO clinical_recommendations (evaluation_id, category, priority_level, recommendation, timeframe, cpt_code, evidence_citation)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(evaluationId, 'home_modification', hazard.priority_level, recommendation, timeframe, cpt_code, 'Evidence-based home safety guidelines').run()
    }
    
  } catch (error) {
    console.error('Failed to generate recommendations:', error)
  }
}

// Calculate total reimbursement based on CPT codes
function calculateReimbursement(recommendations: any[]): number {
  const cptRates: { [key: string]: number } = {
    '97161': 125, // PT evaluation low complexity
    '97162': 150, // PT evaluation moderate complexity
    '97163': 175, // PT evaluation high complexity
    '97542': 90,  // Home management
    '97750': 45,  // Performance tests
    '99401': 25,  // Preventive counseling
  }
  
  let total = 0
  const usedCodes = new Set()
  
  for (const rec of recommendations) {
    if (rec.cpt_code && !usedCodes.has(rec.cpt_code)) {
      total += cptRates[rec.cpt_code] || 0
      usedCodes.add(rec.cpt_code)
    }
  }
  
  return total
}

// Generate PDF report HTML
async function generatePDFReport(db: D1Database, evaluationId: string): Promise<string> {
  const evaluation = await db.prepare(`
    SELECT * FROM clinical_evaluations WHERE id = ?
  `).bind(evaluationId).first()
  
  const { results: recommendations } = await db.prepare(`
    SELECT * FROM clinical_recommendations WHERE evaluation_id = ? ORDER BY priority_level DESC
  `).bind(evaluationId).all()
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Clinical Assessment Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { border-bottom: 2px solid #333; padding-bottom: 10px; }
        .risk-critical { color: #dc3545; font-weight: bold; }
        .risk-high { color: #fd7e14; font-weight: bold; }
        .risk-moderate { color: #ffc107; font-weight: bold; }
        .risk-low { color: #28a745; font-weight: bold; }
        .recommendation { margin: 10px 0; padding: 10px; border-left: 4px solid #007bff; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>SafeAging Clinical Assessment Report</h1>
        <p><strong>Patient:</strong> ${evaluation?.patient_name}</p>
        <p><strong>Assessor:</strong> ${evaluation?.assessor_name}</p>
        <p><strong>Date:</strong> ${new Date(evaluation?.evaluation_date).toLocaleDateString()}</p>
        <p><strong>Overall Risk:</strong> <span class="risk-${evaluation?.risk_category}">${evaluation?.risk_category?.toUpperCase()}</span></p>
      </div>
      
      <h2>Clinical Recommendations</h2>
      ${recommendations.map((rec: any) => `
        <div class="recommendation">
          <strong>${rec.category}:</strong> ${rec.recommendation}
          <br><small>Timeframe: ${rec.timeframe} | CPT Code: ${rec.cpt_code}</small>
        </div>
      `).join('')}
      
      <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #666;">
        Generated by SafeAging Clinical Assessment Platform
      </div>
    </body>
    </html>
  `
}

export default clinicalApi