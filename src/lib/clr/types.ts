export type SourceMode = "url" | "json" | "demo";
export const transcriptEntryTypes = [
  "coursework",
  "internship",
  "live project",
  "assessment",
] as const;
export type TranscriptEntryType = (typeof transcriptEntryTypes)[number];
export type TranscriptTemplate =
  | "heritage"
  | "scholar"
  | "modern"
  | "executive"
  | "ledger"
  | "minimal"
  | "atelier"
  | "spectrum"
  | "clarity"
  | "monograph";

export interface NormalizeClrRequest {
  mode: SourceMode;
  url?: string;
  json?: string;
}

export interface TranscriptLegendItem {
  label: string;
  description: string;
}

export interface TranscriptAlignment {
  name: string;
  code?: string;
  framework?: string;
  description?: string;
  targetType?: string;
  url?: string;
}

export interface TranscriptRubricCriterionLevel {
  id: string;
  name: string;
  level?: string;
  description?: string;
  points?: string;
  alignment: TranscriptAlignment[];
}

export interface TranscriptResultDescriptor {
  id: string;
  name: string;
  resultType: string;
  description?: string;
  value?: string;
  status?: string;
  valueMin?: string;
  valueMax?: string;
  rubricLevels: TranscriptRubricCriterionLevel[];
  alignment: TranscriptAlignment[];
  achievedLevelId?: string;
  achievedLevelLabel?: string;
}

export interface TranscriptSkill {
  name: string;
  proficiencyLevel?: string;
  framework?: string;
  code?: string;
  description?: string;
  targetType?: string;
  url?: string;
}

export interface TranscriptCourse {
  id: string;
  title: string;
  code: string;
  credentialType: TranscriptEntryType;
  issuer: string;
  term: string;
  summary: string;
  skills: string[];
  skillDetails: TranscriptSkill[];
  alignments: TranscriptAlignment[];
  gradeLabel: string;
  gradeValue?: number;
  proficiencyLabel: string;
  creditsLabel: string;
  creditsValue?: number;
  status: string;
  hasEvidence: boolean;
  startDate?: string;
  endDate?: string;
  resultDescriptors: TranscriptResultDescriptor[];
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
  proficiencyLegend: TranscriptLegendItem[];
  abbreviations: TranscriptLegendItem[];
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
