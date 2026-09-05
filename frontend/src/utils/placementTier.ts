export type TierLevel = 'Bronze' | 'Silver' | 'Gold' | 'Diamond'

export interface TierRequirement {
  id: string
  label: string
  currentValue: string | number
  requiredValue: string | number
  isMet: boolean
  tip: string
}

export interface PlacementTierInfo {
  currentTier: TierLevel
  tierName: string
  packageRange: string
  category: string
  color: string
  badgeBg: string
  nextTier: TierLevel | null
  nextTierName: string | null
  nextPackageRange: string | null
  progressToNextTier: number
  requirements: TierRequirement[]
  unlockedFeatures: string[]
}

interface EvaluationInput {
  cgpa: number
  codingScore: number
  verifiedProjectsCount: number
  backlogs: number
  attendancePercent: number
}

export function evaluatePlacementTier(input: EvaluationInput): PlacementTierInfo {
  const { cgpa, codingScore, verifiedProjectsCount, backlogs } = input

  // Check Diamond Criteria
  const diamondReqs: TierRequirement[] = [
    {
      id: 'cgpa',
      label: 'Minimum CGPA',
      currentValue: cgpa.toFixed(2),
      requiredValue: '8.50',
      isMet: cgpa >= 8.5,
      tip: cgpa < 8.5 ? `Aim for ${(8.5 - cgpa).toFixed(2)} higher CGPA in upcoming exams` : 'CGPA criteria satisfied',
    },
    {
      id: 'coding',
      label: 'Coding & DSA Score',
      currentValue: codingScore,
      requiredValue: 260,
      isMet: codingScore >= 260,
      tip: codingScore < 260 ? `Need +${260 - codingScore} coding points on LeetCode/HackerRank` : 'Coding proficiency satisfied',
    },
    {
      id: 'projects',
      label: 'Verified Project Proofs',
      currentValue: verifiedProjectsCount,
      requiredValue: 4,
      isMet: verifiedProjectsCount >= 4,
      tip: verifiedProjectsCount < 4 ? `Add ${4 - verifiedProjectsCount} more project with GitHub/Live URL` : 'Portfolio criteria satisfied',
    },
    {
      id: 'backlogs',
      label: 'Active Backlogs',
      currentValue: backlogs,
      requiredValue: 0,
      isMet: backlogs === 0,
      tip: backlogs > 0 ? `Clear ${backlogs} active backlog(s)` : 'Zero backlogs verified',
    },
  ]

  // Check Gold Criteria
  const goldReqs: TierRequirement[] = [
    {
      id: 'cgpa',
      label: 'Minimum CGPA',
      currentValue: cgpa.toFixed(2),
      requiredValue: '8.00',
      isMet: cgpa >= 8.0,
      tip: cgpa < 8.0 ? `Need ${(8.0 - cgpa).toFixed(2)} higher CGPA` : 'CGPA criteria satisfied',
    },
    {
      id: 'coding',
      label: 'Coding & DSA Score',
      currentValue: codingScore,
      requiredValue: 220,
      isMet: codingScore >= 220,
      tip: codingScore < 220 ? `Need +${220 - codingScore} coding points` : 'Coding score satisfied',
    },
    {
      id: 'projects',
      label: 'Verified Project Proofs',
      currentValue: verifiedProjectsCount,
      requiredValue: 3,
      isMet: verifiedProjectsCount >= 3,
      tip: verifiedProjectsCount < 3 ? `Add ${3 - verifiedProjectsCount} more verified project proof(s)` : 'Portfolio proofs satisfied',
    },
    {
      id: 'backlogs',
      label: 'Active Backlogs',
      currentValue: backlogs,
      requiredValue: 0,
      isMet: backlogs === 0,
      tip: backlogs > 0 ? `Clear active backlog(s)` : 'No backlogs',
    },
  ]

  // Check Silver Criteria
  const silverReqs: TierRequirement[] = [
    {
      id: 'cgpa',
      label: 'Minimum CGPA',
      currentValue: cgpa.toFixed(2),
      requiredValue: '7.50',
      isMet: cgpa >= 7.5,
      tip: cgpa < 7.5 ? `Need ${(7.5 - cgpa).toFixed(2)} higher CGPA` : 'CGPA criteria satisfied',
    },
    {
      id: 'coding',
      label: 'Coding & DSA Score',
      currentValue: codingScore,
      requiredValue: 150,
      isMet: codingScore >= 150,
      tip: codingScore < 150 ? `Need +${150 - codingScore} coding points` : 'Coding score satisfied',
    },
    {
      id: 'projects',
      label: 'Verified Project Proofs',
      currentValue: verifiedProjectsCount,
      requiredValue: 1,
      isMet: verifiedProjectsCount >= 1,
      tip: verifiedProjectsCount < 1 ? 'Add at least 1 project with verified GitHub or demo URL' : 'Portfolio proof verified',
    },
  ]

  // Check Bronze Criteria
  const bronzeReqs: TierRequirement[] = [
    {
      id: 'cgpa',
      label: 'Minimum CGPA',
      currentValue: cgpa.toFixed(2),
      requiredValue: '6.50',
      isMet: cgpa >= 6.5,
      tip: cgpa < 6.5 ? `Need ${(6.5 - cgpa).toFixed(2)} higher CGPA` : 'CGPA criteria satisfied',
    },
    {
      id: 'backlogs',
      label: 'Maximum Backlogs Allowed',
      currentValue: backlogs,
      requiredValue: '<= 2',
      isMet: backlogs <= 2,
      tip: backlogs > 2 ? 'Backlogs exceed service tier limits' : 'Within allowed limits',
    },
  ]

  const isDiamond = diamondReqs.every((r) => r.isMet)
  const isGold = goldReqs.every((r) => r.isMet)
  const isSilver = silverReqs.every((r) => r.isMet)
  const isBronze = bronzeReqs.every((r) => r.isMet)

  if (isDiamond) {
    return {
      currentTier: 'Diamond',
      tierName: 'Diamond Tier',
      packageRange: '25+ LPA',
      category: 'Super Dream & Tier-1 Product',
      color: '#60A5FA', // Blue / Diamond
      badgeBg: 'rgba(96, 165, 250, 0.15)',
      nextTier: null,
      nextTierName: null,
      nextPackageRange: null,
      progressToNextTier: 100,
      requirements: diamondReqs,
      unlockedFeatures: [
        'Eligible for Super Dream campus recruitment drives (25+ LPA)',
        'Direct recruiter recommendation badge on candidate listings',
        'Top 5% verified portfolio priority',
      ],
    }
  }

  if (isGold) {
    const metCount = diamondReqs.filter((r) => r.isMet).length
    const progress = Math.round((metCount / diamondReqs.length) * 100)
    return {
      currentTier: 'Gold',
      tierName: 'Gold Tier',
      packageRange: '12–25 LPA',
      category: 'Product & High-Growth Tech',
      color: '#F59E0B', // Gold / Amber
      badgeBg: 'rgba(245, 158, 11, 0.15)',
      nextTier: 'Diamond',
      nextTierName: 'Diamond Tier (Super Dream)',
      nextPackageRange: '25+ LPA',
      progressToNextTier: progress,
      requirements: diamondReqs,
      unlockedFeatures: [
        'Eligible for Product-based recruitment drives (12–25 LPA)',
        'Verified technical badge sent to shortlisted recruiters',
        'Priority placement interview slots',
      ],
    }
  }

  if (isSilver) {
    const metCount = goldReqs.filter((r) => r.isMet).length
    const progress = Math.round((metCount / goldReqs.length) * 100)
    return {
      currentTier: 'Silver',
      tierName: 'Silver Tier',
      packageRange: '7–12 LPA',
      category: 'Core Engineering & Tech Services',
      color: '#94A3B8', // Silver
      badgeBg: 'rgba(148, 163, 184, 0.15)',
      nextTier: 'Gold',
      nextTierName: 'Gold Tier (Product)',
      nextPackageRange: '12–25 LPA',
      progressToNextTier: progress,
      requirements: goldReqs,
      unlockedFeatures: [
        'Eligible for Core Engineering & IT Product roles (7–12 LPA)',
        'Campus placement drive automated shortlisting',
        'Skill profile verified for recruiter search',
      ],
    }
  }

  if (isBronze) {
    const metCount = silverReqs.filter((r) => r.isMet).length
    const progress = Math.round((metCount / silverReqs.length) * 100)
    return {
      currentTier: 'Bronze',
      tierName: 'Bronze Tier',
      packageRange: '4–6 LPA',
      category: 'Mass Hiring & IT Services',
      color: '#D97706', // Bronze
      badgeBg: 'rgba(217, 119, 6, 0.15)',
      nextTier: 'Silver',
      nextTierName: 'Silver Tier (Core / Tech)',
      nextPackageRange: '7–12 LPA',
      progressToNextTier: progress,
      requirements: silverReqs,
      unlockedFeatures: [
        'Eligible for IT Services & Graduate Campus Hiring (4–6 LPA)',
        'Foundation placement readiness verified',
      ],
    }
  }

  // Baseline / Pre-Bronze
  const metCount = bronzeReqs.filter((r) => r.isMet).length
  const progress = Math.round((metCount / bronzeReqs.length) * 100)
  return {
    currentTier: 'Bronze',
    tierName: 'Foundational Phase',
    packageRange: '4–6 LPA Target',
    category: 'Skill Building in Progress',
    color: '#FF5A28', // Ember
    badgeBg: 'rgba(255, 90, 40, 0.15)',
    nextTier: 'Bronze',
    nextTierName: 'Bronze Tier',
    nextPackageRange: '4–6 LPA',
    progressToNextTier: progress,
    requirements: bronzeReqs,
    unlockedFeatures: [
      'Access to foundational technical and aptitude assessments',
      'Remedial session support to reach 6.5+ CGPA',
    ],
  }
}
