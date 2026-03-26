import * as XLSX from "xlsx";
import { defaultTranscriptCustomization } from "@/lib/branding/defaults";
import {
  normalizeTranscriptEntryType,
  resolveTranscriptEntryType,
} from "@/lib/clr/entry-type";
import { normalizeClrDocument } from "@/lib/clr/normalize";
import { transcriptEntryTypes } from "@/lib/clr/types";
import type {
  TranscriptLegendItem,
  TranscriptCustomization,
  TranscriptEntryType,
  TranscriptRecord,
  TranscriptTemplate,
} from "@/lib/clr/types";

type JsonRecord = Record<string, unknown>;

export interface BulkGlobalSettings {
  institutionName: string;
  boardName: string;
  institutionAddress: string;
  institutionWebsite: string;
  registrarName: string;
  principalName: string;
  reportingPeriodLabel: string;
  sealText: string;
  footerText: string;
  template: TranscriptTemplate;
}

export interface BulkImportRow {
  learnerId: string;
  studentNumber: string;
  recordId: string;
  fullName: string;
  givenName: string;
  familyName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  gradeLevel: string;
  programName: string;
  homeroom: string;
  section: string;
  academicYear: string;
  reportingPeriod: string;
  learnerProfileSummary: string;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  guardianName: string;
  guardianEmail: string;
  guardianPhone: string;
  verificationUrl: string;
  credentialType: string;
  courseCode: string;
  courseTitle: string;
  courseTerm: string;
  courseLevel: string;
  courseStartDate: string;
  courseEndDate: string;
  creditsEarned: string;
  grade: string;
  gradeScale: string;
  result: string;
  courseStatus: string;
  courseSummary: string;
  skillNames: string;
  skillCodes: string;
  skillFramework: string;
  skillProficiencyLevels: string;
  instructorName: string;
  department: string;
  attendancePercent: string;
  abbreviations: string;
  proficiencyLegend: string;
  remarks: string;
}

export interface BulkGeneratedLearnerRecord {
  learnerId: string;
  learnerName: string;
  studentNumber: string;
  email: string;
  courseCount: number;
  clr: JsonRecord;
  transcript: TranscriptRecord;
}

export interface BulkParseResult {
  rows: BulkImportRow[];
  warnings: string[];
  sheetName: string;
}

export interface BulkLearnerGroup {
  learnerId: string;
  rows: BulkImportRow[];
}

interface BulkColumn {
  key: keyof BulkImportRow;
  required: boolean;
  description: string;
}

const CONTEXT_URLS = [
  "https://www.w3.org/ns/credentials/v2",
  "https://purl.imsglobal.org/spec/clr/v2p0/context-2.0.1.json",
  "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
] as const;

const defaultBulkProficiencyLegend: TranscriptLegendItem[] = [
  {
    label: "Beginning",
    description: "Early-stage performance with guided participation and limited independent consistency.",
  },
  {
    label: "Developing",
    description: "Partial command of the skill with growing consistency and occasional support still helpful.",
  },
  {
    label: "Proficient",
    description: "Consistent independent performance at the expected standard across typical learning tasks.",
  },
  {
    label: "Advanced",
    description: "Performance exceeds the expected standard and transfers effectively to complex or unfamiliar contexts.",
  },
];

export const defaultBulkGlobalSettings: BulkGlobalSettings = {
  institutionName: defaultTranscriptCustomization.institutionName,
  boardName: defaultTranscriptCustomization.boardName,
  institutionAddress: defaultTranscriptCustomization.institutionAddress,
  institutionWebsite: defaultTranscriptCustomization.institutionWebsite,
  registrarName: defaultTranscriptCustomization.registrarName,
  principalName: defaultTranscriptCustomization.principalName,
  reportingPeriodLabel: defaultTranscriptCustomization.reportingPeriodLabel,
  sealText: defaultTranscriptCustomization.sealText,
  footerText: defaultTranscriptCustomization.footerText,
  template: defaultTranscriptCustomization.template,
};

