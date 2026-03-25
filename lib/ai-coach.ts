/**
 * Cursor Fund Coach - AI-Powered Investor Matching & Pitch Analysis
 * 
 * This service provides:
 * 1. Deep startup analysis (idea, product, traction, team, pitch)
 * 2. Investor-style feedback on pitch, deck, and fundraising strategy
 * 3. Smart matching to VCs, accelerators, and funding programs
 * 4. Tailored recommendations with specific pitch adaptations
 */

interface StartupProfile {
  // Founder Info
  founderName: string;
  founderBackground: string;
  founderExperience: string;
  coFounders?: string;
  
  // Startup Info
  startupName: string;
  industry: string;
  stage: string;
  location: string;
  businessModel: string;
  
  // Problem & Solution
  problemStatement: string;
  solution: string;
  uniqueValue: string;
  
  // Traction
  currentTraction: string;
  revenue?: string;
  users?: string;
  growth?: string;
  
  // Fundraising
  fundraisingStage: string;
  targetAmount: string;
  previousFunding?: string;
  
  // Additional Context
  pitchDeck?: string; // URL or file path
  competitors?: string;
  futureVision: string;
}

interface InvestorMatch {
  id: string;
  firmName: string;
  fundType: string;
  stages: string[];
  sectors: string[];
  checkSizeMin: number;
  checkSizeMax: number;
  geography: string[];
  thesis?: string;
  bio: string;
  website?: string;
  email?: string;
  
  // Matching metadata
  matchScore: number; // 0-100
  matchReasons: string[];
  pitchAdaptation: string;
  whyThisInvestor: string;
  keyTalkingPoints: string[];
}

interface CoachFeedback {
  overallAssessment: string;
  strengths: string[];
  weaknesses: string[];
  pitchImprovements: string[];
  deckFeedback: string[];
  fundraisingStrategy: string[];
  competitivePositioning: string;
  marketOpportunity: string;
  teamAssessment: string;
  tractionAnalysis: string;
  topMatches: InvestorMatch[];
}

export class AIFundCoach {
  /**
   * Analyzes a startup profile and provides comprehensive feedback
   */
  static async analyzeStartup(profile: StartupProfile): Promise<CoachFeedback> {
    // Perform deep analysis
    const strengths = this.identifyStrengths(profile);
    const weaknesses = this.identifyWeaknesses(profile);
    const pitchImprovements = this.generatePitchImprovements(profile);
    const deckFeedback = this.analyzeDeck(profile);
    const fundraisingStrategy = this.generateFundraisingStrategy(profile);
    
    // Generate assessments
    const overallAssessment = this.generateOverallAssessment(profile, strengths, weaknesses);
    const competitivePositioning = this.analyzeCompetitivePosition(profile);
    const marketOpportunity = this.analyzeMarketOpportunity(profile);
    const teamAssessment = this.analyzeTeam(profile);
    const tractionAnalysis = this.analyzeTraction(profile);
    
    // Find matching investors
    const topMatches = await this.findMatchingInvestors(profile);
    
    return {
      overallAssessment,
      strengths,
      weaknesses,
      pitchImprovements,
      deckFeedback,
      fundraisingStrategy,
      competitivePositioning,
      marketOpportunity,
      teamAssessment,
      tractionAnalysis,
      topMatches
    };
  }
  
  /**
   * Identifies startup strengths based on profile analysis
   */
  private static identifyStrengths(profile: StartupProfile): string[] {
    const strengths: string[] = [];
    
    // Founder background analysis
    if (profile.founderBackground.toLowerCase().includes('technical') || 
        profile.founderBackground.toLowerCase().includes('engineer') ||
        profile.founderBackground.toLowerCase().includes('developer')) {
      strengths.push('Strong technical founding team with hands-on product development capability');
    }
    
    if (profile.founderExperience.toLowerCase().includes('exit') ||
        profile.founderExperience.toLowerCase().includes('acquired') ||
        profile.founderExperience.toLowerCase().includes('successful')) {
      strengths.push('Proven entrepreneurial track record with previous exit experience');
    }
    
    if (profile.coFounders && profile.coFounders.trim().length > 0) {
      strengths.push('Complementary co-founder team reduces single-founder risk');
    }
    
    // Traction analysis
    if (profile.revenue && this.extractNumber(profile.revenue) > 0) {
      const revenueNum = this.extractNumber(profile.revenue);
      if (revenueNum >= 100000) {
        strengths.push(`Strong revenue traction with $${this.formatNumber(revenueNum)} demonstrates product-market fit`);
      } else {
        strengths.push('Early revenue generation shows customer willingness to pay');
      }
    }
    
    if (profile.users && this.extractNumber(profile.users) > 0) {
      const userCount = this.extractNumber(profile.users);
      if (userCount >= 10000) {
        strengths.push(`Significant user base of ${this.formatNumber(userCount)} users shows market demand`);
      } else if (userCount >= 1000) {
        strengths.push(`Growing user base of ${this.formatNumber(userCount)} users demonstrates traction`);
      }
    }
    
    if (profile.growth && this.extractNumber(profile.growth) > 0) {
      const growthRate = this.extractNumber(profile.growth);
      if (growthRate >= 20) {
        strengths.push(`Impressive ${growthRate}% growth rate indicates strong momentum`);
      }
    }
    
    // Problem-solution fit
    if (profile.problemStatement.length > 100 && profile.solution.length > 100) {
      strengths.push('Clear problem-solution articulation shows deep market understanding');
    }
    
    // Previous funding
    if (profile.previousFunding && this.extractNumber(profile.previousFunding) > 0) {
      strengths.push('Previous funding round provides validation from other investors');
    }
    
    // Industry-specific strengths
    const hotIndustries = ['ai', 'artificial intelligence', 'machine learning', 'fintech', 'healthtech', 'climate', 'cleantech'];
    if (hotIndustries.some(ind => profile.industry.toLowerCase().includes(ind))) {
      strengths.push(`Operating in high-growth ${profile.industry} sector with strong investor interest`);
    }
    
    return strengths.length > 0 ? strengths : ['Emerging startup with potential for growth'];
  }
  
