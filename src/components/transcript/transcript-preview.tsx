"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import {
  defaultInstitutionBranding,
  isDefaultInstitutionBranding,
} from "@/lib/branding/defaults";
import { formatTranscriptEntryType } from "@/lib/clr/entry-type";
import { paginateCourses } from "@/lib/transcript/paginate";
import type {
  TranscriptCourse,
  TranscriptCustomization,
  TranscriptRecord,
  TranscriptSkill,
  TranscriptTemplate,
} from "@/lib/clr/types";
import styles from "./transcript-preview.module.css";

function displayValue(...values: Array<string | undefined>) {
  return values.find((value) => value && value.trim()) ?? "Not recorded";
}

function shortenValue(value: string, maxLength = 44) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

function formatSkillValue(skill: TranscriptSkill | string) {
  if (typeof skill === "string") {
    return skill;
  }

  return skill.proficiencyLevel
    ? `${skill.name} (${skill.proficiencyLevel})`
    : skill.name;
}

function toneToken(value?: string) {
  return (
    value
      ?.toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") ?? ""
  );
}

function renderSkillTag(skill: TranscriptSkill | string, key: string) {
  if (typeof skill === "string") {
    return (
      <span key={key} className={styles.skillTag} data-skill-tone="plain">
        <span className={styles.skillTagName}>{skill}</span>
      </span>
    );
  }

  const skillMeta = [skill.proficiencyLevel].filter(Boolean).join(" / ");
  const skillTone = toneToken(skill.proficiencyLevel) || "plain";

  return (
    <span key={key} className={styles.skillTag} data-skill-tone={skillTone}>
      <span className={styles.skillTagName}>{skill.name}</span>
      {skillMeta ? <span className={styles.skillTagMeta}>{skillMeta}</span> : null}
    </span>
  );
}

function renderCourseRows(
  courses: TranscriptCourse[],
  template: TranscriptTemplate,
) {
  const usePlainMeta = template === "minimal";

  if (courses.length === 0) {
    return (
      <tr>
        <td colSpan={6}>
          <p className={styles.summaryText}>
            No credential or achievement entries were available in the supplied CLR source.
          </p>
        </td>
      </tr>
    );
  }

  return courses.map((course) => (
    <tr key={course.id} className={styles.courseRow}>
      <td>
        <div className={styles.courseHeading}>
          <span className={styles.courseTitle}>{course.title}</span>
        </div>
        <p className={styles.summaryText}>{course.summary}</p>
        <div className={styles.courseChips}>
          <span className={styles.codeChip}>{course.code}</span>
          {course.hasEvidence ? (
            <span className={styles.evidenceChip}>Evidence Included</span>
          ) : null}
        </div>
      </td>
      <td>
        {usePlainMeta ? (
          <span className={styles.inlineMetaText}>
            {formatTranscriptEntryType(course.credentialType)}
          </span>
        ) : (
          <span
            className={styles.typeBadge}
            data-entry-tone={toneToken(course.credentialType) || "default"}
          >
            {formatTranscriptEntryType(course.credentialType)}
          </span>
        )}
      </td>
      <td>
        {usePlainMeta ? (
          <p className={styles.inlineMetaList}>
            {(course.skillDetails.length > 0 ? course.skillDetails : course.skills).length > 0
              ? (course.skillDetails.length > 0
                  ? course.skillDetails
                  : course.skills
                )
                  .map((skill) => formatSkillValue(skill))
                  .join(", ")
              : "No skills recorded"}
          </p>
        ) : (
          <div className={styles.skillList}>
            {(course.skillDetails.length > 0 ? course.skillDetails : course.skills).length >
            0 ? (
              (course.skillDetails.length > 0 ? course.skillDetails : course.skills).map(
                (skill, index) =>
                  renderSkillTag(
                    skill,
                    `${course.id}-${typeof skill === "string" ? skill : `${skill.name}-${index}`}`,
                  ),
              )
            ) : (
              <span className={styles.summaryText}>No skills recorded</span>
            )}
          </div>
        )}
      </td>
      <td className={styles.gradeCell}>
        <span className={styles.gradeValue}>{course.proficiencyLabel}</span>
      </td>
      <td className={styles.metricCell}>{course.creditsLabel}</td>
      <td>
        {usePlainMeta ? (
          <span className={styles.inlineMetaTextStrong}>{course.status}</span>
        ) : (
          <span
            className={styles.statusPill}
            data-status-tone={toneToken(course.status) || "default"}
          >
            {course.status}
          </span>
        )}
      </td>
    </tr>
  ));
}