export const bulkImportColumns: BulkColumn[] = [
  {
    key: "learnerId",
    required: true,
    description: "Unique learner key repeated on every credential row for that student.",
  },
  {
    key: "studentNumber",
    required: true,
    description: "Institution student number or admission number.",
  },
  {
    key: "recordId",
    required: false,
    description:
      "Learner-level transcript record ID shown on the printable transcript, for example #f3a91c5d-84e2-4f1d-b1f0-a7b3d9c1e842.",
  },
  {
    key: "fullName",
    required: true,
    description: "Full learner name used in CLR and transcript display.",
  },
  {
    key: "givenName",
    required: false,
    description: "Optional learner given name.",
  },
  {
    key: "familyName",
    required: false,
    description: "Optional learner family name.",
  },
  {
    key: "email",
    required: false,
    description: "Learner email stored in the generated CLR.",
  },
  {
    key: "phone",
    required: false,
    description: "Learner phone number stored in the generated CLR.",
  },
  {
    key: "dateOfBirth",
    required: false,
    description: "Date of birth in ISO format such as 2008-04-11.",
  },
  {
    key: "gender",
    required: false,
    description: "Gender or demographic label if needed for the CLR.",
  },
  {
    key: "gradeLevel",
    required: false,
    description: "Grade or academic level displayed in the transcript header.",
  },
  {
    key: "programName",
    required: false,
    description: "Program or stream name for the learner.",
  },
  {
    key: "homeroom",
    required: false,
    description: "Homeroom, section, or cohort label.",
  },
  {
    key: "section",
    required: false,
    description: "Optional section or house label for CLR storage.",
  },
  {
    key: "academicYear",
    required: false,
    description: "Academic year or session associated with the credential row.",
  },
  {
    key: "reportingPeriod",
    required: false,
    description: "Term, semester, or annual reporting period label.",
  },
  {
    key: "learnerProfileSummary",
    required: false,
    description: "Optional summary text for the learner profile.",
  },
  {
    key: "addressLine",
    required: false,
    description: "Learner address line or street address.",
  },
  {
    key: "city",
    required: false,
    description: "Learner city.",
  },
  {
    key: "state",
    required: false,
    description: "Learner state or region.",
  },
  {
    key: "postalCode",
    required: false,
    description: "Learner postal or PIN code.",
  },
  {
    key: "country",
    required: false,
    description: "Learner country.",
  },
  {
    key: "guardianName",
    required: false,
    description: "Optional guardian name for CLR storage.",
  },
  {
    key: "guardianEmail",
    required: false,
    description: "Optional guardian email.",
  },
  {
    key: "guardianPhone",
    required: false,
    description: "Optional guardian phone.",
  },
  {
    key: "verificationUrl",
    required: false,
    description: "Base verification URL repeated across learner rows if available.",
  },
  {
    key: "credentialType",
    required: false,
    description:
      "Credential entry type: coursework, internship, live project, or assessment.",
  },
  {
    key: "courseCode",
    required: true,
    description: "Credential or achievement code.",
  },
  {
    key: "courseTitle",
    required: true,
    description: "Credential or achievement title shown in the transcript table.",
  },
  {
    key: "courseTerm",
    required: false,
    description: "Term or semester label used for the course achievement.",
  },
  {
    key: "courseLevel",
    required: false,
    description: "Optional course level such as Advanced, Core, or Honors.",
  },
  {
    key: "courseStartDate",
    required: false,
    description: "Course start date in ISO format.",
  },
  {
    key: "courseEndDate",
    required: false,
    description: "Course end date in ISO format.",
  },
  {
    key: "creditsEarned",
    required: false,
    description: "Credits earned for the credential row.",
  },
  {
    key: "grade",
    required: false,
    description: "Final grade or score. Numeric values show in transcript averages.",
  },
  {
    key: "gradeScale",
    required: false,
    description: "Grade scale such as Percentage, GPA, or Letter.",
  },
  {
    key: "result",
    required: false,
    description: "Final result like Pass, Promoted, or Completed with Distinction.",
  },
  {
    key: "courseStatus",
    required: false,
    description: "Status pill value in the transcript such as Completed or In Progress.",
  },
  {
    key: "courseSummary",
    required: false,
    description: "Short course or achievement summary shown in the transcript.",
  },
  {
    key: "skillNames",
    required: false,
    description: "Skill list separated with | for example Research | Coding | Writing.",
  },
  {
    key: "skillCodes",
    required: false,
    description:
      "Optional skill codes separated with | and aligned by position to skillNames.",
  },
  {
    key: "skillFramework",
    required: false,
    description:
      "Optional framework or competency model name applied to the listed skills.",
  },
  {
    key: "skillProficiencyLevels",
    required: false,
    description:
      "Optional proficiency levels separated with | and aligned by position to skillNames.",
  },
  {
    key: "instructorName",
    required: false,
    description: "Optional instructor or evaluator name.",
  },
  {
    key: "department",
    required: false,
    description: "Optional department or subject cluster.",
  },
  {
    key: "attendancePercent",
    required: false,
    description: "Attendance percentage such as 96.",
  },
  {
    key: "abbreviations",
    required: false,
    description:
      "Transcript abbreviations as LABEL: Meaning pairs separated with |, for example CLR: Comprehensive Learner Record | OB: Open Badge.",
  },
  {
    key: "proficiencyLegend",
    required: false,
    description:
      "Proficiency scale as LABEL: Meaning pairs separated with |, repeated across learner rows when needed.",
  },
  {
    key: "remarks",
    required: false,
    description: "Optional course remarks or comments.",
  },
];

const emptyBulkImportRow: BulkImportRow = {
  learnerId: "",
  studentNumber: "",
  recordId: "",
  fullName: "",
  givenName: "",
  familyName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  gender: "",
  gradeLevel: "",
  programName: "",
  homeroom: "",
  section: "",
  academicYear: "",
  reportingPeriod: "",
  learnerProfileSummary: "",
  addressLine: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  guardianName: "",
  guardianEmail: "",
  guardianPhone: "",
  verificationUrl: "",
  credentialType: "",
  courseCode: "",
  courseTitle: "",
  courseTerm: "",
  courseLevel: "",
  courseStartDate: "",
  courseEndDate: "",
  creditsEarned: "",
  grade: "",
  gradeScale: "",
  result: "",
  courseStatus: "",
  courseSummary: "",
  skillNames: "",
  skillCodes: "",
  skillFramework: "",
  skillProficiencyLevels: "",
  instructorName: "",
  department: "",
  attendancePercent: "",
  abbreviations: "",
  proficiencyLegend: "",
  remarks: "",
};

