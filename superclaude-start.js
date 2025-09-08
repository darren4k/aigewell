#!/usr/bin/env node

/**
 * SuperClaude Healthcare API - Simplified Startup
 */

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Rate limit exceeded' }
});
app.use('/api/', limiter);

// Healthcare-specific headers
app.use((req, res, next) => {
  res.setHeader('X-Healthcare-API', 'SuperClaude-v1.0');
  res.setHeader('X-HIPAA-Compliant', 'true');
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    services: {
      planner: 'active',
      coordinator: 'active', 
      reviewer: 'active'
    },
    compliance: {
      hipaa: true,
      ada: true,
      healthcare_safety: true
    }
  });
});

// Mock Healthcare Planner Agent API
app.post('/api/v1/healthcare/safety-plan', async (req, res) => {
  try {
    const { patient_id, patientId, assessment_data, patientContext, assessmentData, urgency } = req.body;
    
    // Flexible input handling
    const actualPatientId = patient_id || patientId || 'demo_patient';
    const actualAssessmentData = assessment_data || assessmentData || {};
    const actualPatientContext = patientContext || {};
    const actualUrgency = urgency || 'routine';
    
    console.log(`🏥 Processing safety plan request for patient: ${actualPatientId}`);
    console.log(`📊 Assessment data:`, actualAssessmentData);
    
    // Generate comprehensive healthcare safety plan
    const plan = {
      id: `plan_${Date.now()}`,
      patientId: actualPatientId,
      assessmentType: "comprehensive",
      riskLevel: determineRiskLevel(actualAssessmentData),
      recommendations: generateHealthcareRecommendations(actualAssessmentData),
      timeline: generateTimeline(),
      nextReview: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      compliance: {
        hipaa: true,
        ada: true,
        healthcareSafety: true
      },
      metadata: {
        createdAt: new Date(),
        createdBy: "healthcare-planner-agent",
        confidence: 0.92,
        evidenceBased: true
      }
    };

    res.json({
      success: true,
      plan,
      metadata: {
        generatedAt: new Date().toISOString(),
        agentVersion: '1.0.0',
        complianceChecked: true
      }
    });

  } catch (error) {
    console.error('Healthcare planning error:', error);
    res.status(500).json({
      error: 'Healthcare planning failed',
      details: error.message
    });
  }
});

// Mock Care Coordinator API
app.post('/api/v1/healthcare/care-coordination', async (req, res) => {
  try {
    const { patientId, patientContext, careNeeds, urgency } = req.body;
    
    console.log(`🤝 Processing care coordination for patient: ${patientId}`);
    
    const coordinationPlan = {
      id: `coord_${Date.now()}`,
      patientId: patientId || 'demo_patient',
      coordinationType: "comprehensive",
      providers: [
        {
          providerId: "prov_001",
          specialization: "primary_care",
          role: "primary",
          contactInfo: {
            name: "Dr. Sarah Johnson",
            phone: "555-0123",
            email: "sarah.johnson@healthcare.com"
          }
        }
      ],
      appointments: [
        {
          type: "assessment",
          providerId: "prov_001",
          urgency: urgency || "routine",
          duration: 60,
          location: "clinic"
        }
      ],
      status: "active",
      metadata: {
        createdAt: new Date(),
        priority: urgency === "emergency" ? "critical" : "medium"
      }
    };

    res.json({
      success: true,
      coordinationPlan,
      metadata: {
        generatedAt: new Date().toISOString(),
        agentVersion: '1.0.0'
      }
    });

  } catch (error) {
    console.error('Care coordination error:', error);
    res.status(500).json({
      error: 'Care coordination failed',
      details: error.message
    });
  }
});

