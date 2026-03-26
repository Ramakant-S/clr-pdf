import { demoClrPayload } from "@/lib/clr/demo-clr";
import { defaultInstitutionBranding } from "@/lib/branding/defaults";
import { resolveTranscriptEntryType } from "@/lib/clr/entry-type";
import type {
  SourceMode,
  TranscriptCourse,
  TranscriptInstitution,
  TranscriptLearner,
  TranscriptLegendItem,
  TranscriptRecord,
} from "@/lib/clr/types";

type JsonRecord = Record<string, unknown>;

const gradeLegend: TranscriptLegendItem[] = [
  {
    label: "90-100",
    description: "Outstanding command of course outcomes and consistent evidence of advanced application.",
  },
  {
    label: "80-89",
    description: "Strong performance with secure understanding, reliable execution, and clear transfer of learning.",
  },
  {
    label: "70-79",
    description: "Provincial standard achieved with consistent completion of course expectations.",
  },
  {
    label: "60-69",
    description: "Developing proficiency with partial command of expectations and targeted support still beneficial.",
  },
  {
    label: "Below 60",
    description: "Limited demonstration of required learning outcomes; remediation or resubmission may be needed.",
  },
];

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) {
    return value;
  }

  return value == null ? [] : [value];
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }

  return undefined;
}

function getValue(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (isRecord(current)) {
      return current[key];
    }

    return undefined;
  }, source);
}

function uniqueStrings(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function readTypeList(source: unknown): string[] {
  if (!isRecord(source)) {
    return [];
  }

  return uniqueStrings(asArray(source.type).map((item) => pickString(item)));
}

function parseNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const match = value.match(/-?\d+(\.\d+)?/);
  if (!match) {
    return undefined;
  }

  return Number(match[0]);
}