const normalizedHeaderMap = new Map(
  bulkImportColumns.map((column) => [normalizeHeader(column.key), column.key]),
);

function normalizeHeader(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function asString(value: unknown) {
  if (value == null) {
    return "";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).trim();
}

function splitSkills(value: string) {
  return value
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseLegendPairs(value: string): TranscriptLegendItem[] {
  return value
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [label, ...descriptionParts] = entry.split(":");
      const nextLabel = label?.trim();
      const nextDescription = descriptionParts.join(":").trim();

      if (!nextLabel || !nextDescription) {
        return undefined;
      }

      return {
        label: nextLabel,
        description: nextDescription,
      } satisfies TranscriptLegendItem;
    })
    .filter((entry): entry is TranscriptLegendItem => Boolean(entry));
}

function serializeLegendPairs(entries: TranscriptLegendItem[]) {
  return entries
    .map((entry) => `${entry.label}: ${entry.description}`)
    .join(" | ");
}

function formatEntryTypeToken(entryType: TranscriptEntryType) {
  return entryType
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "record";
}

function makeRecordId(seed: string) {
  let hash = 2166136261;

  for (const character of seed) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  const hex = (hash >>> 0).toString(16).padStart(8, "0");
  return `#${hex.slice(0, 8)}-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(0, 4)}-${hex}${hex.slice(0, 4)}`;
}

function toNumber(value: string) {
  const match = value.match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : undefined;
}

function formatGradeValue(grade: string, gradeScale: string) {
  const normalizedGrade = grade.trim();
  const normalizedScale = gradeScale.trim();

  if (!normalizedGrade || !normalizedScale) {
    return normalizedGrade;
  }

  if (
    normalizedGrade.toLowerCase().includes(normalizedScale.toLowerCase()) ||
    normalizedGrade.includes("%")
  ) {
    return normalizedGrade;
  }

  if (normalizedScale === "%") {
    return toNumber(normalizedGrade) != null ? `${normalizedGrade}%` : normalizedGrade;
  }

  return toNumber(normalizedGrade) != null
    ? `${normalizedGrade} ${normalizedScale}`
    : `${normalizedGrade} (${normalizedScale})`;
}

function toIsoDate(value: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

function makeIssuer(settings: BulkGlobalSettings) {
  return {
    id: `${settings.institutionWebsite || "https://bulk.import.local"}/issuers/registrar`,
    type: ["Profile"],
    name: settings.institutionName || "Academic Credential Issuer",
    url: settings.institutionWebsite || undefined,
    address: settings.institutionAddress || undefined,
    boardName: settings.boardName || undefined,
  };
}

function rowToObject(row: BulkImportRow) {
  return bulkImportColumns.reduce<Record<string, string>>((result, column) => {
    result[column.key] = row[column.key];
    return result;
  }, {});
}

function inferSheetName(workbook: XLSX.WorkBook) {
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
    });

    if (rows.length === 0) {
      continue;
    }

    const headers = Object.keys(rows[0] ?? {}).map(normalizeHeader);
    const hasLearnerKey = headers.includes(normalizeHeader("learnerId"));
    const hasCourseCode = headers.includes(normalizeHeader("courseCode"));
    const hasCourseTitle = headers.includes(normalizeHeader("courseTitle"));

    if (hasLearnerKey && hasCourseCode && hasCourseTitle) {
      return sheetName;
    }
  }

  return undefined;
}

function mapRawRow(input: Record<string, unknown>) {
  const row = { ...emptyBulkImportRow };

  for (const [key, value] of Object.entries(input)) {
    const resolvedKey = normalizedHeaderMap.get(normalizeHeader(key));
    if (!resolvedKey) {
      continue;
    }

    row[resolvedKey] = asString(value);
  }

  if (!row.fullName && (row.givenName || row.familyName)) {
    row.fullName = [row.givenName, row.familyName].filter(Boolean).join(" ");
  }

  if (!row.learnerId && row.studentNumber) {
    row.learnerId = slugify(row.studentNumber);
  }

  if (!row.recordId) {
    row.recordId = makeRecordId(
      row.learnerId || row.studentNumber || row.fullName || "learner-record",
    );
  }

  if (!row.verificationUrl && row.studentNumber) {
    row.verificationUrl = `https://bulk.import.local/clr/${slugify(row.studentNumber)}`;
  }

  const normalizedType = normalizeTranscriptEntryType(row.credentialType);
  row.credentialType = normalizedType ?? row.credentialType.trim().toLowerCase();

  return row;
}

function isBlankRow(row: BulkImportRow) {
  return Object.values(row).every((value) => value === "");
}

