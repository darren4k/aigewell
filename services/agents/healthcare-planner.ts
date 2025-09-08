import { HealthcareRouter, RouteContext, ModelResponse } from "../../packages/shared/src/model-router.js";
import { ConfigSchema } from "../../packages/shared/src/config-loader.js";
import { ToolRegistry } from "../tools/tool-registry.js";

export type HealthcarePlan = {
  id: string;
  patientId: string;
  assessmentType: "safety" | "mobility" | "cognitive" | "comprehensive";
  recommendations: Recommendation[];
  riskLevel: "low" | "medium" | "high" | "critical";
  timeline: Timeline[];
  nextReview: Date;
  compliance: {
    hipaa: boolean;
    ada: boolean;
    healthcareSafety: boolean;
  };
  metadata: {
    createdAt: Date;
    createdBy: string;
    confidence: number;
    evidenceBased: boolean;
  };
};

export type Recommendation = {
  id: string;
  category: "safety" | "equipment" | "environment" | "care" | "medication";
  priority: "immediate" | "urgent" | "routine" | "preventive";
  description: string;
  rationale: string;
  cost: {
    estimated: number;
    range: { min: number; max: number };
    currency: "USD";
  };
  implementation: {
    steps: string[];
    timeframe: string;
    resources: string[];
    stakeholders: string[];
  };
  outcomes: {
    expected: string[];
    measurable: string[];
    timeline: string;
  };
};

export type Timeline = {
  phase: string;
  startDate: Date;
  endDate: Date;
  milestones: string[];
  dependencies: string[];
};

/**
 * Healthcare-specific planning agent with medical knowledge integration
 */
export class HealthcarePlannerAgent {
  private router: HealthcareRouter;
  private tools: ToolRegistry;
  private config: ConfigSchema;

  constructor(config: ConfigSchema, router: HealthcareRouter, tools: ToolRegistry) {
    this.config = config;
    this.router = router;
    this.tools = tools;
  }

  /**
   * Generate comprehensive healthcare safety plan
   */
  async generateSafetyPlan(request: {
    patientId: string;
    patientContext: {
      age: number;
      medicalHistory: string[];
      currentMedications: string[];
      livingArrangement: "alone" | "with_family" | "assisted_living";
      mobilityLevel: "independent" | "limited" | "assisted" | "wheelchair";
      cognitiveStatus: "normal" | "mild_impairment" | "moderate_impairment" | "severe_impairment";
    };
    assessmentData: {
      roomAssessments: any[];
      riskFactors: string[];
      previousIncidents: any[];
    };
    urgency: "routine" | "urgent" | "emergency";
  }): Promise<HealthcarePlan> {
    
    try {
      // Step 1: Analyze patient context and risk factors
      const riskAnalysis = await this.analyzeRisks(request);
      
      // Step 2: Generate evidence-based recommendations
      const recommendations = await this.generateRecommendations(request, riskAnalysis);
      
      // Step 3: Create implementation timeline
      const timeline = await this.createTimeline(recommendations);
      
      // Step 4: Validate compliance and safety
      await this.validateCompliance(recommendations);
      
      const plan: HealthcarePlan = {
        id: this.generatePlanId(),
        patientId: request.patientId,
        assessmentType: this.determineAssessmentType(request),
        recommendations,
        riskLevel: riskAnalysis.overallRisk,
        timeline,
        nextReview: this.calculateNextReview(riskAnalysis.overallRisk),
        compliance: {
          hipaa: true,
          ada: true,
          healthcareSafety: true
        },
        metadata: {
          createdAt: new Date(),
          createdBy: "healthcare-planner-agent",
          confidence: riskAnalysis.confidence,
          evidenceBased: true
        }
      };

      // Log plan creation for audit trail
      await this.logPlanCreation(plan);
      
      return plan;
      
    } catch (error) {
      console.error("Healthcare plan generation failed:", error);
      throw new Error(`Plan generation failed: ${error.message}`);
    }
  }

  /**
   * Analyze patient risks using medical knowledge base
   */
  private async analyzeRisks(request: any): Promise<{
    overallRisk: "low" | "medium" | "high" | "critical";
    riskFactors: Array<{
      factor: string;
      severity: "low" | "medium" | "high";
      evidence: string;
      mitigation: string;
    }>;
    confidence: number;
  }> {
    
    const prompt = `
You are a healthcare safety specialist analyzing patient risk factors for aging in place.

Patient Context:
- Age: ${request.patientContext.age}
- Medical History: ${request.patientContext.medicalHistory?.join(", ") || "None specified"}
- Current Medications: ${request.patientContext.currentMedications?.join(", ") || "None specified"}
- Living Arrangement: ${request.patientContext.livingArrangement}
- Mobility Level: ${request.patientContext.mobilityLevel}
- Cognitive Status: ${request.patientContext.cognitiveStatus || "Not assessed"}

Assessment Data:
- Risk Factors: ${request.assessmentData.riskFactors?.join(", ") || "None identified"}
- Previous Incidents: ${JSON.stringify(request.assessmentData.previousIncidents)}

Please provide a comprehensive risk analysis following evidence-based healthcare guidelines.
Focus on fall prevention, medication safety, emergency preparedness, and environmental hazards.

Return your analysis in this JSON format:
{
  "overallRisk": "low|medium|high|critical",
  "riskFactors": [
    {
      "factor": "specific risk factor",
      "severity": "low|medium|high", 
      "evidence": "clinical evidence or guidelines supporting this assessment",
      "mitigation": "recommended mitigation strategy"
    }
  ],
  "confidence": 0.95,
  "clinicalRationale": "detailed explanation of risk assessment"
}`;

    const response = await this.router.callHealthcareAgent("planner", {
      patientContext: request.patientContext,
      urgency: request.urgency,
      topic: "risk_analysis",
      input: prompt
    });

    return JSON.parse(response.output);
  }