  /**
   * Identifies areas for improvement
   */
  private static identifyWeaknesses(profile: StartupProfile): string[] {
    const weaknesses: string[] = [];
    
    // Traction concerns
    if (!profile.revenue || this.extractNumber(profile.revenue) === 0) {
      if (profile.stage === 'Seed' || profile.stage === 'Series A') {
        weaknesses.push('Limited or no revenue may concern investors at this stage - focus on path to monetization');
      }
    }
    
    if (!profile.users || this.extractNumber(profile.users) < 100) {
      weaknesses.push('User base is still developing - demonstrate user acquisition strategy and early validation');
    }
    
    // Team concerns
    if (!profile.coFounders || profile.coFounders.trim().length === 0) {
      weaknesses.push('Solo founder structure increases execution risk - consider highlighting advisory board or key hires');
    }
    
    if (profile.founderExperience.toLowerCase().includes('first-time') ||
        profile.founderExperience.toLowerCase().includes('no experience')) {
      weaknesses.push('First-time founder status requires extra emphasis on learning speed and advisors');
    }
    
    // Market validation
    if (!profile.currentTraction || profile.currentTraction.length < 50) {
      weaknesses.push('Limited traction data - investors need concrete metrics and milestones');
    }
    
    // Competitive landscape
    if (!profile.competitors || profile.competitors.length < 20) {
      weaknesses.push('Competitive analysis appears limited - investors will probe this deeply');
    }
    
    // Pitch deck
    if (!profile.pitchDeck) {
      weaknesses.push('No pitch deck provided - having a polished deck is critical for fundraising');
    }
    
    // Previous funding
    if (!profile.previousFunding && (profile.stage === 'Series A' || profile.stage === 'Series B')) {
      weaknesses.push('No previous institutional funding at this stage may raise questions about prior fundraising attempts');
    }
    
    // Business model clarity
    if (profile.businessModel.length < 30) {
      weaknesses.push('Business model needs more detailed articulation - be specific about revenue streams');
    }
    
    return weaknesses;
  }
  
  /**
   * Generates specific pitch improvements
   */
  private static generatePitchImprovements(profile: StartupProfile): string[] {
    const improvements: string[] = [];
    
    // Problem statement
    if (profile.problemStatement.length < 100) {
      improvements.push('Expand your problem statement with specific data points: market size, frequency of problem, current solutions\' failures');
    } else {
      improvements.push('Lead with the problem: "Every year, X million people face Y problem, costing Z dollars. Current solutions fail because..."');
    }
    
    // Solution clarity
    improvements.push('Structure your solution pitch: "We solve this by [approach]. Unlike alternatives, we [unique differentiation]. The result is [quantified outcome]."');
    
    // Traction storytelling
    if (profile.currentTraction) {
      improvements.push('Frame traction as a story: "We launched X months ago. Since then, we\'ve achieved [milestone 1], [milestone 2], showing [trend/insight]."');
    } else {
      improvements.push('Even without traction, show validation: pilot customers, LOIs, wait list size, expert endorsements');
    }
    
    // Market opportunity
    improvements.push('Use TAM-SAM-SOM framework: Total market → Serviceable market → Your realistic target. Back each with sources.');
    
    // Team positioning
    if (profile.coFounders) {
      improvements.push('Introduce team strategically: "[Name] built [relevant system] at [company]. [Co-founder] scaled [achievement]. Together we\'ve [collective win]."');
    } else {
      improvements.push('As solo founder, emphasize: your unique insights from [experience], key advisors/early hires, and what you\'ve already accomplished alone');
    }
    
    // The Ask
    improvements.push(`For your ${profile.targetAmount} raise: specify use of funds (40% engineering, 30% sales, 20% marketing, 10% ops), timeline to next milestone, and expected outcomes`);
    
    // Competitive positioning
    improvements.push('Use a 2x2 matrix for competitors: position yourself in the "ideal" quadrant and explain why others can\'t get there');
    
    // Vision & traction balance
    improvements.push('Balance ambition and realism: "Long-term, we\'re building [big vision]. Near-term, we\'re focused on [achievable milestone with metrics]."');
    
    // Storytelling
    improvements.push('Open with a hook: personal story of encountering the problem, surprising statistic, or bold vision statement');
    
    // Call to action
    improvements.push('End with clear next steps: "We\'re raising [amount] to achieve [specific milestone] by [date]. We\'d love to show you [demo/pilot results/customer interviews]."');
    
    return improvements;
  }
  
  /**
   * Analyzes pitch deck (if provided)
   */
  private static analyzeDeck(profile: StartupProfile): string[] {
    const feedback: string[] = [];
    
    if (!profile.pitchDeck) {
      feedback.push('CREATE A DECK: Essential slides: (1) Problem (2) Solution (3) Product Demo (4) Market Size (5) Traction (6) Business Model (7) Competition (8) Team (9) Financials (10) The Ask');
      feedback.push('Design matters: Use consistent branding, minimal text (6 words per line, 6 lines per slide), high-quality visuals, and readable fonts (30pt+)');
      feedback.push('Data visualization: Charts > tables > paragraphs. Show trends, not just numbers.');
    } else {
      feedback.push('Review your deck against Y Combinator\'s template - it\'s battle-tested across thousands of startups');
      feedback.push('Traction slide is critical: Include a "hockey stick" graph if possible, or show clear momentum through cohort analysis');
      feedback.push('Market size slide: Avoid generic "billion dollar market" claims. Show bottoms-up calculation: [# of potential customers] x [revenue per customer] x [market penetration %]');
    }
    
    feedback.push('Team slide: Include photos, titles, and 1-2 key credentials per person. Highlight any notable alumni (e.g., "ex-Google", "MIT PhD")');
    feedback.push('Competition slide: Never say "no competitors" - shows naivety. Use positioning matrix or feature comparison table');
    feedback.push('Demo/Product: If possible, include actual screenshots or short video. Investors invest in products they can visualize');
    feedback.push('Appendix: Include detailed financials, technical architecture, customer testimonials, and press mentions for deep-dive questions');
    
    return feedback;
  }
  