function validateRow(row: BulkImportRow, rowNumber: number) {
  const issues: string[] = [];

  for (const column of bulkImportColumns) {
    if (column.required && !row[column.key]) {
      issues.push(`Row ${rowNumber}: "${column.key}" is required.`);
    }
  }

  if (row.credentialType && !normalizeTranscriptEntryType(row.credentialType)) {
    issues.push(
      `Row ${rowNumber}: "credentialType" must be one of ${transcriptEntryTypes.join(", ")}.`,
    );
  }

  return issues;
}

function buildProfileSummary(rows: BulkImportRow[]) {
  const manual = rows.find((row) => row.learnerProfileSummary)?.learnerProfileSummary.trim();
  if (manual) {
    return manual;
  }

  const skillPool = [...new Set(rows.flatMap((row) => splitSkills(row.skillNames)))].slice(0, 3);
  if (skillPool.length === 0) {
    return `${rows[0]?.fullName ?? "Learner"} has verified credential and achievement entries imported from the bulk CLR template.`;
  }

  return `${rows[0]?.fullName ?? "Learner"} shows consistent achievement across ${skillPool.join(", ").toLowerCase()} and related credentialed work.`;
}

function getLegendEntries(
  rows: BulkImportRow[],
  selector: (row: BulkImportRow) => string,
  fallback: TranscriptLegendItem[],
) {
  for (const row of rows) {
    const parsed = parseLegendPairs(selector(row));
    if (parsed.length > 0) {
      return parsed;
    }
  }

  return fallback;
}

