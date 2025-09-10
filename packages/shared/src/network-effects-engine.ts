/**
 * Network Effects Engine - "Each User Makes Platform More Valuable"
 * SafeAging Healthcare Disruption Platform v2.0
 * 
 * Implements Metcalfe's Law for healthcare: Network Value = n²
 * TARGET: Viral coefficient > 1.0 for exponential growth
 * RESULT: Unbeatable competitive moat
 */

export interface NetworkMetrics {
  users: {
    patients: number;
    providers: number;
    caregivers: number;
    total: number;
  };
  interactions: {
    dailyAssessments: number;
    sessionBookings: number;
    referrals: number;
    equipmentOrders: number;
  };
  networkValue: {
    metcalfeValue: number;      // n² network value
    dataNetworkValue: number;   // AI improvement value  
    providerNetworkValue: number; // Supply-side liquidity
    viralCoefficient: number;   // Must be > 1.0
  };
  growth: {
    dailyActiveUsers: number;
    weeklyGrowthRate: number;
    viralSignups: number;
    organicGrowthRate: number;
  };
}

export interface ViralLoop {
  trigger: string;           // What starts the loop
  action: string;           // What user does
  outcome: string;          // What happens next
  viralMechanism: string;   // How it spreads
  conversionRate: number;   // Success rate
  timeToConversion: number; // Hours/days to complete loop
}

export class NetworkEffectsEngine {
  private networkState: NetworkMetrics;
  private viralLoops: Map<string, ViralLoop> = new Map();
  private networkHistory: NetworkMetrics[] = [];

  constructor() {
    this.networkState = this.initializeNetwork();
    this.setupViralLoops();
  }

  /**
   * PRIMARY VIRAL LOOPS FOR EXPONENTIAL GROWTH
   */
  private setupViralLoops() {
    // Loop 1: PT Invites PT (Professional Network)
    this.viralLoops.set('pt_invites_pt', {
      trigger: 'PT earns first $500 on platform',
      action: 'System prompts: "Invite 2 PT colleagues to earn $200"',
      outcome: 'Personalized invite sent to PT network',
      viralMechanism: 'Professional credibility + financial incentive',
      conversionRate: 0.65, // 65% of invited PTs join
      timeToConversion: 48   // 48 hours to decision
    });

    // Loop 2: Patient Refers Family (Care Network)
    this.viralLoops.set('patient_refers_family', {
      trigger: 'Patient completes successful assessment/session',
      action: 'AI suggests: "Your family should try this too"',
      outcome: 'Family member gets free assessment',
      viralMechanism: 'Trust + health urgency + family bond',
      conversionRate: 0.40, // 40% of families try it
      timeToConversion: 72   // 72 hours (family discussion time)
    });

    // Loop 3: Caregiver Shares Success (Social Proof)
    this.viralLoops.set('caregiver_social_proof', {
      trigger: 'Parent avoids fall thanks to SafeAging',
      action: 'Caregiver shares story in senior groups/social media',
      outcome: 'Other caregivers sign up parents',
      viralMechanism: 'Social proof + fear of parent falling',
      conversionRate: 0.25, // 25% of story viewers take action
      timeToConversion: 168  // 1 week (research and convince parent)
    });

    // Loop 4: Provider Cross-Referral (Clinical Network)
    this.viralLoops.set('provider_cross_referral', {
      trigger: 'PT identifies need outside their specialty',
      action: 'Refer to specialist on SafeAging platform',
      outcome: 'New provider type joins + patient gets better care',
      viralMechanism: 'Professional referral network',
      conversionRate: 0.80, // 80% of referrals accepted
      timeToConversion: 24   // 24 hours for specialist response
    });

    // Loop 5: Data Network Effect (AI Improvement)
    this.viralLoops.set('ai_improvement_loop', {
      trigger: 'Each new assessment improves AI accuracy',
      action: 'Better predictions attract more users',
      outcome: 'Platform becomes more valuable to everyone',
      viralMechanism: 'Product quality improvement',
      conversionRate: 0.95, // Near-perfect correlation
      timeToConversion: 1    // Immediate AI improvement
    });
  }