  /**
   * Generates fundraising strategy recommendations
   */
  private static generateFundraisingStrategy(profile: StartupProfile): string[] {
    const strategy: string[] = [];
    
    // Timing
    strategy.push('TIMING: Fundraise when you have momentum (recent milestone, revenue growth, product launch) or 6-9 months runway. Don\'t wait until you\'re desperate.');
    
    // Process
    strategy.push('PROCESS: Target 30-50 investors, aim for 5-10 partner meetings, close 2-3 term sheets. Timeline: 8-12 weeks from first meeting to closed round.');
    
    // Outreach strategy
    strategy.push('OUTREACH: Warm intros > cold emails. For cold outreach, personalize every email: mention their portfolio company, recent investment, or tweet. Keep it under 100 words.');
    
    // Meeting strategy
    strategy.push('MEETINGS: First meeting is screening (30 min). Second is deep dive (1 hour). Third is partner meeting (decision). Bring metrics, answer objections directly, and always follow up within 24h.');
    
    // Valuation
    const targetAmountNum = this.extractNumber(profile.targetAmount);
    if (targetAmountNum > 0) {
      const suggestedDilution = profile.stage === 'Pre-seed' ? '10-15%' : profile.stage === 'Seed' ? '15-20%' : '20-25%';
      strategy.push(`VALUATION: For ${profile.stage} stage raising $${this.formatNumber(targetAmountNum)}, expect ${suggestedDilution} dilution. Research recent comps in your sector.`);
    }
    
    // Term sheet
    strategy.push('TERMS: Key terms beyond valuation: liquidation preferences (1x is standard), board composition, pro-rata rights, and anti-dilution protection. Get lawyer review before signing.');
    
    // Investor types
    strategy.push(`INVESTOR MIX: For ${profile.stage}, target a lead investor (60-70% of round) + 2-3 smaller checks. Lead sets terms and drives diligence.`);
    
    // Due diligence
    strategy.push('DUE DILIGENCE: Prepare data room in advance: financials, cap table, customer contracts, technical docs, employment agreements. Clean up issues proactively.');
    
    // Relationship building
    strategy.push('RELATIONSHIPS: Start building investor relationships months before you need to raise. Send quarterly updates, ask for advice (not money), and engage with their content.');
    
    // Alternative funding
    if (profile.stage === 'Pre-seed' || profile.stage === 'Seed') {
      strategy.push('ALTERNATIVES: Consider combining: friends & family, angel investors, revenue-based financing, accelerator, or grants. Diversification reduces dilution and risk.');
    }
    
    return strategy;
  }
  
  /**
   * Generates overall assessment with deep understanding of ideas and vision
   */
  private static generateOverallAssessment(profile: StartupProfile, strengths: string[], weaknesses: string[]): string {
    const stage = profile.stage;
    const hasRevenue = profile.revenue && this.extractNumber(profile.revenue) > 0;
    const hasUsers = profile.users && this.extractNumber(profile.users) > 0;
    const hasPreviousFunding = profile.previousFunding && this.extractNumber(profile.previousFunding) > 0;
    
    // Deep analysis of the core idea and vision
    const ideaAnalysis = this.analyzeCoreIdea(profile);
    const visionAnalysis = this.analyzeVision(profile);
    const nichePositioning = this.identifyNichePositioning(profile);
    
    let assessment = `**${profile.startupName}** is a ${stage.toLowerCase()}-stage ${profile.industry} company`;
    
    // Start with the core idea and vision
    if (ideaAnalysis.isNovel) {
      assessment += ` with a ${ideaAnalysis.noveltyLevel} idea: ${ideaAnalysis.coreInsight}. `;
    } else {
      assessment += ` addressing ${ideaAnalysis.marketNeed}. `;
    }
    
    if (visionAnalysis.hasClearVision) {
      assessment += `Your vision to ${visionAnalysis.visionSummary} shows ${visionAnalysis.ambitionLevel} ambition. `;
    }
    
    if (nichePositioning.hasNiche) {
      assessment += `You're targeting a ${nichePositioning.nicheDescription} - this focused approach ${nichePositioning.nicheAdvantage}. `;
    }
    
    if (hasRevenue && hasUsers) {
      assessment += 'You have demonstrated product-market fit through both revenue and user growth. ';
    } else if (hasRevenue) {
      assessment += 'Early revenue traction shows customer willingness to pay. ';
    } else if (hasUsers) {
      assessment += 'A growing user base demonstrates market interest. ';
    } else if (stage === 'Idea') {
      assessment += 'As an idea-stage startup, your focus should be on validating the core hypothesis and building an MVP. ';
    } else {
      assessment += 'You\'re in the early validation phase. ';
    }
    
    // Strength summary
    if (strengths.length >= 3) {
      assessment += 'Your key strengths are your ';
      if (strengths.some(s => s.includes('team') || s.includes('founder'))) {
        assessment += 'team background, ';
      }
      if (strengths.some(s => s.includes('traction') || s.includes('growth'))) {
        assessment += 'traction metrics, ';
      }
      if (strengths.some(s => s.includes('market') || s.includes('sector'))) {
        assessment += 'market positioning, ';
      }
      assessment = assessment.slice(0, -2); // Remove trailing comma
      assessment += '. ';
    }
    
    // Investment readiness
    if (weaknesses.length <= 2 && strengths.length >= 3) {
      assessment += '**You\'re in a strong position to fundraise.** Focus on: (1) perfecting your pitch narrative, (2) building relationships with target investors, and (3) preparing for deep diligence. ';
    } else if (weaknesses.length <= 4) {
      assessment += '**You\'re approaching investment readiness.** Before active fundraising: (1) address the key weaknesses below, (2) build 2-3 more months of traction data, and (3) start warm relationship building with investors. ';
    } else {
      assessment += '**You should strengthen your position before active fundraising.** Investors typically pass on startups with multiple red flags. Spend the next 3-6 months: (1) fixing critical weaknesses, (2) achieving clear milestones, and (3) refining your pitch story. ';
    }
    
    // Investor expectations
    assessment += `For ${stage} companies in ${profile.industry}, investors will scrutinize: `;
    if (stage === 'Pre-seed' || stage === 'Seed') {
      assessment += 'team quality, market opportunity, product vision, and any early validation signals (pilots, LOIs, early users). ';
    } else {
      assessment += 'unit economics, growth rate, customer acquisition costs, market positioning, and path to profitability. ';
    }
    
    // Action items
    assessment += '**Next steps:** Review the detailed feedback below, prioritize the pitch improvements, and use the matched investors to refine your target list. Each investor match includes specific guidance on how to position your startup for their thesis.';
    
    return assessment;
  }
  
  /**
   * Analyzes competitive positioning
   */
  private static analyzeCompetitivePosition(profile: StartupProfile): string {
    let analysis = '**Competitive Positioning Strategy:**\n\n';
    
    if (profile.competitors && profile.competitors.length > 20) {
      analysis += `You've identified competitors: ${profile.competitors.substring(0, 100)}${profile.competitors.length > 100 ? '...' : ''}. `;
      analysis += 'Good competitive awareness is crucial. ';
    } else {
      analysis += 'You need to develop stronger competitive intelligence. ';
    }
    
    analysis += '\n\n**How to position against competition:**\n';
    analysis += '• **Direct competitors:** Acknowledge their existence, then explain why you win: better technology, superior UX, lower cost, or different go-to-market.\n';
    analysis += '• **Indirect competitors:** Show why the market is shifting toward your approach (e.g., "The market is moving from X to Y because...").\n';
    analysis += '• **Incumbent alternatives:** Explain what fundamental change (new technology, regulation, behavior) enables your solution now.\n';
    analysis += '• **Differentiation:** Your unique value proposition should be defensible - network effects, proprietary data, patents, or technical complexity.\n\n';
    
    analysis += `**For ${profile.industry}:** `;
    if (profile.industry.toLowerCase().includes('ai') || profile.industry.toLowerCase().includes('ml')) {
      analysis += 'Emphasize your data advantage, model performance benchmarks, or unique application. AI is commoditizing fast - differentiation must be in proprietary data or specialized domain application.';
    } else if (profile.industry.toLowerCase().includes('fintech')) {
      analysis += 'Highlight regulatory compliance, security measures, and financial partnerships. Banking relationships and licenses are moats in fintech.';
    } else if (profile.industry.toLowerCase().includes('health')) {
      analysis += 'Emphasize clinical validation, HIPAA compliance, and healthcare partnerships. Healthcare sales cycles are long - show pilot results and integration readiness.';
    } else {
      analysis += 'Focus on what makes your approach 10x better, not 10% better. Incremental improvements don\'t create venture-scale outcomes.';
    }
    
    return analysis;
  }
  
