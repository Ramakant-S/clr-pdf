import type { TranscriptCustomization } from "@/lib/clr/types";

export const defaultInstitutionBranding = {
  name: "Goa Tech Institute",
  boardName: "Academic Records Office",
  address: "Plot 42, Kadamba Plateau, Panaji, Goa 403006, India",
  website: "https://goatech.example",
  verificationUrl:
    "https://testapp.thesolo.network/clr-credentials/89ce185b-677e-5992-ba18-59a23e48296c",
  registrarName: "Office of the Registrar",
  principalName: "Academic Dean",
  sealText: "GT",
  footerText:
    "Prepared for official academic review and print distribution by Goa Tech Institute.",
  logoPath: "/institution-logo.svg",
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

export function isDefaultInstitutionBranding(name?: string, website?: string) {
  return Boolean(
    name?.toLowerCase().includes(defaultInstitutionBranding.name.toLowerCase()) ||
      website?.toLowerCase().includes("goatech.example"),
  );
}
