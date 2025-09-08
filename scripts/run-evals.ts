#!/usr/bin/env tsx

import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from '../packages/shared/src/config-loader.js';
import { HealthcareRouter, ModelRouter } from '../packages/shared/src/model-router.js';
import { HealthcarePlannerAgent } from '../services/agents/healthcare-planner.js';
import { CareCoordinatorAgent } from '../services/agents/care-coordinator.js';
import { SafetyReviewerAgent } from '../services/agents/safety-reviewer.js';
import { ToolRegistry } from '../services/tools/tool-registry.js';

interface EvalResult {
  scenario: string;
  success: boolean;
  score: number;
  errors: string[];
  metrics: {
    latency: number;
    cost: number;
    compliance: boolean;
    safety: boolean;
  };
  output: any;
}

interface EvalSuite {
  name: string;
  passRate: number;
  results: EvalResult[];
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    averageScore: number;
    totalCost: number;
    avgLatency: number;
  };
}

class HealthcareEvaluator {
  private config: any;
  private router: HealthcareRouter;
  private plannerAgent: HealthcarePlannerAgent;
  private coordinatorAgent: CareCoordinatorAgent;
  private reviewerAgent: SafetyReviewerAgent;
  private toolRegistry: ToolRegistry;

  constructor() {
    this.config = loadConfig({ overlay: 'dev' });
    
    // Initialize mock adapters for evaluation
    const mockAdapters = {
      anthropic: this.createMockAdapter('anthropic'),
      openai: this.createMockAdapter('openai'),
      local: this.createMockAdapter('local')
    };

    this.router = new HealthcareRouter(this.config, mockAdapters);
    this.toolRegistry = new ToolRegistry();
    
    this.plannerAgent = new HealthcarePlannerAgent(this.config, this.router, this.toolRegistry);
    this.coordinatorAgent = new CareCoordinatorAgent(this.config, this.router, this.toolRegistry);
    this.reviewerAgent = new SafetyReviewerAgent(this.config, this.router, this.toolRegistry);
  }

  /**
   * Run healthcare evaluation suite
   */
  async runHealthcareEvals(suitePath: string): Promise<EvalSuite> {
    console.log(`🧪 Running healthcare evaluation suite: ${suitePath}`);
    
    const inputPath = path.join(suitePath, 'inputs.jsonl');
    const expectedPath = path.join(suitePath, 'expected.jsonl');
    
    if (!fs.existsSync(inputPath) || !fs.existsSync(expectedPath)) {
      throw new Error(`Evaluation files not found: ${inputPath} or ${expectedPath}`);
    }

    const inputs = this.readJsonLines(inputPath);
    const expected = this.readJsonLines(expectedPath);

    if (inputs.length !== expected.length) {
      throw new Error('Input and expected files must have same number of lines');
    }

    const results: EvalResult[] = [];
    let totalCost = 0;
    let totalLatency = 0;

    for (let i = 0; i < inputs.length; i++) {
      console.log(`📋 Running test ${i + 1}/${inputs.length}: ${inputs[i].scenario}`);
      
      const startTime = Date.now();
      
      try {
        const result = await this.runSingleEval(inputs[i], expected[i]);
        results.push(result);
        
        totalCost += result.metrics.cost;
        totalLatency += result.metrics.latency;
        
        console.log(`✅ Test ${i + 1} ${result.success ? 'PASSED' : 'FAILED'} (Score: ${result.score})`);
      } catch (error) {
        const failedResult: EvalResult = {
          scenario: inputs[i].scenario,
          success: false,
          score: 0,
          errors: [error.message],
          metrics: {
            latency: Date.now() - startTime,
            cost: 0,
            compliance: false,
            safety: false
          },
          output: null
        };
        
        results.push(failedResult);
        console.log(`❌ Test ${i + 1} FAILED: ${error.message}`);
      }
    }

    const passed = results.filter(r => r.success).length;
    const passRate = passed / results.length;
    const averageScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

    const suite: EvalSuite = {
      name: path.basename(suitePath),
      passRate: passRate,
      results,
      summary: {
        totalTests: results.length,
        passed,
        failed: results.length - passed,
        averageScore,
        totalCost,
        avgLatency: totalLatency / results.length
      }
    };

    // Check if suite meets minimum pass rate
    const requiredPassRate = this.config.evals?.suites?.find((s: any) => s.name === 'healthcare_safety_smoke')?.passRate || 0.9;
    
    console.log(`\n📊 Suite Summary:`);
    console.log(`Tests: ${suite.summary.totalTests}`);
    console.log(`Passed: ${suite.summary.passed}`);
    console.log(`Failed: ${suite.summary.failed}`);
    console.log(`Pass Rate: ${(passRate * 100).toFixed(1)}% (Required: ${(requiredPassRate * 100).toFixed(1)}%)`);
    console.log(`Average Score: ${averageScore.toFixed(1)}`);
    console.log(`Total Cost: $${totalCost.toFixed(4)}`);
    console.log(`Avg Latency: ${(totalLatency / results.length).toFixed(0)}ms`);

    if (passRate < requiredPassRate) {
      console.log(`❌ Suite FAILED - Pass rate ${(passRate * 100).toFixed(1)}% below required ${(requiredPassRate * 100).toFixed(1)}%`);
      process.exit(1);
    } else {
      console.log(`✅ Suite PASSED`);
    }

    return suite;
  }

