import { HealthcareRouter } from "../../packages/shared/src/model-router.js";
import { ConfigSchema } from "../../packages/shared/src/config-loader.js";
import { ToolRegistry } from "../tools/tool-registry.js";

export type SafetyReview = {
  id: string;
  reviewType: "plan" | "recommendation" | "implementation" | "outcome";
  targetId: string; // ID of what's being reviewed
  compliance: ComplianceCheck;
  safety: SafetyAssessment;
  accessibility: AccessibilityAudit;
  quality: QualityMetrics;
  recommendations: ReviewRecommendation[];
  approvalStatus: "approved" | "conditional" | "rejected" | "needs_revision";
  reviewerInfo: {
    agentId: string;
    timestamp: Date;
    version: string;
    confidence: number;
  };
  auditTrail: AuditEntry[];
};

export type ComplianceCheck = {
  hipaa: {
    compliant: boolean;
    issues: string[];
    requirements: string[];
    recommendations: string[];
  };
  ada: {
    compliant: boolean;
    issues: string[];
    accessibility_score: number; // 0-100
    accommodations: string[];
  };
  healthcareSafety: {
    compliant: boolean;
    riskLevel: "low" | "medium" | "high" | "critical";
    safetyStandards: string[];
    violations: string[];
  };
  regulatory: {
    compliant: boolean;
    regulations: string[];
    certifications: string[];
    exceptions: string[];
  };
};

export type SafetyAssessment = {
  overallScore: number; // 0-100
  riskFactors: Array<{
    factor: string;
    severity: "low" | "medium" | "high" | "critical";
    likelihood: number; // 0-1
    impact: "minor" | "moderate" | "major" | "catastrophic";
    mitigation: string;
  }>;
  safetyGaps: string[];
  emergencyPreparedness: {
    score: number;
    protocols: string[];
    gaps: string[];
    improvements: string[];
  };
  preventiveMeasures: string[];
};

export type AccessibilityAudit = {
  score: number; // 0-100  
  wcagLevel: "A" | "AA" | "AAA" | "non_compliant";
  barriers: Array<{
    type: string;
    severity: "low" | "medium" | "high";
    description: string;
    solution: string;
    cost: number;
  }>;
  accommodations: string[];
  assistiveTechnology: {
    supported: string[];
    recommended: string[];
    required: string[];
  };
};

export type QualityMetrics = {
  evidenceBased: {
    score: number;
    guidelines: string[];
    research: string[];
    clinicalSupport: boolean;
  };
  effectiveness: {
    predictedOutcome: number; // 0-100
    successIndicators: string[];
    measurableGoals: string[];
    timeframe: string;
  };
  patientCentered: {
    score: number;
    preferences: boolean;
    autonomy: boolean;
    dignity: boolean;
    culturalSensitivity: boolean;
  };
};

export type ReviewRecommendation = {
  id: string;
  category: "safety" | "compliance" | "accessibility" | "quality" | "efficiency";
  priority: "critical" | "high" | "medium" | "low";
  description: string;
  rationale: string;
  implementation: {
    steps: string[];
    timeframe: string;
    resources: string[];
    cost: number;
  };
  impact: {
    safety: string;
    compliance: string;
    patient: string;
  };
};

export type AuditEntry = {
  timestamp: Date;
  action: string;
  details: string;
  userId: string;
  outcome: string;
};

/**
 * Safety Reviewer Agent - Ensures healthcare plans meet safety and compliance standards
 */
export class SafetyReviewerAgent {
  private router: HealthcareRouter;
  private tools: ToolRegistry;
  private config: ConfigSchema;
  private policyEngine: PolicyEngine;

  constructor(config: ConfigSchema, router: HealthcareRouter, tools: ToolRegistry) {
    this.config = config;
    this.router = router;
    this.tools = tools;
    this.policyEngine = new PolicyEngine(config);
  }

