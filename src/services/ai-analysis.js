/**
 * Real AI Room Analysis Service using OpenAI Vision API
 * Replaces mock hazard detection with actual computer vision analysis
 */

import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';

class AIAnalysisService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not configured. Using fallback mock analysis.');
      this.mockMode = true;
    } else {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      this.mockMode = false;
    }
  }

  /**
   * Analyze room image for safety hazards using OpenAI Vision
   * @param {string} imagePath - Path to uploaded image file
   * @param {string} roomType - Type of room (bathroom, kitchen, bedroom, etc.)
   * @param {Object} userContext - User information for personalized analysis
   * @returns {Promise<Object>} Analysis results with hazards and recommendations
   */
  async analyzeRoomImage(imagePath, roomType, userContext = {}) {
    try {
      if (this.mockMode) {
        return this.getMockAnalysis(roomType);
      }

      // Read and encode image
      const imageBuffer = await fs.readFile(imagePath);
      const base64Image = imageBuffer.toString('base64');
      
      // Construct healthcare-specific prompt
      const prompt = this.buildAnalysisPrompt(roomType, userContext);

      // Call OpenAI Vision API
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini", // Use gpt-4o-mini for cost efficiency
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: "high" // High detail for better hazard detection
                }
              }
            ]
          }
        ],
        max_tokens: 1500,
        temperature: 0.1 // Low temperature for consistent, factual analysis
      });

      // Parse AI response into structured data
      const analysisText = response.choices[0].message.content;
      const structuredAnalysis = this.parseAIResponse(analysisText, roomType);

      // Calculate overall risk score
      const riskScore = this.calculateRiskScore(structuredAnalysis.hazards);

      return {
        success: true,
        analysis_id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        room_type: roomType,
        image_analyzed: true,
        ai_model: "gpt-4o-mini",
        hazards: structuredAnalysis.hazards,
        recommendations: structuredAnalysis.recommendations,
        risk_score: riskScore,
        confidence_level: structuredAnalysis.confidence || 0.85,
        analysis_timestamp: new Date().toISOString(),
        processed_by: 'openai_vision',
        user_context: userContext
      };

    } catch (error) {
      console.error('AI Analysis Error:', error);
      
      // Fallback to mock analysis if AI fails
      if (error.code === 'insufficient_quota' || error.status === 429) {
        console.warn('OpenAI quota exceeded, falling back to mock analysis');
        return this.getMockAnalysis(roomType, { 
          error: 'API quota exceeded',
          fallback: true 
        });
      }

      // Return error analysis for other failures
      return {
        success: false,
        error: 'Analysis failed',
        error_details: error.message,
        analysis_id: `error_${Date.now()}`,
        room_type: roomType,
        fallback_analysis: this.getMockAnalysis(roomType, { 
          error: error.message,
          fallback: true 
        })
      };
    }
  }

  /**
   * Build healthcare-specific analysis prompt
   */
  buildAnalysisPrompt(roomType, userContext) {
    const basePrompt = `You are an expert occupational therapist and home safety specialist. Analyze this ${roomType} image for fall hazards and safety concerns for an aging adult.

User Context: ${JSON.stringify(userContext)}

Please identify:

1. FALL HAZARDS (High Priority):
   - Slippery surfaces, wet areas
   - Loose rugs, uneven flooring  
   - Poor lighting, shadows
   - Clutter, obstacles in walkways
   - Missing grab bars, railings
   - Unstable furniture

2. ACCESSIBILITY ISSUES:
   - Steps, thresholds that could cause tripping
   - Reach zones (items too high/low)
   - Inadequate seating/support
   - Door width restrictions

3. ROOM-SPECIFIC HAZARDS for ${roomType}:`;

    const roomSpecific = {
      bathroom: `
   - Bathtub/shower safety (grab bars, non-slip surfaces)
   - Toilet height and support
   - Water pooling areas
   - Mirror/lighting adequacy
   - Medication storage safety`,
      
      kitchen: `
   - Stove/oven safety and accessibility
   - Counter height and workspace
   - Cabinet/appliance reach zones
   - Slip hazards near sink
   - Sharp corner hazards`,
      
      bedroom: `
   - Bed height and accessibility
   - Nightstand placement
   - Pathway to bathroom (night safety)
   - Closet/storage accessibility
   - Lighting switches location`,
      
      living_room: `
   - Furniture arrangement and stability
   - Remote control accessibility
   - Cord management
   - Seating support and height
   - Pathway clearance`
    };

    return basePrompt + (roomSpecific[roomType] || roomSpecific.living_room) + `

RESPONSE FORMAT (JSON-like structure):
{
  "hazards": [
    {
      "type": "hazard_category",
      "description": "specific hazard found",
      "location": "where in image",
      "severity": "low|moderate|high|critical", 
      "confidence": 0.0-1.0,
      "fall_risk": true/false
    }
  ],
  "recommendations": [
    {
      "hazard_addressed": "hazard type",
      "action": "specific recommendation",
      "priority": "immediate|short_term|long_term",
      "estimated_cost": "$ range",
      "diy_possible": true/false
    }
  ],
  "overall_safety_rating": "poor|fair|good|excellent",
  "confidence": 0.0-1.0
}

Be specific, practical, and focus on evidence-based fall prevention strategies.`;
  }

  /**
   * Parse AI response text into structured data
   */
  parseAIResponse(analysisText, roomType) {
    try {
      // Try to extract JSON from AI response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          hazards: parsed.hazards || [],
          recommendations: parsed.recommendations || [],
          confidence: parsed.confidence || 0.85,
          overall_rating: parsed.overall_safety_rating
        };
      }
    } catch (parseError) {
      console.warn('Failed to parse JSON from AI response, using text analysis');
    }

    // Fallback: Parse text-based response
    return this.parseTextResponse(analysisText, roomType);
  }

  /**
   * Parse text-based AI response (fallback)
   */
  parseTextResponse(text, roomType) {
    const hazards = [];
    const recommendations = [];

    // Extract hazards using pattern matching
    const hazardPatterns = [
      /slippery|wet|slip hazard/i,
      /poor lighting|dark|inadequate light/i,
      /clutter|obstruct|block/i,
      /loose rug|unsecured/i,
      /no grab bar|missing rail/i,
      /uneven|trip hazard/i
    ];

    const hazardTypes = [
      'slippery_surface',
      'poor_lighting', 
      'clutter_obstruction',
      'loose_flooring',
      'missing_safety_equipment',
      'uneven_surface'
    ];

    hazardPatterns.forEach((pattern, index) => {
      if (pattern.test(text)) {
        hazards.push({
          type: hazardTypes[index],
          description: `Potential ${hazardTypes[index].replace('_', ' ')} detected`,
          location: `${roomType} area`,
          severity: index < 2 ? 'high' : 'moderate',
          confidence: 0.75,
          fall_risk: true
        });
      }
    });

    // Generate basic recommendations
    hazards.forEach(hazard => {
      const recMap = {
        slippery_surface: 'Install non-slip mats or strips',
        poor_lighting: 'Add brighter lighting or motion sensors',
        clutter_obstruction: 'Clear walkways and organize storage',
        loose_flooring: 'Secure loose rugs or repair flooring',
        missing_safety_equipment: 'Install grab bars and safety rails',
        uneven_surface: 'Repair or mark uneven surfaces'
      };

      if (recMap[hazard.type]) {
        recommendations.push({
          hazard_addressed: hazard.type,
          action: recMap[hazard.type],
          priority: hazard.severity === 'high' ? 'immediate' : 'short_term',
          estimated_cost: '$50-200',
          diy_possible: true
        });
      }
    });

    return {
      hazards: hazards.length > 0 ? hazards : this.getDefaultHazards(roomType),
      recommendations: recommendations.length > 0 ? recommendations : this.getDefaultRecommendations(roomType),
      confidence: 0.70
    };
  }

  /**
   * Calculate overall risk score from hazards
   */
  calculateRiskScore(hazards) {
    if (!hazards || hazards.length === 0) return 85; // Default safe score

    let totalRisk = 0;
    let weightedHazards = 0;

    hazards.forEach(hazard => {
      const severityWeight = {
        critical: 100,
        high: 25,
        moderate: 10,
        low: 5
      };

      const weight = severityWeight[hazard.severity] || 10;
      const confidence = hazard.confidence || 0.8;
      
      totalRisk += weight * confidence;
      weightedHazards += 1;
    });

    // Score out of 100 (lower is better, 100 is safest)
    const rawScore = Math.max(0, 100 - (totalRisk / Math.max(weightedHazards, 1)));
    return Math.round(rawScore);
  }

  /**
   * Get mock analysis for fallback scenarios
   */
  getMockAnalysis(roomType, metadata = {}) {
    const mockHazards = this.getDefaultHazards(roomType);
    const mockRecommendations = this.getDefaultRecommendations(roomType);
    
    return {
      success: true,
      analysis_id: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      room_type: roomType,
      image_analyzed: false,
      ai_model: "fallback_mock",
      hazards: mockHazards,
      recommendations: mockRecommendations,
      risk_score: this.calculateRiskScore(mockHazards),
      confidence_level: 0.60,
      analysis_timestamp: new Date().toISOString(),
      processed_by: 'mock_analysis',
      is_fallback: true,
      metadata
    };
  }

  /**
   * Default hazards by room type (for fallback)
   */
  getDefaultHazards(roomType) {
    const hazardsByRoom = {
      bathroom: [
        {
          type: 'missing_grab_bars',
          description: 'No grab bars detected near toilet or shower area',
          location: 'bathroom walls',
          severity: 'high',
          confidence: 0.80,
          fall_risk: true
        },
        {
          type: 'slippery_surface',
          description: 'Potentially slippery floor surface when wet',
          location: 'bathroom floor',
          severity: 'moderate',
          confidence: 0.75,
          fall_risk: true
        }
      ],
      kitchen: [
        {
          type: 'reach_zone_hazard',
          description: 'Items stored in hard-to-reach locations',
          location: 'upper cabinets',
          severity: 'moderate',
          confidence: 0.70,
          fall_risk: true
        }
      ],
      bedroom: [
        {
          type: 'poor_lighting',
          description: 'Insufficient lighting for nighttime navigation',
          location: 'pathway to bathroom',
          severity: 'high',
          confidence: 0.85,
          fall_risk: true
        }
      ]
    };

    return hazardsByRoom[roomType] || hazardsByRoom.bathroom;
  }

  /**
   * Default recommendations by room type
   */
  getDefaultRecommendations(roomType) {
    const recommendationsByRoom = {
      bathroom: [
        {
          hazard_addressed: 'missing_grab_bars',
          action: 'Install ADA-compliant grab bars near toilet and in shower',
          priority: 'immediate',
          estimated_cost: '$75-150',
          diy_possible: false
        }
      ],
      kitchen: [
        {
          hazard_addressed: 'reach_zone_hazard',
          action: 'Reorganize frequently used items to lower, accessible shelves',
          priority: 'short_term',
          estimated_cost: '$0-50',
          diy_possible: true
        }
      ],
      bedroom: [
        {
          hazard_addressed: 'poor_lighting',
          action: 'Install motion-activated night lights along pathway',
          priority: 'immediate',
          estimated_cost: '$25-75',
          diy_possible: true
        }
      ]
    };

    return recommendationsByRoom[roomType] || recommendationsByRoom.bathroom;
  }

  /**
   * Health check for AI service
   */
  async healthCheck() {
    return {
      service: 'AI Analysis Service',
      status: this.mockMode ? 'mock_mode' : 'ai_enabled',
      openai_configured: !this.mockMode,
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
const aiAnalysisService = new AIAnalysisService();
export default aiAnalysisService;