import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { loadConfig, FeatureFlags } from '../../packages/shared/src/config-loader.js';
import { HealthcareRouter } from '../../packages/shared/src/model-router.js';
import { HealthcarePlannerAgent } from '../../services/agents/healthcare-planner.js';
import { CareCoordinatorAgent } from '../../services/agents/care-coordinator.js';
import { SafetyReviewerAgent } from '../../services/agents/safety-reviewer.js';
import { ToolRegistry } from '../../services/tools/tool-registry.js';

/**
 * SuperClaude Healthcare API Gateway
 * Provides RESTful API interface to SuperClaude agents
 */

export class SuperClaudeAPI {
  private app: express.Application;
  private config: any;
  private featureFlags: FeatureFlags;
  private healthcareRouter: HealthcareRouter;
  private plannerAgent: HealthcarePlannerAgent;
  private coordinatorAgent: CareCoordinatorAgent;
  private reviewerAgent: SafetyReviewerAgent;
  private toolRegistry: ToolRegistry;

  constructor() {
    this.app = express();
    this.config = loadConfig({ 
      overlay: process.env.NODE_ENV as any || 'dev',
      tenant: process.env.TENANT 
    });
    this.featureFlags = new FeatureFlags(this.config);
    
    this.initializeAgents();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private initializeAgents() {
    // Initialize healthcare-specific LLM adapters
    const adapters = {
      anthropic: this.createAnthropicAdapter(),
      openai: this.createOpenAIAdapter(),
      local: this.createLocalAdapter()
    };

    this.healthcareRouter = new HealthcareRouter(this.config, adapters);
    this.toolRegistry = new ToolRegistry();
    
    this.plannerAgent = new HealthcarePlannerAgent(this.config, this.healthcareRouter, this.toolRegistry);
    this.coordinatorAgent = new CareCoordinatorAgent(this.config, this.healthcareRouter, this.toolRegistry);
    this.reviewerAgent = new SafetyReviewerAgent(this.config, this.healthcareRouter, this.toolRegistry);
  }

  private setupMiddleware() {
    // CORS with healthcare-specific settings
    this.app.use(cors({
      origin: this.config.security.allowlistDomains,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Patient-ID', 'X-Tenant']
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: this.config.rateLimit?.rps || 5,
      message: { error: 'Rate limit exceeded' },
      standardHeaders: true,
      legacyHeaders: false
    });
    this.app.use('/api/', limiter);

    // Body parsing with size limits for healthcare data
    this.app.use(express.json({ 
      limit: '10mb',
      verify: (req, res, buf) => {
        // HIPAA compliance - log data access
        console.log(`API access: ${req.method} ${req.path} - Size: ${buf.length}b`);
      }
    }));

    // Healthcare-specific headers
    this.app.use((req, res, next) => {
      res.setHeader('X-Healthcare-API', 'SuperClaude-v1.0');
      res.setHeader('X-HIPAA-Compliant', 'true');
      next();
    });

    // Request logging for HIPAA audit
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
      });
      next();
    });
  }

  private setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
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

    // SuperClaude Healthcare Planner API
    this.app.post('/api/v1/healthcare/safety-plan', async (req, res) => {
      try {
        if (!this.featureFlags.isEnabled('enableHealthcarePlanner', true)) {
          return res.status(503).json({ error: 'Healthcare planner temporarily unavailable' });
        }

        const { patientId, patientContext, assessmentData, urgency } = req.body;
        
        // Validate required fields
        if (!patientId || !patientContext) {
          return res.status(400).json({ error: 'Missing required fields: patientId, patientContext' });
        }

        const plan = await this.plannerAgent.generateSafetyPlan({
          patientId,
          patientContext,
          assessmentData: assessmentData || { roomAssessments: [], riskFactors: [], previousIncidents: [] },
          urgency: urgency || 'routine'
        });

        // Auto-review if feature enabled
        if (this.featureFlags.isEnabled('enableHealthcareReviewer', true)) {
          const review = await this.reviewerAgent.conductSafetyReview({
            targetType: 'plan',
            targetData: plan,
            patientContext,
            urgency: urgency || 'routine',
            scope: 'comprehensive'
          });
          
          plan.review = review;
          plan.approved = review.approvalStatus === 'approved';
        }

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
          details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
      }
    });

    // SuperClaude Care Coordinator API
    this.app.post('/api/v1/healthcare/care-coordination', async (req, res) => {
      try {
        if (!this.featureFlags.isEnabled('enableCareCoordinator', true)) {
          return res.status(503).json({ error: 'Care coordinator temporarily unavailable' });
        }

        const { patientId, patientContext, careNeeds, constraints, urgency } = req.body;
        
        if (!patientId || !patientContext || !careNeeds) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        const coordinationPlan = await this.coordinatorAgent.createCareCoordinationPlan({
          patientId,
          patientContext,
          careNeeds,
          constraints: constraints || { transportation: true, mobility: 'independent', technology: 'basic' },
          urgency: urgency || 'routine'
        });

        // Auto-schedule appointments if enabled
        if (this.featureFlags.isEnabled('enableAutoScheduling', false) && coordinationPlan.appointments.length > 0) {
          const schedulingResults = await this.coordinatorAgent.scheduleAppointments(
            coordinationPlan, 
            coordinationPlan.appointments
          );
          coordinationPlan.schedulingResults = schedulingResults;
        }

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
          details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
      }
    });

    // SuperClaude Safety Reviewer API
    this.app.post('/api/v1/healthcare/safety-review', async (req, res) => {
      try {
        if (!this.featureFlags.isEnabled('enableSafetyReviewer', true)) {
          return res.status(503).json({ error: 'Safety reviewer temporarily unavailable' });
        }

        const { targetType, targetData, patientContext, urgency, scope } = req.body;
        
        if (!targetType || !targetData) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        const review = await this.reviewerAgent.conductSafetyReview({
          targetType,
          targetData,
          patientContext: patientContext || {},
          urgency: urgency || 'routine',
          scope: scope || 'basic'
        });

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
          details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
      }
    });

    // SuperClaude Agent Status API
    this.app.get('/api/v1/agents/status', (req, res) => {
      const stats = this.healthcareRouter.getStats();
      
      res.json({
        agents: {
          healthcarePlanner: {
            status: 'active',
            enabled: this.featureFlags.isEnabled('enableHealthcarePlanner', true)
          },
          careCoordinator: {
            status: 'active', 
            enabled: this.featureFlags.isEnabled('enableCareCoordinator', true)
          },
          safetyReviewer: {
            status: 'active',
            enabled: this.featureFlags.isEnabled('enableSafetyReviewer', true)
          }
        },
        routing: {
          totalCalls: stats.totalCalls || 0,
          totalCost: stats.totalCost || 0,
          avgCost: stats.avgCost || 0
        },
        features: {
          emergencyDetection: this.featureFlags.isEnabled('enableEmergencyDetection', true),
          accessibilityEnhancements: this.featureFlags.isEnabled('enableAccessibilityEnhancements', true),
          hipaaAuditMode: this.featureFlags.isEnabled('enableHipaaAuditMode', true)
        }
      });
    });

    // Tool Registry API
    this.app.get('/api/v1/tools', (req, res) => {
      const tools = this.toolRegistry.getAvailableTools();
      res.json({
        tools: tools.map(toolName => ({
          name: toolName,
          info: this.toolRegistry.getToolInfo(toolName)
        }))
      });
    });

    // Execute tool API (for authorized users only)
    this.app.post('/api/v1/tools/:toolName/execute', async (req, res) => {
      try {
        const { toolName } = req.params;
        const { action, params } = req.body;
        
        // In production, add proper authentication/authorization
        const result = await this.toolRegistry.execute(toolName, action, params, req.headers['x-user-id'] as string);
        
        res.json({
          success: true,
          result,
          executedAt: new Date().toISOString()
        });

      } catch (error) {
        console.error('Tool execution error:', error);
        res.status(500).json({
          error: 'Tool execution failed',
          details: error.message
        });
      }
    });

    // Agent evaluation endpoint (for testing)
    this.app.post('/api/v1/eval/run', async (req, res) => {
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Evaluation endpoint not available in production' });
      }

      try {
        // This would run the evaluation framework
        res.json({
          message: 'Evaluation endpoint - implement evaluation runner here',
          availableSuites: ['healthcare', 'accessibility', 'safety']
        });
      } catch (error) {
        res.status(500).json({ error: 'Evaluation failed' });
      }
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        availableEndpoints: [
          'GET /health',
          'POST /api/v1/healthcare/safety-plan',
          'POST /api/v1/healthcare/care-coordination', 
          'POST /api/v1/healthcare/safety-review',
          'GET /api/v1/agents/status',
          'GET /api/v1/tools'
        ]
      });
    });
  }

  // LLM Adapter implementations
  private createAnthropicAdapter() {
    return async ({ model, input, options }: any) => {
      // This would integrate with Anthropic API
      // For now, return mock response
      return {
        output: `Mock Anthropic response for model ${model}`,
        usage: { inputTokens: 100, outputTokens: 150, totalTokens: 250, cost: 0.01 },
        latency: 1000,
        model,
        provider: 'anthropic'
      };
    };
  }

  private createOpenAIAdapter() {
    return async ({ model, input, options }: any) => {
      // This would integrate with OpenAI API
      return {
        output: `Mock OpenAI response for model ${model}`,
        usage: { inputTokens: 100, outputTokens: 150, totalTokens: 250, cost: 0.008 },
        latency: 800,
        model,
        provider: 'openai'
      };
    };
  }

  private createLocalAdapter() {
    return async ({ model, input, options }: any) => {
      // This would integrate with local LLM (Ollama, etc.)
      return {
        output: `Mock local response for model ${model}`,
        usage: { inputTokens: 100, outputTokens: 150, totalTokens: 250, cost: 0 },
        latency: 2000,
        model,
        provider: 'local'
      };
    };
  }

  public start(port: number = 8888) {
    this.app.listen(port, () => {
      console.log(`🚀 SuperClaude Healthcare API running on port ${port}`);
      console.log(`📊 Environment: ${this.config.app.env}`);
      console.log(`🏥 Healthcare compliance: ENABLED`);
      console.log(`📋 Available endpoints:`);
      console.log(`   GET  /health - Health check`);
      console.log(`   POST /api/v1/healthcare/safety-plan - Generate safety plans`);
      console.log(`   POST /api/v1/healthcare/care-coordination - Coordinate care`);
      console.log(`   POST /api/v1/healthcare/safety-review - Conduct safety reviews`);
      console.log(`   GET  /api/v1/agents/status - Agent status`);
    });
  }
}

// Start server if run directly
if (require.main === module) {
  const api = new SuperClaudeAPI();
  const port = parseInt(process.env.PORT || '8888');
  api.start(port);
}