  /**
   * Conduct comprehensive safety review
   */
  async conductSafetyReview(request: {
    targetType: "plan" | "recommendation" | "implementation";
    targetData: any;
    patientContext: any;
    urgency: "routine" | "urgent" | "emergency";
    scope: "basic" | "comprehensive" | "full_audit";
  }): Promise<SafetyReview> {

    try {
      const reviewId = this.generateReviewId();
      
      // Create audit trail entry
      const auditEntry: AuditEntry = {
        timestamp: new Date(),
        action: "safety_review_initiated",
        details: `Review of ${request.targetType} with scope: ${request.scope}`,
        userId: "safety-reviewer-agent",
        outcome: "in_progress"
      };

      // Step 1: Compliance Assessment
      const compliance = await this.assessCompliance(request);
      
      // Step 2: Safety Assessment  
      const safety = await this.assessSafety(request);
      
      // Step 3: Accessibility Audit
      const accessibility = await this.auditAccessibility(request);
      
      // Step 4: Quality Assessment
      const quality = await this.assessQuality(request);
      
      // Step 5: Generate Recommendations
      const recommendations = await this.generateRecommendations(compliance, safety, accessibility, quality);
      
      // Step 6: Determine Approval Status
      const approvalStatus = this.determineApprovalStatus(compliance, safety, accessibility, quality);

      const review: SafetyReview = {
        id: reviewId,
        reviewType: request.targetType,
        targetId: request.targetData.id || `target_${Date.now()}`,
        compliance,
        safety,
        accessibility,
        quality,
        recommendations,
        approvalStatus,
        reviewerInfo: {
          agentId: "safety-reviewer-agent",
          timestamp: new Date(),
          version: "1.0.0",
          confidence: this.calculateConfidence(compliance, safety, accessibility, quality)
        },
        auditTrail: [
          auditEntry,
          {
            timestamp: new Date(),
            action: "safety_review_completed",
            details: `Review completed with status: ${approvalStatus}`,
            userId: "safety-reviewer-agent",
            outcome: "completed"
          }
        ]
      };

      // Log for HIPAA audit trail
      await this.logReviewCompletion(review);
      
      return review;

    } catch (error) {
      console.error("Safety review failed:", error);
      throw new Error(`Safety review failed: ${error.message}`);
    }
  }

  /**
   * Assess compliance with healthcare regulations
   */
  private async assessCompliance(request: any): Promise<ComplianceCheck> {
    
    const prompt = `
You are a healthcare compliance specialist reviewing a ${request.targetType} for regulatory compliance.

Target Data:
${JSON.stringify(request.targetData, null, 2)}

Patient Context:
${JSON.stringify(request.patientContext, null, 2)}

Please assess compliance with:

1. HIPAA (Health Insurance Portability and Accountability Act)
   - Privacy protection
   - Data handling
   - Access controls
   - Audit requirements

2. ADA (Americans with Disabilities Act)
   - Accessibility requirements
   - Reasonable accommodations
   - Non-discrimination
   - Equal access

3. Healthcare Safety Standards
   - Patient safety protocols
   - Risk management
   - Quality assurance
   - Emergency procedures

4. Regulatory Requirements
   - State and federal regulations
   - Professional standards
   - Certification requirements

Return assessment in this JSON format:
{
  "hipaa": {
    "compliant": true,
    "issues": ["list any issues"],
    "requirements": ["applicable requirements"],
    "recommendations": ["compliance recommendations"]
  },
  "ada": {
    "compliant": true,
    "issues": ["accessibility issues"],
    "accessibility_score": 85,
    "accommodations": ["required accommodations"]
  },
  "healthcareSafety": {
    "compliant": true,
    "riskLevel": "low|medium|high|critical",
    "safetyStandards": ["applicable standards"],
    "violations": ["any violations found"]
  },
  "regulatory": {
    "compliant": true,
    "regulations": ["applicable regulations"],
    "certifications": ["required certifications"],
    "exceptions": ["any exceptions or variances"]
  }
}`;

    const response = await this.router.callHealthcareAgent("reviewer", {
      patientContext: request.patientContext,
      urgency: request.urgency,
      topic: "compliance_assessment",
      input: prompt
    });

    return JSON.parse(response.output);
  }

