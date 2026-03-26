import { defaultInstitutionBranding } from "@/lib/branding/defaults";

export const demoClrPayload = {
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://purl.imsglobal.org/spec/clr/v2p0/context-2.0.1.json",
    "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
  ],
  id: "https://ibu.ca/demo/clr/2026/semester-final",
  type: ["VerifiableCredential", "ClrCredential"],
  name: "Higher Secondary Comprehensive Learner Record",
  issuer: {
    id: "https://ibu.ca/demo/issuers/registrar",
    type: ["Profile"],
    name: defaultInstitutionBranding.name,
    url: defaultInstitutionBranding.website,
    address: {
      streetAddress: "655 Bay St., Suite 200",
      addressLocality: "Toronto",
      addressRegion: "ON",
      postalCode: "M5G 2K4",
      addressCountry: "Canada",
    },
  },
  validFrom: "2026-03-18T09:00:00Z",
  credentialSubject: {
    id: "did:example:student-amara-nelson",
    type: ["Learner"],
    name: "Amara Nelson",
    studentId: "IBU-2026-1042",
    gradeLevel: "Year 4",
    homeroom: "",
    programName: "Bachelor of Commerce (Honours)",
    verifiableCredential: [
      {
        id: "https://ibu.ca/demo/course/english-12",
        type: ["VerifiableCredential", "OpenBadgeCredential", "AchievementCredential"],
        issuer: {
          id: "https://ibu.ca/demo/issuers/english",
          name: defaultInstitutionBranding.name,
        },
        validFrom: "2025-12-12T09:00:00Z",
        credentialSubject: {
          id: "did:example:student-amara-nelson",
          achievement: {
            id: "https://ibu.ca/demo/achievements/eng4u",
            type: ["Achievement"],
            name: "English Literature and Composition",
            description:
              "Advanced analytical reading, persuasive writing, and seminar leadership with a focus on comparative texts.",
            identifier: [{ type: "CourseCode", identifier: "ENG4U" }],
            creditsAvailable: { value: 1 },
            term: "Semester 1",
            alignment: [
              { targetName: "Critical Writing" },
              { targetName: "Research Synthesis" },
              { targetName: "Discussion Leadership" },
            ],
          },
          result: [
            { resultDescription: "Final Grade", value: "92" },
            { resultDescription: "Result", value: "Promoted" },
          ],
        },
      },
      {
        id: "https://ibu.ca/demo/course/calculus-advanced",
        type: ["VerifiableCredential", "OpenBadgeCredential", "AchievementCredential"],
        issuer: {
          id: "https://ibu.ca/demo/issuers/stem",
          name: defaultInstitutionBranding.name,
        },
        validFrom: "2025-12-12T09:00:00Z",
        credentialSubject: {
          id: "did:example:student-amara-nelson",
          achievement: {
            id: "https://ibu.ca/demo/achievements/mcv4u",
            type: ["Achievement"],
            name: "Calculus and Vectors",
            description:
              "Problem-solving in functions, derivatives, vectors, and mathematical modelling for university preparation.",
            identifier: [{ type: "CourseCode", identifier: "MCV4U" }],
            creditsAvailable: { value: 1 },
            term: "Semester 1",
            alignment: [
              { targetName: "Quantitative Reasoning" },
              { targetName: "Applied Modelling" },
              { targetName: "Mathematical Communication" },
            ],
          },
          result: [
            { resultDescription: "Final Grade", value: "89" },
            { resultDescription: "Result", value: "Promoted" },
          ],
        },
      },
      {
        id: "https://ibu.ca/demo/course/biology-systems",
        type: ["VerifiableCredential", "OpenBadgeCredential", "AchievementCredential"],
        issuer: {
          id: "https://ibu.ca/demo/issuers/science",
          name: defaultInstitutionBranding.name,
        },
        validFrom: "2026-03-16T09:00:00Z",
        credentialSubject: {
          id: "did:example:student-amara-nelson",
          achievement: {
            id: "https://ibu.ca/demo/achievements/sbi4u",
            type: ["Achievement"],
            name: "Biology: Systems and Genetics",
            description:
              "Laboratory-led study of molecular genetics, homeostasis, and population systems supported by inquiry journals.",
            identifier: [{ type: "CourseCode", identifier: "SBI4U" }],
            creditsAvailable: { value: 1 },
            term: "Semester 2",
            alignment: [
              { targetName: "Scientific Inquiry" },
              { targetName: "Lab Documentation" },
              { targetName: "Evidence Evaluation" },
            ],
          },
          result: [
            { resultDescription: "Final Grade", value: "94" },
            { resultDescription: "Result", value: "Promoted" },
          ],
        },
      },
      {
        id: "https://ibu.ca/demo/course/economics-policy",
        type: ["VerifiableCredential", "OpenBadgeCredential", "AchievementCredential"],
        issuer: {
          id: "https://ibu.ca/demo/issuers/humanities",
          name: defaultInstitutionBranding.name,
        },
        validFrom: "2026-03-16T09:00:00Z",
        credentialSubject: {
          id: "did:example:student-amara-nelson",
          achievement: {
            id: "https://ibu.ca/demo/achievements/cia4u",
            type: ["Achievement"],
            name: "Economics and Public Policy",
            description:
              "Macroeconomic analysis, civic policy review, and debate-based presentations tied to local and global case studies.",
            identifier: [{ type: "CourseCode", identifier: "CIA4U" }],
            creditsAvailable: { value: 1 },
            term: "Semester 2",
            alignment: [
              { targetName: "Policy Analysis" },
              { targetName: "Presentation Skills" },
              { targetName: "Data Interpretation" },
            ],
          },
          result: [
            { resultDescription: "Final Grade", value: "88" },
            { resultDescription: "Result", value: "Promoted" },
          ],
        },
      },
      {
        id: "https://ibu.ca/demo/course/computer-science",
        type: ["VerifiableCredential", "OpenBadgeCredential", "AchievementCredential"],
        issuer: {
          id: "https://ibu.ca/demo/issuers/innovation",
          name: defaultInstitutionBranding.name,
        },
        validFrom: "2026-03-16T09:00:00Z",
        credentialSubject: {
          id: "did:example:student-amara-nelson",
          achievement: {
            id: "https://ibu.ca/demo/achievements/ics4u",
            type: ["Achievement"],
            name: "Computer Science and Application Design",
            description:
              "Software design, collaborative debugging, and full-stack prototyping with documented testing and code review.",
            identifier: [{ type: "CourseCode", identifier: "ICS4U" }],
            creditsAvailable: { value: 1 },
            term: "Semester 2",
            alignment: [
              { targetName: "Programming" },
              { targetName: "Collaboration" },
              { targetName: "Debugging" },
            ],
          },
          result: [
            { resultDescription: "Final Grade", value: "96" },
            { resultDescription: "Result", value: "Promoted" },
          ],
        },
      },
      {
        id: "https://ibu.ca/demo/course/capstone-leadership",
        type: ["VerifiableCredential", "OpenBadgeCredential", "AchievementCredential"],
        issuer: {
          id: "https://ibu.ca/demo/issuers/career",
          name: defaultInstitutionBranding.name,
        },
        validFrom: "2026-03-18T09:00:00Z",
        credentialSubject: {
          id: "did:example:student-amara-nelson",
          achievement: {
            id: "https://ibu.ca/demo/achievements/capstone",
            type: ["Achievement"],
            name: "Leadership Capstone and Career Readiness",
            description:
              "Portfolio defence, internship reflection, and service-learning artefacts demonstrating readiness for post-secondary study.",
            identifier: [{ type: "CourseCode", identifier: "CAP4U" }],
            creditsAvailable: { value: 1 },
            term: "Semester 2",
            alignment: [
              { targetName: "Leadership" },
              { targetName: "Reflection" },
              { targetName: "Career Planning" },
            ],
          },
          result: [
            { resultDescription: "Final Grade", value: "91" },
            { resultDescription: "Result", value: "Completed with Distinction" },
          ],
        },
      },
    ],
  },
} as const;