  /**
   * Analyzes market opportunity
   */
  private static analyzeMarketOpportunity(profile: StartupProfile): string {
    let analysis = '**Market Opportunity Analysis:**\n\n';
    
    // TAM/SAM/SOM framework
    analysis += '**Market sizing approach:**\n';
    analysis += '• **TAM (Total Addressable Market):** The total market demand if you achieved 100% market share. Be realistic - cite sources.\n';
    analysis += '• **SAM (Serviceable Addressable Market):** The segment of TAM you can realistically target with your product/geography.\n';
    analysis += '• **SOM (Serviceable Obtainable Market):** What you can capture in the next 3-5 years given competition and resources.\n\n';
    
    // Industry-specific insights
    analysis += `**For ${profile.industry}:**\n`;
    const industry = profile.industry.toLowerCase();
    
    if (industry.includes('ai') || industry.includes('artificial intelligence')) {
      analysis += 'AI/ML market is projected to reach $200B+ by 2026, but investors are looking for specific use cases with clear ROI, not generic "AI solutions". Show how your AI creates measurable value.\n\n';
    } else if (industry.includes('fintech')) {
      analysis += 'Fintech is huge but competitive. Success factors: regulatory compliance, banking partnerships, and superior unit economics. Neobanks need 100K+ users to be viable.\n\n';
    } else if (industry.includes('healthtech') || industry.includes('health')) {
      analysis += 'Healthcare is a $4T+ market but notoriously slow-moving. You need: clinical validation, HIPAA compliance, and existing provider relationships. Reimbursement strategy is critical.\n\n';
    } else if (industry.includes('saas') || industry.includes('software')) {
      analysis += 'SaaS is mature and competitive. Focus on a specific niche, achieve <6 month payback period, and show <5% monthly churn. Rule of 40 (growth% + profit margin%) is key metric.\n\n';
    } else if (industry.includes('climate') || industry.includes('clean')) {
      analysis += 'Climate tech is hot with $40B+ deployed annually. But investors want proven technology at scale, not lab projects. Show: unit economics, scalable manufacturing, and customer pilots.\n\n';
    } else {
      analysis += 'Demonstrate you\'re in a large, growing market with structural tailwinds (regulatory, technological, or behavioral shifts).\n\n';
    }
    
    // Growth drivers
    analysis += '**Key growth drivers to emphasize:**\n';
    analysis += '• Identify macro trends accelerating your market (remote work, AI adoption, climate crisis, aging population, etc.)\n';
    analysis += '• Show why incumbents can\'t adapt quickly (legacy systems, channel conflict, culture)\n';
    analysis += '• Explain your unfair advantage in capturing this opportunity (unique insight, technology, distribution, or timing)\n';
    
    return analysis;
  }
  
  /**
   * Analyzes team composition and credibility
   */
  private static analyzeTeam(profile: StartupProfile): string {
    let analysis = '**Team Assessment:**\n\n';
    
    const hasCoFounders = profile.coFounders && profile.coFounders.trim().length > 0;
    const hasTechnicalBackground = profile.founderBackground.toLowerCase().includes('technical') ||
                                   profile.founderBackground.toLowerCase().includes('engineer') ||
                                   profile.founderBackground.toLowerCase().includes('developer');
    const hasIndustryExperience = profile.founderBackground.toLowerCase().includes(profile.industry.toLowerCase());
    const hasExitExperience = profile.founderExperience.toLowerCase().includes('exit') ||
                              profile.founderExperience.toLowerCase().includes('acquired');
    
    // Founder analysis
    if (hasCoFounders) {
      analysis += '✅ **Co-founder team:** Multiple founders reduce execution risk and bring complementary skills. ';
      analysis += 'Emphasize: how you met, how long you\'ve worked together, and how you complement each other (e.g., technical + sales, product + growth).\n\n';
    } else {
      analysis += '⚠️ **Solo founder:** This increases perceived risk. Mitigate by: (1) highlighting strong advisors, (2) showing you can attract talent (early hires), and (3) demonstrating you\'ve already achieved milestones independently.\n\n';
    }
    
    // Background analysis
    if (hasTechnicalBackground) {
      analysis += '✅ **Technical expertise:** Strong technical founding team is essential for tech startups. Investors value founders who can build the product themselves.\n\n';
    } else {
      analysis += '⚠️ **Non-technical founder:** If building a technical product, investors will look for a technical co-founder or strong CTO hire. Explain your product development strategy.\n\n';
    }
    
    if (hasIndustryExperience) {
      analysis += '✅ **Domain expertise:** Your background in the industry gives you unique insights and credibility. Leverage this in your pitch.\n\n';
    } else {
      analysis += '⚠️ **Industry outsider:** This can be both a weakness (learning curve) and strength (fresh perspective). Position it as: "We\'re not constrained by industry assumptions."\n\n';
    }
    
    if (hasExitExperience) {
      analysis += '✅ **Previous exit:** This is a huge credibility booster. Investors back "repeat entrepreneurs" at higher valuations. Lead with this.\n\n';
    }
    
    // Recommended team positions
    analysis += '**Critical roles to fill:**\n';
    if (profile.stage === 'Pre-seed' || profile.stage === 'Seed') {
      analysis += '• **Early stage:** Focus on technical talent (engineers, designers) and 1-2 customer-facing roles (sales, customer success)\n';
      analysis += '• **Advisors:** Recruit 3-5 advisors with: industry expertise, fundraising experience, and specific connections to customers/investors\n';
    } else {
      analysis += '• **Growth stage:** Expand into: VP Sales, Head of Marketing, Technical Leadership, Operations/Finance\n';
      analysis += '• **Board:** Construct a board that adds strategic value: experienced operators, domain experts, and investors with relevant networks\n';
    }
    
    analysis += '\n**Team slide best practices:**\n';
    analysis += '• Include professional photos and key credentials (school, company alumni, specific achievements)\n';
    analysis += '• Use recognizable brand names: "ex-Google", "Stanford CS", "led $50M sales team at Salesforce"\n';
    analysis += '• Show commitment: if you left a lucrative job for this, mention it\n';
    analysis += '• Mention advisors if they\'re notable (but don\'t inflate their role)';
    
    return analysis;
  }
  