function formatDate(value: unknown): string | undefined {
  const text = pickString(value);
  if (!text) {
    return undefined;
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function makeFallbackStudentId(seed: string): string {
  let hash = 0;

  for (const character of seed) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  const numeric = String(hash % 1_000_000).padStart(6, "0");
  return `STU-${numeric}`;
}

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatAddress(address: unknown): string | undefined {
  if (typeof address === "string") {
    return address;
  }

  if (!isRecord(address)) {
    return undefined;
  }

  return uniqueStrings([
    pickString(address.streetAddress),
    pickString(address.addressLocality),
    pickString(address.addressRegion),
    pickString(address.postalCode),
    pickString(address.addressCountry),
  ]).join(", ");
}

function deriveTerm(value: unknown): string | undefined {
  const explicit = pickString(value);
  if (explicit) {
    return explicit;
  }

  const dateText = pickString(value);
  if (!dateText) {
    return undefined;
  }

  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  const month = date.getUTCMonth();
  const year = date.getUTCFullYear();

  if (month <= 2) {
    return `Spring ${year}`;
  }

  if (month <= 5) {
    return `Summer ${year}`;
  }

  if (month <= 8) {
    return `Autumn ${year}`;
  }

  return `Winter ${year}`;
}

function extractIdentifier(source: unknown): string | undefined {
  if (typeof source === "string") {
    return source;
  }

  if (Array.isArray(source)) {
    for (const entry of source) {
      const resolved = extractIdentifier(entry);
      if (resolved) {
        return resolved;
      }
    }

    return undefined;
  }

  if (!isRecord(source)) {
    return undefined;
  }

  return pickString(
    source.identifier,
    source.value,
    source.code,
    source.id,
    source.name,
  );
}

function extractNames(source: unknown): string[] {
  if (typeof source === "string") {
    return [source];
  }

  if (Array.isArray(source)) {
    return source.flatMap((entry) => extractNames(entry));
  }

  if (!isRecord(source)) {
    return [];
  }

  return uniqueStrings([
    pickString(source.targetName),
    pickString(source.name),
    pickString(source.title),
    pickString(source.value),
  ]);
}

function normalizeIssuer(source: unknown): TranscriptInstitution | undefined {
  if (typeof source === "string") {
    return {
      name: source,
      logoText: initialsFromName(source),
    };
  }

  if (!isRecord(source)) {
    return undefined;
  }

  const name = pickString(source.name, source.legalName, source.displayName);
  if (!name) {
    return undefined;
  }

  return {
    name,
    boardName: pickString(source.boardName, source.parentOrganization),
    address: formatAddress(source.address),
    website: pickString(source.url, source.email),
    logoText: initialsFromName(name),
  };
}

function extractResultEntries(
  source: unknown,
): Array<{ label: string; value: string; numeric?: number }> {
  const entries: Array<{ label: string; value: string; numeric?: number }> = [];

  for (const entry of asArray(source)) {
    if (typeof entry === "string") {
      entries.push({
        label: "Result",
        value: entry,
        numeric: parseNumber(entry),
      });
      continue;
    }

    if (!isRecord(entry)) {
      continue;
    }

    const value = pickString(
      entry.value,
      entry.result,
      entry.achievedLevel,
      entry.resultValue,
    );

    if (!value) {
      continue;
    }

    entries.push({
      label:
        pickString(entry.resultDescription, entry.resultType, entry.name, entry.type) ??
        "Result",
      value,
      numeric: parseNumber(value),
    });
  }

  return entries;
}

function sortCourses(courses: TranscriptCourse[]): TranscriptCourse[] {
  return [...courses].sort((left, right) => {
    const leftDate = new Date(left.endDate ?? left.startDate ?? "").getTime();
    const rightDate = new Date(right.endDate ?? right.startDate ?? "").getTime();

    if (!Number.isNaN(leftDate) && !Number.isNaN(rightDate) && leftDate !== rightDate) {
      return leftDate - rightDate;
    }

    return left.title.localeCompare(right.title);
  });
}

function getEmbeddedCredentials(root: JsonRecord, subject: JsonRecord | undefined): JsonRecord[] {
  const candidates = [
    ...asArray(root.verifiableCredential),
    ...asArray(subject?.verifiableCredential),
  ];

  return candidates.filter(isRecord);
}

function getStandaloneAchievements(
  root: JsonRecord,
  subject: JsonRecord | undefined,
): JsonRecord[] {
  const achievements = [
    ...asArray(subject?.achievement),
    ...asArray(subject?.achievements),
    ...asArray(root.achievement),
    ...asArray(root.achievements),
  ].filter(isRecord);

  return achievements.map((achievement, index) => ({
    id: pickString(achievement.id) ?? `achievement-${index + 1}`,
    type: ["AchievementCredential"],
    issuer: root.issuer,
    validFrom: pickString(root.validFrom, root.issuanceDate),
    credentialSubject: {
      id: pickString(subject?.id),
      name: pickString(subject?.name),
      achievement,
      result: asArray(subject?.result).filter(isRecord),
      creditsEarned: subject?.creditsEarned,
      term: subject?.term,
    },
  }));
}

function normalizeCourse(
  credential: JsonRecord,
  index: number,
  fallbackInstitution: TranscriptInstitution,
): TranscriptCourse {
  const subject = isRecord(credential.credentialSubject) ? credential.credentialSubject : undefined;
  const achievement = isRecord(subject?.achievement)
    ? subject.achievement
    : isRecord(credential.achievement)
      ? credential.achievement
      : undefined;

  const issuer = normalizeIssuer(credential.issuer) ?? fallbackInstitution;
  const results = extractResultEntries(subject?.result ?? credential.result ?? achievement?.result);
  const gradeEntry =
    results.find((entry) => /grade|mark|score/i.test(entry.label)) ??
    results.find((entry) => entry.numeric != null);
  const statusEntry = results.find((entry) => /result|status|outcome/i.test(entry.label));
  const courseCode =
    extractIdentifier(
      asArray(achievement?.identifier).find((entry) =>
        pickString(isRecord(entry) ? entry.type : undefined)?.toLowerCase().includes("code"),
      ) ?? achievement?.identifier,
    ) ??
    extractIdentifier(subject?.identifier) ??
    `ACH-${String(index + 1).padStart(3, "0")}`;

  const startDateSource = pickString(
    achievement?.startDate,
    subject?.startDate,
    credential.validFrom,
  );

  const endDateSource = pickString(
    achievement?.endDate,
    subject?.endDate,
    credential.validUntil,
    credential.validFrom,
  );

  const summary =
    pickString(
      achievement?.description,
      credential.description,
      results.find((entry) => /comment|remark|summary/i.test(entry.label))?.value,
    ) ?? "Verified credential achievement imported from the learner credential record.";

  const credentialType = resolveTranscriptEntryType(
    pickString(
      achievement?.achievementType,
      achievement?.credentialType,
      subject?.achievementType,
      subject?.credentialType,
      credential.achievementType,
      credential.credentialType,
    ),
    ...readTypeList(achievement),
    ...readTypeList(credential),
    pickString(achievement?.name, credential.name),
    summary,
  );

  const creditsValue =
    parseNumber(getValue(achievement, "creditsAvailable.value")) ??
    parseNumber(achievement?.creditsAvailable) ??
    parseNumber(getValue(subject, "creditsEarned.value")) ??
    parseNumber(subject?.creditsEarned);

  return {
    id: pickString(credential.id, achievement?.id) ?? `${courseCode}-${index + 1}`,
    title:
      pickString(achievement?.name, subject?.name, credential.name) ??
      `Achievement ${index + 1}`,
    code: courseCode,
    credentialType,
    issuer: issuer.name,
    term:
      pickString(
        achievement?.term,
        subject?.term,
        deriveTerm(endDateSource),
        deriveTerm(startDateSource),
      ) ?? `Term ${Math.floor(index / 4) + 1}`,
    summary,
    skills: uniqueStrings([
      ...extractNames(achievement?.alignment),
      ...extractNames(achievement?.skill),
      ...extractNames(achievement?.skills),
      ...extractNames(achievement?.tag),
    ]).slice(0, 6),
    gradeLabel: gradeEntry?.value ?? "Recorded",
    gradeValue: gradeEntry?.numeric,
    creditsLabel:
      creditsValue != null ? `${creditsValue.toFixed(creditsValue % 1 === 0 ? 0 : 1)} credit` : "Recorded",
    creditsValue,
    status: statusEntry?.value ?? "Completed",
    startDate: startDateSource,
    endDate: endDateSource,
  };
}

function buildProfileSummary(learnerName: string, topSkills: string[]): string {
  if (topSkills.length === 0) {
    return `${learnerName} has verified credential and achievement entries recorded in the CLR and organized here in transcript format.`;
  }

  return `${learnerName} demonstrates consistent performance across credentialed learning with emphasis on ${topSkills
    .slice(0, 3)
    .join(", ")
    .toLowerCase()}.`;
}

export function parseJsonSource(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `CLR JSON is invalid: ${error.message}`
        : "CLR JSON is invalid.",
    );
  }
}

