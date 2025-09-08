import { ConfigSchema } from "./config-loader.js";

export type RouteContext = { 
  topic: string; 
  tenant?: string; 
  risk?: "low" | "medium" | "high";
  userId?: string;
  emergency?: boolean;
};

export type ModelRequest = {
  model: string; 
  input: string; 
  options?: {
    temperature?: number;
    maxTokens?: number;
    tools?: string[];
    systemPrompt?: string;
  };
};

export type ModelResponse = { 
  output: string; 
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost: number;
  };
  latency: number;
  model: string;
  provider: string;
};

export type Adapter = (request: ModelRequest) => Promise<ModelResponse>;

export class ModelRouter {
  private costTracker = new CostTracker();
  
  constructor(
    private config: ConfigSchema, 
    private adapters: Record<string, Adapter>
  ) {}

  /**
   * Select the best route for a given context
   */
  selectRoute(context: RouteContext) {
    const rules = this.config.routing.rules;
    
    // Emergency bypass - always use highest quality model
    if (context.emergency) {
      return {
        provider: "anthropic",
        model: "claude-3-5-sonnet",
        temperature: 0.0,
        budget: { maxCostUSD: 1.0, maxLatencyMs: 10000 }
      };
    }
    
    // Find matching rule
    const matchingRule = rules.find(rule =>
      this.matchesPattern(context.topic, rule.match)
    );
    
    if (!matchingRule) {
      // Fallback to default
      return {
        provider: this.config.llm.defaultProvider,
        model: this.config.llm.defaultModel,
        temperature: this.config.llm.temperature ?? 0.2
      };
    }
    
    return matchingRule;
  }

  /**
   * Execute a request through the routing system
   */
  async call(
    context: RouteContext, 
    input: string, 
    options?: ModelRequest["options"]
  ): Promise<ModelResponse> {
    const route = this.selectRoute(context);
    
    // Check budget constraints first
    await this.checkBudgetConstraints(context, route);
    
    if (route.strategy === "fallback" && route.candidates) {
      return this.executeFallbackStrategy(route.candidates, input, options);
    } else {
      return this.executeSingleRoute(route, input, options);
    }
  }