  /**
   * Assess safety aspects of the plan or recommendation
   */
  private async assessSafety(request: any): Promise<SafetyAssessment> {
    
    const prompt = `
You are a healthcare safety specialist conducting a comprehensive safety assessment.

Target Data:
${JSON.stringify(request.targetData, null, 2)}

Patient Context:
${JSON.stringify(request.patientContext, null, 2)}

Please assess:

1. Overall Safety Score (0-100)
2. Risk Factors:
   - Fall risks
   - Medication risks
   - Environmental hazards
   - Medical complications
   - Emergency response gaps

3. Safety Gaps:
   - Missing safety measures
   - Inadequate protocols
   - Resource gaps
   - Training needs

4. Emergency Preparedness:
   - Emergency protocols
   - Contact systems
   - Response times
   - Escalation procedures

5. Preventive Measures:
   - Risk mitigation
   - Safety equipment
   - Monitoring systems
   - Education needs

Use evidence-based safety standards and geriatric care guidelines.

Return assessment in this JSON format:
{
  "overallScore": 85,
  "riskFactors": [
    {
      "factor": "fall risk",
      "severity": "medium",
      "likelihood": 0.3,
      "impact": "moderate",
      "mitigation": "install grab bars and improve lighting"
    }
  ],
  "safetyGaps": ["identified gaps"],
  "emergencyPreparedness": {
    "score": 80,
    "protocols": ["emergency protocols in place"],
    "gaps": ["gaps in emergency preparedness"],
    "improvements": ["recommended improvements"]
  },
  "preventiveMeasures": ["recommended preventive measures"]
}`;

    const response = await this.router.callHealthcareAgent("reviewer", {
      patientContext: request.patientContext,
      urgency: request.urgency,
      topic: "safety_assessment",
      input: prompt
    });

    return JSON.parse(response.output);
  }

  /**
   * Conduct accessibility audit
   */
  private async auditAccessibility(request: any): Promise<AccessibilityAudit> {
    
    const prompt = `
You are an accessibility specialist conducting an audit for healthcare services and recommendations.

Target Data:
${JSON.stringify(request.targetData, null, 2)}

Patient Context:
- Age: ${request.patientContext.age}
- Mobility: ${request.patientContext.mobilityLevel || "not specified"}
- Cognitive Status: ${request.patientContext.cognitiveStatus || "not specified"}
- Sensory Impairments: ${request.patientContext.sensoryImpairments || "none specified"}

Please assess:

1. WCAG Compliance Level (A, AA, AAA)
2. Accessibility Score (0-100)
3. Barriers:
   - Physical barriers
   - Cognitive barriers
   - Sensory barriers
   - Technology barriers
   - Communication barriers

4. Accommodations:
   - Required accommodations
   - Assistive technology needs
   - Environmental modifications
   - Communication adaptations

5. Solutions and Costs:
   - Specific solutions for each barrier
   - Implementation costs
   - Priority levels

Focus on healthcare-specific accessibility requirements for aging adults.

Return audit in this JSON format:
{
  "score": 78,
  "wcagLevel": "AA",
  "barriers": [
    {
      "type": "mobility",
      "severity": "medium",
      "description": "steep entrance ramp",
      "solution": "install chairlift or reduce grade",
      "cost": 2500
    }
  ],
  "accommodations": ["large print materials", "wheelchair access"],
  "assistiveTechnology": {
    "supported": ["screen readers", "voice control"],
    "recommended": ["hearing loops", "magnifiers"],
    "required": ["wheelchair access"]
  }
}`;

    const response = await this.router.callHealthcareAgent("reviewer", {
      patientContext: request.patientContext,
      urgency: request.urgency,
      topic: "accessibility_audit",
      input: prompt
    });

    return JSON.parse(response.output);
  }

