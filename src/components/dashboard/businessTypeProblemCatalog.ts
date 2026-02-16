export const BUSINESS_TYPE_PROBLEM_CATEGORIES = {
  'Web Agencies': [
    'Website Absence',
    'Website Quality & Design',
    'Mobile Optimization Issues',
    'Technical Website Errors',
    'Conversion & CTA Weakness',
    'Booking & Automation Gaps',
    'Trust & Credibility Deficits',
    'Brand Presentation Issues',
    'Website Performance Problems',
    'Compliance & Legal Gaps',
  ],
  'SEO / Digital Marketing Agencies': [
    'Local SEO Weakness',
    'Organic Ranking Deficiency',
    'Content Depth & Structure Issues',
    'Keyword Optimization Gaps',
    'Technical SEO Errors',
    'Backlink & Authority Weakness',
    'Citation & NAP Inconsistency',
    'Google Business Optimization Issues',
    'Low Search Intent Coverage',
    'Content Freshness & Update Gaps',
  ],
  'Social Media Agencies': [
    'Social Media Absence',
    'Inactive Social Accounts',
    'Low Engagement Rate',
    'Poor Content Quality',
    'Brand Inconsistency Across Platforms',
    'No Video / Reels Presence',
    'Weak Community Interaction',
    'No Paid Ad Utilization',
    'Missing Social-to-Website Integration',
    'Platform Diversification Gaps',
  ],
  'Reputation Management Agencies': [
    'Low Overall Rating',
    'Negative Review Clusters',
    'No Owner Responses',
    'Review Stagnation',
    'Low Review Volume',
    'Poor Review Sentiment Distribution',
    'Reputation Platform Absence',
    'No Review Generation System',
    'Public Complaint Exposure',
    'Brand Trust Signal Deficiency',
  ],
  'Booking / Automation SaaS Providers': [
    'No Online Booking System',
    'Manual Appointment Handling',
    'No CRM Integration',
    'No Automated Reminders',
    'No Calendar Sync',
    'No Chatbot / Instant Messaging',
    'Paper-Based Workflow',
    'No Payment Integration',
    'No Client Database',
    'No Follow-Up Automation',
  ],
  'Local Marketing Agencies': [
    'Google Business Incompleteness',
    'Low Map Pack Visibility',
    'Missing Business Description',
    'No Image / Media Uploads',
    'Poor Category Optimization',
    'No Local Landing Pages',
    'No Geo-Targeted Content',
    'Weak Local Backlinks',
    'Inconsistent Directory Listings',
    'No Promotional Activity',
  ],
  'IT / Cybersecurity Providers': [
    'No SSL / HTTPS',
    'Outdated CMS / Plugins',
    'No Firewall Protection',
    'No Backup System',
    'Weak Password Policies',
    'No Privacy Policy / Compliance Issues',
    'Data Protection Gaps',
    'Slow / Vulnerable Hosting',
    'No Monitoring System',
    'No Security Certifications Displayed',
  ],
  'Branding / Design Agencies': [
    'Outdated Logo',
    'Inconsistent Brand Identity',
    'Poor Visual Quality',
    'Low-Quality Photography',
    'No Brand Guidelines',
    'Weak Typography & Layout',
    'No Unique Value Messaging',
    'No Portfolio Showcase',
    'Generic Website Templates',
    'No Brand Storytelling',
  ],
  'Recruitment Agencies': [
    'No Careers Page',
    'No Open Job Listings',
    'Weak Employer Branding',
    'No LinkedIn Presence',
    'No Application Funnel',
    'No Talent Pipeline System',
    'Outdated Job Descriptions',
    'Poor Candidate Experience',
    'No Recruiting Content',
    'No Hiring Campaigns',
  ],
  'Lead Generation Agencies': [
    'No Landing Pages',
    'No Lead Capture Forms',
    'No Funnel Structure',
    'No Tracking / Analytics',
    'No Email Marketing Setup',
    'Weak Offer Positioning',
    'No Retargeting Setup',
    'No Lead Magnets',
    'No Conversion Tracking',
    'Poor Value Proposition Messaging',
  ],
} as const;

export type BusinessType = keyof typeof BUSINESS_TYPE_PROBLEM_CATEGORIES;

export const BUSINESS_TYPE_OPTIONS = Object.keys(
  BUSINESS_TYPE_PROBLEM_CATEGORIES,
) as BusinessType[];

export const getProblemCategoriesForBusinessType = (
  businessType: string,
): string[] => {
  if (!businessType) {
    return [];
  }

  const categories =
    BUSINESS_TYPE_PROBLEM_CATEGORIES[
      businessType as keyof typeof BUSINESS_TYPE_PROBLEM_CATEGORIES
    ];

  if (!categories) {
    return [];
  }

  return [...categories];
};