function buildBulkClrPayload(rows: BulkImportRow[], settings: BulkGlobalSettings): JsonRecord {
  const primary = rows[0];
  const issuer = makeIssuer(settings);
  const proficiencyLegendEntries = getLegendEntries(
    rows,
    (row) => row.proficiencyLegend,
    defaultBulkProficiencyLegend,
  );
  const abbreviationEntries = getLegendEntries(rows, (row) => row.abbreviations, []);
  const legendSections = [
    abbreviationEntries.length > 0
      ? `Abbreviations: ${serializeLegendPairs(abbreviationEntries)}`
      : undefined,
    proficiencyLegendEntries.length > 0
      ? `Proficiency scale: ${serializeLegendPairs(proficiencyLegendEntries)}`
      : undefined,
  ].filter(Boolean);
  const verificationUrl =
    primary.verificationUrl || `${settings.institutionWebsite || "https://bulk.import.local"}/clr/${slugify(primary.studentNumber || primary.learnerId)}`;
  const recordId =
    primary.recordId ||
    makeRecordId(primary.learnerId || primary.studentNumber || primary.fullName);
  const issuedOn =
    toIsoDate(
      [...rows]
        .map((row) => row.courseEndDate || row.courseStartDate)
        .filter(Boolean)
        .sort()
        .at(-1) ?? new Date().toISOString(),
    ) ?? new Date().toISOString();

  return {
    "@context": CONTEXT_URLS,
    id: verificationUrl,
    identifier: recordId,
    type: ["VerifiableCredential", "ClrCredential"],
    name: (
      settings.reportingPeriodLabel || primary.reportingPeriod
        ? `${settings.reportingPeriodLabel || primary.reportingPeriod} Comprehensive Learner Record`
        : "Comprehensive Learner Record"
    ),
    issuer,
    validFrom: issuedOn,
    transcriptAbbreviations: abbreviationEntries,
    proficiencyScale: proficiencyLegendEntries,
    evidence:
      legendSections.length > 0
        ? [
            {
              type: ["Evidence"],
              genre: "Legend",
              narrative: legendSections.join("\n\n"),
            },
          ]
        : undefined,
    credentialSubject: {
      id: `did:bulk:${slugify(primary.learnerId || primary.studentNumber || primary.fullName)}`,
      type: ["Learner"],
      name: primary.fullName,
      givenName: primary.givenName || undefined,
      familyName: primary.familyName || undefined,
      studentId: primary.studentNumber,
      gradeLevel: primary.gradeLevel || undefined,
      homeroom: primary.homeroom || primary.section || undefined,
      programName: primary.programName || undefined,
      email: primary.email || undefined,
      phone: primary.phone || undefined,
      dateOfBirth: primary.dateOfBirth || undefined,
      gender: primary.gender || undefined,
      academicYear: primary.academicYear || undefined,
      reportingPeriod: primary.reportingPeriod || undefined,
      profileSummary: buildProfileSummary(rows),
      address: {
        streetAddress: primary.addressLine || undefined,
        addressLocality: primary.city || undefined,
        addressRegion: primary.state || undefined,
        postalCode: primary.postalCode || undefined,
        addressCountry: primary.country || undefined,
      },
      guardian: {
        name: primary.guardianName || undefined,
        email: primary.guardianEmail || undefined,
        phone: primary.guardianPhone || undefined,
      },
      verifiableCredential: rows.map((row, index) => {
        const baseCourseUrl = `${verificationUrl.replace(/\/$/, "")}/course/${slugify(row.courseCode || row.courseTitle || String(index + 1))}`;
        const creditsValue = toNumber(row.creditsEarned);
        const attendanceValue = toNumber(row.attendancePercent);
        const entryType = resolveTranscriptEntryType(
          row.credentialType,
          row.courseTitle,
          row.courseSummary,
        );
        const skillNames = splitSkills(row.skillNames);
        const skillCodes = splitSkills(row.skillCodes);
        const skillLevels = splitSkills(row.skillProficiencyLevels);
        const skillAlignments = skillNames.map((skill, skillIndex) => ({
          type: ["Alignment"],
          targetName: skill,
          targetCode: skillCodes[skillIndex] || undefined,
          targetFramework: row.skillFramework || undefined,
        }));
        const rubricLevels = proficiencyLegendEntries.map((entry) => ({
          id: `${baseCourseUrl}/rubric/${slugify(entry.label)}`,
          type: ["RubricCriterionLevel"],
          name: entry.label,
          level: entry.label,
          description: entry.description,
        }));
        const skillResultDescriptions = skillNames.map((skill, skillIndex) => ({
          id: `${baseCourseUrl}/result-description/${skillIndex + 1}`,
          type: ["ResultDescription"],
          name: `${skill} proficiency`,
          resultType: "RubricScore",
          rubricCriterionLevel: rubricLevels,
          alignment: [
            {
              type: ["Alignment"],
              targetName: skill,
              targetCode: skillCodes[skillIndex] || undefined,
              targetFramework: row.skillFramework || undefined,
            },
          ],
        }));
        const skillResults = skillNames
          .map((skill, skillIndex) => {
            const levelLabel = skillLevels[skillIndex];
            if (!levelLabel) {
              return undefined;
            }

            const matchedRubricLevel = rubricLevels.find(
              (level) => level.name.toLowerCase() === levelLabel.toLowerCase(),
            );

            return {
              type: ["Result"],
              resultDescription: `${baseCourseUrl}/result-description/${skillIndex + 1}`,
              value: levelLabel,
              rubricCriterionLevel: matchedRubricLevel?.id,
              alignment: [
                {
                  type: ["Alignment"],
                  targetName: skill,
                  targetCode: skillCodes[skillIndex] || undefined,
                  targetFramework: row.skillFramework || undefined,
                },
              ],
            };
          })
          .filter(Boolean);

        return {
          id: baseCourseUrl,
          type: ["VerifiableCredential", "OpenBadgeCredential", "AchievementCredential"],
          issuer: {
            ...issuer,
            department: row.department || undefined,
          },
          validFrom: toIsoDate(row.courseEndDate || row.courseStartDate) ?? issuedOn,
          credentialSubject: {
            id: `did:bulk:${slugify(primary.learnerId || primary.studentNumber || primary.fullName)}`,
            achievement: {
              id: `${baseCourseUrl}/achievement`,
              type: ["Achievement", formatEntryTypeToken(entryType)],
              achievementType: entryType,
              credentialType: entryType,
              name: row.courseTitle,
              description:
                row.courseSummary ||
                `${row.courseTitle} imported from the bulk CLR spreadsheet template.`,
              identifier: [{ type: "CourseCode", identifier: row.courseCode }],
              creditsAvailable: creditsValue != null ? { value: creditsValue } : undefined,
              term: row.courseTerm || primary.reportingPeriod || undefined,
              startDate: row.courseStartDate || undefined,
              endDate: row.courseEndDate || undefined,
              courseLevel: row.courseLevel || undefined,
              alignment: skillAlignments,
              resultDescription: skillResultDescriptions,
              instructor: row.instructorName || undefined,
              department: row.department || undefined,
            },
            result: [
              row.grade
                ? {
                    resultDescription: "Final Grade",
                    value: formatGradeValue(row.grade, row.gradeScale),
                  }
                : undefined,
              row.result
                ? {
                    resultDescription: "Result",
                    value: row.result,
                  }
                : undefined,
              row.courseStatus
                ? {
                    resultDescription: "Course Status",
                    value: row.courseStatus,
                  }
                : undefined,
              attendanceValue != null
                ? {
                    resultDescription: "Attendance",
                    value: `${attendanceValue}%`,
                  }
                : undefined,
              row.remarks
                ? {
                    resultDescription: "Remarks",
                    value: row.remarks,
                  }
                : undefined,
              ...skillResults,
            ].filter(Boolean),
          },
        };
      }),
    },
  };
}

function compareLearners(left: BulkGeneratedLearnerRecord, right: BulkGeneratedLearnerRecord) {
  return (
    left.learnerName.localeCompare(right.learnerName) ||
    left.studentNumber.localeCompare(right.studentNumber)
  );
}

function compareLearnerGroups(left: BulkLearnerGroup, right: BulkLearnerGroup) {
  const leftPrimary = left.rows[0];
  const rightPrimary = right.rows[0];

  return (
    leftPrimary.fullName.localeCompare(rightPrimary.fullName) ||
    leftPrimary.studentNumber.localeCompare(rightPrimary.studentNumber)
  );
}

interface SampleLearnerProfile {
  givenName: string;
  familyName: string;
  gender: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  addressSuffix: string;
  guardianName: string;
  guardianEmailHandle: string;
  phonePrefix: string;
  guardianPhonePrefix: string;
}