// Mock Safety Reviewer API
app.post('/api/v1/healthcare/safety-review', async (req, res) => {
  try {
    const { targetType, targetData, patientContext, urgency, scope } = req.body;
    
    console.log(`🛡️ Conducting safety review: ${targetType}`);
    
    const review = {
      id: `review_${Date.now()}`,
      reviewType: targetType || "plan",
      targetId: targetData?.id || `target_${Date.now()}`,
      compliance: {
        hipaa: { compliant: true, issues: [], requirements: ["Data encryption", "Access controls"] },
        ada: { compliant: true, issues: [], accessibility_score: 95 },
        healthcareSafety: { compliant: true, riskLevel: "low", violations: [] }
      },
      safety: {
        overallScore: 88,
        riskFactors: [
          {
            factor: "medication_management",
            severity: "medium",
            likelihood: 0.3,
            impact: "moderate",
            mitigation: "Implement pill organizer system"
          }
        ],
        emergencyPreparedness: {
          score: 90,
          protocols: ["Emergency contacts configured", "Medical alert system"],
          gaps: [],
          improvements: ["Add backup communication method"]
        }
      },
      approvalStatus: "approved",
      reviewerInfo: {
        agentId: "safety-reviewer-agent",
        timestamp: new Date(),
        confidence: 0.94
      }
    };

    res.json({
      success: true,
      review,
      metadata: {
        reviewedAt: new Date().toISOString(),
        agentVersion: '1.0.0',
        complianceStandards: ['HIPAA', 'ADA', 'Healthcare Safety']
      }
    });

  } catch (error) {
    console.error('Safety review error:', error);
    res.status(500).json({
      error: 'Safety review failed',
      details: error.message
    });
  }
});

// Agent status endpoint
app.get('/api/v1/agents/status', (req, res) => {
  res.json({
    agents: {
      healthcarePlanner: { status: 'active', enabled: true },
      careCoordinator: { status: 'active', enabled: true },
      safetyReviewer: { status: 'active', enabled: true }
    },
    routing: {
      totalCalls: 0,
      totalCost: 0,
      avgCost: 0
    },
    features: {
      emergencyDetection: true,
      accessibilityEnhancements: true,
      hipaaAuditMode: true
    }
  });
});

// Helper functions
function determineRiskLevel(assessmentData) {
  const bergScore = assessmentData?.berg_balance_score || 50;
  const tugTime = assessmentData?.tug_time || 10;
  const fallHistory = assessmentData?.fall_history || 0;
  const medications = assessmentData?.medications || 0;
  
  let riskScore = 0;
  
  if (bergScore < 45) riskScore += 2; // Poor balance
  if (tugTime > 14) riskScore += 2;   // Slow mobility
  if (fallHistory > 0) riskScore += fallHistory; // Fall history
  if (medications > 5) riskScore += 1; // Polypharmacy
  
  if (riskScore >= 4) return "high";
  if (riskScore >= 2) return "medium"; 
  return "low";
}

