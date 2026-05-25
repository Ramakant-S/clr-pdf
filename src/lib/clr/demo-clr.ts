import { defaultInstitutionBranding } from "@/lib/branding/defaults";

export const demoClrPayload = {
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://purl.imsglobal.org/spec/clr/v2p0/context-2.0.1.json",
    "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
  ],
  id: defaultInstitutionBranding.verificationUrl,
  type: ["VerifiableCredential", "ClrCredential"],
  name: "Higher Secondary Comprehensive Learner Record",
  issuer: {
    id: "https://goatech.example/demo/issuers/registrar",
    type: ["Profile"],
    name: defaultInstitutionBranding.name,
    url: defaultInstitutionBranding.website,
    address: {
      streetAddress: "Plot 42, Kadamba Plateau",
      addressLocality: "Panaji",
      addressRegion: "Goa",
      postalCode: "403006",
      addressCountry: "India",
    },
  },
  validFrom: "2026-03-18T09:00:00Z",
  credentialSubject: {
    id: "did:example:student-shivona-fernandes",
    type: ["Learner"],
    name: "Shivona Fernandes",
    studentId: "GTI-2026-1042",
    gradeLevel: "Year 4",
    homeroom: "",
    programName: "Bachelor of Commerce (Honours)",
    verifiableCredential: [
      {
        id: "https://goatech.example/demo/course/english-12",
        type: ["VerifiableCredential", "OpenBadgeCredential", "AchievementCredential"],
        issuer: {
          id: "https://goatech.example/demo/issuers/english",
          name: defaultInstitutionBranding.name,
        },
        validFrom: "2025-12-12T09:00:00Z",
        credentialSubject: {
          id: "did:example:student-shivona-fernandes",
          achievement: {
            id: "https://goatech.example/demo/achievements/eng4u",
            type: ["Achievement"],
            achievementType: "coursework",
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
        id: "https://goatech.example/demo/course/calculus-advanced",
        type: ["VerifiableCredential", "OpenBadgeCredential", "AchievementCredential"],
        issuer: {
          id: "https://goatech.example/demo/issuers/stem",
          name: defaultInstitutionBranding.name,
        },
        validFrom: "2025-12-12T09:00:00Z",
        credentialSubject: {
          id: "did:example:student-shivona-fernandes",
          achievement: {
            id: "https://goatech.example/demo/achievements/mcv4u",
            type: ["Achievement"],
            achievementType: "coursework",
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
        id: "https://goatech.example/demo/course/biology-systems",
        type: ["VerifiableCredential", "OpenBadgeCredential", "AchievementCredential"],
        issuer: {
          id: "https://goatech.example/demo/issuers/science",
          name: defaultInstitutionBranding.name,
        },
        validFrom: "2026-03-16T09:00:00Z",
        credentialSubject: {
          id: "did:example:student-shivona-fernandes",
          achievement: {
            id: "https://goatech.example/demo/achievements/sbi4u",
            type: ["Achievement"],
            achievementType: "assessment",
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
        id: "https://goatech.example/demo/course/economics-policy",
        type: ["VerifiableCredential", "OpenBadgeCredential", "AchievementCredential"],
        issuer: {
          id: "https://goatech.example/demo/issuers/humanities",
          name: defaultInstitutionBranding.name,
        },
        validFrom: "2026-03-16T09:00:00Z",
        credentialSubject: {
          id: "did:example:student-shivona-fernandes",
          achievement: {
            id: "https://goatech.example/demo/achievements/cia4u",
            type: ["Achievement"],
            achievementType: "coursework",
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
        id: "https://goatech.example/demo/course/computer-science",
        type: ["VerifiableCredential", "OpenBadgeCredential", "AchievementCredential"],
        issuer: {
          id: "https://goatech.example/demo/issuers/innovation",
          name: defaultInstitutionBranding.name,
        },
        validFrom: "2026-03-16T09:00:00Z",
        credentialSubject: {
          id: "did:example:student-shivona-fernandes",
          achievement: {
            id: "https://goatech.example/demo/achievements/ics4u",
            type: ["Achievement"],
            achievementType: "live project",
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
        id: "https://goatech.example/demo/course/capstone-leadership",
        type: ["VerifiableCredential", "OpenBadgeCredential", "AchievementCredential"],
        issuer: {
          id: "https://goatech.example/demo/issuers/career",
          name: defaultInstitutionBranding.name,
        },
        validFrom: "2026-03-18T09:00:00Z",
        credentialSubject: {
          id: "did:example:student-shivona-fernandes",
          achievement: {
            id: "https://goatech.example/demo/achievements/capstone",
            type: ["Achievement"],
            achievementType: "internship",
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