  /**
   * Run single evaluation test
   */
  private async runSingleEval(input: any, expected: any): Promise<EvalResult> {
    const startTime = Date.now();
    let output: any;
    let cost = 0;

    try {
      // Route to appropriate agent based on scenario
      if (input.scenario.includes('fall_risk') || input.scenario.includes('medication') || input.assessmentData) {
        output = await this.plannerAgent.generateSafetyPlan({
          patientId: 'eval_patient',
          patientContext: input.patientContext,
          assessmentData: input.assessmentData || { roomAssessments: [], riskFactors: input.patientContext.riskFactors || [], previousIncidents: [] },
          urgency: input.urgency || 'routine'
        });
      } else if (input.careNeeds || input.scenario.includes('coordination')) {
        output = await this.coordinatorAgent.createCareCoordinationPlan({
          patientId: 'eval_patient',
          patientContext: input.patientContext,
          careNeeds: input.careNeeds || { immediate: [], ongoing: [], preventive: [] },
          constraints: input.constraints || { transportation: true, mobility: 'independent', technology: 'basic' },
          urgency: input.urgency || 'routine'
        });
      } else if (input.scenario.includes('accessibility')) {
        output = await this.reviewerAgent.conductSafetyReview({
          targetType: 'plan',
          targetData: { accessibility: input.environmentData },
          patientContext: input.patientContext,
          urgency: input.urgency || 'routine',
          scope: 'comprehensive'
        });
      }

      const latency = Date.now() - startTime;
      
      // Estimate cost based on latency (mock)
      cost = latency * 0.001; // $0.001 per second

      // Evaluate output against expected results
      const evaluation = this.evaluateOutput(output, expected, input.scenario);
      
      return {
        scenario: input.scenario,
        success: evaluation.success,
        score: evaluation.score,
        errors: evaluation.errors,
        metrics: {
          latency,
          cost,
          compliance: evaluation.compliance,
          safety: evaluation.safety
        },
        output
      };

    } catch (error) {
      return {
        scenario: input.scenario,
        success: false,
        score: 0,
        errors: [error.message],
        metrics: {
          latency: Date.now() - startTime,
          cost,
          compliance: false,
          safety: false
        },
        output: null
      };
    }
  }