const sampleLearnerCount = 10;

export function createSampleBulkRows(learnerCount = sampleLearnerCount) {
  const learnerProfiles: SampleLearnerProfile[] = [
    {
      givenName: "Amelia",
      familyName: "Harrington",
      gender: "Female",
      city: "Boston",
      state: "MA",
      postalCode: "02116",
      country: "US",
      addressSuffix: "Beacon Street",
      guardianName: "Claire Harrington",
      guardianEmailHandle: "claire.harrington",
      phonePrefix: "+1-617-555-",
      guardianPhonePrefix: "+1-857-555-",
    },
    {
      givenName: "Oliver",
      familyName: "Whitmore",
      gender: "Male",
      city: "Chicago",
      state: "IL",
      postalCode: "60611",
      country: "US",
      addressSuffix: "Walton Avenue",
      guardianName: "Daniel Whitmore",
      guardianEmailHandle: "daniel.whitmore",
      phonePrefix: "+1-312-555-",
      guardianPhonePrefix: "+1-773-555-",
    },
    {
      givenName: "Charlotte",
      familyName: "Prescott",
      gender: "Female",
      city: "Seattle",
      state: "WA",
      postalCode: "98104",
      country: "US",
      addressSuffix: "Columbia Street",
      guardianName: "Margaret Prescott",
      guardianEmailHandle: "margaret.prescott",
      phonePrefix: "+1-206-555-",
      guardianPhonePrefix: "+1-425-555-",
    },
    {
      givenName: "Henry",
      familyName: "Fletcher",
      gender: "Male",
      city: "Denver",
      state: "CO",
      postalCode: "80205",
      country: "US",
      addressSuffix: "Wynkoop Street",
      guardianName: "Edward Fletcher",
      guardianEmailHandle: "edward.fletcher",
      phonePrefix: "+1-303-555-",
      guardianPhonePrefix: "+1-720-555-",
    },
    {
      givenName: "Eleanor",
      familyName: "Sinclair",
      gender: "Female",
      city: "London",
      state: "Greater London",
      postalCode: "SW1A 1AA",
      country: "UK",
      addressSuffix: "Kensington Lane",
      guardianName: "Helen Sinclair",
      guardianEmailHandle: "helen.sinclair",
      phonePrefix: "+44-20-555-",
      guardianPhonePrefix: "+44-77-555-",
    },
    {
      givenName: "Theodore",
      familyName: "Bennett",
      gender: "Male",
      city: "Manchester",
      state: "Greater Manchester",
      postalCode: "M2 5DB",
      country: "UK",
      addressSuffix: "Deansgate",
      guardianName: "Richard Bennett",
      guardianEmailHandle: "richard.bennett",
      phonePrefix: "+44-16-1555-",
      guardianPhonePrefix: "+44-75-555-",
    },
    {
      givenName: "Lucy",
      familyName: "Kensington",
      gender: "Female",
      city: "Edinburgh",
      state: "Scotland",
      postalCode: "EH2 2PF",
      country: "UK",
      addressSuffix: "George Street",
      guardianName: "Emma Kensington",
      guardianEmailHandle: "emma.kensington",
      phonePrefix: "+44-13-1555-",
      guardianPhonePrefix: "+44-78-555-",
    },
    {
      givenName: "Samuel",
      familyName: "Mercer",
      gender: "Male",
      city: "Dublin",
      state: "Leinster",
      postalCode: "D02 X285",
      country: "IE",
      addressSuffix: "Merrion Square",
      guardianName: "Patrick Mercer",
      guardianEmailHandle: "patrick.mercer",
      phonePrefix: "+353-1-555-",
      guardianPhonePrefix: "+353-85-555-",
    },
    {
      givenName: "Sophie",
      familyName: "Holloway",
      gender: "Female",
      city: "Bristol",
      state: "England",
      postalCode: "BS1 5TR",
      country: "UK",
      addressSuffix: "Queen Square",
      guardianName: "Julia Holloway",
      guardianEmailHandle: "julia.holloway",
      phonePrefix: "+44-11-7555-",
      guardianPhonePrefix: "+44-79-555-",
    },
    {
      givenName: "William",
      familyName: "Ashford",
      gender: "Male",
      city: "Amsterdam",
      state: "North Holland",
      postalCode: "1017 CP",
      country: "NL",
      addressSuffix: "Herengracht",
      guardianName: "Thomas Ashford",
      guardianEmailHandle: "thomas.ashford",
      phonePrefix: "+31-20-555-",
      guardianPhonePrefix: "+31-6-555-",
    },
  ];
  const programs = [
    "Senior Secondary Diploma",
    "STEM Excellence Track",
    "Commerce and Analytics",
    "Humanities and Policy",
  ];
  const courseCatalog = [
    {
      code: "ENG401",
      title: "Advanced English Composition",
      credentialType: "coursework",
      term: "Semester 1",
      department: "Languages",
      skills: "Analytical Writing | Discussion Leadership | Research Synthesis",
      summary: "Advanced reading, academic writing, and seminar-led communication.",
    },
    {
      code: "MAT402",
      title: "Applied Mathematics and Modelling",
      credentialType: "coursework",
      term: "Semester 1",
      department: "Mathematics",
      skills: "Quantitative Reasoning | Problem Solving | Modelling",
      summary: "Functions, statistics, and applied modelling for higher studies.",
    },
    {
      code: "SCI403",
      title: "Integrated Science Laboratory Assessment",
      credentialType: "assessment",
      term: "Semester 1",
      department: "Sciences",
      skills: "Scientific Inquiry | Evidence Evaluation | Lab Documentation",
      summary: "Multi-disciplinary lab work with structured experimentation and reporting.",
    },
    {
      code: "CSC404",
      title: "Computer Science Live Project",
      credentialType: "live project",
      term: "Semester 2",
      department: "Innovation",
      skills: "Programming | Debugging | Collaboration",
      summary: "Software design, testing practice, and application prototyping.",
    },
    {
      code: "ECO405",
      title: "Industry Internship: Economics and Public Policy",
      credentialType: "internship",
      term: "Semester 2",
      department: "Humanities",
      skills: "Policy Analysis | Data Interpretation | Presentation",
      summary: "Economic reasoning and civic policy review through case studies.",
    },
  ];
  const proficiencyScaleLabels = defaultBulkProficiencyLegend.map(
    (entry) => entry.label,
  );
  const sampleAbbreviations = serializeLegendPairs([
    {
      label: "CLR",
      description: "Comprehensive Learner Record",
    },
    {
      label: "OB",
      description: "Open Badge",
    },
    {
      label: "QR",
      description: "Quick Response verification code",
    },
  ]);
  const sampleProficiencyLegend = serializeLegendPairs(defaultBulkProficiencyLegend);

  const rows: BulkImportRow[] = [];

  for (let learnerIndex = 0; learnerIndex < learnerCount; learnerIndex += 1) {
    const profile = learnerProfiles[learnerIndex % learnerProfiles.length];
    const familyName = profile.familyName;
    const fullName = `${profile.givenName} ${familyName}`;
    const learnerId = `learner-${String(learnerIndex + 1).padStart(3, "0")}`;
    const studentNumber = `CLR-${2026}${String(learnerIndex + 1).padStart(4, "0")}`;
    const homeroom = `${11 + (learnerIndex % 2)}-${String.fromCharCode(65 + (learnerIndex % 4))}`;
    const programName = programs[learnerIndex % programs.length];
    const gradeLevel = learnerIndex % 2 === 0 ? "Grade 11" : "Grade 12";
    const verificationUrl = `https://bulk.demo.example/clr/${slugify(studentNumber)}`;
    const recordId = makeRecordId(studentNumber);

    for (let courseIndex = 0; courseIndex < courseCatalog.length; courseIndex += 1) {
      const course = courseCatalog[(learnerIndex + courseIndex) % courseCatalog.length];
      const grade = 74 + ((learnerIndex * 3 + courseIndex * 5) % 24);
      const credits = courseIndex === courseCatalog.length - 1 ? "0.5" : "1";
      const skillNames = splitSkills(course.skills);
      const skillCodes = skillNames.map(
        (skill, skillIndex) =>
          `${course.code}-SK${String(skillIndex + 1).padStart(2, "0")}-${slugify(skill)
            .replace(/-/g, "")
            .slice(0, 6)
            .toUpperCase()}`,
      );
      const skillProficiencyLevels = skillNames.map(
        (_, skillIndex) =>
          proficiencyScaleLabels[
            (learnerIndex + courseIndex + skillIndex) % proficiencyScaleLabels.length
          ],
      );

      rows.push({
        learnerId,
        studentNumber,
        recordId,
        fullName,
        givenName: profile.givenName,
        familyName,
        email: `${slugify(fullName)}@sampleacademy.edu`,
        phone: `${profile.phonePrefix}${String(learnerIndex + 1000).slice(-4)}`,
        dateOfBirth: `200${7 + (learnerIndex % 2)}-${String((learnerIndex % 9) + 1).padStart(2, "0")}-${String((learnerIndex % 21) + 7).padStart(2, "0")}`,
        gender: profile.gender,
        gradeLevel,
        programName,
        homeroom,
        section: `Section ${String.fromCharCode(65 + (learnerIndex % 4))}`,
        academicYear: "2025-2026",
        reportingPeriod: "Annual Result",
        learnerProfileSummary: "",
        addressLine: `${15 + learnerIndex} ${profile.addressSuffix}`,
        city: profile.city,
        state: profile.state,
        postalCode: profile.postalCode,
        country: profile.country,
        guardianName: `${profile.guardianName.split(" ")[0]} ${familyName}`,
        guardianEmail: `${profile.guardianEmailHandle}.${slugify(familyName)}${learnerIndex + 1}@samplemail.com`,
        guardianPhone: `${profile.guardianPhonePrefix}${String(learnerIndex + 2000).slice(-4)}`,
        verificationUrl,
        credentialType: course.credentialType,
        courseCode: course.code,
        courseTitle: course.title,
        courseTerm: course.term,
        courseLevel: learnerIndex % 4 === 0 ? "Advanced" : "Core",
        courseStartDate: course.term === "Semester 1" ? "2025-06-10" : "2025-11-15",
        courseEndDate: course.term === "Semester 1" ? "2025-10-20" : "2026-03-12",
        creditsEarned: credits,
        grade: String(grade),
        gradeScale: "%",
        result: grade >= 90 ? "Completed with Distinction" : "Promoted",
        courseStatus: "Completed",
        courseSummary: course.summary,
        skillNames: course.skills,
        skillCodes: skillCodes.join(" | "),
        skillFramework: "Institutional Competency Framework",
        skillProficiencyLevels: skillProficiencyLevels.join(" | "),
        instructorName: `${["Dr.", "Prof.", "Ms.", "Mr."][courseIndex % 4]} ${learnerProfiles[(learnerIndex + courseIndex + 2) % learnerProfiles.length].familyName}`,
        department: course.department,
        attendancePercent: String(91 + ((learnerIndex + courseIndex) % 8)),
        abbreviations: sampleAbbreviations,
        proficiencyLegend: sampleProficiencyLegend,
        remarks:
          grade >= 90
            ? "High distinction performance with strong evidence of mastery."
            : "Consistent completion of course expectations with reliable participation.",
      });
    }
  }

  return rows;
}