  /**
   * Analyzes traction and metrics
   */
  private static analyzeTraction(profile: StartupProfile): string {
    let analysis = '**Traction Analysis:**\n\n';
    
    const revenue = this.extractNumber(profile.revenue || '0');
    const users = this.extractNumber(profile.users || '0');
    const growth = this.extractNumber(profile.growth || '0');
    
    // Revenue analysis
    if (revenue > 0) {
      analysis += `✅ **Revenue: $${this.formatNumber(revenue)}**\n`;
      if (revenue >= 1000000) {
        analysis += 'This is strong traction. Focus on: (1) revenue growth rate, (2) gross margins, (3) customer acquisition cost (CAC), and (4) customer lifetime value (LTV).\n\n';
      } else if (revenue >= 100000) {
        analysis += 'This demonstrates product-market fit. Investors will want to see: path to $1M ARR, unit economics, and repeatability of sales.\n\n';
      } else {
        analysis += 'Early revenue is positive but not sufficient for later-stage rounds. Show: growth trajectory, improving unit economics, and path to scale.\n\n';
      }
    } else {
      analysis += '⚠️ **No revenue yet:**\n';
      if (profile.stage === 'Seed' || profile.stage === 'Series A') {
        analysis += 'This is a red flag at your stage. Explain: (1) why no revenue yet (product still in development, pilot phase, etc.), (2) when revenue starts, and (3) what validates demand (LOIs, pilots, waitlist).\n\n';
      } else {
        analysis += 'Acceptable for pre-seed, but show alternative validation: user engagement, LOIs, pilot customers, or expert endorsements.\n\n';
      }
    }
    
    // User analysis
    if (users > 0) {
      analysis += `✅ **Users: ${this.formatNumber(users)}**\n`;
      if (users >= 100000) {
        analysis += 'Strong user base. Key metrics to emphasize: (1) DAU/MAU ratio, (2) retention cohorts, (3) engagement metrics, (4) monetization strategy.\n\n';
      } else if (users >= 10000) {
        analysis += 'Good initial traction. Show: user growth rate, engagement trends, and path to monetization or network effects.\n\n';
      } else if (users >= 1000) {
        analysis += 'Early validation. Focus on: quality of users (are they target customers?), engagement depth, and feedback/testimonials.\n\n';
      } else {
        analysis += 'Very early user base. Emphasize: user acquisition strategy, early user feedback, and product iteration based on learning.\n\n';
      }
    } else {
      analysis += '⚠️ **No users yet:**\n';
      analysis += 'Show alternative forms of validation: customer interviews, LOIs, wait list signups, or pilot agreements. Pre-launch traction matters.\n\n';
    }
    
    // Growth analysis
    if (growth > 0) {
      analysis += `✅ **Growth: ${growth}% MoM**\n`;
      if (growth >= 20) {
        analysis += 'This is exceptional growth (> 20% MoM). Highlight this prominently and explain: (1) growth drivers, (2) sustainability, and (3) how funding accelerates it.\n\n';
      } else if (growth >= 10) {
        analysis += 'Solid growth rate. Show it\'s consistent across multiple months and explain how you\'ll maintain or accelerate it.\n\n';
      } else {
        analysis += 'Moderate growth. Investors expect >10% monthly at early stages. Explain: what\'s limiting growth and how funding removes that bottleneck.\n\n';
      }
    }
    
    // Key metrics framework
    analysis += '**Essential metrics to track and present:**\n\n';
    
    if (revenue > 0) {
      analysis += '**For revenue-generating startups:**\n';
      analysis += '• **ARR/MRR:** Annual/Monthly Recurring Revenue (investors love predictable revenue)\n';
      analysis += '• **Growth rate:** Month-over-month revenue growth\n';
      analysis += '• **Gross margin:** (Revenue - COGS) / Revenue (aim for >70% for SaaS)\n';
      analysis += '• **CAC:** Customer Acquisition Cost (total sales/marketing spend ÷ new customers)\n';
      analysis += '• **LTV:** Customer Lifetime Value (average revenue per customer × lifetime)\n';
      analysis += '• **LTV:CAC ratio:** Aim for 3:1 or higher\n';
      analysis += '• **CAC payback period:** Aim for <12 months, ideally <6\n';
      analysis += '• **Net dollar retention:** For SaaS, >100% means existing customers expand\n\n';
    }
    
    if (users > 0) {
      analysis += '**For user-driven startups:**\n';
      analysis += '• **User growth:** Weekly/Monthly Active Users (WAU/MAU) trend\n';
      analysis += '• **Engagement:** DAU/MAU ratio (>20% is good), session length, actions per user\n';
      analysis += '• **Retention:** Day 1, Day 7, Day 30 retention rates\n';
      analysis += '• **Cohort analysis:** Show retention improving for recent cohorts\n';
      analysis += '• **Virality:** K-factor (how many new users does each user bring?)\n';
      analysis += '• **Monetization:** Revenue per user, conversion to paid\n\n';
    }
    
    analysis += '**Traction slide best practices:**\n';
    analysis += '• Use a "hockey stick" graph showing clear growth trajectory\n';
    analysis += '• Include both vanity metrics (users, revenue) and quality metrics (retention, engagement, margins)\n';
    analysis += '• Show trends over time, not just current numbers\n';
    analysis += '• If numbers are small, frame them as validation: "We launched 3 months ago and already have X"\n';
    analysis += '• Include customer testimonials, logos (if B2B), or press mentions';
    
    return analysis;
  }
  