function sameCoursePages(
  left: TranscriptCourse[][],
  right: TranscriptCourse[][],
) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((leftPage, pageIndex) => {
    const rightPage = right[pageIndex];

    if (!rightPage || leftPage.length !== rightPage.length) {
      return false;
    }

    return leftPage.every((course, courseIndex) => course.id === rightPage[courseIndex]?.id);
  });
}

interface TranscriptPreviewProps {
  record: TranscriptRecord;
  customization: TranscriptCustomization;
  previewRef: React.RefObject<HTMLDivElement | null>;
  template?: TranscriptTemplate;
  onLayoutSettledChange?: (settled: boolean) => void;
}

export function TranscriptPreview({
  record,
  customization,
  previewRef,
  template,
  onLayoutSettledChange,
}: TranscriptPreviewProps) {
  const activeTemplate = template ?? customization.template ?? "heritage";
  const estimatedPages = useMemo(() => {
    const initialPages = paginateCourses(record.courses);

    return [initialPages.cover, ...initialPages.overflow];
  }, [record.courses]);
  const [coursePages, setCoursePages] = useState<TranscriptCourse[][]>(estimatedPages);
  const summaryAnchorRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLElement | null>(null);
  const summaryMeasureRef = useRef<HTMLDivElement | null>(null);
  const firstPageBodyMeasureRef = useRef<HTMLTableSectionElement | null>(null);
  const firstPageFooterMeasureRef = useRef<HTMLElement | null>(null);
  const laterPageBodyMeasureRef = useRef<HTMLTableSectionElement | null>(null);
  const laterPageFooterMeasureRef = useRef<HTMLElement | null>(null);
  const rowMeasureBodyRef = useRef<HTMLTableSectionElement | null>(null);
  const [layoutSettled, setLayoutSettled] = useState(false);
  const [inlineSummaryOnLastCredentialPage, setInlineSummaryOnLastCredentialPage] =
    useState(false);
  const credentialPages = coursePages.length;
  const summaryPageNumber = credentialPages + 1;
  const notesPageNumber = credentialPages + (inlineSummaryOnLastCredentialPage ? 1 : 2);
  const totalPages = credentialPages + (inlineSummaryOnLastCredentialPage ? 1 : 2);
  const institutionName = displayValue(
    customization.institutionName,
    record.institution.name,
  );
  const institutionWebsite =
    customization.institutionWebsite || record.institution.website;
  const gradeLevel = displayValue(record.learner.gradeLevel);
  const programName = displayValue(
    customization.programName,
    record.learner.programName,
  );
  const studentNumber = displayValue(
    customization.studentNumber,
    record.learner.studentId,
  );
  const homeroom = displayValue(customization.homeroom, record.learner.homeroom);
  const sealText = displayValue(
    customization.sealText,
    record.institution.logoText,
  ).slice(0, 2);
  const overallResult = displayValue(
    customization.overallResult,
    record.summary.overallResult,
  );
  const academicStanding = displayValue(
    customization.academicStanding,
    record.summary.academicStanding,
  );
  const institutionLines = [
    customization.boardName || record.institution.boardName,
    customization.institutionAddress || record.institution.address,
    institutionWebsite,
  ].filter((value): value is string => Boolean(value && value.trim()));
  const useInstitutionLogo = isDefaultInstitutionBranding(
    institutionName,
    institutionWebsite,
  );
  const footerText =
    customization.footerText.trim() ||
    `${institutionName} | Official academic record prepared from CLR data`;
  const coverCourses = coursePages[0] ?? [];
  const overflowPages = coursePages.slice(1);

  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setCoursePages(estimatedPages);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [estimatedPages]);

  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setLayoutSettled(false);
    });
    onLayoutSettledChange?.(false);

    return () => window.cancelAnimationFrame(frame);
  }, [
    activeTemplate,
    customization.homeroom,
    customization.overallResult,
    customization.academicStanding,
    customization.footerText,
    customization.institutionName,
    customization.institutionAddress,
    customization.institutionWebsite,
    customization.boardName,
    customization.studentNumber,
    customization.programName,
    customization.reportingPeriodLabel,
    customization.principalName,
    customization.registrarName,
    record.courses,
    record.issuedOn,
    record.credentialId,
    record.learner.fullName,
    record.learner.profileSummary,
    record.summary.topSkills,
    record.summary.overallResult,
    record.summary.academicStanding,
    onLayoutSettledChange,
  ]);

  useLayoutEffect(() => {
    if (layoutSettled) {
      onLayoutSettledChange?.(true);
      return;
    }

    let frameOne = 0;
    let frameTwo = 0;

    const measureCoursePagination = () => {
      if (record.courses.length === 0) {
        const nextPages = [[]];
        const pagesSettled = sameCoursePages(coursePages, nextPages);

        if (!pagesSettled) {
          setCoursePages(nextPages);
        }

        return pagesSettled;
      }

      const firstPageBody = firstPageBodyMeasureRef.current;
      const firstPageFooter = firstPageFooterMeasureRef.current;
      const laterPageBody = laterPageBodyMeasureRef.current;
      const laterPageFooter = laterPageFooterMeasureRef.current;
      const rowMeasureBody = rowMeasureBodyRef.current;

      if (
        !firstPageBody ||
        !firstPageFooter ||
        !laterPageBody ||
        !laterPageFooter ||
        !rowMeasureBody
      ) {
        return false;
      }

      const firstPageCapacity =
        firstPageFooter.getBoundingClientRect().top -
        firstPageBody.getBoundingClientRect().top -
        2;
      const laterPageCapacity =
        laterPageFooter.getBoundingClientRect().top -
        laterPageBody.getBoundingClientRect().top -
        2;

      if (firstPageCapacity <= 0 || laterPageCapacity <= 0) {
        return false;
      }

      const measuredRows = Array.from(rowMeasureBody.querySelectorAll("tr"));

      if (measuredRows.length !== record.courses.length) {
        return false;
      }

      const rowHeights = measuredRows.map((row) => row.getBoundingClientRect().height);
      const nextPages: TranscriptCourse[][] = [];
      let currentPage: TranscriptCourse[] = [];
      let currentHeight = 0;
      let currentCapacity = firstPageCapacity;

      record.courses.forEach((course, index) => {
        const rowHeight = rowHeights[index] ?? 0;
        const wouldOverflow =
          currentPage.length > 0 && currentHeight + rowHeight > currentCapacity;

        if (wouldOverflow) {
          nextPages.push(currentPage);
          currentPage = [];
          currentHeight = 0;
          currentCapacity = laterPageCapacity;
        }

        currentPage.push(course);
        currentHeight += rowHeight;
      });

      if (currentPage.length > 0) {
        nextPages.push(currentPage);
      }

      const pagesSettled = sameCoursePages(coursePages, nextPages);

      if (!pagesSettled) {
        setCoursePages(nextPages);
      }

      return pagesSettled;
    };

    const measurePlacement = () => {
      const pagesSettled = measureCoursePagination();

      const summaryAnchor = summaryAnchorRef.current;
      const footer = footerRef.current;
      const summaryMeasure = summaryMeasureRef.current;

      if (!summaryAnchor || !footer || !summaryMeasure) {
        setInlineSummaryOnLastCredentialPage(false);
        setLayoutSettled(false);
        onLayoutSettledChange?.(false);
        return;
      }

      const availableHeight =
        footer.getBoundingClientRect().top - summaryAnchor.getBoundingClientRect().bottom;
      const requiredHeight = summaryMeasure.getBoundingClientRect().height + 8;
      const shouldInlineSummary = availableHeight >= requiredHeight;
      const summarySettled =
        inlineSummaryOnLastCredentialPage === shouldInlineSummary;

      if (!summarySettled) {
        setInlineSummaryOnLastCredentialPage(shouldInlineSummary);
      }

      const nextLayoutSettled = Boolean(pagesSettled) && summarySettled;
      setLayoutSettled(nextLayoutSettled);
      onLayoutSettledChange?.(nextLayoutSettled);
    };

    frameOne = window.requestAnimationFrame(() => {
      frameTwo = window.requestAnimationFrame(measurePlacement);
    });

    return () => {
      window.cancelAnimationFrame(frameOne);
      window.cancelAnimationFrame(frameTwo);
    };
  }, [
    activeTemplate,
    coverCourses.length,
    overflowPages.length,
    customization.homeroom,
    customization.overallResult,
    customization.academicStanding,
    customization.footerText,
    customization.institutionName,
    customization.institutionAddress,
    customization.institutionWebsite,
    customization.boardName,
    customization.studentNumber,
    customization.programName,
    customization.reportingPeriodLabel,
    customization.principalName,
    customization.registrarName,
    record.courses,
    record.issuedOn,
    record.credentialId,
    record.learner.fullName,
    record.learner.profileSummary,
    record.summary.topSkills,
    record.summary.overallResult,
    record.summary.academicStanding,
    coursePages,
    inlineSummaryOnLastCredentialPage,
    layoutSettled,
    onLayoutSettledChange,
  ]);

  function renderSummaryAndSkills() {
    return (
      <div className={styles.bottomGrid}>
        <section className={styles.compactPanel}>
          <p className={styles.panelTitle}>Learner Summary</p>
          <p className={styles.panelCopy}>{record.learner.profileSummary}</p>
        </section>

        <section className={`${styles.compactPanel} ${styles.skillsPanel}`}>
          <p className={styles.panelTitle}>Acquired Skills</p>
          {activeTemplate === "minimal" ? (
            <p className={styles.inlineMetaList}>
              {record.summary.topSkills.length > 0
                ? record.summary.topSkills.join(", ")
                : "No skills were recorded."}
            </p>
          ) : (
            <div className={styles.skillList}>
              {record.summary.topSkills.length > 0 ? (
                record.summary.topSkills.map((skill) => renderSkillTag(skill, skill))
              ) : (
                <span className={styles.summaryText}>No skills were recorded.</span>
              )}
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div
      ref={previewRef}
      className={`${styles.document} ${styles[`template${activeTemplate[0].toUpperCase()}${activeTemplate.slice(1)}`]}`}
      data-transcript-root
      data-template={activeTemplate}
    >
      <section className={styles.sheet} data-transcript-page>
        <header className={styles.sheetHeader}>
          <div className={styles.brandBlock}>
            {useInstitutionLogo ? (
              <Image
                src={defaultInstitutionBranding.logoPath}
                alt="Goa Tech Institute logo"
                className={styles.brandLogo}
                width={148}
                height={44}
                priority
              />
            ) : (
              <div className={styles.seal}>{sealText}</div>
            )}
            <div className={styles.brandCopy}>
              {!useInstitutionLogo ? (
                <p className={styles.institutionName}>{institutionName}</p>
              ) : null}
              {institutionLines.length > 0 ? (
                <p className={styles.institutionMeta}>
                  {institutionLines.join(" | ")}
                </p>
              ) : null}
            </div>
          </div>

          <div className={styles.titleBlock}>
            <p className={styles.titleEyebrow}>Official Academic Transcript</p>
            <h1 className={styles.documentTitle}>Comprehensive Learner Record Summary</h1>
            <p className={styles.titleCopy}>
              Transcript format prepared from verified credential and achievement data for print and archival use.
            </p>
          </div>

          <div className={styles.verificationCard}>
            <QRCodeSVG
              value={record.verificationUrl ?? record.credentialId}
              size={60}
              bgColor="#ffffff"
              fgColor="#13212d"
              includeMargin
            />
            <div>
              <p className={styles.qrLabel}>Verification</p>
              <p className={styles.qrValue}>
                Scan to open the source CLR record.
              </p>
            </div>
          </div>
        </header>

        <div className={styles.transcriptMeta}>
          <div className={styles.headerStrip}>
            <div className={styles.headerCell}>
              <span className={styles.label}>Reporting Period</span>
              <strong>{customization.reportingPeriodLabel}</strong>
            </div>
            <div className={styles.headerCell}>
              <span className={styles.label}>Issued On</span>
              <strong>{record.issuedOn}</strong>
            </div>
            <div className={styles.headerCell}>
              <span className={styles.label}>Record ID</span>
              <strong>{shortenValue(record.credentialId, 38)}</strong>
            </div>
          </div>

          <div className={styles.identitySection}>
            <div className={styles.identityGrid}>
              <div className={styles.detailCell}>
                <span className={styles.label}>Student</span>
                <p className={styles.value}>{record.learner.fullName}</p>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.label}>Student Number</span>
                <p className={styles.value}>{studentNumber}</p>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.label}>Program</span>
                <p className={styles.value}>{programName}</p>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.label}>Grade Level</span>
                <p className={styles.value}>{gradeLevel}</p>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.label}>Homeroom</span>
                <p className={styles.value}>{homeroom}</p>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.label}>Principal</span>
                <p className={styles.value}>{customization.principalName}</p>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.label}>Registrar</span>
                <p className={styles.value}>{customization.registrarName}</p>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.label}>Academic Standing</span>
                <p className={styles.value}>{academicStanding}</p>
              </div>
            </div>

            <div className={styles.summaryGrid}>
              <div className={styles.summaryCard}>
                <span className={styles.label}>Credential Entries</span>
                <strong>{record.summary.totalCourses}</strong>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.label}>Credits</span>
                <strong>{record.summary.totalCredits.toFixed(1)}</strong>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.label}>Average Grade</span>
                <strong>
                  {record.summary.averageGrade != null
                    ? `${record.summary.averageGrade}%`
                    : "Recorded"}
                </strong>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.label}>Result</span>
                <strong>{overallResult}</strong>
              </div>
            </div>
          </div>
        </div>

        <section className={styles.tablePanel}>
          <div className={styles.tableHeader}>
            <div>
              <p className={styles.tableTitle}>Credential and Achievement Listing</p>
              <p className={styles.tableHint}>
                Each CLR achievement is presented as a credential entry with type,
                summary, skills, proficiency, credits, and recorded result.
              </p>
            </div>
            <span className={styles.label}>Transcript Page 1</span>
          </div>

          <table className={styles.table}>
            <thead>
              <tr>
                <th>Credential / Achievement</th>
                <th>Type</th>
                <th>Skills Earned</th>
                <th>Proficiency</th>
                <th>Credits</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>{renderCourseRows(coverCourses, activeTemplate)}</tbody>
          </table>
        </section>

        {overflowPages.length === 0 ? <div ref={summaryAnchorRef} /> : null}

        {overflowPages.length === 0 && inlineSummaryOnLastCredentialPage
          ? renderSummaryAndSkills()
          : null}

        <footer className={styles.footer} ref={overflowPages.length === 0 ? footerRef : null}>
          <p>{footerText}</p>
          <span className={styles.pageCounter}>Page 1 of {totalPages}</span>
        </footer>
      </section>

      {overflowPages.map((courses, index) => (
        <section
          key={`overflow-${index}`}
          className={styles.sheet}
          data-transcript-page
        >
          <header className={styles.compactHeader}>
            <div>
              <p className={styles.titleEyebrow}>{institutionName}</p>
              <h2 className={styles.overflowTitle}>Credential and Achievement Listing</h2>
            </div>
            <div className={styles.compactHeaderMeta}>
              <span>{record.learner.fullName}</span>
              <span>{studentNumber}</span>
            </div>
          </header>

          <section className={styles.tablePanel}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Credential / Achievement</th>
                  <th>Type</th>
                  <th>Skills Earned</th>
                  <th>Proficiency</th>
                  <th>Credits</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>{renderCourseRows(courses, activeTemplate)}</tbody>
            </table>
          </section>

          {index === overflowPages.length - 1 ? <div ref={summaryAnchorRef} /> : null}

          {index === overflowPages.length - 1 && inlineSummaryOnLastCredentialPage
            ? renderSummaryAndSkills()
            : null}

          <footer
            className={styles.footer}
            ref={index === overflowPages.length - 1 ? footerRef : null}
          >
            <p>{footerText}</p>
            <span className={styles.pageCounter}>
              Page {index + 2} of {totalPages}
            </span>
          </footer>
        </section>
      ))}

      {!inlineSummaryOnLastCredentialPage ? (
        <section className={styles.sheet} data-transcript-page>
          <header className={styles.compactHeader}>
            <div>
              <p className={styles.titleEyebrow}>{institutionName}</p>
              <h2 className={styles.overflowTitle}>Learner Summary and Acquired Skills</h2>
            </div>
            <div className={styles.compactHeaderMeta}>
              <span>{record.learner.fullName}</span>
              <span>{studentNumber}</span>
            </div>
          </header>

          {renderSummaryAndSkills()}

          <footer className={styles.footer}>
            <p>{footerText}</p>
            <span className={styles.pageCounter}>
              Page {summaryPageNumber} of {totalPages}
            </span>
          </footer>
        </section>
      ) : null}

      {!layoutSettled ? (
        <>
          <div className={styles.summaryMeasure} aria-hidden="true" ref={summaryMeasureRef}>
            {renderSummaryAndSkills()}
          </div>

          <div className={styles.paginationMeasure} aria-hidden="true">
            <section className={styles.sheet}>
              <header className={styles.sheetHeader}>
                <div className={styles.brandBlock}>
                  {useInstitutionLogo ? (
                    <Image
                      src={defaultInstitutionBranding.logoPath}
                      alt=""
                      className={styles.brandLogo}
                      width={148}
                      height={44}
                    />
                  ) : (
                    <div className={styles.seal}>{sealText}</div>
                  )}
                  <div className={styles.brandCopy}>
                    {!useInstitutionLogo ? (
                      <p className={styles.institutionName}>{institutionName}</p>
                    ) : null}
                    {institutionLines.length > 0 ? (
                      <p className={styles.institutionMeta}>
                        {institutionLines.join(" | ")}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className={styles.titleBlock}>
                  <p className={styles.titleEyebrow}>Official Academic Transcript</p>
                  <h1 className={styles.documentTitle}>Comprehensive Learner Record Summary</h1>
                  <p className={styles.titleCopy}>
                    Transcript format prepared from verified credential and achievement data for print and archival use.
                  </p>
                </div>

                <div className={styles.verificationCard}>
                  <QRCodeSVG
                    value={record.verificationUrl ?? record.credentialId}
                    size={60}
                    bgColor="#ffffff"
                    fgColor="#13212d"
                    includeMargin
                  />
                  <div>
                    <p className={styles.qrLabel}>Verification</p>
                    <p className={styles.qrValue}>
                      Scan to open the source CLR record.
                    </p>
                  </div>
                </div>
              </header>

              <div className={styles.transcriptMeta}>
                <div className={styles.headerStrip}>
                  <div className={styles.headerCell}>
                    <span className={styles.label}>Reporting Period</span>
                    <strong>{customization.reportingPeriodLabel}</strong>
                  </div>
                  <div className={styles.headerCell}>
                    <span className={styles.label}>Issued On</span>
                    <strong>{record.issuedOn}</strong>
                  </div>
                  <div className={styles.headerCell}>
                    <span className={styles.label}>Record ID</span>
                    <strong>{shortenValue(record.credentialId, 38)}</strong>
                  </div>
                </div>

                <div className={styles.identitySection}>
                  <div className={styles.identityGrid}>
                    <div className={styles.detailCell}>
                      <span className={styles.label}>Student</span>
                      <p className={styles.value}>{record.learner.fullName}</p>
                    </div>
                    <div className={styles.detailCell}>
                      <span className={styles.label}>Student Number</span>
                      <p className={styles.value}>{studentNumber}</p>
                    </div>
                    <div className={styles.detailCell}>
                      <span className={styles.label}>Program</span>
                      <p className={styles.value}>{programName}</p>
                    </div>
                    <div className={styles.detailCell}>
                      <span className={styles.label}>Grade Level</span>
                      <p className={styles.value}>{gradeLevel}</p>
                    </div>
                    <div className={styles.detailCell}>
                      <span className={styles.label}>Homeroom</span>
                      <p className={styles.value}>{homeroom}</p>
                    </div>
                    <div className={styles.detailCell}>
                      <span className={styles.label}>Principal</span>
                      <p className={styles.value}>{customization.principalName}</p>
                    </div>
                    <div className={styles.detailCell}>
                      <span className={styles.label}>Registrar</span>
                      <p className={styles.value}>{customization.registrarName}</p>
                    </div>
                    <div className={styles.detailCell}>
                      <span className={styles.label}>Academic Standing</span>
                      <p className={styles.value}>{academicStanding}</p>
                    </div>
                  </div>

                  <div className={styles.summaryGrid}>
                    <div className={styles.summaryCard}>
                      <span className={styles.label}>Credential Entries</span>
                      <strong>{record.summary.totalCourses}</strong>
                    </div>
                    <div className={styles.summaryCard}>
                      <span className={styles.label}>Credits</span>
                      <strong>{record.summary.totalCredits.toFixed(1)}</strong>
                    </div>
                    <div className={styles.summaryCard}>
                      <span className={styles.label}>Average Grade</span>
                      <strong>
                        {record.summary.averageGrade != null
                          ? `${record.summary.averageGrade}%`
                          : "Recorded"}
                      </strong>
                    </div>
                    <div className={styles.summaryCard}>
                      <span className={styles.label}>Result</span>
                      <strong>{overallResult}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <section className={styles.tablePanel}>
                <div className={styles.tableHeader}>
                  <div>
                    <p className={styles.tableTitle}>Credential and Achievement Listing</p>
                    <p className={styles.tableHint}>
                      Each CLR achievement is presented as a credential entry with type,
                      summary, skills, proficiency, credits, and recorded result.
                    </p>
                  </div>
                  <span className={styles.label}>Transcript Page 1</span>
                </div>

                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Credential / Achievement</th>
                      <th>Type</th>
                      <th>Skills Earned</th>
                      <th>Proficiency</th>
                      <th>Credits</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody ref={firstPageBodyMeasureRef} />
                </table>
              </section>

              <footer className={styles.footer} ref={firstPageFooterMeasureRef}>
                <p>{footerText}</p>
                <span className={styles.pageCounter}>Page 1 of {totalPages}</span>
              </footer>
            </section>

            <section className={styles.sheet}>
              <header className={styles.compactHeader}>
                <div>
                  <p className={styles.titleEyebrow}>{institutionName}</p>
                  <h2 className={styles.overflowTitle}>Credential and Achievement Listing</h2>
                </div>
                <div className={styles.compactHeaderMeta}>
                  <span>{record.learner.fullName}</span>
                  <span>{studentNumber}</span>
                </div>
              </header>

              <section className={styles.tablePanel}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Credential / Achievement</th>
                      <th>Type</th>
                      <th>Skills Earned</th>
                      <th>Proficiency</th>
                      <th>Credits</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody ref={laterPageBodyMeasureRef} />
                </table>
              </section>

              <footer className={styles.footer} ref={laterPageFooterMeasureRef}>
                <p>{footerText}</p>
                <span className={styles.pageCounter}>Page 2 of {totalPages}</span>
              </footer>
            </section>

            <section className={styles.sheet}>
              <section className={styles.tablePanel}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Credential / Achievement</th>
                      <th>Type</th>
                      <th>Skills Earned</th>
                      <th>Proficiency</th>
                      <th>Credits</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody ref={rowMeasureBodyRef}>
                    {renderCourseRows(record.courses, activeTemplate)}
                  </tbody>
                </table>
              </section>
            </section>
          </div>
        </>
      ) : null}

      <section className={styles.sheet} data-transcript-page>
        <header className={`${styles.compactHeader} ${styles.legendHeader}`}>
          <div>
            <p className={styles.titleEyebrow}>{institutionName}</p>
            <h2 className={styles.overflowTitle}>Transcript Notes and Legend</h2>
          </div>
          <div className={styles.compactHeaderMeta}>
            <span>{record.learner.fullName}</span>
            <span>{academicStanding}</span>
          </div>
        </header>

        <div className={styles.legendColumns}>
          <div className={styles.legendColumn}>
            <section className={`${styles.compactPanel} ${styles.legendPanel}`}>
              <p className={styles.panelTitle}>Abbreviations</p>
              <table className={styles.legendTable}>
                <tbody>
                  {record.abbreviations.map((entry) => (
                    <tr key={entry.label}>
                      <td className={styles.legendCode}>{entry.label}</td>
                      <td className={styles.legendCopy}>{entry.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className={`${styles.compactPanel} ${styles.legendPanel}`}>
              <p className={styles.panelTitle}>Transcript Notes</p>
              <div className={styles.metaList}>
                {record.notes.map((note) => (
                  <p key={note} className={styles.legendCopy}>
                    {note}
                  </p>
                ))}
              </div>
            </section>
          </div>

          <div className={styles.legendColumn}>
            <section className={`${styles.compactPanel} ${styles.legendPanel}`}>
              <p className={styles.panelTitle}>Proficiency Scale</p>
              <table className={styles.legendTable}>
                <tbody>
                  {record.proficiencyLegend.map((entry) => (
                    <tr key={entry.label}>
                      <td className={styles.legendCode}>{entry.label}</td>
                      <td className={styles.legendCopy}>{entry.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className={`${styles.compactPanel} ${styles.legendPanel}`}>
              <p className={styles.panelTitle}>Record Details</p>
              <div className={styles.metaList}>
                <div className={styles.metaItem}>
                  <span className={styles.label}>Credential Title</span>
                  <span className={styles.value}>{record.title}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.label}>Credential Models</span>
                  <span className={styles.value}>
                    {record.modelHints.join(", ") || "CLR"}
                  </span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.label}>Verification Source</span>
                  <span className={styles.value}>
                    {record.verificationUrl ?? "Not recorded"}
                  </span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.label}>Registrar</span>
                  <span className={styles.value}>{customization.registrarName}</span>
                </div>
              </div>
            </section>
          </div>
        </div>

        <footer className={styles.footer}>
          <p>{footerText}</p>
          <span className={styles.pageCounter}>
            Page {notesPageNumber} of {totalPages}
          </span>
        </footer>
      </section>
    </div>
  );
}
