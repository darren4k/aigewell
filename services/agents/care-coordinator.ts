import { HealthcareRouter } from "../../packages/shared/src/model-router.js";
import { ConfigSchema } from "../../packages/shared/src/config-loader.js";
import { ToolRegistry } from "../tools/tool-registry.js";

export type CareCoordinationPlan = {
  id: string;
  patientId: string;
  coordinationType: "routine" | "transitional" | "complex" | "emergency";
  providers: ProviderAssignment[];
  appointments: AppointmentPlan[];
  services: ServiceCoordination[];
  emergencyContacts: EmergencyContact[];
  careTeam: CareTeamMember[];
  communicationPlan: CommunicationPlan;
  timeline: CareTimeline[];
  status: "active" | "pending" | "completed" | "escalated";
  metadata: {
    createdAt: Date;
    lastUpdated: Date;
    coordinatorId: string;
    priority: "low" | "medium" | "high" | "critical";
  };
};

export type ProviderAssignment = {
  providerId: string;
  specialization: string;
  role: "primary" | "specialist" | "consultant" | "emergency";
  contactInfo: {
    name: string;
    phone: string;
    email: string;
    availability: string;
  };
  responsibilities: string[];
  credentials: {
    license: string;
    certifications: string[];
    experience: string;
  };
};

export type AppointmentPlan = {
  type: "assessment" | "followup" | "procedure" | "consultation" | "therapy";
  providerId: string;
  urgency: "immediate" | "within_week" | "within_month" | "routine";
  duration: number; // minutes
  frequency: string;
  location: "home" | "clinic" | "hospital" | "telehealth";
  requirements: {
    preparation: string[];
    equipment: string[];
    assistance: boolean;
    transportation: boolean;
  };
  scheduling: {
    preferredTimes: string[];
    blackoutDates: Date[];
    flexibility: "rigid" | "moderate" | "flexible";
  };
};

export type ServiceCoordination = {
  serviceType: "homecare" | "therapy" | "equipment" | "transportation" | "nutrition";
  provider: string;
  schedule: string;
  duration: string;
  cost: {
    amount: number;
    coverage: "insurance" | "private" | "medicare" | "medicaid" | "mixed";
    authorization: boolean;
  };
  dependencies: string[];
};

export type EmergencyContact = {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  address: string;
  availability: "24/7" | "business_hours" | "emergency_only";
  priority: number;
  medicalPowerOfAttorney: boolean;
  languages: string[];
};

export type CareTeamMember = {
  id: string;
  name: string;
  role: "physician" | "nurse" | "therapist" | "social_worker" | "caregiver" | "family";
  contactInfo: string;
  responsibilities: string[];
  schedule: string;
  accessLevel: "full" | "limited" | "emergency_only";
};

export type CommunicationPlan = {
  primaryContact: string;
  updateFrequency: "daily" | "weekly" | "monthly" | "as_needed";
  communicationMethods: ("phone" | "email" | "text" | "portal" | "video")[];
  emergencyProtocol: {
    triggers: string[];
    contacts: string[];
    escalationSteps: string[];
    timeframes: string[];
  };
  reportingSchedule: {
    to: string;
    frequency: string;
    format: "summary" | "detailed" | "metrics";
  };
};

export type CareTimeline = {
  phase: string;
  startDate: Date;
  endDate: Date;
  goals: string[];
  milestones: string[];
  appointments: string[];
  reviews: Date[];
};

/**
 * Care Coordinator Agent - Orchestrates healthcare services and appointments
 */
export class CareCoordinatorAgent {
  private router: HealthcareRouter;
  private tools: ToolRegistry;
  private config: ConfigSchema;

  constructor(config: ConfigSchema, router: HealthcareRouter, tools: ToolRegistry) {
    this.config = config;
    this.router = router;
    this.tools = tools;
  }