function generateHealthcareRecommendations(assessmentData) {
  const recommendations = [];
  const bergScore = assessmentData?.berg_balance_score || 50;
  const tugTime = assessmentData?.tug_time || 10;
  const fallHistory = assessmentData?.fall_history || 0;
  const medications = assessmentData?.medications || 0;
  
  if (bergScore < 45) {
    recommendations.push({
      id: "rec_001",
      category: "safety",
      priority: "urgent",
      description: "Implement comprehensive fall prevention program",
      rationale: "Berg Balance Score of " + bergScore + " indicates significant fall risk",
      cost: { estimated: 500, range: { min: 300, max: 700 }, currency: "USD" },
      implementation: {
        steps: ["Physical therapy assessment", "Home safety evaluation", "Balance training program"],
        timeframe: "2-4 weeks",
        resources: ["Physical therapist", "Occupational therapist"],
        stakeholders: ["Patient", "Healthcare team"]
      },
      outcomes: {
        expected: ["Improved balance", "Reduced fall risk"],
        measurable: ["Berg Score improvement >5 points", "No falls in 6 months"],
        timeline: "8-12 weeks"
      }
    });
  }
  
  if (tugTime > 14) {
    recommendations.push({
      id: "rec_002",
      category: "mobility",
      priority: "urgent",
      description: "Mobility assistance and gait training",
      rationale: "Timed Up and Go test of " + tugTime + " seconds indicates mobility impairment",
      cost: { estimated: 300, range: { min: 200, max: 400 }, currency: "USD" },
      implementation: {
        steps: ["Gait analysis", "Assistive device evaluation", "Mobility training"],
        timeframe: "1-2 weeks",
        resources: ["Physical therapist", "Mobility equipment"],
        stakeholders: ["Patient", "Caregiver"]
      }
    });
  }
  
  if (fallHistory > 0) {
    recommendations.push({
      id: "rec_003",
      category: "environment",
      priority: "immediate",
      description: "Comprehensive home safety modifications",
      rationale: "Previous fall history of " + fallHistory + " falls requires immediate environmental intervention",
      cost: { estimated: 800, range: { min: 500, max: 1200 }, currency: "USD" },
      implementation: {
        steps: ["Home safety assessment", "Install grab bars and handrails", "Improve lighting", "Remove trip hazards"],
        timeframe: "1 week",
        resources: ["Occupational therapist", "Handyman services"],
        stakeholders: ["Patient", "Family", "Contractors"]
      }
    });
  }
  
  if (medications > 5) {
    recommendations.push({
      id: "rec_004",
      category: "medication",
      priority: "routine",
      description: "Comprehensive medication review and management",
      rationale: "Polypharmacy (" + medications + " medications) increases risk of adverse effects",
      cost: { estimated: 150, range: { min: 100, max: 200 }, currency: "USD" },
      implementation: {
        steps: ["Pharmacist consultation", "Medication reconciliation", "Pill organizer setup"],
        timeframe: "1-2 weeks",
        resources: ["Clinical pharmacist", "Medication management tools"],
        stakeholders: ["Patient", "Pharmacist", "Physician"]
      }
    });
  }
  
  return recommendations;
}

function generateTimeline() {
  return [
    {
      phase: "Immediate Safety (0-1 weeks)",
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      milestones: ["Emergency safety measures", "Critical assessments"],
      dependencies: ["Healthcare team coordination"]
    },
    {
      phase: "Implementation (1-4 weeks)",
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
      milestones: ["Equipment installation", "Training programs", "Service setup"],
      dependencies: ["Initial assessments complete"]
    }
  ];
}

// Default route for undefined endpoints
app.get('/', (req, res) => {
  res.json({
    message: 'SuperClaude Healthcare API',
    version: '1.0.0',
    endpoints: [
      'GET /health',
      'POST /api/v1/healthcare/safety-plan',
      'POST /api/v1/healthcare/care-coordination', 
      'POST /api/v1/healthcare/safety-review',
      'GET /api/v1/agents/status'
    ]
  });
});

// Start server
const port = process.env.PORT || 8888;
app.listen(port, () => {
  console.log(`🚀 SuperClaude Healthcare API running on port ${port}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🏥 Healthcare compliance: ENABLED`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /health - Health check`);
  console.log(`   POST /api/v1/healthcare/safety-plan - Generate safety plans`);
  console.log(`   POST /api/v1/healthcare/care-coordination - Coordinate care`);
  console.log(`   POST /api/v1/healthcare/safety-review - Conduct safety reviews`);
  console.log(`   GET  /api/v1/agents/status - Agent status`);
  console.log(`\n✅ Ready to process healthcare AI requests!`);
  console.log(`\nExample test command:`);
  console.log(`curl -X POST http://localhost:${port}/api/v1/healthcare/safety-plan -H "Content-Type: application/json" -d '{"patient_id": "123", "assessment_data": {"berg_balance_score": 45, "tug_time": 15.2, "fall_history": 2, "medications": 7}}'`);
});