export function createSampleBulkCsv(learnerCount = sampleLearnerCount) {
  const worksheet = XLSX.utils.json_to_sheet(
    createSampleBulkRows(learnerCount).map((row) => rowToObject(row)),
  );
  return XLSX.utils.sheet_to_csv(worksheet);
}

export function createSampleBulkWorkbook(learnerCount = sampleLearnerCount) {
  const workbook = XLSX.utils.book_new();
  const importRows = createSampleBulkRows(learnerCount).map((row) => rowToObject(row));
  const importSheet = XLSX.utils.json_to_sheet(importRows);
  const instructionsSheet = XLSX.utils.json_to_sheet(
    bulkImportColumns.map((column) => ({
      column: column.key,
      required: column.required ? "Yes" : "No",
      description: column.description,
    })),
  );

  XLSX.utils.book_append_sheet(workbook, instructionsSheet, "instructions");
  XLSX.utils.book_append_sheet(workbook, importSheet, "bulk_clr_import");

  return XLSX.write(workbook, { type: "array", bookType: "xlsx" });
}

export function parseBulkWorkbook(buffer: ArrayBuffer): BulkParseResult {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = inferSheetName(workbook);

  if (!sheetName) {
    throw new Error(
      "No import sheet was found. Use the downloaded template so the upload contains learnerId, courseCode, and courseTitle columns.",
    );
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });
  const rows: BulkImportRow[] = [];
  const warnings: string[] = [];

  rawRows.forEach((entry, index) => {
    const row = mapRawRow(entry);
    if (isBlankRow(row)) {
      return;
    }

    warnings.push(...validateRow(row, index + 2));
    rows.push(row);
  });

  if (rows.length === 0) {
    throw new Error("The uploaded file did not contain any learner credential rows.");
  }

  return { rows, warnings, sheetName };
}