  /**
   * Execute with fallback strategy
   */
  private async executeFallbackStrategy(
    candidates: any[],
    input: string,
    options?: ModelRequest["options"]
  ): Promise<ModelResponse> {
    let lastError: Error | null = null;
    
    for (const candidate of candidates) {
      try {
        const startTime = Date.now();
        const result = await this.executeRoute(candidate, input, options);
        
        // Track successful call
        this.costTracker.recordCall(result);
        
        return result;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Fallback attempt failed for ${candidate.provider}/${candidate.model}:`, error);
        continue;
      }
    }
    
    throw new Error(`All fallback candidates failed. Last error: ${lastError?.message}`);
  }

  /**
   * Execute single route
   */
  private async executeSingleRoute(
    route: any,
    input: string,
    options?: ModelRequest["options"]
  ): Promise<ModelResponse> {
    const result = await this.executeRoute(route, input, options);
    this.costTracker.recordCall(result);
    return result;
  }

  /**
   * Execute a specific route
   */
  private async executeRoute(
    route: any,
    input: string,
    options?: ModelRequest["options"]
  ): Promise<ModelResponse> {
    const adapter = this.adapters[route.provider];
    if (!adapter) {
      throw new Error(`No adapter found for provider: ${route.provider}`);
    }

    const startTime = Date.now();
    
    const request: ModelRequest = {
      model: route.model,
      input,
      options: {
        temperature: route.temperature ?? options?.temperature,
        maxTokens: options?.maxTokens,
        tools: options?.tools,
        systemPrompt: options?.systemPrompt,
      }
    };

    const response = await adapter(request);
    const latency = Date.now() - startTime;

    // Check latency budget
    if (route.budget?.maxLatencyMs && latency > route.budget.maxLatencyMs) {
      console.warn(`Request exceeded latency budget: ${latency}ms > ${route.budget.maxLatencyMs}ms`);
    }

    return {
      ...response,
      latency,
      provider: route.provider
    };
  }

  /**
   * Check budget constraints before execution
   */
  private async checkBudgetConstraints(context: RouteContext, route: any) {
    const dailySpend = await this.costTracker.getDailySpend(context.tenant);
    const monthlySpend = await this.costTracker.getMonthlySpend(context.tenant);
    
    const limits = this.config.cost?.hardLimits;
    if (!limits) return;

    if (limits.daily && dailySpend >= limits.daily) {
      throw new Error(`Daily cost limit exceeded: $${dailySpend} >= $${limits.daily}`);
    }

    if (limits.monthly && monthlySpend >= limits.monthly) {
      throw new Error(`Monthly cost limit exceeded: $${monthlySpend} >= $${limits.monthly}`);
    }

    if (limits.perTenant && context.tenant) {
      const tenantSpend = await this.costTracker.getTenantSpend(context.tenant);
      if (tenantSpend >= limits.perTenant) {
        throw new Error(`Tenant cost limit exceeded: $${tenantSpend} >= $${limits.perTenant}`);
      }
    }
  }

  /**
   * Pattern matching for routing rules
   */
  private matchesPattern(topic: string, pattern: string): boolean {
    // Handle simple regex patterns - escape special chars except * and |
    const regexPattern = pattern
      .replace(/[.+?^${}()\[\]\\]/g, '\\$&')  // Escape special regex chars
      .replace(/\*/g, '.*');                   // Convert * to .*
    return new RegExp(`^${regexPattern}$`, "i").test(topic);
  }

  /**
   * Get routing statistics
   */
  getStats() {
    return this.costTracker.getStats();
  }
}

/**
 * Cost tracking and budget management
 */
class CostTracker {
  private calls: Array<{
    timestamp: Date;
    provider: string;
    model: string;
    cost: number;
    tenant?: string;
    inputTokens: number;
    outputTokens: number;
  }> = [];

  recordCall(response: ModelResponse & { tenant?: string }) {
    this.calls.push({
      timestamp: new Date(),
      provider: response.provider,
      model: response.model,
      cost: response.usage.cost,
      tenant: response.tenant,
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
    });
  }

  async getDailySpend(tenant?: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return this.calls
      .filter(call => 
        call.timestamp >= today && 
        (!tenant || call.tenant === tenant)
      )
      .reduce((sum, call) => sum + call.cost, 0);
  }

  async getMonthlySpend(tenant?: string): Promise<number> {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    
    return this.calls
      .filter(call => 
        call.timestamp >= monthStart && 
        (!tenant || call.tenant === tenant)
      )
      .reduce((sum, call) => sum + call.cost, 0);
  }

  async getTenantSpend(tenant: string): Promise<number> {
    return this.calls
      .filter(call => call.tenant === tenant)
      .reduce((sum, call) => sum + call.cost, 0);
  }

  getStats() {
    const totalCalls = this.calls.length;
    const totalCost = this.calls.reduce((sum, call) => sum + call.cost, 0);
    const avgCost = totalCalls > 0 ? totalCost / totalCalls : 0;
    
    const providerStats = this.calls.reduce((stats, call) => {
      if (!stats[call.provider]) {
        stats[call.provider] = { calls: 0, cost: 0 };
      }
      stats[call.provider].calls++;
      stats[call.provider].cost += call.cost;
      return stats;
    }, {} as Record<string, { calls: number; cost: number }>);

    return {
      totalCalls,
      totalCost,
      avgCost,
      providerStats,
      dailySpend: this.getDailySpend(),
      monthlySpend: this.getMonthlySpend(),
    };
  }
}

/**
 * Healthcare-specific routing utilities
 */
export class HealthcareRouter extends ModelRouter {
  
  /**
   * Route healthcare-specific requests with enhanced safety
   */
  async callHealthcareAgent(
    agentType: "planner" | "coordinator" | "reviewer",
    request: {
      patientContext: any;
      medicalHistory?: any;
      urgency: "routine" | "urgent" | "emergency";
      topic: string;
      input: string;
    }
  ): Promise<ModelResponse> {
    const context: RouteContext = {
      topic: `${agentType}.${request.topic}`,
      risk: this.mapUrgencyToRisk(request.urgency),
      emergency: request.urgency === "emergency"
    };

    // Add healthcare-specific system prompts and safety checks
    const options = {
      systemPrompt: this.getHealthcareSystemPrompt(agentType),
      tools: this.getHealthcareTools(agentType),
      temperature: request.urgency === "emergency" ? 0.0 : 0.1 // Lower temperature for medical
    };

    return this.call(context, request.input, options);
  }

  private mapUrgencyToRisk(urgency: string): "low" | "medium" | "high" {
    switch (urgency) {
      case "routine": return "low";
      case "urgent": return "medium";
      case "emergency": return "high";
      default: return "medium";
    }
  }

  private getHealthcareSystemPrompt(agentType: string): string {
    // These would load from the prompts directory
    const prompts = {
      planner: "You are a healthcare safety planning assistant...",
      coordinator: "You are a care coordination assistant...",
      reviewer: "You are a healthcare safety reviewer..."
    };
    return prompts[agentType as keyof typeof prompts] || "";
  }

  private getHealthcareTools(agentType: string): string[] {
    const tools = {
      planner: ["safety_assessment", "medical_knowledge", "risk_analysis"],
      coordinator: ["appointment_service", "provider_network", "emergency_contacts"],
      reviewer: ["safety_policy_check", "medical_compliance", "accessibility_audit"]
    };
    return tools[agentType as keyof typeof tools] || [];
  }
}