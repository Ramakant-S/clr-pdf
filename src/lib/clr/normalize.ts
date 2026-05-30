import { demoClrPayload } from "@/lib/clr/demo-clr";
import { defaultInstitutionBranding } from "@/lib/branding/defaults";
import { resolveTranscriptEntryType } from "@/lib/clr/entry-type";
import type {
  TranscriptAlignment,
  SourceMode,
  TranscriptCourse,
  TranscriptInstitution,
  TranscriptLearner,
  TranscriptLegendItem,
  TranscriptRecord,
  TranscriptResultDescriptor,
  TranscriptRubricCriterionLevel,
  TranscriptSkill,
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

const defaultProficiencyLegend: TranscriptLegendItem[] = [
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

const baseAbbreviations: TranscriptLegendItem[] = [
  {
    label: "CLR",
    description: "Comprehensive Learner Record",
  },
  {
    label: "OB",
    description: "Open Badge credential data aligned with CLR evidence structures.",
  },
  {
    label: "QR",
    description: "Quick Response code used to open the verification source for the record.",
  },
];

const defaultLearnerProgram = "B.E. in Computer Science";
const defaultLearnerGradeLevel = "Undergraduate Year 2";
const defaultLearnerHomeroom = "CS-2A";
const defaultCredentialCredits = 1;
const defaultProficiencyLevels = ["Beginning", "Developing", "Proficient", "Advanced"] as const;
const fallbackIssuedIsoDate = "2026-05-31T00:00:00.000Z";

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

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = monthNames[date.getUTCMonth()];
  const year = date.getUTCFullYear();

  return `${day} ${month} ${year}`;
}

function makeFallbackStudentId(seed: string): string {
  let hash = 0;

  for (const character of seed) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  const numeric = String(hash % 1_000_000).padStart(6, "0");
  return `STU-${numeric}`;
}

function makeSeededIndex(seed: string, modulo: number): number {
  let hash = 2_166_136_261;

  for (const character of seed) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619) >>> 0;
  }

  return hash % modulo;
}

