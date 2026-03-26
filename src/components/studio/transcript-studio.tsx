"use client";

import { startTransition, useRef } from "react";
import { downloadTranscriptPdf } from "@/lib/transcript/pdf";
import { getDemoClrPayload } from "@/lib/clr/normalize";
import { StudioSwitcher } from "@/components/navigation/studio-switcher";
import { TranscriptPreview } from "@/components/transcript/transcript-preview";
import { transcriptTemplateOptions } from "@/lib/transcript/templates";
import { useNormalizeClrMutation } from "@/store/transcript-api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  setCustomField,
  setErrorMessage,
  setJsonInput,
  setMode,
  setTemplate,
  setTranscript,
  setUrl,
} from "@/store/transcript-slice";
import type { NormalizeClrRequest, SourceMode } from "@/lib/clr/types";
import styles from "./transcript-studio.module.css";

function makeFilename(name: string) {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "learner"}-transcript.pdf`;
}

export function TranscriptStudio() {
  const dispatch = useAppDispatch();
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [normalizeClr, { isLoading }] = useNormalizeClrMutation();
  const { mode, url, jsonInput, transcript, custom, errorMessage } =
    useAppSelector((state) => state.transcript);

  async function submitRequest(nextMode: SourceMode) {
    dispatch(setErrorMessage(""));

    const payload: NormalizeClrRequest =
      nextMode === "demo"
        ? { mode: "demo" }
        : nextMode === "url"
          ? { mode: "url", url }
          : { mode: "json", json: jsonInput };

    try {
      const response = await normalizeClr(payload).unwrap();
      startTransition(() => {
        dispatch(setMode(nextMode));
        dispatch(setTranscript(response));
      });
    } catch (error) {
      const message =
        typeof error === "object" &&
        error != null &&
        "data" in error &&
        typeof error.data === "object" &&
        error.data != null &&
        "message" in error.data &&
        typeof error.data.message === "string"
          ? error.data.message
          : "The CLR source could not be converted.";

      dispatch(setErrorMessage(message));
    }
  }

  async function handleDownloadPdf() {
    try {
      await downloadTranscriptPdf(
        {
          record: transcript,
          customization: custom,
          template: custom.template,
        },
        makeFilename(transcript.learner.fullName),
      );
    } catch (error) {
      dispatch(
        setErrorMessage(
          error instanceof Error ? error.message : "PDF export failed.",
        ),
      );
    }
  }

  function loadLocalDemoUrl() {
    const origin = window.location.origin;
    dispatch(setMode("url"));
    dispatch(setUrl(`${origin}/api/clr/demo`));
    dispatch(setErrorMessage(""));
  }

  return (
    <main className={styles.shell}>
      <aside className={styles.panel} data-no-print>
        <div className={styles.section}>
          <StudioSwitcher />
          <span className={styles.eyebrow}>CLR 2.0 Transcript Builder</span>
          <h1 className={styles.title}>Credential to report-card transcript</h1>
          <p className={styles.lede}>
            Load a 1EdTech CLR URL, paste CLR JSON, or start from the bundled
            demo. The app normalizes each credential achievement into a
            professional credential listing with print and PDF output.
          </p>
        </div>

        <div className={styles.section}>
          <span className={styles.sectionTitle}>Source</span>
          <div className={styles.modeGroup}>
            {([
              ["url", "CLR Link"],
              ["json", "CLR JSON"],
              ["demo", "Demo"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`${styles.modeButton} ${mode === value ? styles.modeActive : ""}`}
                onClick={() => dispatch(setMode(value))}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === "url" ? (
            <div className={styles.field}>
              <label htmlFor="clr-url">Credential URL</label>
              <input
                id="clr-url"
                className={styles.input}
                type="url"
                value={url}
                onChange={(event) => dispatch(setUrl(event.target.value))}
                placeholder="https://issuer.example/credential/123"
              />
              <p className={styles.hint}>
                Best results come from a direct CLR JSON endpoint. HTML pages
                with embedded JSON-LD or alternate JSON links are also handled.
              </p>
              <button
                type="button"
                className={styles.hintAction}
                onClick={loadLocalDemoUrl}
              >
                Use local demo CLR URL
              </button>
            </div>
          ) : mode === "json" ? (
            <div className={styles.field}>
              <label htmlFor="clr-json">CLR JSON</label>
              <textarea
                id="clr-json"
                className={styles.textarea}
                value={jsonInput}
                onChange={(event) => dispatch(setJsonInput(event.target.value))}
                placeholder='{"type":["VerifiableCredential","ClrCredential"],"...": "..."}'
              />
              <p className={styles.hint}>
                Paste the raw CLR payload here. Embedded Open Badge credentials
                will be transformed into credential rows.
              </p>
            </div>
          ) : (
            <div className={`${styles.status} ${styles.statusInfo}`}>
              Demo mode is loaded with a multi-credential learner record so the
              report-card layout is visible immediately.
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryAction}
            onClick={() => void submitRequest(mode)}
            disabled={isLoading}
          >
            {isLoading ? "Generating..." : "Generate Transcript"}
          </button>
          <button
            type="button"
            className={styles.secondaryAction}
            onClick={() => {
              dispatch(setJsonInput(JSON.stringify(getDemoClrPayload(), null, 2)));
              void submitRequest("demo");
            }}
          >
            Load Demo
          </button>
        </div>

        <div className={styles.section}>
          <span className={styles.sectionTitle}>Transcript Templates</span>
          <div className={styles.templateGrid}>
            {transcriptTemplateOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`${styles.templateCard} ${custom.template === option.id ? styles.templateActive : ""}`}
                onClick={() => dispatch(setTemplate(option.id))}
              >
                <strong>{option.name}</strong>
                <span>{option.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <span className={styles.sectionTitle}>Transcript Fields</span>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label htmlFor="institution-name">Institution Name</label>
              <input
                id="institution-name"
                className={styles.input}
                value={custom.institutionName}
                onChange={(event) =>
                  dispatch(
                    setCustomField({
                      key: "institutionName",
                      value: event.target.value,
                    }),
                  )
                }
                placeholder={transcript.institution.name}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="seal-text">Seal Text</label>
              <input
                id="seal-text"
                className={styles.input}
                value={custom.sealText}
                onChange={(event) =>
                  dispatch(
                    setCustomField({
                      key: "sealText",
                      value: event.target.value,
                    }),
                  )
                }
                placeholder={transcript.institution.logoText}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="board-name">Board / Authority</label>
              <input
                id="board-name"
                className={styles.input}
                value={custom.boardName}
                onChange={(event) =>
                  dispatch(
                    setCustomField({
                      key: "boardName",
                      value: event.target.value,
                    }),
                  )
                }
                placeholder={transcript.institution.boardName ?? "Academic Records Board"}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="website">Website or Email</label>
              <input
                id="website"
                className={styles.input}
                value={custom.institutionWebsite}
                onChange={(event) =>
                  dispatch(
                    setCustomField({
                      key: "institutionWebsite",
                      value: event.target.value,
                    }),
                  )
                }
                placeholder={transcript.institution.website ?? "registrar@example.edu"}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="address">Institution Address</label>
              <input
                id="address"
                className={styles.input}
                value={custom.institutionAddress}
                onChange={(event) =>
                  dispatch(
                    setCustomField({
                      key: "institutionAddress",
                      value: event.target.value,
                    }),
                  )
                }
                placeholder={transcript.institution.address ?? "Academic address"}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="program">Program Name</label>
              <input
                id="program"
                className={styles.input}
                value={custom.programName}
                onChange={(event) =>
                  dispatch(
                    setCustomField({
                      key: "programName",
                      value: event.target.value,
                    }),
                  )
                }
                placeholder={transcript.learner.programName ?? "Program"}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="student-number">Student Number</label>
              <input
                id="student-number"
                className={styles.input}
                value={custom.studentNumber}
                onChange={(event) =>
                  dispatch(
                    setCustomField({
                      key: "studentNumber",
                      value: event.target.value,
                    }),
                  )
                }
                placeholder={transcript.learner.studentId}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="homeroom">Homeroom</label>
              <input
                id="homeroom"
                className={styles.input}
                value={custom.homeroom}
                onChange={(event) =>
                  dispatch(
                    setCustomField({
                      key: "homeroom",
                      value: event.target.value,
                    }),
                  )
                }
                placeholder={transcript.learner.homeroom ?? "Homeroom"}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="period">Reporting Period</label>
              <input
                id="period"
                className={styles.input}
                value={custom.reportingPeriodLabel}
                onChange={(event) =>
                  dispatch(
                    setCustomField({
                      key: "reportingPeriodLabel",
                      value: event.target.value,
                    }),
                  )
                }
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="result">Overall Result</label>
              <input
                id="result"
                className={styles.input}
                value={custom.overallResult}
                onChange={(event) =>
                  dispatch(
                    setCustomField({
                      key: "overallResult",
                      value: event.target.value,
                    }),
                  )
                }
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="standing">Academic Standing</label>
              <input
                id="standing"
                className={styles.input}
                value={custom.academicStanding}
                onChange={(event) =>
                  dispatch(
                    setCustomField({
                      key: "academicStanding",
                      value: event.target.value,
                    }),
                  )
                }
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="principal">Principal / Dean</label>
              <input
                id="principal"
                className={styles.input}
                value={custom.principalName}
                onChange={(event) =>
                  dispatch(
                    setCustomField({
                      key: "principalName",
                      value: event.target.value,
                    }),
                  )
                }
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="registrar">Registrar</label>
              <input
                id="registrar"
                className={styles.input}
                value={custom.registrarName}
                onChange={(event) =>
                  dispatch(
                    setCustomField({
                      key: "registrarName",
                      value: event.target.value,
                    }),
                  )
                }
              />
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.ghostAction}
            onClick={() => window.print()}
          >
            Print Preview
          </button>
          <button
            type="button"
            className={styles.ghostAction}
            onClick={() => void handleDownloadPdf()}
          >
            Download PDF
          </button>
        </div>

        {errorMessage ? (
          <div className={`${styles.status} ${styles.statusError}`}>
            {errorMessage}
          </div>
        ) : (
          <div className={`${styles.status} ${styles.statusInfo}`}>
            Preview reflects the loaded transcript plus the editable institution
            fields and selected shared template in this panel.
          </div>
        )}
      </aside>

      <section className={styles.preview}>
        <div className={styles.previewHeader} data-no-print>
          <div>
            <h2 className={styles.previewTitle}>Transcript Preview</h2>
            <p className={styles.previewMeta}>
              {transcript.summary.totalCourses} credential records |{" "}
              {transcript.summary.topSkills.length} tracked skills | issued{" "}
              {transcript.issuedOn}
            </p>
          </div>
        </div>

        <TranscriptPreview
          record={transcript}
          customization={custom}
          previewRef={previewRef}
        />
      </section>
    </main>
  );
}