export function getDemoClrPayload(): unknown {
  return demoClrPayload;
}

export function normalizeClrDocument(
  payload: unknown,
  options: { mode: SourceMode; sourceUrl?: string } = { mode: "json" },
): TranscriptRecord {
  if (!isRecord(payload)) {
    throw new Error("The supplied CLR payload is not a valid JSON object.");
  }

  const subject = isRecord(payload.credentialSubject) ? payload.credentialSubject : undefined;
  const embeddedCredentials = getEmbeddedCredentials(payload, subject);
  const standaloneAchievements = getStandaloneAchievements(payload, subject);
  const institution =
    normalizeIssuer(payload.issuer) ??
    normalizeIssuer(embeddedCredentials[0]?.issuer) ?? {
      name: defaultInstitutionBranding.name,
      boardName: defaultInstitutionBranding.boardName,
      address: defaultInstitutionBranding.address,
      website: defaultInstitutionBranding.website,
      logoText: defaultInstitutionBranding.sealText,
    };

  const coursePayloads =
    embeddedCredentials.length > 0
      ? embeddedCredentials
      : standaloneAchievements.length > 0
        ? standaloneAchievements
        : isRecord(subject?.achievement) || isRecord(payload.achievement)
          ? [payload]
          : [];

  const courses = sortCourses(
    coursePayloads.map((credential, index) => normalizeCourse(credential, index, institution)),
  );

  if (courses.length === 0) {
    throw new Error(
      "No credential or achievement entries were found in the CLR payload. Provide a CLR with embedded credentials or achievement records.",
    );
  }

  const skillCounts = new Map<string, number>();
  for (const course of courses) {
    for (const skill of course.skills) {
      skillCounts.set(skill, (skillCounts.get(skill) ?? 0) + 1);
    }
  }

  const topSkills = [...skillCounts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([skill]) => skill)
    .slice(0, 10);

  const numericGrades = courses
    .map((course) => course.gradeValue)
    .filter((value): value is number => value != null);

  const totalCredits = courses.reduce(
    (sum, course) => sum + (course.creditsValue ?? 0),
    0,
  );

  const learnerName =
    pickString(subject?.name, subject?.givenName, getValue(subject, "identity.name")) ?? "Learner";

  const learner: TranscriptLearner = {
    fullName: learnerName,
    studentId:
      pickString(
        subject?.studentId,
        subject?.identifier,
        extractIdentifier(subject?.otherIdentifier),
      ) ??
      makeFallbackStudentId(
        pickString(subject?.id, payload.id, learnerName) ?? "learner",
      ),
    gradeLevel: pickString(subject?.gradeLevel, subject?.academicLevel),
    programName: pickString(subject?.programName, getValue(subject, "program.name")),
    homeroom: pickString(subject?.homeroom),
    oen: pickString(subject?.oen, subject?.nationalId),
    profileSummary: buildProfileSummary(learnerName, topSkills),
  };

  const title = pickString(payload.name, payload.title) ?? "Official Academic Transcript";
  const issuedOn =
    formatDate(
      pickString(payload.validFrom, payload.issuanceDate, payload.awardedDate, courses.at(-1)?.endDate),
    ) ?? formatDate(new Date().toISOString())!;

  return {
    sourceType: options.mode,
    sourceUrl: options.sourceUrl,
    verificationUrl:
      options.sourceUrl ?? pickString(payload.id, payload.identifier, getValue(payload, "credentialSubject.id")),
    credentialId: pickString(payload.id, payload.identifier) ?? "Credential ID unavailable",
    title,
    issuedOn,
    institution,
    learner,
    summary: {
      totalCourses: courses.length,
      totalCredits,
      averageGrade:
        numericGrades.length > 0
          ? Number((numericGrades.reduce((sum, value) => sum + value, 0) / numericGrades.length).toFixed(1))
          : undefined,
      overallResult: "Completed",
      academicStanding:
        numericGrades.length > 0 && numericGrades.every((value) => value >= 85)
          ? "Honours Standing"
          : "Good Standing",
      topSkills,
    },
    courses,
    notes: [
      "This transcript is a print-oriented summary generated from a verified CLR/Open Badge record.",
      "Credential and achievement entries are normalized into transcript format for academic review.",
      "The QR code links back to the source credential URL when one is available.",
    ],
    gradeLegend,
    modelHints: uniqueStrings([
      ...readTypeList(payload),
      ...embeddedCredentials.flatMap((credential) => readTypeList(credential)),
    ]),
  };
}