function makeDefaultProficiencyLevel(seed: string): string {
  return defaultProficiencyLevels[
    makeSeededIndex(seed, defaultProficiencyLevels.length)
  ];
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

function extractImageUrl(source: unknown): string | undefined {
  if (typeof source === "string") {
    return source;
  }

  if (Array.isArray(source)) {
    for (const entry of source) {
      const resolved = extractImageUrl(entry);
      if (resolved) {
        return resolved;
      }
    }

    return undefined;
  }

  if (!isRecord(source)) {
    return undefined;
  }

  return pickString(source.id, source.url, source.href);
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

function extractIdentityValue(source: unknown, acceptedTypes: RegExp[]): string | undefined {
  if (Array.isArray(source)) {
    for (const entry of source) {
      const resolved = extractIdentityValue(entry, acceptedTypes);
      if (resolved) {
        return resolved;
      }
    }

    return undefined;
  }

  if (!isRecord(source)) {
    return undefined;
  }

  const identityType = pickString(source.identityType, source.identifierType);
  if (!identityType || !acceptedTypes.some((pattern) => pattern.test(identityType))) {
    return undefined;
  }

  return pickString(source.identityHash, source.identifier, source.value, source.name);
}

function extractLearnerName(
  subject: JsonRecord | undefined,
  payload: JsonRecord,
  embeddedCredentials: JsonRecord[],
): string | undefined {
  const embeddedSubjects = embeddedCredentials
    .map((credential) => credential.credentialSubject)
    .filter(isRecord);

  return pickString(
    subject?.name,
    subject?.givenName,
    getValue(subject, "identity.name"),
    extractIdentityValue(subject?.identifier, [/^name$/i, /student.?name/i, /learner.?name/i]),
    extractIdentityValue(payload.identifier, [/^name$/i, /student.?name/i, /learner.?name/i]),
    ...embeddedSubjects.map((embeddedSubject) =>
      extractIdentityValue(embeddedSubject.identifier, [/^name$/i, /student.?name/i, /learner.?name/i]),
    ),
  );
}

function deriveProgramName(title: string): string {
  const beforeColon = title.split(":")[0]?.trim();
  if (beforeColon && !/transcript|record|credential/i.test(beforeColon)) {
    return beforeColon;
  }

  return defaultLearnerProgram;
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

function extractAlignments(source: unknown): TranscriptAlignment[] {
  return asArray(source)
    .filter(isRecord)
    .reduce<TranscriptAlignment[]>((alignments, entry) => {
      const name = pickString(entry.targetName, entry.name, entry.title);
      if (!name) {
        return alignments;
      }

      alignments.push({
        name,
        code: pickString(entry.targetCode, entry.code),
        framework: pickString(entry.targetFramework, entry.framework),
        description: pickString(entry.targetDescription, entry.description),
        targetType: pickString(entry.targetType, entry.type),
        url: pickString(entry.targetUrl, entry.url, entry.id),
      });

      return alignments;
    }, []);
}

function extractRubricLevels(source: unknown): TranscriptRubricCriterionLevel[] {
  return asArray(source)
    .filter(isRecord)
    .reduce<TranscriptRubricCriterionLevel[]>((levels, entry, index) => {
      const name = pickString(entry.name, entry.level, entry.id);
      if (!name) {
        return levels;
      }

      levels.push({
        id: pickString(entry.id) ?? `rubric-level-${index + 1}`,
        name,
        level: pickString(entry.level),
        description: pickString(entry.description),
        points: pickString(entry.points),
        alignment: extractAlignments(entry.alignment),
      });

      return levels;
    }, []);
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
    logoUrl: extractImageUrl(source.image),
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

function extractResultDescriptors(
  source: unknown,
  resultsSource: unknown,
): TranscriptResultDescriptor[] {
  const results = asArray(resultsSource).filter(isRecord);

  return asArray(source)
    .filter(isRecord)
    .map((entry, index) => {
      const descriptorId =
        pickString(entry.id) ?? `result-description-${index + 1}`;
      const rubricLevels = extractRubricLevels(entry.rubricCriterionLevel);
      const matchedResult = results.find(
        (result) => pickString(result.resultDescription) === descriptorId,
      );
      const achievedLevelId = pickString(matchedResult?.rubricCriterionLevel);
      const achievedLevelLabel =
        rubricLevels.find((level) => level.id === achievedLevelId)?.name ??
        pickString(matchedResult?.value, matchedResult?.status);
      const name =
        pickString(entry.name, entry.resultType, entry.type) ??
        `Result ${index + 1}`;

      return {
        id: descriptorId,
        name,
        resultType: pickString(entry.resultType, entry.type) ?? "Result",
        description: pickString(entry.description),
        value: pickString(matchedResult?.value),
        status: pickString(matchedResult?.status),
        valueMin: pickString(entry.valueMin),
        valueMax: pickString(entry.valueMax),
        rubricLevels,
        alignment: extractAlignments(entry.alignment),
        achievedLevelId,
        achievedLevelLabel,
      } satisfies TranscriptResultDescriptor;
    });
}

function extractLegendItems(source: unknown): TranscriptLegendItem[] {
  return asArray(source)
    .filter(isRecord)
    .map((entry) => {
      const label = pickString(entry.label, entry.name, entry.term);
      const description = pickString(
        entry.description,
        entry.meaning,
        entry.definition,
        entry.narrative,
      );

      if (!label || !description) {
        return undefined;
      }

      return { label, description } satisfies TranscriptLegendItem;
    })
    .filter((entry): entry is TranscriptLegendItem => Boolean(entry));
}

function buildAbbreviations(
  learner: TranscriptLearner,
  modelHints: string[],
): TranscriptLegendItem[] {
  const abbreviations = [...baseAbbreviations];

  if (learner.oen) {
    abbreviations.push({
      label: "OEN",
      description: "Ontario Education Number or comparable provincial learner identifier.",
    });
  }

  if (modelHints.some((hint) => /openbadge|open badge/i.test(hint))) {
    abbreviations.push({
      label: "VC",
      description: "Verifiable Credential packaging used to transport CLR-linked achievement data.",
    });
  }

  return abbreviations;
}

function buildProficiencyLegend(
  courses: TranscriptCourse[],
): TranscriptLegendItem[] {
  const seen = new Map<string, string>();

  for (const course of courses) {
    for (const descriptor of course.resultDescriptors) {
      for (const level of descriptor.rubricLevels) {
        const key = level.name.trim();
        if (!key || seen.has(key)) {
          continue;
        }

        seen.set(
          key,
          level.description ||
            `Rubric level recorded for ${descriptor.name.toLowerCase()}.`,
        );
      }
    }
  }

  if (seen.size === 0) {
    return defaultProficiencyLegend;
  }

  return [...seen.entries()].map(([label, description]) => ({
    label,
    description,
  }));
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
  const resultDescriptors = extractResultDescriptors(
    achievement?.resultDescription ??
      subject?.resultDescription ??
      credential.resultDescription,
    subject?.result ?? credential.result ?? achievement?.result,
  );
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
  const hasEvidence =
    asArray(subject?.evidence).length > 0 ||
    asArray(credential.evidence).length > 0 ||
    asArray(achievement?.evidence).length > 0;

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

  const extractedCreditsValue =
    parseNumber(getValue(achievement, "creditsAvailable.value")) ??
    parseNumber(achievement?.creditsAvailable) ??
    parseNumber(getValue(subject, "creditsEarned.value")) ??
    parseNumber(subject?.creditsEarned);
  const creditsValue = extractedCreditsValue ?? defaultCredentialCredits;
  const alignments = extractAlignments(achievement?.alignment);
  const rawSkillNames = uniqueStrings([
    ...alignments.map((alignment) => alignment.name),
    ...extractNames(achievement?.skill),
    ...extractNames(achievement?.skills),
    ...extractNames(achievement?.tag),
  ]).slice(0, 8);
  const skillDetails: TranscriptSkill[] = rawSkillNames.map((skillName) => {
    const matchingAlignment = alignments.find((alignment) => alignment.name === skillName);
    const matchingResult = resultDescriptors.find((descriptor) => {
      const descriptorMatchesAlignment = descriptor.alignment.some(
        (alignment) => alignment.name === skillName,
      );
      const descriptorMentionsSkill = descriptor.name
        .toLowerCase()
        .includes(skillName.toLowerCase());

      return descriptorMatchesAlignment || descriptorMentionsSkill;
    });

    return {
      name: skillName,
      proficiencyLevel: matchingResult?.achievedLevelLabel,
      framework: matchingAlignment?.framework,
      code: matchingAlignment?.code,
      description: matchingAlignment?.description,
      targetType: matchingAlignment?.targetType,
      url: matchingAlignment?.url,
    };
  });

  const courseId = pickString(credential.id, achievement?.id) ?? `${courseCode}-${index + 1}`;
  const courseTitle =
    pickString(achievement?.name, subject?.name, credential.name) ??
    `Achievement ${index + 1}`;
  const proficiencyLabel =
    resultDescriptors.find((descriptor) => descriptor.achievedLevelLabel)
      ?.achievedLevelLabel ??
    skillDetails.find((skill) => skill.proficiencyLevel)?.proficiencyLevel ??
    makeDefaultProficiencyLevel(`${courseId}-${courseTitle}-${courseCode}`);

  return {
    id: courseId,
    title: courseTitle,
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
    skills: skillDetails.map((skill) => skill.name),
    skillDetails,
    alignments,
    gradeLabel: gradeEntry?.value ?? "Recorded",
    gradeValue: gradeEntry?.numeric,
    proficiencyLabel,
    creditsLabel:
      `${creditsValue.toFixed(creditsValue % 1 === 0 ? 0 : 1)} credit`,
    creditsValue,
    status: statusEntry?.value ?? "Completed",
    hasEvidence,
    startDate: startDateSource,
    endDate: endDateSource,
    resultDescriptors,
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
      logoUrl: defaultInstitutionBranding.logoPath,
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

  const title = pickString(payload.name, payload.title) ?? "Official Academic Transcript";
  const learnerName =
    extractLearnerName(subject, payload, embeddedCredentials) ?? "Learner";

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
    gradeLevel:
      pickString(subject?.gradeLevel, subject?.academicLevel) ??
      defaultLearnerGradeLevel,
    programName:
      pickString(subject?.programName, getValue(subject, "program.name")) ??
      deriveProgramName(title),
    homeroom: pickString(subject?.homeroom) ?? defaultLearnerHomeroom,
    oen: pickString(subject?.oen, subject?.nationalId),
    profileSummary: buildProfileSummary(learnerName, topSkills),
  };

  const issuedOn =
    formatDate(
      pickString(payload.validFrom, payload.issuanceDate, payload.awardedDate, courses.at(-1)?.endDate),
    ) ?? formatDate(fallbackIssuedIsoDate)!;
  const modelHints = uniqueStrings([
    ...readTypeList(payload),
    ...embeddedCredentials.flatMap((credential) => readTypeList(credential)),
  ]);
  const customProficiencyLegend = extractLegendItems(payload.proficiencyScale);
  const customAbbreviations = extractLegendItems(payload.transcriptAbbreviations);
  const proficiencyLegend =
    customProficiencyLegend.length > 0
      ? customProficiencyLegend
      : buildProficiencyLegend(courses);
  const abbreviations =
    customAbbreviations.length > 0
      ? customAbbreviations
      : buildAbbreviations(learner, modelHints);

  return {
    sourceType: options.mode,
    sourceUrl: options.sourceUrl,
    verificationUrl:
      pickString(payload.id, payload.identifier, options.sourceUrl, getValue(payload, "credentialSubject.id")),
    credentialId: pickString(payload.identifier, payload.id) ?? "Credential ID unavailable",
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
    proficiencyLegend,
    abbreviations,
    modelHints,
  };
}