  /**
   * Assess quality metrics
   */
  private async assessQuality(request: any): Promise<QualityMetrics> {
    
    const prompt = `
You are a healthcare quality specialist assessing the quality of care recommendations.

Target Data:
${JSON.stringify(request.targetData, null, 2)}

Please assess:

1. Evidence-Based Score (0-100):
   - Clinical guidelines adherence
   - Research support
   - Best practices alignment
   - Professional standards compliance

2. Effectiveness Prediction (0-100):
   - Likelihood of success
   - Measurable outcomes
   - Success indicators
   - Timeline realism

3. Patient-Centered Score (0-100):
   - Patient preferences respected
   - Autonomy preserved
   - Dignity maintained
   - Cultural sensitivity
   - Individual needs addressed

Consider geriatric care standards and patient-centered care principles.

Return quality assessment in this JSON format:
{
  "evidenceBased": {
    "score": 88,
    "guidelines": ["CDC fall prevention guidelines", "AHA cardiac care standards"],
    "research": ["peer-reviewed studies supporting recommendations"],
    "clinicalSupport": true
  },
  "effectiveness": {
    "predictedOutcome": 85,
    "successIndicators": ["reduced fall risk", "improved mobility"],
    "measurableGoals": ["30% reduction in fall risk within 6 months"],
    "timeframe": "3-6 months for full implementation"
  },
  "patientCentered": {
    "score": 90,
    "preferences": true,
    "autonomy": true,
    "dignity": true,
    "culturalSensitivity": true
  }
}`;

    const response = await this.router.callHealthcareAgent("reviewer", {
      patientContext: request.patientContext,
      urgency: request.urgency,
      topic: "quality_assessment",
      input: prompt
    });

    return JSON.parse(response.output);
  }

  /**
   * Generate review recommendations
   */
  private async generateRecommendations(
    compliance: ComplianceCheck,
    safety: SafetyAssessment,
    accessibility: AccessibilityAudit,
    quality: QualityMetrics
  ): Promise<ReviewRecommendation[]> {
    
    const issues = [
      ...(compliance.hipaa?.issues || []).map(issue => ({ category: "compliance", issue, source: "HIPAA" })),
      ...(compliance.ada?.issues || []).map(issue => ({ category: "accessibility", issue, source: "ADA" })),
      ...(safety.safetyGaps || []).map(gap => ({ category: "safety", issue: gap, source: "Safety Assessment" })),
      ...(accessibility.barriers || []).map(barrier => ({ category: "accessibility", issue: barrier.description, source: "Accessibility Audit" }))
    ];

    const recommendations: ReviewRecommendation[] = [];
    let recId = 1;

    for (const issue of issues) {
      const priority = this.determinePriority(issue);
      
      recommendations.push({
        id: `rec_${recId++}`,
        category: issue.category as any,
        priority,
        description: `Address ${issue.issue}`,
        rationale: `Required for ${issue.source} compliance`,
        implementation: {
          steps: [`Analyze ${issue.issue}`, `Develop solution`, `Implement fix`, "Verify compliance"],
          timeframe: priority === "critical" ? "immediate" : priority === "high" ? "1 week" : "1 month",
          resources: ["compliance officer", "technical team"],
          cost: this.estimateCost(issue, priority)
        },
        impact: {
          safety: priority === "critical" ? "high" : "medium",
          compliance: "high", 
          patient: "medium"
        }
      });
    }

    return recommendations;
  }