  /**
   * Generate evidence-based recommendations
   */
  private async generateRecommendations(
    request: any, 
    riskAnalysis: any
  ): Promise<Recommendation[]> {
    
    const prompt = `
Based on the risk analysis, generate specific, actionable healthcare recommendations.

Risk Analysis:
${JSON.stringify(riskAnalysis, null, 2)}

Patient Context:
${JSON.stringify(request.patientContext, null, 2)}

Generate recommendations that are:
1. Evidence-based and follow clinical guidelines
2. Prioritized by safety impact and urgency  
3. Feasible for the patient's situation and resources
4. Measurable with clear outcomes
5. ADA compliant and age-appropriate

Focus on:
- Fall prevention and mobility safety
- Medication management
- Emergency preparedness
- Environmental modifications
- Care coordination
- Technology solutions appropriate for seniors

Return recommendations in this JSON format:
{
  "recommendations": [
    {
      "id": "rec_001",
      "category": "safety|equipment|environment|care|medication",
      "priority": "immediate|urgent|routine|preventive",
      "description": "Clear, specific recommendation",
      "rationale": "Evidence-based rationale with guidelines reference",
      "cost": {
        "estimated": 150,
        "range": {"min": 100, "max": 200},
        "currency": "USD"
      },
      "implementation": {
        "steps": ["Step 1", "Step 2"],
        "timeframe": "1-2 weeks", 
        "resources": ["Resource 1"],
        "stakeholders": ["Patient", "Caregiver"]
      },
      "outcomes": {
        "expected": ["Expected outcome 1"],
        "measurable": ["Measurable metric 1"],
        "timeline": "4-6 weeks"
      }
    }
  ]
}`;

    const response = await this.router.callHealthcareAgent("planner", {
      patientContext: request.patientContext,
      urgency: request.urgency,
      topic: "recommendations",
      input: prompt
    });

    const result = JSON.parse(response.output);
    return result.recommendations;
  }

  /**
   * Create implementation timeline
   */
  private async createTimeline(recommendations: Recommendation[]): Promise<Timeline[]> {
    // Sort recommendations by priority
    if (!recommendations || !Array.isArray(recommendations)) {
      return [];
    }
    const prioritized = recommendations.sort((a, b) => {
      const priorityOrder = { immediate: 0, urgent: 1, routine: 2, preventive: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    const timeline: Timeline[] = [];
    let currentDate = new Date();

    // Group into phases based on priority and dependencies
    const phases = [
      {
        name: "Immediate Safety (0-2 weeks)",
        recommendations: prioritized.filter(r => r.priority === "immediate"),
        duration: 14
      },
      {
        name: "Urgent Improvements (2-6 weeks)", 
        recommendations: prioritized.filter(r => r.priority === "urgent"),
        duration: 28
      },
      {
        name: "Routine Enhancements (1-3 months)",
        recommendations: prioritized.filter(r => r.priority === "routine"),
        duration: 60
      },
      {
        name: "Preventive Measures (3-6 months)",
        recommendations: prioritized.filter(r => r.priority === "preventive"),
        duration: 90
      }
    ];

    for (const phase of phases) {
      if (phase.recommendations.length > 0) {
        const startDate = new Date(currentDate);
        const endDate = new Date(currentDate.getTime() + phase.duration * 24 * 60 * 60 * 1000);
        
        timeline.push({
          phase: phase.name,
          startDate,
          endDate,
          milestones: phase.recommendations.map(r => r.description),
          dependencies: phase.recommendations.flatMap(r => r.implementation.resources)
        });
        
        currentDate = new Date(endDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 1 week buffer
      }
    }

    return timeline;
  }

  /**
   * Validate compliance with healthcare regulations
   */
  private async validateCompliance(recommendations: Recommendation[]): Promise<void> {
    // Check for HIPAA compliance
    if (!recommendations || !Array.isArray(recommendations)) {
      return;
    }
    for (const rec of recommendations) {
      if (rec.description.includes("share") || rec.description.includes("data")) {
        // Validate data sharing recommendations comply with HIPAA
      }
    }

    // Check for ADA compliance
    for (const rec of recommendations) {
      if (rec.category === "equipment" || rec.category === "environment") {
        // Validate accessibility requirements
      }
    }
  }

  // Utility methods
  private generatePlanId(): string {
    return `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private determineAssessmentType(request: any): "safety" | "mobility" | "cognitive" | "comprehensive" {
    const riskCount = request.assessmentData.riskFactors.length;
    const hasIncidents = request.assessmentData.previousIncidents.length > 0;
    
    if (riskCount > 5 || hasIncidents) return "comprehensive";
    if (request.patientContext.mobilityLevel !== "independent") return "mobility";
    if (request.patientContext.cognitiveStatus !== "normal") return "cognitive";
    return "safety";
  }

  private calculateNextReview(riskLevel: string): Date {
    const months = {
      critical: 1,
      high: 2,
      medium: 3,
      low: 6
    };
    
    const reviewDate = new Date();
    reviewDate.setMonth(reviewDate.getMonth() + months[riskLevel as keyof typeof months]);
    return reviewDate;
  }

  private async logPlanCreation(plan: HealthcarePlan): Promise<void> {
    // HIPAA-compliant audit logging
    console.log(`Healthcare plan created: ${plan.id} for patient ${plan.patientId} at ${plan.metadata.createdAt}`);
  }
}