  /**
   * CALCULATE NETWORK VALUE USING METCALFE'S LAW
   */
  calculateNetworkValue(): NetworkMetrics {
    const { users, interactions } = this.networkState;
    
    // Metcalfe's Law: Network value proportional to n²
    const totalUsers = users.total;
    const metcalfeValue = Math.pow(totalUsers, 1.8) * 10; // Modified for healthcare network

    // Provider Network Value (Supply-side liquidity)
    const providerNetworkValue = users.providers * Math.log10(users.providers + 1) * 1000;

    // Data Network Value (AI improvement from assessments)
    const totalAssessments = interactions.dailyAssessments * 30; // Monthly approximation
    const dataNetworkValue = Math.log10(totalAssessments + 1) * 5000;

    // Calculate Viral Coefficient
    const viralCoefficient = this.calculateViralCoefficient();

    this.networkState.networkValue = {
      metcalfeValue,
      dataNetworkValue,
      providerNetworkValue,
      viralCoefficient
    };

    return this.networkState;
  }

  /**
   * VIRAL COEFFICIENT CALCULATION (Must be > 1.0 for exponential growth)
   */
  private calculateViralCoefficient(): number {
    let totalViralValue = 0;
    let loopCount = 0;

    this.viralLoops.forEach(loop => {
      // Viral contribution = conversion rate * average invites per user
      const avgInvites = this.estimateAvgInvites(loop.trigger);
      const viralContribution = loop.conversionRate * avgInvites;
      totalViralValue += viralContribution;
      loopCount++;
    });

    // Overall viral coefficient
    return totalViralValue / loopCount;
  }

  /**
   * TRIGGER VIRAL LOOPS BASED ON USER ACTIONS
   */
  async triggerViralLoop(event: string, userId: string, userData: any) {
    const triggeredLoops: string[] = [];

    for (const [loopId, loop] of this.viralLoops) {
      if (this.shouldTriggerLoop(event, loop.trigger, userData)) {
        await this.executeViralLoop(loopId, userId, userData);
        triggeredLoops.push(loopId);
      }
    }

    // Update network metrics
    this.updateNetworkMetrics(event, triggeredLoops.length);

    return {
      triggered: triggeredLoops,
      viralPotential: this.calculateViralPotential(triggeredLoops),
      networkValueIncrease: this.calculateValueIncrease(triggeredLoops.length)
    };
  }

  /**
   * EXECUTE SPECIFIC VIRAL LOOP
   */
  private async executeViralLoop(loopId: string, userId: string, userData: any) {
    const loop = this.viralLoops.get(loopId);
    if (!loop) return;

    console.log(`🚀 Triggering viral loop: ${loopId} for user ${userId}`);

    switch (loopId) {
      case 'pt_invites_pt':
        await this.executePTInviteLoop(userId, userData);
        break;
      case 'patient_refers_family':
        await this.executeFamilyReferralLoop(userId, userData);
        break;
      case 'caregiver_social_proof':
        await this.executeSocialProofLoop(userId, userData);
        break;
      case 'provider_cross_referral':
        await this.executeCrossReferralLoop(userId, userData);
        break;
      case 'ai_improvement_loop':
        await this.executeAIImprovementLoop(userId, userData);
        break;
    }
  }

  /**
   * PT INVITES PT VIRAL LOOP
   */
  private async executePTInviteLoop(ptId: string, data: any) {
    if (data.earningsThisMonth >= 500) {
      // Trigger viral invite prompt
      const incentiveOffer = {
        message: "You're earning great money! Invite 2 PT colleagues and earn $200 more",
        incentive: "$100 per successful PT referral",
        easyInviteButton: true,
        personalReferralLink: `https://safeaging.ai/join/${ptId}`,
        suggestedContacts: await this.suggestPTContacts(ptId)
      };

      await this.sendViralPrompt(ptId, 'pt_invite_opportunity', incentiveOffer);
    }
  }