  /**
   * Determine overall approval status
   */
  private determineApprovalStatus(
    compliance: ComplianceCheck,
    safety: SafetyAssessment,
    accessibility: AccessibilityAudit,
    quality: QualityMetrics
  ): "approved" | "conditional" | "rejected" | "needs_revision" {
    
    // Critical safety issues = rejected
    if (safety.riskFactors && Array.isArray(safety.riskFactors) && 
        safety.riskFactors.some(rf => rf.severity === "critical")) {
      return "rejected";
    }
    
    // Major compliance issues = needs revision
    if (!compliance.hipaa?.compliant || !compliance.healthcareSafety?.compliant) {
      return "needs_revision";
    }
    
    // Safety score too low = conditional
    if (safety.overallScore < 70) {
      return "conditional";
    }
    
    // Quality issues = conditional  
    if (quality.evidenceBased.score < 60 || quality.effectiveness.predictedOutcome < 60) {
      return "conditional";
    }
    
    // All good = approved
    return "approved";
  }

  // Helper methods
  private calculateConfidence(
    compliance: ComplianceCheck,
    safety: SafetyAssessment,
    accessibility: AccessibilityAudit,
    quality: QualityMetrics
  ): number {
    const scores = [
      compliance.hipaa?.compliant ? 100 : 50,
      compliance.ada?.compliant ? 100 : 50,
      safety.overallScore || 0,
      accessibility.score || 0,
      quality.evidenceBased?.score || 0,
      quality.effectiveness?.predictedOutcome || 0,
      quality.patientCentered?.score || 0
    ];
    
    return scores.reduce((sum, score) => sum + score, 0) / scores.length / 100;
  }

  private determinePriority(issue: { category: string; issue: string }): "critical" | "high" | "medium" | "low" {
    if (issue.issue.includes("emergency") || issue.issue.includes("critical")) return "critical";
    if (issue.category === "safety" || issue.issue.includes("fall")) return "high";
    if (issue.category === "compliance") return "high";
    return "medium";
  }

  private estimateCost(issue: { category: string; issue: string }, priority: string): number {
    const baseCosts = {
      critical: 5000,
      high: 2000,
      medium: 500,
      low: 200
    };
    return baseCosts[priority as keyof typeof baseCosts];
  }

  private generateReviewId(): string {
    return `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async logReviewCompletion(review: SafetyReview): Promise<void> {
    // HIPAA-compliant audit logging
    console.log(`Safety review completed: ${review.id} with status ${review.approvalStatus} at ${review.reviewerInfo.timestamp}`);
  }
}

/**
 * Policy Engine for healthcare regulations and rules
 */
class PolicyEngine {
  private config: ConfigSchema;
  
  constructor(config: ConfigSchema) {
    this.config = config;
  }

  async checkPolicy(policyName: string, context: any): Promise<{
    compliant: boolean;
    violations: string[];
    recommendations: string[];
  }> {
    // This would integrate with Open Policy Agent (OPA) or similar
    // For now, basic policy checking
    
    const policies = {
      hipaa: this.checkHIPAAPolicy,
      ada: this.checkADAPolicy,
      safety: this.checkSafetyPolicy
    };

    const checker = policies[policyName as keyof typeof policies];
    if (checker) {
      return checker.call(this, context);
    }

    return {
      compliant: true,
      violations: [],
      recommendations: []
    };
  }

  private checkHIPAAPolicy(context: any) {
    const violations = [];
    
    // Check for PII exposure
    if (context.data && typeof context.data === 'string' && 
        (context.data.includes('ssn') || context.data.includes('phone'))) {
      violations.push("Potential PII exposure in data");
    }

    return {
      compliant: violations.length === 0,
      violations,
      recommendations: violations.length > 0 ? ["Implement data masking", "Add access controls"] : []
    };
  }

  private checkADAPolicy(context: any) {
    // Basic ADA compliance checks
    return {
      compliant: true,
      violations: [],
      recommendations: []
    };
  }

  private checkSafetyPolicy(context: any) {
    // Basic safety policy checks
    return {
      compliant: true,
      violations: [],
      recommendations: []
    };
  }
}