"use client";

import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { defaultInstitutionBranding, isIbuBranding } from "@/lib/branding/defaults";
import { formatTranscriptEntryType } from "@/lib/clr/entry-type";
import { paginateCourses } from "@/lib/transcript/paginate";
import type {
  TranscriptCourse,
  TranscriptCustomization,
  TranscriptRecord,
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

function renderCourseRows(courses: TranscriptCourse[]) {
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
          <span className={styles.codeChip}>{course.code}</span>
        </div>
        <p className={styles.summaryText}>{course.summary}</p>
      </td>
      <td>
        <span className={styles.typeBadge}>
          {formatTranscriptEntryType(course.credentialType)}
        </span>
      </td>
      <td>
        <div className={styles.skillList}>
          {course.skills.length > 0 ? (
            course.skills.map((skill) => (
              <span key={`${course.id}-${skill}`} className={styles.skillTag}>
                {skill}
              </span>
            ))
          ) : (
            <span className={styles.summaryText}>No skills recorded</span>
          )}
        </div>
      </td>
      <td className={styles.gradeCell}>
        <span className={styles.gradeValue}>{course.gradeLabel}</span>
      </td>
      <td className={styles.metricCell}>{course.creditsLabel}</td>
      <td>
        <span className={styles.statusPill}>{course.status}</span>
      </td>
    </tr>
  ));
}

interface TranscriptPreviewProps {
  record: TranscriptRecord;
  customization: TranscriptCustomization;
  previewRef: React.RefObject<HTMLDivElement | null>;
  template?: TranscriptTemplate;
}

export function TranscriptPreview({
  record,
  customization,
  previewRef,
  template,
}: TranscriptPreviewProps) {
  const pages = paginateCourses(record.courses);
  const totalPages = 1 + pages.overflow.length + 1;
  const activeTemplate = template ?? customization.template ?? "heritage";
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
  const useIbuLogo = isIbuBranding(institutionName, institutionWebsite);
  const footerText =
    customization.footerText.trim() ||
    `${institutionName} | Official academic record prepared from CLR data`;

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
            {useIbuLogo ? (
              <Image
                src={defaultInstitutionBranding.logoPath}
                alt="International Business University logo"
                className={styles.brandLogo}
                width={148}
                height={44}
                priority
              />
            ) : (
              <div className={styles.seal}>{sealText}</div>
            )}
            <div>
              {!useIbuLogo ? (
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
                summary, skills, grade, credits, and recorded result.
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
                <th>Grade</th>
                <th>Credits</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>{renderCourseRows(pages.cover)}</tbody>
          </table>
        </section>

        <div className={styles.bottomGrid}>
          <section className={styles.compactPanel}>
            <p className={styles.panelTitle}>Learner Summary</p>
            <p className={styles.panelCopy}>{record.learner.profileSummary}</p>
          </section>

          <section className={`${styles.compactPanel} ${styles.skillsPanel}`}>
            <p className={styles.panelTitle}>Acquired Skills</p>
            <div className={styles.skillList}>
              {record.summary.topSkills.length > 0 ? (
                record.summary.topSkills.map((skill) => (
                  <span key={skill} className={styles.skillTag}>
                    {skill}
                  </span>
                ))
              ) : (
                <span className={styles.summaryText}>No skills were recorded.</span>
              )}
            </div>
          </section>
        </div>

        <footer className={styles.footer}>
          <p>{footerText}</p>
          <span className={styles.pageCounter}>Page 1 of {totalPages}</span>
        </footer>
      </section>

      {pages.overflow.map((courses, index) => (
        <section
          key={`overflow-${index}`}
          className={styles.sheet}
          data-transcript-page
        >
          <header className={styles.compactHeader}>
            <div>
              <p className={styles.titleEyebrow}>{institutionName}</p>
              <h2 className={styles.overflowTitle}>Additional Credential Records</h2>
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
                  <th>Grade</th>
                  <th>Credits</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>{renderCourseRows(courses)}</tbody>
            </table>
          </section>

          <footer className={styles.footer}>
            <p>{footerText}</p>
            <span className={styles.pageCounter}>
              Page {index + 2} of {totalPages}
            </span>
          </footer>
        </section>
      ))}

      <section className={styles.sheet} data-transcript-page>
        <header className={styles.compactHeader}>
          <div>
            <p className={styles.titleEyebrow}>{institutionName}</p>
            <h2 className={styles.overflowTitle}>Transcript Notes and Legend</h2>
          </div>
          <div className={styles.compactHeaderMeta}>
            <span>{record.learner.fullName}</span>
            <span>{academicStanding}</span>
          </div>
        </header>

        <div className={styles.legendGrid}>
          <section className={styles.compactPanel}>
            <p className={styles.panelTitle}>Grade Interpretation</p>
            <table className={styles.legendTable}>
              <tbody>
                {record.gradeLegend.map((entry) => (
                  <tr key={entry.label}>
                    <td className={styles.legendCode}>{entry.label}</td>
                    <td className={styles.legendCopy}>{entry.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className={styles.compactPanel}>
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

          <section className={styles.compactPanel}>
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

        <footer className={styles.footer}>
          <p>{footerText}</p>
          <span className={styles.pageCounter}>Page {totalPages} of {totalPages}</span>
        </footer>
      </section>
    </div>
  );
}