  /**
   * Create comprehensive care coordination plan
   */
  async createCareCoordinationPlan(request: {
    patientId: string;
    patientContext: {
      age: number;
      medicalConditions: string[];
      currentProviders: any[];
      insuranceInfo: any;
      supportSystem: any;
      preferences: {
        communicationStyle: string;
        appointmentTimes: string[];
        locationPreferences: string[];
      };
    };
    careNeeds: {
      immediate: string[];
      ongoing: string[];
      preventive: string[];
    };
    constraints: {
      budget?: number;
      transportation: boolean;
      mobility: string;
      technology: string;
    };
    urgency: "routine" | "urgent" | "emergency";
  }): Promise<CareCoordinationPlan> {

    try {
      // Step 1: Assess care needs and build provider network
      const providerAssessment = await this.assessProviderNeeds(request);
      
      // Step 2: Create appointment scheduling strategy
      const appointmentStrategy = await this.createAppointmentStrategy(request, providerAssessment);
      
      // Step 3: Coordinate services and resources
      const serviceCoordination = await this.coordinateServices(request);
      
      // Step 4: Establish emergency protocols
      const emergencyPlan = await this.createEmergencyProtocol(request);
      
      // Step 5: Build care team and communication plan
      const careTeamPlan = await this.buildCareTeam(request, providerAssessment);

      const coordinationPlan: CareCoordinationPlan = {
        id: this.generateCoordinationId(),
        patientId: request.patientId,
        coordinationType: this.determineCoordinationType(request),
        providers: providerAssessment.providers,
        appointments: appointmentStrategy.appointments,
        services: serviceCoordination,
        emergencyContacts: emergencyPlan.contacts,
        careTeam: careTeamPlan.members,
        communicationPlan: careTeamPlan.communicationPlan,
        timeline: await this.createCareTimeline(appointmentStrategy, serviceCoordination),
        status: "pending",
        metadata: {
          createdAt: new Date(),
          lastUpdated: new Date(),
          coordinatorId: "care-coordinator-agent",
          priority: this.determinePriority(request.urgency, request.careNeeds)
        }
      };

      // Execute initial coordination tasks
      await this.initiateCoordination(coordinationPlan);
      
      return coordinationPlan;

    } catch (error) {
      console.error("Care coordination planning failed:", error);
      throw new Error(`Coordination planning failed: ${error.message}`);
    }
  }

  /**
   * Assess provider needs and match with network
   */
  private async assessProviderNeeds(request: any): Promise<{
    providers: ProviderAssignment[];
    gaps: string[];
    recommendations: string[];
  }> {
    
    const prompt = `
You are a healthcare care coordinator analyzing provider needs for a patient.

Patient Information:
- Age: ${request.patientContext.age}
- Medical Conditions: ${request.patientContext.medicalConditions?.join(", ") || "None specified"}
- Current Providers: ${JSON.stringify(request.patientContext.currentProviders)}
- Insurance: ${JSON.stringify(request.patientContext.insuranceInfo)}

Care Needs:
- Immediate: ${request.careNeeds.immediate?.join(", ") || "None specified"}
- Ongoing: ${request.careNeeds.ongoing?.join(", ") || "None specified"}
- Preventive: ${request.careNeeds.preventive?.join(", ") || "None specified"}

Constraints:
- Budget: ${request.constraints.budget || "not specified"}
- Transportation: ${request.constraints.transportation ? "available" : "limited"}
- Mobility: ${request.constraints.mobility}
- Technology comfort: ${request.constraints.technology}

Please assess the provider network needed and identify any gaps. Consider:
1. Primary care coordination
2. Specialist referrals based on conditions
3. Therapy and rehabilitation needs
4. Home health services
5. Emergency care access
6. Insurance coverage and authorization requirements

Return assessment in this JSON format:
{
  "providers": [
    {
      "specialization": "primary_care|cardiology|neurology|therapy|etc",
      "role": "primary|specialist|consultant|emergency",
      "urgency": "immediate|within_week|within_month|routine",
      "rationale": "why this provider is needed",
      "requirements": ["specific requirements"],
      "insuranceCoverage": "covered|requires_auth|not_covered"
    }
  ],
  "gaps": ["identified gaps in current care"],
  "recommendations": ["specific recommendations for care coordination"]
}`;

    const response = await this.router.callHealthcareAgent("coordinator", {
      patientContext: request.patientContext,
      urgency: request.urgency,
      topic: "provider_assessment",
      input: prompt
    });

    const assessment = JSON.parse(response.output);
    
    // Convert to ProviderAssignment format
    const providers: ProviderAssignment[] = await Promise.all(
      (assessment.providers || []).map(async (p: any) => {
        const matchedProvider = await this.matchProvider(p);
        return {
          providerId: matchedProvider.id,
          specialization: p.specialization,
          role: p.role,
          contactInfo: matchedProvider.contactInfo,
          responsibilities: this.getProviderResponsibilities(p.specialization),
          credentials: matchedProvider.credentials
        };
      })
    );

    return {
      providers,
      gaps: assessment.gaps,
      recommendations: assessment.recommendations
    };
  }