export function groupBulkImportRows(rows: BulkImportRow[]) {
  const grouped = new Map<string, BulkImportRow[]>();

  for (const row of rows) {
    const learnerKey = row.learnerId || row.studentNumber || row.fullName;
    if (!grouped.has(learnerKey)) {
      grouped.set(learnerKey, []);
    }

    grouped.get(learnerKey)!.push(row);
  }

  return [...grouped.entries()]
    .map(([learnerId, learnerRows]) => ({
      learnerId,
      rows: learnerRows,
    }))
    .sort(compareLearnerGroups);
}

export function buildBulkLearnerRecord(
  group: BulkLearnerGroup,
  settings: BulkGlobalSettings,
) {
  const clr = buildBulkClrPayload(group.rows, settings);
  const transcript = normalizeClrDocument(clr, { mode: "json" });
  const primary = group.rows[0];

  return {
    learnerId: group.learnerId,
    learnerName: primary.fullName,
    studentNumber: primary.studentNumber,
    email: primary.email,
    courseCount: group.rows.length,
    clr,
    transcript,
  } satisfies BulkGeneratedLearnerRecord;
}

export function buildBulkLearnerRecords(
  rows: BulkImportRow[],
  settings: BulkGlobalSettings,
) {
  return groupBulkImportRows(rows)
    .map((group) => buildBulkLearnerRecord(group, settings))
    .sort(compareLearners);
}

export function buildBulkTranscriptCustomization(
  settings: BulkGlobalSettings,
): TranscriptCustomization {
  return {
    institutionName: settings.institutionName,
    boardName: settings.boardName,
    institutionAddress: settings.institutionAddress,
    institutionWebsite: settings.institutionWebsite,
    registrarName: settings.registrarName,
    principalName: settings.principalName,
    reportingPeriodLabel: settings.reportingPeriodLabel,
    overallResult: "",
    academicStanding: "",
    programName: "",
    studentNumber: "",
    sealText: settings.sealText,
    homeroom: "",
    footerText: settings.footerText,
    template: settings.template,
  };
}
