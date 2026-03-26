import type { TranscriptCustomization } from "@/lib/clr/types";

export const defaultInstitutionBranding = {
  name: "International Business University",
  boardName: "Toronto Campus",
  address: "655 Bay St., Suite 200, Toronto M5G 2K4, Canada",
  website: "https://ibu.ca",
  registrarName: "Office of the Registrar",
  principalName: "Academic Dean",
  sealText: "IBU",
  footerText:
    "Prepared for official academic review and print distribution by International Business University.",
  logoPath: "/ibu-logo.svg",
} as const;

export const defaultTranscriptCustomization: TranscriptCustomization = {
  institutionName: defaultInstitutionBranding.name,
  boardName: defaultInstitutionBranding.boardName,
  institutionAddress: defaultInstitutionBranding.address,
  institutionWebsite: defaultInstitutionBranding.website,
  registrarName: defaultInstitutionBranding.registrarName,
  principalName: defaultInstitutionBranding.principalName,
  reportingPeriodLabel: "Semester Final 2025-2026",
  overallResult: "",
  academicStanding: "",
  programName: "",
  studentNumber: "",
  sealText: defaultInstitutionBranding.sealText,
  homeroom: "",
  footerText: defaultInstitutionBranding.footerText,
  template: "heritage",
};

export function isIbuBranding(name?: string, website?: string) {
  return Boolean(
    name?.toLowerCase().includes("international business university") ||
      website?.toLowerCase().includes("ibu.ca"),
  );
}