  /**
   * Create appointment scheduling strategy
   */
  private async createAppointmentStrategy(
    request: any, 
    providerAssessment: any
  ): Promise<{
    appointments: AppointmentPlan[];
    schedule: any;
  }> {

    const prompt = `
Create an optimal appointment scheduling strategy based on provider needs and patient constraints.

Provider Needs:
${JSON.stringify(providerAssessment, null, 2)}

Patient Preferences:
- Communication style: ${request.patientContext.preferences?.communicationStyle || "Not specified"}
- Preferred appointment times: ${request.patientContext.preferences?.appointmentTimes?.join(", ") || "None specified"}
- Location preferences: ${request.patientContext.preferences?.locationPreferences?.join(", ") || "None specified"}

Constraints:
- Transportation: ${request.constraints.transportation ? "available" : "requires assistance"}
- Mobility: ${request.constraints.mobility}
- Technology: ${request.constraints.technology}

Please create an appointment strategy that:
1. Prioritizes urgent needs first
2. Minimizes travel and coordination burden
3. Optimizes for patient preferences and constraints
4. Coordinates between providers to avoid conflicts
5. Includes adequate time for preparation and travel
6. Considers insurance authorization requirements

Return strategy in this JSON format:
{
  "appointments": [
    {
      "type": "assessment|followup|procedure|consultation|therapy",
      "specialization": "provider specialization",
      "urgency": "immediate|within_week|within_month|routine",
      "duration": 60,
      "frequency": "one-time|weekly|monthly|quarterly",
      "location": "home|clinic|hospital|telehealth",
      "requirements": {
        "preparation": ["what patient needs to do"],
        "equipment": ["any special equipment needed"],
        "assistance": true,
        "transportation": true
      },
      "scheduling": {
        "preferredTimes": ["morning|afternoon|evening"],
        "flexibility": "rigid|moderate|flexible",
        "coordination": ["other appointments to coordinate with"]
      }
    }
  ],
  "coordinationNotes": ["important scheduling considerations"]
}`;

    const response = await this.router.callHealthcareAgent("coordinator", {
      patientContext: request.patientContext,
      urgency: request.urgency,
      topic: "appointment_scheduling",
      input: prompt
    });

    const strategy = JSON.parse(response.output);
    
    const appointments: AppointmentPlan[] = (strategy.appointments || []).map((apt: any) => ({
      type: apt.type,
      providerId: `provider_${apt.specialization}`,
      urgency: apt.urgency,
      duration: apt.duration,
      frequency: apt.frequency,
      location: apt.location,
      requirements: apt.requirements,
      scheduling: {
        preferredTimes: apt.scheduling.preferredTimes,
        blackoutDates: [],
        flexibility: apt.scheduling.flexibility
      }
    }));

    return {
      appointments,
      schedule: strategy.coordinationNotes
    };
  }

