export type SourceMode = "url" | "json" | "demo";
export type TranscriptTemplate =
  | "heritage"
  | "scholar"
  | "modern"
  | "executive"
  | "ledger"
  | "minimal";

export interface NormalizeClrRequest {
  mode: SourceMode;
  url?: string;
  json?: string;
}

export interface TranscriptLegendItem {
  label: string;
  description: string;
}

export interface TranscriptCourse {
  id: string;
  title: string;
  code: string;
  issuer: string;
  term: string;
  summary: string;
  skills: string[];
  gradeLabel: string;
  gradeValue?: number;
  creditsLabel: string;
  creditsValue?: number;
  status: string;
  startDate?: string;
  endDate?: string;
}

export interface TranscriptInstitution {
  name: string;
  boardName?: string;
  address?: string;
  website?: string;
  logoText: string;
}

export interface TranscriptLearner {
  fullName: string;
  studentId: string;
  gradeLevel?: string;
  programName?: string;
  homeroom?: string;
  oen?: string;
  profileSummary: string;
}

export interface TranscriptSummary {
  totalCourses: number;
  totalCredits: number;
  averageGrade?: number;
  overallResult: string;
  academicStanding: string;
  topSkills: string[];
}

export interface TranscriptRecord {
  sourceType: SourceMode;
  sourceUrl?: string;
  verificationUrl?: string;
  credentialId: string;
  title: string;
  issuedOn: string;
  institution: TranscriptInstitution;
  learner: TranscriptLearner;
  summary: TranscriptSummary;
  courses: TranscriptCourse[];
  notes: string[];
  gradeLegend: TranscriptLegendItem[];
  modelHints: string[];
}

export interface TranscriptCustomization {
  institutionName: string;
  boardName: string;
  institutionAddress: string;
  institutionWebsite: string;
  registrarName: string;
  principalName: string;
  reportingPeriodLabel: string;
  overallResult: string;
  academicStanding: string;
  programName: string;
  studentNumber: string;
  sealText: string;
  homeroom: string;
  footerText: string;
  template: TranscriptTemplate;
}