  /**
   * Evaluate agent output against expected results
   */
  private evaluateOutput(output: any, expected: any, scenario: string): {
    success: boolean;
    score: number;
    errors: string[];
    compliance: boolean;
    safety: boolean;
  } {
    const errors: string[] = [];
    let score = 100;
    let compliance = true;
    let safety = true;

    // Check basic output structure
    if (!output) {
      errors.push('No output generated');
      return { success: false, score: 0, errors, compliance: false, safety: false };
    }

    // Healthcare planner evaluations
    if (output.recommendations) {
      // Check recommendation count
      if (expected.expected.recommendationsCount) {
        const count = output.recommendations.length;
        if (count < expected.expected.recommendationsCount.min || count > expected.expected.recommendationsCount.max) {
          errors.push(`Recommendation count ${count} outside expected range ${expected.expected.recommendationsCount.min}-${expected.expected.recommendationsCount.max}`);
          score -= 20;
        }
      }

      // Check must-include items
      if (expected.expected.mustInclude) {
        for (const mustInclude of expected.expected.mustInclude) {
          const found = output.recommendations.some((rec: any) => 
            rec.description.toLowerCase().includes(mustInclude.toLowerCase()) ||
            rec.category.toLowerCase().includes(mustInclude.toLowerCase())
          );
          
          if (!found) {
            errors.push(`Missing required recommendation: ${mustInclude}`);
            score -= 15;
          }
        }
      }

      // Check risk level alignment
      if (expected.expected.riskLevel && output.riskLevel) {
        if (output.riskLevel !== expected.expected.riskLevel) {
          errors.push(`Risk level mismatch: got ${output.riskLevel}, expected ${expected.expected.riskLevel}`);
          score -= 10;
        }
      }
    }

    // Care coordinator evaluations  
    if (output.providers || output.appointments) {
      // Check provider count
      if (expected.expected.coordination?.providers) {
        const providerCount = output.providers?.length || 0;
        if (providerCount < expected.expected.coordination.providers.min) {
          errors.push(`Insufficient providers: ${providerCount} < ${expected.expected.coordination.providers.min}`);
          score -= 15;
        }
      }

      // Check care team size
      if (expected.expected.careTeam?.min_members) {
        const teamSize = output.careTeam?.length || 0;
        if (teamSize < expected.expected.careTeam.min_members) {
          errors.push(`Care team too small: ${teamSize} < ${expected.expected.careTeam.min_members}`);
          score -= 10;
        }
      }
    }

    // Safety reviewer evaluations
    if (output.compliance || output.accessibility) {
      // Check compliance
      if (expected.expected.compliance) {
        for (const [key, required] of Object.entries(expected.expected.compliance)) {
          if (required && output.compliance && !output.compliance[key]?.compliant) {
            errors.push(`Compliance failure: ${key}`);
            compliance = false;
            score -= 20;
          }
        }
      }

      // Check accessibility score
      if (expected.expected.accessibility_score?.min && output.accessibility?.score) {
        if (output.accessibility.score < expected.expected.accessibility_score.min) {
          errors.push(`Accessibility score too low: ${output.accessibility.score} < ${expected.expected.accessibility_score.min}`);
          score -= 15;
        }
      }
    }

    // General safety checks
    if (output.riskLevel === 'critical' && !output.recommendations?.some((r: any) => r.priority === 'immediate')) {
      errors.push('Critical risk level but no immediate recommendations');
      safety = false;
      score -= 25;
    }

    // Timeline and urgency checks
    if (expected.expected.timeframe) {
      if (expected.expected.timeframe.immediate && !output.timeline?.some((t: any) => t.phase.includes('Immediate'))) {
        errors.push('Missing immediate timeframe for urgent scenario');
        score -= 10;
      }
    }

    const success = errors.length === 0 && score >= 70; // Minimum 70% score to pass

    return {
      success,
      score: Math.max(0, score),
      errors,
      compliance,
      safety
    };
  }

  /**
   * Create mock adapter for testing
   */
  private createMockAdapter(provider: string) {
    return async ({ model, input }: any) => {
      // Simulate realistic response based on healthcare context
      const healthcareResponse = this.generateMockHealthcareResponse(input, provider, model);
      
      return {
        output: healthcareResponse,
        usage: {
          inputTokens: Math.floor(input.length / 4),
          outputTokens: Math.floor(healthcareResponse.length / 4),
          totalTokens: Math.floor((input.length + healthcareResponse.length) / 4),
          cost: 0.01 // Mock cost
        },
        latency: Math.random() * 1000 + 500, // 500-1500ms
        model,
        provider
      };
    };
  }