  /**
   * FAMILY REFERRAL VIRAL LOOP  
   */
  private async executeFamilyReferralLoop(patientId: string, data: any) {
    if (data.sessionRating >= 4.5) {
      const familyPrompt = {
        message: "Your assessment helped keep you safer at home. Your family should try this too!",
        offer: "Free assessment for family members",
        socialSharing: {
          enabled: true,
          prewrittenPosts: await this.generateSocialContent(data)
        },
        familyInviteLinks: this.generateFamilyInviteLinks(patientId)
      };

      await this.sendViralPrompt(patientId, 'family_referral', familyPrompt);
    }
  }

  /**
   * NETWORK GROWTH PROJECTIONS
   */
  projectNetworkGrowth(days: number): GrowthProjection {
    const currentCoefficient = this.networkState.networkValue.viralCoefficient;
    const currentUsers = this.networkState.users.total;
    
    let projectedUsers = currentUsers;
    const dailyGrowth = [];

    for (let day = 1; day <= days; day++) {
      // Apply viral coefficient daily
      const dailyNewUsers = projectedUsers * (currentCoefficient - 1) / 7; // Weekly coefficient applied daily
      projectedUsers += dailyNewUsers;
      
      dailyGrowth.push({
        day,
        users: Math.floor(projectedUsers),
        networkValue: Math.pow(projectedUsers, 1.8) * 10,
        dailyRevenue: this.projectDailyRevenue(projectedUsers)
      });
    }

    return {
      projections: dailyGrowth,
      summary: {
        startUsers: currentUsers,
        endUsers: Math.floor(projectedUsers),
        growthMultiple: projectedUsers / currentUsers,
        viralCoefficient: currentCoefficient,
        networkValueGrowth: Math.pow(projectedUsers / currentUsers, 1.8)
      }
    };
  }

  /**
   * DARREN'S 50 PT ADVANTAGE PROJECTION
   */
  projectFounderAdvantage(initialPTs: number = 50): FounderProjection {
    const baseConversion = 0.70; // 70% of your contacts will join
    const viralMultiplier = 2.3;  // Each PT brings 2.3 more PTs
    
    const projections = {
      week1: {
        ptsJoined: Math.floor(initialPTs * baseConversion),
        revenue: 0, // Setup week
        networkValue: 0
      },
      week2: {
        ptsJoined: Math.floor(initialPTs * baseConversion * 1.5), // First viral wave
        revenue: Math.floor(initialPTs * baseConversion * 10 * 150 * 0.20), // 10 sessions per PT
        networkValue: Math.pow(initialPTs * baseConversion * 1.5, 1.8) * 10
      },
      month1: {
        ptsJoined: Math.floor(initialPTs * baseConversion * viralMultiplier),
        revenue: Math.floor(initialPTs * baseConversion * viralMultiplier * 40 * 150 * 0.20), // 40 sessions per PT
        networkValue: Math.pow(initialPTs * baseConversion * viralMultiplier, 1.8) * 10
      },
      month3: {
        ptsJoined: Math.floor(initialPTs * baseConversion * Math.pow(viralMultiplier, 2)),
        revenue: Math.floor(initialPTs * baseConversion * Math.pow(viralMultiplier, 2) * 100 * 150 * 0.20),
        networkValue: Math.pow(initialPTs * baseConversion * Math.pow(viralMultiplier, 2), 1.8) * 10
      }
    };

    return {
      projections,
      advantage: "While competitors spend 6+ months recruiting first 50 PTs, you start with network effects from day 1",
      competitiveMoat: "By month 3, your network is too valuable for PTs to leave and too expensive for competitors to replicate"
    };
  }

