export interface OfferDTO {
  id: string;
  projectId: string;
  version: number;
  fundingGoal: number;
  minInvestment: number;
  maxInvestment: number | null;
  annualRate: number | null;
  ratePeriod: string | null;
  durationMonths: number | null;
  repaymentType: string | null;
  equityOfferedPct: number | null;
  valuationPre: number | null;
  upfrontCommissionPct: number;
  annualFollowUpPct: number;
  raisedAmount: number;
  committedAmount: number;
  backersCount: number;
  publishedAt: string;
  closingDate: string;
  visibility: string;
  status: string;
  project: ProjectDTO;
}

export interface ProjectDTO {
  id: string;
  companyId: string;
  title: string;
  description: string;
  longDescription: string;
  sector: string;
  country: string;
  city: string;
  imageUrl: string;
  instrumentType: string;
  fundingGoal: number;
  companyContribution: number;
  minInvestment: number;
  risksIdentified: string;
  repaymentSource: string;
  budgetDetail: string;
  company: CompanyDTO;
}

export interface Project extends ProjectDTO {
  tagline: string;
  raisedAmount: number;
  backersCount: number;
  riskLevel: "Faible" | "Modéré" | "Élevé" | string;
  featured?: boolean;
  expectedRoi: number;
  duration: number;
  equityOffered: number;
  jobsCreated: number;
  promoterName: string;
  promoterRole: string;
  promoterBio: string;
}

export type ProjectDetail = Project;

export interface PlatformStats {
  totalRaised: number;
  activeProjects: number;
  totalBackers: number;
  totalJobs: number;
  bySector: Array<{ name: string; value: number }>;
  byCountry: Array<{ name: string; value: number }>;
}

export interface CompanyDTO {
  id: string;
  legalName: string;
  tradeName: string;
  legalForm: string;
  country: string;
  activity: string;
  foundedYear: number;
  verificationStatus: string;
}

export interface InvestmentDTO {
  id: string;
  offerId: string;
  investorType: string;
  investorId: string;
  investorName: string;
  investorEmail: string;
  amount: number;
  sharePct: number;
  status: string;
  signedAt: string | null;
  paymentConfirmedAt: string | null;
  createdAt: string;
  project?: ProjectDTO;
}

export interface SimulationResult {
  expectedRepayment?: number;
  perInvestorRepayment: number;
  capitalPlusInterest: number;
  investorInterest: number;
  upfrontCommission: number;
  netToCompany: number;
  followUpCommission: number;
  totalCompanyPayment: number;
  platformRevenue: number;
  sharePct: number;
  offerAllocationPct?: number;
  companyOwnershipPct?: number;
}