  /**
   * Generate mock healthcare response
   */
  private generateMockHealthcareResponse(input: string, provider: string, model: string): string {
    // This would use actual LLM responses in production
    // For testing, generate structured mock responses
    
    if (input.includes('risk analysis')) {
      return JSON.stringify({
        overallRisk: 'high',
        riskFactors: [
          {
            factor: 'fall risk',
            severity: 'high',
            evidence: 'Advanced age and mobility limitations increase fall risk by 40%',
            mitigation: 'Install grab bars and improve lighting'
          }
        ],
        confidence: 0.92,
        clinicalRationale: 'Based on established geriatric assessment guidelines'
      });
    }

    if (input.includes('recommendations')) {
      return JSON.stringify({
        recommendations: [
          {
            id: 'rec_001',
            category: 'safety',
            priority: 'immediate',
            description: 'Install bathroom grab bars',
            rationale: 'Reduces fall risk in high-risk areas',
            cost: { estimated: 200, range: { min: 150, max: 250 }, currency: 'USD' },
            implementation: {
              steps: ['Purchase grab bars', 'Schedule installation', 'Test stability'],
              timeframe: '1 week',
              resources: ['Hardware store', 'Contractor'],
              stakeholders: ['Patient', 'Caregiver']
            },
            outcomes: {
              expected: ['Reduced fall risk'],
              measurable: ['Zero bathroom falls in 6 months'],
              timeline: '2-4 weeks'
            }
          },
          {
            id: 'rec_002', 
            category: 'environment',
            priority: 'urgent',
            description: 'Improve lighting in hallways',
            rationale: 'Poor lighting contributes to falls',
            cost: { estimated: 100, range: { min: 75, max: 150 }, currency: 'USD' },
            implementation: {
              steps: ['Replace bulbs', 'Add motion sensors'],
              timeframe: '3-5 days',
              resources: ['Electrician'],
              stakeholders: ['Patient']
            },
            outcomes: {
              expected: ['Better visibility'],
              measurable: ['Adequate lux levels (>50) measured'],
              timeline: '1 week'
            }
          }
        ]
      });
    }

    // Default mock response
    return JSON.stringify({
      analysis: 'Healthcare analysis completed',
      recommendations: ['Follow clinical guidelines', 'Monitor patient closely'],
      compliance: { hipaa: true, ada: true, healthcareSafety: true },
      confidence: 0.85
    });
  }

  /**
   * Read JSONL file
   */
  private readJsonLines(filePath: string): any[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.trim().split('\n').map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        console.error(`JSON parse error in ${filePath} at line ${index + 1}:`);
        console.error(`Line content: ${line}`);
        throw error;
      }
    });
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  const suite = args.find(arg => arg.startsWith('--suite='))?.split('=')[1] || 'healthcare';
  const budgetMaxCost = parseFloat(args.find(arg => arg.startsWith('--budget.maxCostUSD='))?.split('=')[1] || '0.50');
  const budgetMaxLatency = parseInt(args.find(arg => arg.startsWith('--budget.maxLatencyMs='))?.split('=')[1] || '10000');
  
  console.log(`🚀 Starting healthcare agent evaluation`);
  console.log(`Suite: ${suite}`);
  console.log(`Budget: $${budgetMaxCost}, ${budgetMaxLatency}ms max latency`);
  
  const evaluator = new HealthcareEvaluator();
  
  try {
    const suitePath = path.join('tests/evals', suite);
    const results = await evaluator.runHealthcareEvals(suitePath);
    
    // Check budget constraints
    if (results.summary.totalCost > budgetMaxCost) {
      console.log(`❌ Budget exceeded: $${results.summary.totalCost.toFixed(4)} > $${budgetMaxCost}`);
      process.exit(1);
    }
    
    if (results.summary.avgLatency > budgetMaxLatency) {
      console.log(`❌ Latency exceeded: ${results.summary.avgLatency.toFixed(0)}ms > ${budgetMaxLatency}ms`);
      process.exit(1);
    }
    
    // Save results
    const resultsPath = `eval-results-${suite}-${Date.now()}.json`;
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`📝 Results saved to: ${resultsPath}`);
    
  } catch (error) {
    console.error(`💥 Evaluation failed:`, error);
    process.exit(1);
  }
}

// Run if this is the main module (ES module compatible)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}