  /**
   * Execute appointment scheduling
   */
  async scheduleAppointments(
    plan: CareCoordinationPlan, 
    appointments: AppointmentPlan[]
  ): Promise<{
    scheduled: any[];
    failed: any[];
    rescheduled: any[];
  }> {
    
    const results = {
      scheduled: [] as any[],
      failed: [] as any[],
      rescheduled: [] as any[]
    };

    // Sort appointments by urgency
    const sortedAppointments = appointments.sort((a, b) => {
      const urgencyOrder = { immediate: 0, within_week: 1, within_month: 2, routine: 3 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });

    for (const appointment of sortedAppointments) {
      try {
        // Use existing appointment service to schedule
        const schedulingRequest = {
          user_id: parseInt(plan.patientId),
          provider_id: await this.getProviderIdBySpecialization(appointment.providerId),
          appointment_type: appointment.location,
          scheduled_at: await this.findOptimalTimeSlot(appointment),
          notes: `${appointment.type} appointment - ${appointment.duration} minutes`
        };

        const scheduledAppointment = await this.tools.execute("appointment_service", "schedule", schedulingRequest);
        results.scheduled.push({
          ...appointment,
          scheduledDetails: scheduledAppointment
        });

      } catch (error) {
        console.error(`Failed to schedule appointment:`, error);
        results.failed.push({
          appointment,
          error: error.message
        });

        // Attempt to reschedule with more flexible parameters
        try {
          const flexibleAppointment = await this.rescheduleWithFlexibility(appointment);
          results.rescheduled.push(flexibleAppointment);
        } catch (rescheduleError) {
          console.error("Rescheduling also failed:", rescheduleError);
        }
      }
    }

    return results;
  }

  /**
   * Monitor and adjust care coordination
   */
  async monitorCareProgress(
    planId: string,
    period: "daily" | "weekly" | "monthly"
  ): Promise<{
    status: "on_track" | "needs_attention" | "critical";
    alerts: any[];
    recommendations: string[];
    nextActions: any[];
  }> {
    
    // This would integrate with monitoring systems
    // For now, return structure that would be populated with real data
    return {
      status: "on_track",
      alerts: [],
      recommendations: [
        "Continue current care plan",
        "Schedule routine follow-up in 2 weeks"
      ],
      nextActions: []
    };
  }

  // Helper methods
  private async matchProvider(requirements: any): Promise<any> {
    // This would integrate with provider network database
    return {
      id: `provider_${Math.random().toString(36).substr(2, 9)}`,
      contactInfo: {
        name: `Dr. ${requirements.specialization}`,
        phone: "555-0123",
        email: `${requirements.specialization}@healthcare.com`,
        availability: "Mon-Fri 9AM-5PM"
      },
      credentials: {
        license: "MD12345",
        certifications: [`Board Certified ${requirements.specialization}`],
        experience: "10+ years"
      }
    };
  }

  private getProviderResponsibilities(specialization: string): string[] {
    const responsibilities = {
      primary_care: ["Overall health management", "Routine checkups", "Referral coordination"],
      cardiology: ["Heart health monitoring", "Cardiac procedures", "Medication management"],
      neurology: ["Neurological assessment", "Cognitive evaluation", "Treatment planning"],
      therapy: ["Physical rehabilitation", "Mobility improvement", "Exercise planning"]
    };
    return responsibilities[specialization as keyof typeof responsibilities] || ["General care"];
  }

  private async coordinateServices(request: any): Promise<ServiceCoordination[]> {
    // Placeholder for service coordination logic
    return [];
  }

  private async createEmergencyProtocol(request: any): Promise<{ contacts: EmergencyContact[] }> {
    // Placeholder for emergency protocol creation
    return { contacts: [] };
  }

  private async buildCareTeam(request: any, providerAssessment: any): Promise<{
    members: CareTeamMember[];
    communicationPlan: CommunicationPlan;
  }> {
    // Placeholder for care team building
    return {
      members: [],
      communicationPlan: {
        primaryContact: "care_coordinator",
        updateFrequency: "weekly",
        communicationMethods: ["phone", "email"],
        emergencyProtocol: {
          triggers: ["falls", "medication issues", "health changes"],
          contacts: ["911", "primary_physician", "emergency_contact"],
          escalationSteps: ["assess", "contact", "transport"],
          timeframes: ["immediate", "within_hour", "same_day"]
        },
        reportingSchedule: {
          to: "primary_physician",
          frequency: "monthly",
          format: "summary"
        }
      }
    };
  }

  private async createCareTimeline(
    appointmentStrategy: any,
    serviceCoordination: ServiceCoordination[]
  ): Promise<CareTimeline[]> {
    // Create timeline based on appointments and services
    return [];
  }

  private async initiateCoordination(plan: CareCoordinationPlan): Promise<void> {
    // Send initial communications, set up monitoring, etc.
    console.log(`Initiated care coordination for plan ${plan.id}`);
  }

  // Utility methods
  private generateCoordinationId(): string {
    return `coord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private determineCoordinationType(request: any): "routine" | "transitional" | "complex" | "emergency" {
    if (request.urgency === "emergency") return "emergency";
    if (request.careNeeds.immediate.length > 3) return "complex";
    if (request.patientContext.medicalConditions.length > 5) return "complex";
    return "routine";
  }

  private determinePriority(urgency: string, careNeeds: any): "low" | "medium" | "high" | "critical" {
    if (urgency === "emergency") return "critical";
    if (careNeeds.immediate.length > 0) return "high";
    if (careNeeds.ongoing.length > 3) return "medium";
    return "low";
  }

  private async getProviderIdBySpecialization(specialization: string): Promise<number> {
    // This would look up actual provider IDs
    // For demo, return a default provider ID
    return 3; // Default provider from our test data
  }

  private async findOptimalTimeSlot(appointment: AppointmentPlan): Promise<string> {
    // This would integrate with provider schedules and patient preferences
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0); // Default to 10 AM tomorrow
    return tomorrow.toISOString().slice(0, 19).replace('T', ' ');
  }

  private async rescheduleWithFlexibility(appointment: AppointmentPlan): Promise<any> {
    // Implement flexible rescheduling logic
    return { ...appointment, status: "rescheduled" };
  }
}