// AI-Powered Marketplace Module for Therapists and Providers
// Designed for integration with Anything AI platform

import { Database } from 'better-sqlite3';
import { OpenAI } from 'openai';

class MarketplaceModule {
  constructor(dbPath, aiConfig) {
    this.db = new Database(dbPath);
    this.ai = aiConfig?.apiKey ? new OpenAI({ apiKey: aiConfig.apiKey }) : null;
    this.initializeSchema();
  }

  initializeSchema() {
    // Provider marketplace tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS marketplace_providers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        specialty TEXT NOT NULL,
        sub_specialties TEXT,
        years_experience INTEGER,
        rating REAL DEFAULT 0,
        total_ratings INTEGER DEFAULT 0,
        verified BOOLEAN DEFAULT FALSE,
        ai_match_score REAL,
        profile_completeness INTEGER,
        languages TEXT,
        insurance_accepted TEXT,
        virtual_available BOOLEAN DEFAULT TRUE,
        in_person_available BOOLEAN DEFAULT TRUE,
        availability_schedule TEXT,
        pricing_tier TEXT,
        bio TEXT,
        credentials TEXT,
        featured BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS marketplace_services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider_id INTEGER REFERENCES marketplace_providers(id),
        service_name TEXT NOT NULL,
        service_type TEXT,
        description TEXT,
        duration_minutes INTEGER,
        price DECIMAL(10,2),
        discount_percentage INTEGER DEFAULT 0,
        ai_tags TEXT,
        popular BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS marketplace_reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider_id INTEGER REFERENCES marketplace_providers(id),
        patient_id INTEGER REFERENCES users(id),
        rating INTEGER CHECK(rating >= 1 AND rating <= 5),
        review_text TEXT,
        ai_sentiment_score REAL,
        verified_booking BOOLEAN DEFAULT FALSE,
        helpful_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ai_matching_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        preferred_specialties TEXT,
        preferred_languages TEXT,
        preferred_gender TEXT,
        age_range_preference TEXT,
        insurance_requirements TEXT,
        budget_range TEXT,
        preferred_modality TEXT,
        ai_personality_match TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS provider_ai_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider_id INTEGER REFERENCES marketplace_providers(id),
        therapeutic_approach TEXT,
        personality_traits TEXT,
        communication_style TEXT,
        specialization_keywords TEXT,
        success_metrics TEXT,
        ai_generated_summary TEXT,
        embedding_vector TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  // AI-Powered Provider Matching
  async findBestProviders(userId, requirements) {
    const userPrefs = this.getUserPreferences(userId);
    const providers = this.getAllActiveProviders();
    
    if (this.ai) {
      // Use AI to analyze and match providers
      const matches = await this.aiMatchProviders(userPrefs, providers, requirements);
      return matches;
    }
    
    // Fallback to rule-based matching
    return this.ruleBasedMatching(userPrefs, providers, requirements);
  }

  async aiMatchProviders(userPrefs, providers, requirements) {
    try {
      const prompt = `
        Match the following patient needs with available providers:
        
        Patient Preferences:
        ${JSON.stringify(userPrefs, null, 2)}
        
        Specific Requirements:
        ${JSON.stringify(requirements, null, 2)}
        
        Available Providers:
        ${JSON.stringify(providers.map(p => ({
          id: p.id,
          specialty: p.specialty,
          experience: p.years_experience,
          rating: p.rating,
          languages: p.languages,
          modalities: { virtual: p.virtual_available, inPerson: p.in_person_available }
        })), null, 2)}
        
        Return the top 5 matches with scores (0-100) and reasoning.
      `;

      const response = await this.ai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('AI matching failed:', error);
      return this.ruleBasedMatching(userPrefs, providers, requirements);
    }
  }

  ruleBasedMatching(userPrefs, providers, requirements) {
    return providers
      .map(provider => {
        let score = 0;
        
        // Specialty match
        if (requirements.specialty === provider.specialty) score += 30;
        
        // Rating weight
        score += provider.rating * 10;
        
        // Experience weight
        score += Math.min(provider.years_experience * 2, 20);
        
        // Language match
        if (userPrefs?.preferred_languages && provider.languages?.includes(userPrefs.preferred_languages)) {
          score += 15;
        }
        
        // Modality preference
        if (requirements.virtual && provider.virtual_available) score += 10;
        if (requirements.inPerson && provider.in_person_available) score += 10;
        
        return { ...provider, matchScore: score };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10);
  }

  // Provider Management
  createProviderProfile(userId, profileData) {
    const stmt = this.db.prepare(`
      INSERT INTO marketplace_providers (
        user_id, specialty, sub_specialties, years_experience,
        languages, insurance_accepted, virtual_available, 
        in_person_available, availability_schedule, pricing_tier,
        bio, credentials
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    return stmt.run(
      userId,
      profileData.specialty,
      JSON.stringify(profileData.subSpecialties || []),
      profileData.yearsExperience,
      JSON.stringify(profileData.languages || ['English']),
      JSON.stringify(profileData.insuranceAccepted || []),
      profileData.virtualAvailable !== false,
      profileData.inPersonAvailable !== false,
      JSON.stringify(profileData.availabilitySchedule || {}),
      profileData.pricingTier || 'standard',
      profileData.bio,
      JSON.stringify(profileData.credentials || [])
    );
  }

  addProviderService(providerId, serviceData) {
    const stmt = this.db.prepare(`
      INSERT INTO marketplace_services (
        provider_id, service_name, service_type, description,
        duration_minutes, price, discount_percentage, ai_tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    return stmt.run(
      providerId,
      serviceData.name,
      serviceData.type,
      serviceData.description,
      serviceData.duration,
      serviceData.price,
      serviceData.discount || 0,
      JSON.stringify(serviceData.tags || [])
    );
  }

  // Search and Discovery
  searchProviders(searchCriteria) {
    let query = `
      SELECT mp.*, u.name, u.email,
        COUNT(DISTINCT mr.id) as review_count,
        AVG(mr.rating) as avg_rating
      FROM marketplace_providers mp
      JOIN users u ON mp.user_id = u.id
      LEFT JOIN marketplace_reviews mr ON mp.id = mr.provider_id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (searchCriteria.specialty) {
      query += ` AND mp.specialty = ?`;
      params.push(searchCriteria.specialty);
    }
    
    if (searchCriteria.minRating) {
      query += ` AND mp.rating >= ?`;
      params.push(searchCriteria.minRating);
    }
    
    if (searchCriteria.virtual) {
      query += ` AND mp.virtual_available = 1`;
    }
    
    if (searchCriteria.verified) {
      query += ` AND mp.verified = 1`;
    }
    
    query += ` GROUP BY mp.id ORDER BY mp.rating DESC, review_count DESC`;
    
    return this.db.prepare(query).all(...params);
  }

  // User Preference Management
  getUserPreferences(userId) {
    return this.db.prepare(`
      SELECT * FROM ai_matching_preferences WHERE user_id = ?
    `).get(userId);
  }

  updateUserPreferences(userId, preferences) {
    const stmt = this.db.prepare(`
      INSERT INTO ai_matching_preferences (
        user_id, preferred_specialties, preferred_languages,
        preferred_gender, age_range_preference, insurance_requirements,
        budget_range, preferred_modality, ai_personality_match
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        preferred_specialties = excluded.preferred_specialties,
        preferred_languages = excluded.preferred_languages,
        preferred_gender = excluded.preferred_gender,
        age_range_preference = excluded.age_range_preference,
        insurance_requirements = excluded.insurance_requirements,
        budget_range = excluded.budget_range,
        preferred_modality = excluded.preferred_modality,
        ai_personality_match = excluded.ai_personality_match,
        updated_at = CURRENT_TIMESTAMP
    `);
    
    return stmt.run(
      userId,
      JSON.stringify(preferences.specialties || []),
      JSON.stringify(preferences.languages || []),
      preferences.gender,
      preferences.ageRange,
      JSON.stringify(preferences.insurance || []),
      preferences.budgetRange,
      preferences.modality,
      JSON.stringify(preferences.personalityMatch || {})
    );
  }

  // Review System
  addReview(providerId, patientId, reviewData) {
    const stmt = this.db.prepare(`
      INSERT INTO marketplace_reviews (
        provider_id, patient_id, rating, review_text,
        ai_sentiment_score, verified_booking
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const sentimentScore = this.ai ? 
      this.analyzeSentiment(reviewData.text) : 0;
    
    const result = stmt.run(
      providerId,
      patientId,
      reviewData.rating,
      reviewData.text,
      sentimentScore,
      reviewData.verifiedBooking || false
    );
    
    // Update provider rating
    this.updateProviderRating(providerId);
    
    return result;
  }

  updateProviderRating(providerId) {
    const reviews = this.db.prepare(`
      SELECT AVG(rating) as avg_rating, COUNT(*) as total
      FROM marketplace_reviews
      WHERE provider_id = ?
    `).get(providerId);
    
    this.db.prepare(`
      UPDATE marketplace_providers
      SET rating = ?, total_ratings = ?
      WHERE id = ?
    `).run(reviews.avg_rating || 0, reviews.total || 0, providerId);
  }

  async analyzeSentiment(text) {
    if (!this.ai) return 0;
    
    try {
      const response = await this.ai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{
          role: "user",
          content: `Analyze the sentiment of this review on a scale of -1 to 1: "${text}"`
        }],
        temperature: 0.3,
      });
      
      return parseFloat(response.choices[0].message.content) || 0;
    } catch (error) {
      console.error('Sentiment analysis failed:', error);
      return 0;
    }
  }

  // Helper methods
  getAllActiveProviders() {
    return this.db.prepare(`
      SELECT * FROM marketplace_providers
      WHERE verified = 1
      ORDER BY rating DESC, total_ratings DESC
    `).all();
  }

  getProviderById(providerId) {
    return this.db.prepare(`
      SELECT mp.*, u.name, u.email
      FROM marketplace_providers mp
      JOIN users u ON mp.user_id = u.id
      WHERE mp.id = ?
    `).get(providerId);
  }

  getProviderServices(providerId) {
    return this.db.prepare(`
      SELECT * FROM marketplace_services
      WHERE provider_id = ?
      ORDER BY popular DESC, price ASC
    `).all(providerId);
  }

  getProviderReviews(providerId, limit = 10) {
    return this.db.prepare(`
      SELECT mr.*, u.name as patient_name
      FROM marketplace_reviews mr
      JOIN users u ON mr.patient_id = u.id
      WHERE mr.provider_id = ?
      ORDER BY mr.created_at DESC
      LIMIT ?
    `).all(providerId, limit);
  }
}

export default MarketplaceModule;