  /**
   * Finds and ranks matching investors from the database
   */
  private static async findMatchingInvestors(profile: StartupProfile): Promise<InvestorMatch[]> {
    // Import Prisma client dynamically to avoid issues
    const { db } = await import('./db');

    try {
      // Determine search criteria from profile
      const targetStage = this.mapStageToInvestorStage(profile.stage);
      const targetSectors = this.extractSectors(profile.industry);
      const targetCheckSize = this.extractNumber(profile.targetAmount);
      const targetGeography = this.extractGeography(profile.location);
      
      // Fetch all investors and score them
      const allInvestors = await db.investor.findMany();
      
      const scoredInvestors: InvestorMatch[] = allInvestors
        .map(investor => {
          // Parse JSON fields
          const stages = typeof investor.stages === 'string' ? JSON.parse(investor.stages) : investor.stages;
          const sectors = typeof investor.sectors === 'string' ? JSON.parse(investor.sectors) : investor.sectors;
          const geography = typeof investor.geography === 'string' ? JSON.parse(investor.geography) : investor.geography;
          
          const investorData = {
            ...investor,
            stages,
            sectors,
            geography
          };
          
          const matchScore = this.calculateMatchScore(profile, investorData, targetStage, targetSectors, targetCheckSize, targetGeography);
          const matchReasons = this.generateMatchReasons(profile, investorData, targetStage, targetSectors, targetCheckSize);
          const pitchAdaptation = this.generatePitchAdaptation(profile, investorData);
          const whyThisInvestor = this.generateWhyThisInvestor(profile, investorData);
          const keyTalkingPoints = this.generateKeyTalkingPoints(profile, investorData);
          
          return {
            id: investor.id,
            firmName: investor.firmName,
            fundType: investor.fundType,
            stages,
            sectors,
            checkSizeMin: investor.checkSizeMin,
            checkSizeMax: investor.checkSizeMax,
            geography,
            thesis: investor.thesis || undefined,
            bio: investor.bio,
            website: investor.website || undefined,
            email: investor.email || undefined,
            matchScore,
            matchReasons,
            pitchAdaptation,
            whyThisInvestor,
            keyTalkingPoints
          };
        })
        .filter(match => match.matchScore >= 40) // Only show decent matches
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 25); // Top 25 matches

      return scoredInvestors;
    } catch (error) {
      console.error('Error fetching investors:', error);
      return [];
    }
  }
  
  /**
   * Calculates match score between startup and investor
   */
  private static calculateMatchScore(
    profile: StartupProfile,
    investor: any,
    targetStage: string,
    targetSectors: string[],
    targetCheckSize: number,
    targetGeography: string
  ): number {
    let score = 0;
    
    // Stage match (30 points)
    if (investor.stages.includes(targetStage)) {
      score += 30;
    } else if (
      (targetStage === 'Seed' && investor.stages.includes('Pre-seed')) ||
      (targetStage === 'Series A' && investor.stages.includes('Seed'))
    ) {
      score += 15; // Adjacent stage
    }
    
    // Sector match (25 points)
    const sectorMatches = targetSectors.filter(sector =>
      investor.sectors.some((invSector: string) =>
        invSector.toLowerCase().includes(sector.toLowerCase()) ||
        sector.toLowerCase().includes(invSector.toLowerCase())
      )
    );
    if (sectorMatches.length > 0) {
      score += Math.min(25, sectorMatches.length * 12);
    }
    
    // Check size match (20 points)
    if (targetCheckSize >= investor.checkSizeMin && targetCheckSize <= investor.checkSizeMax) {
      score += 20;
    } else if (targetCheckSize < investor.checkSizeMin) {
      const diff = (targetCheckSize / investor.checkSizeMin) * 20;
      score += Math.max(0, diff);
    } else if (targetCheckSize > investor.checkSizeMax) {
      const diff = (investor.checkSizeMax / targetCheckSize) * 20;
      score += Math.max(0, diff);
    }
    
    // Geography match (15 points)
    if (investor.geography.includes(targetGeography) || investor.geography.includes('United States')) {
      score += 15;
    } else if (investor.geography.some((geo: string) => geo.includes('US'))) {
      score += 10;
    }
    
    // Fund type relevance (10 points)
    if (profile.stage === 'Pre-seed' || profile.stage === 'Seed') {
      if (investor.fundType === 'Accelerator' || investor.fundType === 'Micro VC' || investor.fundType === 'Angel Group') {
        score += 10;
      }
    } else {
      if (investor.fundType === 'Venture Capital' || investor.fundType === 'Corporate VC') {
        score += 10;
      }
    }
    
    // Thesis alignment (bonus, up to 10 points)
    if (investor.thesis) {
      const thesisLower = investor.thesis.toLowerCase();
      const profileKeywords = [
        profile.industry.toLowerCase(),
        ...profile.problemStatement.toLowerCase().split(' '),
        ...profile.solution.toLowerCase().split(' ')
      ];
      
      const thesisMatches = profileKeywords.filter(keyword =>
        keyword.length > 4 && thesisLower.includes(keyword)
      );
      
      if (thesisMatches.length > 0) {
        score += Math.min(10, thesisMatches.length * 2);
      }
    }
    
    return Math.min(100, Math.round(score));
  }
  
  /**
   * Generates reasons why this investor matches
   */
  private static generateMatchReasons(
    profile: StartupProfile,
    investor: any,
    targetStage: string,
    targetSectors: string[],
    targetCheckSize: number
  ): string[] {
    const reasons: string[] = [];
    
    // Stage match
    if (investor.stages.includes(targetStage)) {
      reasons.push(`✅ Invests in ${targetStage} stage companies`);
    }
    
    // Sector match
    const sectorMatches = targetSectors.filter(sector =>
      investor.sectors.some((invSector: string) =>
        invSector.toLowerCase().includes(sector.toLowerCase()) ||
        sector.toLowerCase().includes(invSector.toLowerCase())
      )
    );
    if (sectorMatches.length > 0) {
      reasons.push(`✅ Active in ${sectorMatches.join(', ')} sector${sectorMatches.length > 1 ? 's' : ''}`);
    }
    
    // Check size match
    if (targetCheckSize >= investor.checkSizeMin && targetCheckSize <= investor.checkSizeMax) {
      reasons.push(`✅ Check size ($${this.formatNumber(targetCheckSize)}) within their range ($${this.formatNumber(investor.checkSizeMin)}-$${this.formatNumber(investor.checkSizeMax)})`);
    }
    
    // Geography match
    if (investor.geography.includes(profile.location.split(',')[0].trim()) ||
        investor.geography.some((geo: string) => profile.location.includes(geo))) {
      reasons.push(`✅ Invests in your geography (${profile.location})`);
    }
    
    // Thesis match
    if (investor.thesis) {
      reasons.push(`✅ Thesis aligns: "${investor.thesis.substring(0, 100)}${investor.thesis.length > 100 ? '...' : ''}"`);
    }
    
    // Fund type relevance
    if (investor.fundType === 'Accelerator') {
      reasons.push(`✅ Accelerator provides mentorship, network, and structured program beyond capital`);
    } else if (investor.fundType === 'Corporate VC') {
      reasons.push(`✅ Corporate VC can provide strategic partnerships and customer access`);
    }
    
    return reasons;
  }
  
  /**
   * Generates pitch adaptation for specific investor
   */
  private static generatePitchAdaptation(profile: StartupProfile, investor: any): string {
    let adaptation = '';
    
    // Stage-specific adaptations
    if (investor.stages.includes('Pre-seed') || investor.stages.includes('Seed')) {
      adaptation += 'Early-stage investors prioritize team and vision over metrics. Lead with: (1) your unique insight/unfair advantage, (2) why now is the right time, (3) your ability to execute. ';
    } else {
      adaptation += 'Growth-stage investors focus on metrics and scalability. Lead with: (1) traction and growth rate, (2) unit economics, (3) path to profitability. ';
    }
    
    // Sector-specific adaptations
    const profileSectors = this.extractSectors(profile.industry);
    const matchingSectors = investor.sectors.filter((sector: string) =>
      profileSectors.some(ps => sector.toLowerCase().includes(ps.toLowerCase()))
    );
    
    if (matchingSectors.length > 0) {
      adaptation += `They're experts in ${matchingSectors[0]}, so dive deep into technical details and market dynamics they'll appreciate. `;
    }
    
    // Thesis-specific adaptations
    if (investor.thesis) {
      adaptation += `Their thesis: "${investor.thesis.substring(0, 150)}${investor.thesis.length > 150 ? '...' : ''}". Frame your pitch to show how you exemplify this thesis. `;
    }
    
    // Fund type adaptations
    if (investor.fundType === 'Accelerator') {
      adaptation += 'Accelerators value coachability and commitment. Emphasize: what specific help you need, why their network/mentors matter, and your full-time dedication. ';
    } else if (investor.fundType === 'Corporate VC') {
      adaptation += 'Corporate VCs seek strategic fit with parent company. Highlight: potential partnerships, complementary products, or customer synergies. ';
    } else if (investor.fundType === 'Micro VC') {
      adaptation += 'Micro VCs are hands-on and thesis-driven. Show: clear capital efficiency plan and how their specific expertise helps you win. ';
    }
    
    // Personalization
    adaptation += `\n\n**Before reaching out:** Research their recent investments (check their portfolio), read their blog/tweets, and find a warm intro if possible. Reference specific portfolio companies or insights in your outreach.`;
    
    return adaptation;
  }
  
  /**
   * Generates explanation of why this investor is a strong match
   */
  private static generateWhyThisInvestor(profile: StartupProfile, investor: any): string {
    let explanation = `**Why ${investor.firmName} is a strong match:**\n\n`;
    
    // Reputation and portfolio
    if (investor.bio.includes('portfolio') || investor.bio.includes('invested in')) {
      explanation += `Their portfolio and track record in ${investor.sectors[0]} means they understand your market deeply and can provide strategic guidance beyond capital.\n\n`;
    }
    
    // Network and resources
    if (investor.fundType === 'Accelerator') {
      explanation += `As an accelerator, they provide structured mentorship, investor network access, and peer community - critical for early-stage startups.\n\n`;
    } else if (investor.fundType === 'Corporate VC') {
      explanation += `Corporate backing provides potential customer access, technology partnerships, and distribution channels that pure financial VCs can't offer.\n\n`;
    } else {
      explanation += `Their focus on ${investor.stages[0]} ${investor.sectors[0]} companies means they have deep pattern recognition for what works at your stage.\n\n`;
    }
    
    // Check size fit
    explanation += `Their typical check size ($${this.formatNumber(investor.checkSizeMin)}-$${this.formatNumber(investor.checkSizeMax)}) aligns with your needs, `;
    if (investor.checkSizeMin > 500000) {
      explanation += 'and they can lead your round, which simplifies fundraising.\n\n';
    } else {
      explanation += 'making them ideal for your syndicate.\n\n';
    }
    
    // Value-add
    explanation += `**Specific value-add:** `;
    if (investor.sectors.includes('AI/ML') || investor.sectors.includes('Enterprise Software')) {
      explanation += 'Technical expertise to help with product architecture and hiring senior engineers.';
    } else if (investor.sectors.includes('Consumer') || investor.sectors.includes('Marketplace')) {
      explanation += 'Growth marketing expertise and playbooks for scaling user acquisition.';
    } else if (investor.sectors.includes('Fintech') || investor.sectors.includes('Healthcare')) {
      explanation += 'Regulatory guidance and introductions to strategic partners in highly regulated industries.';
    } else {
      explanation += 'Industry connections and operational expertise from backing similar companies.';
    }
    
    return explanation;
  }
  
  /**
   * Generates key talking points for this investor meeting
   */
  private static generateKeyTalkingPoints(profile: StartupProfile, investor: any): string[] {
    const talkingPoints: string[] = [];
    
    // Sector-specific points
    if (investor.sectors.length > 0) {
      talkingPoints.push(`Emphasize your deep understanding of ${investor.sectors[0]} market dynamics and trends`);
    }
    
    // Stage-specific points
    if (investor.stages.includes('Pre-seed') || investor.stages.includes('Seed')) {
      talkingPoints.push('Focus on team capability, market insight, and early validation rather than metrics');
      talkingPoints.push('Share your "unfair advantage" - unique insight or capability competitors lack');
    } else {
      talkingPoints.push('Lead with quantitative traction: growth rate, unit economics, and market penetration');
      talkingPoints.push('Discuss path to next funding milestone and ultimate exit potential');
    }
    
    // Fund-specific points
    if (investor.fundType === 'Accelerator') {
      talkingPoints.push('Express specific asks: what mentorship, connections, or resources you need from the program');
    } else if (investor.fundType === 'Corporate VC') {
      talkingPoints.push('Highlight strategic synergies with parent company and potential partnership opportunities');
    }
    
    // Universal points
    talkingPoints.push(`Prepare for questions about: competitive landscape, go-to-market strategy, and why now is the right time`);
    talkingPoints.push(`Have concrete answers for: your 12-18 month roadmap, key hires you'll make, and use of funds breakdown`);
    
    return talkingPoints;
  }
  
  // Helper functions
  
  private static mapStageToInvestorStage(stage: string): string {
    const stageMap: { [key: string]: string } = {
      'Idea': 'Pre-seed',
      'Pre-seed': 'Pre-seed',
      'Seed': 'Seed',
      'Series A': 'Series A',
      'Series B': 'Series B',
      'Series C': 'Series C+',
      'Series C+': 'Series C+',
      'Growth': 'Series C+',
      'Late Stage': 'Series C+'
    };
    return stageMap[stage] || 'Pre-seed';
  }
  
  private static extractSectors(industry: string): string[] {
    const sectors: string[] = [];
    const industryLower = industry.toLowerCase();
    
    const sectorKeywords = {
      'ai/ml': ['ai', 'artificial intelligence', 'machine learning', 'ml', 'deep learning'],
      'fintech': ['fintech', 'financial', 'payments', 'banking', 'crypto', 'blockchain'],
      'healthcare': ['health', 'healthcare', 'medical', 'biotech', 'digital health'],
      'enterprise': ['enterprise', 'saas', 'b2b', 'software'],
      'consumer': ['consumer', 'b2c', 'marketplace', 'social'],
      'climate': ['climate', 'clean', 'cleantech', 'energy', 'sustainability'],
      'edtech': ['education', 'edtech', 'learning'],
      'biotech': ['biotech', 'biology', 'pharmaceutical', 'life sciences']
    };
    
    for (const [sector, keywords] of Object.entries(sectorKeywords)) {
      if (keywords.some(keyword => industryLower.includes(keyword))) {
        sectors.push(sector);
      }
    }
    
    return sectors.length > 0 ? sectors : ['technology'];
  }
  
  private static extractGeography(location: string): string {
    if (location.includes('San Francisco') || location.includes('SF') || location.includes('Bay Area')) {
      return 'San Francisco Bay Area';
    } else if (location.includes('New York') || location.includes('NYC')) {
      return 'New York';
    } else if (location.includes('Los Angeles') || location.includes('LA')) {
      return 'Los Angeles';
    } else if (location.includes('Boston')) {
      return 'Boston';
    } else if (location.includes('Austin')) {
      return 'Austin';
    } else if (location.includes('Seattle')) {
      return 'Seattle';
    }
    return 'United States';
  }
  
  private static extractNumber(text: string): number {
    if (!text) return 0;
    
    // Remove common prefixes and clean up
    const cleaned = text.replace(/[$,]/g, '').toLowerCase();
    
    // Extract number with possible K, M, B suffixes
    const match = cleaned.match(/(\d+\.?\d*)\s*(k|m|b)?/);
    if (!match) return 0;
    
    let num = parseFloat(match[1]);
    const suffix = match[2];
    
    if (suffix === 'k') num *= 1000;
    else if (suffix === 'm') num *= 1000000;
    else if (suffix === 'b') num *= 1000000000;
    
    return num;
  }
  
  private static formatNumber(num: number): string {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1) + 'B';
    } else if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(0) + 'K';
    }
    return num.toFixed(0);
  }
  
  /**
   * Deep analysis of the core idea - understanding what makes it unique
   */
  private static analyzeCoreIdea(profile: StartupProfile): {
    isNovel: boolean;
    noveltyLevel: string;
    coreInsight: string;
    marketNeed: string;
  } {
    const problem = profile.problemStatement.toLowerCase();
    const solution = profile.solution.toLowerCase();
    const unique = profile.uniqueValue.toLowerCase();
    
    // Detect novelty signals
    const noveltyKeywords = ['first', 'only', 'novel', 'unique', 'revolutionary', 'breakthrough', 'unprecedented', 'new approach'];
    const hasNovelty = noveltyKeywords.some(kw => problem.includes(kw) || solution.includes(kw) || unique.includes(kw));
    
    // Extract core insight
    let coreInsight = '';
    if (unique.length > 50) {
      coreInsight = unique.substring(0, 150) + (unique.length > 150 ? '...' : '');
    } else if (solution.length > 50) {
      coreInsight = solution.substring(0, 150) + (solution.length > 150 ? '...' : '');
    } else {
      coreInsight = 'addressing a specific market need';
    }
    
    // Determine novelty level
    let noveltyLevel = 'promising';
    if (hasNovelty && (unique.length > 100 || solution.length > 100)) {
      noveltyLevel = 'highly innovative';
    } else if (hasNovelty) {
      noveltyLevel = 'innovative';
    }
    
    // Extract market need
    let marketNeed = '';
    if (problem.length > 50) {
      marketNeed = problem.substring(0, 100) + (problem.length > 100 ? '...' : '');
    } else {
      marketNeed = 'a market opportunity in ' + profile.industry;
    }
    
    return {
      isNovel: hasNovelty,
      noveltyLevel,
      coreInsight,
      marketNeed
    };
  }
  
  /**
   * Analyzes the long-term vision and ambition
   */
  private static analyzeVision(profile: StartupProfile): {
    hasClearVision: boolean;
    visionSummary: string;
    ambitionLevel: string;
  } {
    const vision = profile.futureVision.toLowerCase();
    const hasVision = Boolean(profile.futureVision && profile.futureVision.length > 50);
    
    let visionSummary = '';
    if (hasVision) {
      visionSummary = profile.futureVision.substring(0, 100) + (profile.futureVision.length > 100 ? '...' : '');
    } else {
      visionSummary = 'build a successful company';
    }
    
    // Detect ambition level
    const ambitiousKeywords = ['transform', 'revolutionize', 'dominate', 'leader', 'standard', 'platform', 'ecosystem', 'category'];
    const hasAmbition = ambitiousKeywords.some(kw => vision.includes(kw));
    
    let ambitionLevel = 'moderate';
    if (hasAmbition && vision.length > 100) {
      ambitionLevel = 'high';
    } else if (hasAmbition) {
      ambitionLevel = 'moderate-to-high';
    }
    
    return {
      hasClearVision: hasVision,
      visionSummary,
      ambitionLevel
    };
  }
  
  /**
   * Identifies niche positioning and advantages
   */
  private static identifyNichePositioning(profile: StartupProfile): {
    hasNiche: boolean;
    nicheDescription: string;
    nicheAdvantage: string;
  } {
    const industry = profile.industry.toLowerCase();
    const problem = profile.problemStatement.toLowerCase();
    const solution = profile.solution.toLowerCase();
    
    // Detect niche signals
    const nicheKeywords = ['specific', 'focused', 'niche', 'vertical', 'specialized', 'targeted', 'particular'];
    const hasNicheSignal = nicheKeywords.some(kw => problem.includes(kw) || solution.includes(kw));
    
    // Extract niche description
    let nicheDescription = '';
    if (hasNicheSignal) {
      // Try to extract the specific niche
      const nichePatterns = [
        /targeting\s+([^,\.]+)/i,
        /focusing\s+on\s+([^,\.]+)/i,
        /serving\s+([^,\.]+)/i,
        /for\s+([^,\.]+)\s+companies/i
      ];
      
      for (const pattern of nichePatterns) {
        const match = (problem + ' ' + solution).match(pattern);
        if (match && match[1]) {
          nicheDescription = match[1].trim();
          break;
        }
      }
      
      if (!nicheDescription) {
        nicheDescription = 'specific segment within ' + profile.industry;
      }
    } else {
      nicheDescription = 'broad market in ' + profile.industry;
    }
    
    // Determine advantage
    let nicheAdvantage = '';
    if (hasNicheSignal) {
      nicheAdvantage = 'allows for deeper expertise and faster customer acquisition';
    } else {
      nicheAdvantage = 'provides larger addressable market but requires clear differentiation';
    }
    
    return {
      hasNiche: hasNicheSignal,
      nicheDescription,
      nicheAdvantage
    };
  }
}