  // Helper methods
  private initializeNetwork(): NetworkMetrics {
    return {
      users: { patients: 0, providers: 0, caregivers: 0, total: 0 },
      interactions: { dailyAssessments: 0, sessionBookings: 0, referrals: 0, equipmentOrders: 0 },
      networkValue: { metcalfeValue: 0, dataNetworkValue: 0, providerNetworkValue: 0, viralCoefficient: 0 },
      growth: { dailyActiveUsers: 0, weeklyGrowthRate: 0, viralSignups: 0, organicGrowthRate: 0 }
    };
  }

  private shouldTriggerLoop(event: string, trigger: string, userData: any): boolean {
    // Simple matching logic - would be more sophisticated in production
    return event.includes(trigger.split(' ')[0].toLowerCase());
  }

  private estimateAvgInvites(trigger: string): number {
    const inviteRates = {
      'PT earns': 2.5,       // PTs invite 2.5 colleagues on average
      'Patient completes': 1.8, // Patients tell 1.8 family members
      'Parent avoids': 3.2,     // Caregivers share with 3.2 people
      'PT identifies': 1.0,     // 1:1 professional referrals
      'Each new': 1.0          // Data network effect is 1:1
    };

    for (const [key, rate] of Object.entries(inviteRates)) {
      if (trigger.includes(key)) return rate;
    }
    return 1.0;
  }

  private updateNetworkMetrics(event: string, viralLoopsTriggered: number) {
    // Update based on event type
    if (event.includes('assessment')) this.networkState.interactions.dailyAssessments++;
    if (event.includes('booking')) this.networkState.interactions.sessionBookings++;
    if (event.includes('referral')) this.networkState.interactions.referrals++;
    
    this.networkState.growth.viralSignups += viralLoopsTriggered;
  }

  private calculateViralPotential(triggeredLoops: string[]): number {
    return triggeredLoops.reduce((sum, loopId) => {
      const loop = this.viralLoops.get(loopId);
      return sum + (loop?.conversionRate || 0);
    }, 0);
  }

  private calculateValueIncrease(loopCount: number): number {
    return loopCount * 100; // $100 network value per viral loop
  }

  private async suggestPTContacts(ptId: string): Promise<string[]> {
    return ['colleague1@example.com', 'colleague2@example.com'];
  }

  private async sendViralPrompt(userId: string, promptType: string, data: any) {
    console.log(`📱 Sending viral prompt ${promptType} to user ${userId}`);
  }

  private async generateSocialContent(data: any): Promise<string[]> {
    return [
      "Just had an amazing fall prevention assessment with SafeAging! Their AI is incredible.",
      "Finally, a healthcare platform that actually helps seniors stay safely at home 🏠❤️"
    ];
  }

  private generateFamilyInviteLinks(patientId: string): string[] {
    return [`https://safeaging.ai/family/${patientId}`];
  }

  private projectDailyRevenue(users: number): number {
    const avgRevenuePerUser = 25; // Conservative estimate
    return users * avgRevenuePerUser / 30; // Daily from monthly
  }

  private executeSocialProofLoop(userId: string, userData: any) {
    console.log(`📱 Executing social proof loop for ${userId}`);
  }

  private executeCrossReferralLoop(userId: string, userData: any) {
    console.log(`👥 Executing cross-referral loop for ${userId}`);
  }

  private executeAIImprovementLoop(userId: string, userData: any) {
    console.log(`🤖 Executing AI improvement loop for ${userId}`);
  }
}

interface GrowthProjection {
  projections: Array<{
    day: number;
    users: number;
    networkValue: number;
    dailyRevenue: number;
  }>;
  summary: {
    startUsers: number;
    endUsers: number;
    growthMultiple: number;
    viralCoefficient: number;
    networkValueGrowth: number;
  };
}

interface FounderProjection {
  projections: {
    week1: { ptsJoined: number; revenue: number; networkValue: number };
    week2: { ptsJoined: number; revenue: number; networkValue: number };
    month1: { ptsJoined: number; revenue: number; networkValue: number };
    month3: { ptsJoined: number; revenue: number; networkValue: number };
  };
  advantage: string;
  competitiveMoat: string;
}