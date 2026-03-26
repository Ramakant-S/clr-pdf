"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import JSZip from "jszip";
import { StudioSwitcher } from "@/components/navigation/studio-switcher";
import { TranscriptPreview } from "@/components/transcript/transcript-preview";
import {
  buildBulkLearnerRecord,
  buildBulkTranscriptCustomization,
  createSampleBulkCsv,
  createSampleBulkRows,
  createSampleBulkWorkbook,
  defaultBulkGlobalSettings,
  groupBulkImportRows,
  parseBulkWorkbook,
  type BulkGeneratedLearnerRecord,
  type BulkGlobalSettings,
} from "@/lib/bulk/import";
import { downloadBlob } from "@/lib/files/download";
import { getTranscriptPdfBlob, downloadTranscriptPdf } from "@/lib/transcript/pdf";
import { transcriptTemplateOptions } from "@/lib/transcript/templates";
import styles from "./bulk-transcript-studio.module.css";

const SETTINGS_STORAGE_KEY = "clr-bulk-global-settings";
const csvMimeType = "text/csv;charset=utf-8;";
const workbookMimeType =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

type GenerationStatus = "idle" | "running" | "completed" | "stopped";

interface GeneratedSession {
  records: BulkGeneratedLearnerRecord[];
  settings: BulkGlobalSettings;
  sourceRevision: number;
  settingsRevision: number;
}

interface BatchPreviewState {
  record: BulkGeneratedLearnerRecord;
  settings: BulkGlobalSettings;
}

interface GenerationProgress {
  completed: number;
  total: number;
  currentLearner: string;
}

function makeSlug(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "learner"
  );
}

function makeTranscriptFilename(record: BulkGeneratedLearnerRecord) {
  return `${makeSlug(record.learnerName)}-transcript.pdf`;
}

function makeClrFilename(record: BulkGeneratedLearnerRecord) {
  return `${makeSlug(record.learnerName)}-clr.json`;
}

function downloadJson(data: unknown, filename: string) {
  downloadBlob(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    filename,
  );
}

function templateName(templateId: BulkGlobalSettings["template"]) {
  return (
    transcriptTemplateOptions.find((option) => option.id === templateId)?.name ??
    "Template"
  );
}

function migrateBulkSettings(
  savedSettings: Partial<BulkGlobalSettings>,
): BulkGlobalSettings {
  const nextSettings: BulkGlobalSettings = {
    ...defaultBulkGlobalSettings,
    ...savedSettings,
  };
  const hasLegacyInstitution =
    savedSettings.institutionName === "Riverstone Collegiate Institute" ||
    savedSettings.institutionWebsite === "https://riverstone.example";

  if (hasLegacyInstitution) {
    nextSettings.institutionName = defaultBulkGlobalSettings.institutionName;
    nextSettings.boardName = defaultBulkGlobalSettings.boardName;
    nextSettings.institutionAddress = defaultBulkGlobalSettings.institutionAddress;
    nextSettings.institutionWebsite = defaultBulkGlobalSettings.institutionWebsite;
    nextSettings.registrarName = defaultBulkGlobalSettings.registrarName;
    nextSettings.principalName = defaultBulkGlobalSettings.principalName;
    nextSettings.sealText = defaultBulkGlobalSettings.sealText;
    nextSettings.footerText = defaultBulkGlobalSettings.footerText;
  }

  if (
    !savedSettings.reportingPeriodLabel ||
    savedSettings.reportingPeriodLabel === "Academic Session 2025-2026"
  ) {
    nextSettings.reportingPeriodLabel =
      defaultBulkGlobalSettings.reportingPeriodLabel;
  }

  if (
    !savedSettings.footerText ||
    savedSettings.footerText ===
      "Prepared from bulk CLR import data for institutional review and print distribution."
  ) {
    nextSettings.footerText = defaultBulkGlobalSettings.footerText;
  }

  if (!savedSettings.sealText || savedSettings.sealText === "RC") {
    nextSettings.sealText = defaultBulkGlobalSettings.sealText;
  }

  if (
    !savedSettings.registrarName ||
    savedSettings.registrarName === "Registrar Office"
  ) {
    nextSettings.registrarName = defaultBulkGlobalSettings.registrarName;
  }

  return nextSettings;
}

export function BulkTranscriptStudio() {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const batchPreviewRef = useRef<HTMLDivElement | null>(null);
  const generationRunRef = useRef(0);
  const [settings, setSettings] = useState<BulkGlobalSettings>(
    defaultBulkGlobalSettings,
  );
  const [sourceRows, setSourceRows] = useState(() => createSampleBulkRows(50));
  const [sourceRevision, setSourceRevision] = useState(1);
  const [settingsRevision, setSettingsRevision] = useState(1);
  const [selectedLearnerId, setSelectedLearnerId] = useState("");
  const [sourceLabel, setSourceLabel] = useState("Built-in sample workbook");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [busyMessage, setBusyMessage] = useState("");
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [generationStatus, setGenerationStatus] =
    useState<GenerationStatus>("idle");
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress>(
    {
      completed: 0,
      total: 0,
      currentLearner: "",
    },
  );
  const [generatedSession, setGeneratedSession] = useState<GeneratedSession | null>(
    null,
  );
  const [batchPreviewState, setBatchPreviewState] =
    useState<BatchPreviewState | null>(null);

  const importedGroups = groupBulkImportRows(sourceRows);
  const generatedRecords = generatedSession?.records;
  const selectedRecord =
    generatedRecords?.find((record) => record.learnerId === selectedLearnerId) ??
    generatedRecords?.[0];
  const generatedCustomization = buildBulkTranscriptCustomization(
    generatedSession?.settings ?? settings,
  );
  const hasGeneratedOutput =
    generatedSession != null && (generatedRecords?.length ?? 0) > 0;
  const outputIsStale =
    generatedSession != null &&
    (generatedSession.sourceRevision !== sourceRevision ||
      generatedSession.settingsRevision !== settingsRevision);
  const canDownloadOutputs =
    hasGeneratedOutput && !outputIsStale && generationStatus !== "running";

  useEffect(() => {
    const savedSettings = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!savedSettings) {
      setHasLoadedSettings(true);
      return;
    }

    try {
      const parsed = JSON.parse(savedSettings) as Partial<BulkGlobalSettings>;
      setSettings(migrateBulkSettings(parsed));
    } catch {
      window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
    } finally {
      setHasLoadedSettings(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedSettings) {
      return;
    }

    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [hasLoadedSettings, settings]);

  useEffect(() => {
    if (!generatedSession || generatedSession.records.length === 0) {
      if (selectedLearnerId) {
        setSelectedLearnerId("");
      }
      return;
    }

    if (
      !generatedSession.records.some(
        (record) => record.learnerId === selectedLearnerId,
      )
    ) {
      setSelectedLearnerId(generatedSession.records[0].learnerId);
    }
  }, [generatedSession, selectedLearnerId]);

  function updateSetting<Key extends keyof BulkGlobalSettings>(
    key: Key,
    value: BulkGlobalSettings[Key],
  ) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
    setSettingsRevision((current) => current + 1);
  }

  function resetGeneratedOutput(nextMessage = "") {
    generationRunRef.current += 1;
    setGeneratedSession(null);
    setSelectedLearnerId("");
    setGenerationStatus("idle");
    setGenerationProgress({
      completed: 0,
      total: 0,
      currentLearner: "",
    });
    setBusyMessage(nextMessage);
  }

  async function handleWorkbookUpload(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setErrorMessage("");
    setBusyMessage(`Parsing ${file.name}...`);

    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseBulkWorkbook(buffer);

      startTransition(() => {
        setSourceRows(parsed.rows);
        setWarnings(parsed.warnings);
        setSourceLabel(`${file.name} (${parsed.sheetName})`);
        setSourceRevision((current) => current + 1);
      });

      resetGeneratedOutput(
        `Imported ${parsed.rows.length} learner-course rows. Select a template and generate transcripts.`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "The workbook could not be read.",
      );
      setBusyMessage("");
    } finally {
      event.target.value = "";
    }
  }

  function handleLoadSampleData() {
    const sampleRows = createSampleBulkRows(50);
    startTransition(() => {
      setSourceRows(sampleRows);
      setWarnings([]);
      setSourceLabel("Built-in sample workbook");
      setSourceRevision((current) => current + 1);
    });
    setErrorMessage("");
    resetGeneratedOutput(
      "Loaded 50 sample learners. Choose a template and click Generate All Transcripts.",
    );
  }

  function handleDownloadCsvTemplate() {
    downloadBlob(
      new Blob([createSampleBulkCsv(50)], { type: csvMimeType }),
      "bulk-clr-import-sample.csv",
    );
  }

  function handleDownloadExcelTemplate() {
    downloadBlob(
      new Blob([createSampleBulkWorkbook(50)], { type: workbookMimeType }),
      "bulk-clr-import-template.xlsx",
    );
  }

  async function handleGenerateAll() {
    if (importedGroups.length === 0) {
      setErrorMessage("Upload a workbook or load the sample data first.");
      return;
    }

    const runId = generationRunRef.current + 1;
    generationRunRef.current = runId;
    const settingsSnapshot = { ...settings };
    const nextRecords: BulkGeneratedLearnerRecord[] = [];

    setErrorMessage("");
    setGenerationStatus("running");
    setGenerationProgress({
      completed: 0,
      total: importedGroups.length,
      currentLearner: "",
    });
    setBusyMessage(
      `Generating ${importedGroups.length} transcripts using the ${templateName(settingsSnapshot.template)} template...`,
    );

    try {
      for (const [index, group] of importedGroups.entries()) {
        if (generationRunRef.current !== runId) {
          setGenerationStatus("stopped");
          setBusyMessage("Generation stopped. You can restart it at any time.");
          return;
        }

        setGenerationProgress({
          completed: index,
          total: importedGroups.length,
          currentLearner: group.rows[0]?.fullName ?? "",
        });

        nextRecords.push(buildBulkLearnerRecord(group, settingsSnapshot));

        await new Promise<void>((resolve) => {
          window.setTimeout(() => resolve(), 0);
        });
      }

      if (generationRunRef.current !== runId) {
        setGenerationStatus("stopped");
        setBusyMessage("Generation stopped. You can restart it at any time.");
        return;
      }

      startTransition(() => {
        setGeneratedSession({
          records: nextRecords,
          settings: settingsSnapshot,
          sourceRevision,
          settingsRevision,
        });
        setSelectedLearnerId(
          nextRecords.find((record) => record.learnerId === selectedLearnerId)
            ?.learnerId ?? nextRecords[0]?.learnerId ?? "",
        );
      });

      setGenerationStatus("completed");
      setGenerationProgress({
        completed: nextRecords.length,
        total: nextRecords.length,
        currentLearner: nextRecords.at(-1)?.learnerName ?? "",
      });
      setBusyMessage(
        `Generated ${nextRecords.length} transcripts with the ${templateName(settingsSnapshot.template)} template.`,
      );
    } catch (error) {
      setGenerationStatus("stopped");
      setErrorMessage(
        error instanceof Error ? error.message : "Transcript generation failed.",
      );
      setBusyMessage("");
    }
  }

  function handleStopGeneration() {
    generationRunRef.current += 1;
    setGenerationStatus("stopped");
    setBusyMessage("Generation stopped. Adjust settings and restart when ready.");
  }

  async function handleDownloadSelectedPdf() {
    if (!previewRef.current || !selectedRecord || !canDownloadOutputs) {
      return;
    }

    try {
      await downloadTranscriptPdf(
        previewRef.current,
        makeTranscriptFilename(selectedRecord),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "The transcript PDF could not be created.",
      );
    }
  }

  function handleDownloadSelectedClr() {
    if (!selectedRecord || !canDownloadOutputs) {
      return;
    }

    downloadJson(selectedRecord.clr, makeClrFilename(selectedRecord));
  }

  async function renderPdfForRecord(
    record: BulkGeneratedLearnerRecord,
    sessionSettings: BulkGlobalSettings,
  ) {
    flushSync(() => {
      setBatchPreviewState({ record, settings: sessionSettings });
    });

    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });

    if (!batchPreviewRef.current) {
      throw new Error("The hidden transcript renderer is not ready.");
    }

    return getTranscriptPdfBlob(batchPreviewRef.current);
  }

  async function handleDownloadRecordPdf(record: BulkGeneratedLearnerRecord) {
    if (!generatedSession || !canDownloadOutputs) {
      return;
    }

    try {
      setBusyMessage(`Rendering transcript for ${record.learnerName}...`);
      const pdfBlob = await renderPdfForRecord(record, generatedSession.settings);
      downloadBlob(pdfBlob, makeTranscriptFilename(record));
      setBusyMessage(`Downloaded transcript for ${record.learnerName}.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "The transcript PDF could not be created.",
      );
      setBusyMessage("");
    } finally {
      setBatchPreviewState(null);
    }
  }

  async function handleDownloadAllClr() {
    if (!generatedSession || !canDownloadOutputs) {
      return;
    }

    setBusyMessage(`Packaging ${generatedSession.records.length} CLR JSON files...`);
    setErrorMessage("");

    try {
      const zip = new JSZip();

      for (const record of generatedSession.records) {
        zip.file(makeClrFilename(record), JSON.stringify(record.clr, null, 2));
      }

      const archive = await zip.generateAsync({ type: "blob" });
      downloadBlob(
        archive,
        `bulk-clr-json-${generatedSession.records.length}-learners.zip`,
      );
      setBusyMessage(
        `Downloaded CLR JSON archive for ${generatedSession.records.length} learners.`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "The CLR archive could not be generated.",
      );
      setBusyMessage("");
    }
  }

  async function handleDownloadAllPdfs() {
    if (!generatedSession || !canDownloadOutputs) {
      return;
    }

    setErrorMessage("");

    try {
      const zip = new JSZip();

      for (const [index, record] of generatedSession.records.entries()) {
        setBusyMessage(
          `Rendering transcript ${index + 1} of ${generatedSession.records.length}: ${record.learnerName}`,
        );
        const pdfBlob = await renderPdfForRecord(record, generatedSession.settings);
        zip.file(makeTranscriptFilename(record), pdfBlob);
      }

      const archive = await zip.generateAsync({ type: "blob" });
      downloadBlob(
        archive,
        `bulk-transcripts-${generatedSession.records.length}-learners.zip`,
      );
      setBusyMessage(
        `Downloaded transcript archive for ${generatedSession.records.length} learners.`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "The transcript archive could not be generated.",
      );
      setBusyMessage("");
    } finally {
      setBatchPreviewState(null);
    }
  }

  return (
    <main className={styles.shell}>
      <button
        type="button"
        className={styles.sidebarToggle}
        onClick={() => setIsSidebarOpen(true)}
        data-no-print
      >
        Open Controls
      </button>

      <div
        className={`${styles.sidebarBackdrop} ${isSidebarOpen ? styles.sidebarBackdropVisible : ""}`}
        onClick={() => setIsSidebarOpen(false)}
        data-no-print
      />

      <aside
        className={`${styles.panel} ${isSidebarOpen ? styles.panelOpen : ""}`}
        data-no-print
      >
        <div className={styles.panelTopBar}>
          <StudioSwitcher />
          <button
            type="button"
            className={styles.panelClose}
            onClick={() => setIsSidebarOpen(false)}
          >
            Close
          </button>
        </div>

        <div className={styles.section}>
          <span className={styles.eyebrow}>Bulk CLR and Transcript Studio</span>
          <h1 className={styles.title}>Spreadsheet to CLR JSON and bulk transcripts</h1>
          <p className={styles.lede}>
            Upload a CSV or Excel workbook with one row per learner-course entry.
            Select a transcript template, then generate the full batch before
            previewing or downloading outputs.
          </p>
        </div>

        <div className={styles.section}>
          <span className={styles.sectionTitle}>Template Files</span>
          <p className={styles.hint}>
            The import format is flat: repeat learner details on every course
            row. Download the sample CSV or Excel workbook to see the exact
            columns and a 50-learner dataset.
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryAction}
              onClick={handleDownloadExcelTemplate}
            >
              Download Excel Template
            </button>
            <button
              type="button"
              className={styles.secondaryAction}
              onClick={handleDownloadCsvTemplate}
            >
              Download CSV Sample
            </button>
          </div>
          <div className={styles.actions}>
            <label className={styles.uploadAction}>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className={styles.hiddenInput}
                onChange={(event) => void handleWorkbookUpload(event)}
              />
              Upload CSV or Excel
            </label>
            <button
              type="button"
              className={styles.ghostAction}
              onClick={handleLoadSampleData}
            >
              Reload Sample Data
            </button>
          </div>
        </div>

        <div className={styles.section}>
          <span className={styles.sectionTitle}>Global Settings</span>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label htmlFor="bulk-institution-name">Institution Name</label>
              <input
                id="bulk-institution-name"
                className={styles.input}
                value={settings.institutionName}
                onChange={(event) =>
                  updateSetting("institutionName", event.target.value)
                }
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="bulk-seal-text">Seal Text</label>
              <input
                id="bulk-seal-text"
                className={styles.input}
                value={settings.sealText}
                onChange={(event) => updateSetting("sealText", event.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="bulk-board-name">Board / Authority</label>
              <input
                id="bulk-board-name"
                className={styles.input}
                value={settings.boardName}
                onChange={(event) => updateSetting("boardName", event.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="bulk-website">Website or Email</label>
              <input
                id="bulk-website"
                className={styles.input}
                value={settings.institutionWebsite}
                onChange={(event) =>
                  updateSetting("institutionWebsite", event.target.value)
                }
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="bulk-address">Institution Address</label>
              <input
                id="bulk-address"
                className={styles.input}
                value={settings.institutionAddress}
                onChange={(event) =>
                  updateSetting("institutionAddress", event.target.value)
                }
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="bulk-period">Reporting Period</label>
              <input
                id="bulk-period"
                className={styles.input}
                value={settings.reportingPeriodLabel}
                onChange={(event) =>
                  updateSetting("reportingPeriodLabel", event.target.value)
                }
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="bulk-principal">Principal / Dean</label>
              <input
                id="bulk-principal"
                className={styles.input}
                value={settings.principalName}
                onChange={(event) =>
                  updateSetting("principalName", event.target.value)
                }
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="bulk-registrar">Registrar</label>
              <input
                id="bulk-registrar"
                className={styles.input}
                value={settings.registrarName}
                onChange={(event) =>
                  updateSetting("registrarName", event.target.value)
                }
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="bulk-footer">Global Footer</label>
            <textarea
              id="bulk-footer"
              className={styles.textarea}
              value={settings.footerText}
              onChange={(event) => updateSetting("footerText", event.target.value)}
            />
          </div>
        </div>

        <div className={styles.section}>
          <span className={styles.sectionTitle}>Transcript Templates</span>
          <div className={styles.templateGrid}>
            {transcriptTemplateOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`${styles.templateCard} ${settings.template === option.id ? styles.templateActive : ""}`}
                onClick={() => updateSetting("template", option.id)}
              >
                <strong>{option.name}</strong>
                <span>{option.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <span className={styles.sectionTitle}>Generation</span>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryAction}
              onClick={() => void handleGenerateAll()}
              disabled={generationStatus === "running"}
            >
              {hasGeneratedOutput ? "Regenerate All Transcripts" : "Generate All Transcripts"}
            </button>
            <button
              type="button"
              className={styles.ghostAction}
              onClick={handleStopGeneration}
              disabled={generationStatus !== "running"}
            >
              Stop Generation
            </button>
          </div>
        </div>

        {errorMessage ? (
          <div className={`${styles.status} ${styles.statusError}`}>
            {errorMessage}
          </div>
        ) : (
          <div className={`${styles.status} ${styles.statusInfo}`}>
            {busyMessage ||
              "Imported data and template edits stay in draft mode until you generate the batch."}
          </div>
        )}
      </aside>

      <section className={styles.workspace}>
        <div className={styles.toolbar} data-no-print>
          <div>
            <p className={styles.toolbarLabel}>Generation Status</p>
            <h2 className={styles.toolbarTitle}>
              {generationStatus === "running"
                ? `Generating ${generationProgress.completed} of ${generationProgress.total}`
                : generationStatus === "completed"
                  ? "Ready to Preview and Download"
                  : generationStatus === "stopped"
                    ? "Generation Stopped"
                    : "Draft Batch"}
            </h2>
            <p className={styles.toolbarMeta}>
              {generationStatus === "running"
                ? `Currently preparing ${generationProgress.currentLearner || "learner records"}`
                : outputIsStale && generatedSession
                  ? `Template or settings changed after generation. Preview still shows ${templateName(generatedSession.settings.template)} until you regenerate.`
                  : hasGeneratedOutput && generatedSession
                    ? `Preview is showing the last generated ${templateName(generatedSession.settings.template)} template batch.`
                    : "Load data, choose a template, and generate the batch before previewing transcripts."}
            </p>
          </div>

          <div className={styles.toolbarActions}>
            <button
              type="button"
              className={styles.secondaryAction}
              onClick={() => void handleGenerateAll()}
              disabled={generationStatus === "running"}
            >
              {hasGeneratedOutput ? "Regenerate" : "Generate"}
            </button>
            <button
              type="button"
              className={styles.ghostAction}
              onClick={handleStopGeneration}
              disabled={generationStatus !== "running"}
            >
              Stop
            </button>
            <button
              type="button"
              className={styles.primaryAction}
              onClick={() => void handleDownloadAllPdfs()}
              disabled={!canDownloadOutputs}
            >
              Download All PDFs
            </button>
            <button
              type="button"
              className={styles.secondaryAction}
              onClick={() => void handleDownloadAllClr()}
              disabled={!canDownloadOutputs}
            >
              Download All CLR JSON
            </button>
          </div>
        </div>

        <div className={styles.summaryGrid} data-no-print>
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Imported Learners</span>
            <strong>{importedGroups.length}</strong>
            <p>{sourceLabel}</p>
          </article>
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Course Rows</span>
            <strong>{sourceRows.length}</strong>
            <p>Flat import rows repeated per learner-course entry.</p>
          </article>
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Generated Batch</span>
            <strong>{generatedRecords?.length ?? 0}</strong>
            <p>
              {generatedSession
                ? `${templateName(generatedSession.settings.template)} template`
                : "No generated output yet"}
            </p>
          </article>
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Warnings</span>
            <strong>{warnings.length}</strong>
            <p>Validation messages from the latest spreadsheet upload.</p>
          </article>
        </div>

        {outputIsStale ? (
          <div className={styles.noticePanel} data-no-print>
            Template or global settings changed after the last generation.
            Regenerate the batch to apply the new design and metadata to preview
            and downloads.
          </div>
        ) : null}

        <div className={styles.contentGrid}>
          <section className={styles.listPanel} data-no-print>
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>Generated Learners</h2>
                <p className={styles.panelMeta}>
                  Generate the batch first, then select a learner to preview the
                  transcript and download files.
                </p>
              </div>
            </div>

            {(generatedRecords?.length ?? 0) > 0 ? (
              <div className={styles.learnerList}>
                {generatedRecords?.map((record) => (
                  <article
                    key={record.learnerId}
                    className={`${styles.learnerCard} ${selectedRecord?.learnerId === record.learnerId ? styles.learnerActive : ""}`}
                  >
                    <button
                      type="button"
                      className={styles.learnerSelect}
                      onClick={() => setSelectedLearnerId(record.learnerId)}
                    >
                      <strong>{record.learnerName}</strong>
                      <span>{record.studentNumber}</span>
                      <span>{record.courseCount} courses</span>
                    </button>
                    <div className={styles.inlineActions}>
                      <button
                        type="button"
                        className={styles.inlineAction}
                        onClick={() => setSelectedLearnerId(record.learnerId)}
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        className={styles.inlineAction}
                        onClick={() => downloadJson(record.clr, makeClrFilename(record))}
                        disabled={!canDownloadOutputs}
                      >
                        CLR
                      </button>
                      <button
                        type="button"
                        className={styles.inlineAction}
                        onClick={() => void handleDownloadRecordPdf(record)}
                        disabled={!canDownloadOutputs}
                      >
                        PDF
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.listEmptyState}>
                <p className={styles.emptyTitle}>No generated transcripts yet</p>
                <p className={styles.panelMeta}>
                  {importedGroups.length} learners are loaded from the current
                  workbook. Click Generate All Transcripts to prepare the batch.
                </p>
              </div>
            )}

            {warnings.length > 0 ? (
              <div className={styles.warningPanel}>
                <p className={styles.warningTitle}>Import Warnings</p>
                {warnings.slice(0, 8).map((warning) => (
                  <p key={warning} className={styles.warningItem}>
                    {warning}
                  </p>
                ))}
                {warnings.length > 8 ? (
                  <p className={styles.warningItem}>
                    {warnings.length - 8} more warnings not shown.
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className={styles.previewPanel}>
            {selectedRecord && generatedSession ? (
              <>
                <div className={styles.previewHeader} data-no-print>
                  <div>
                    <h2 className={styles.panelTitle}>{selectedRecord.learnerName}</h2>
                    <p className={styles.panelMeta}>
                      {selectedRecord.studentNumber} | {selectedRecord.courseCount}{" "}
                      course rows | {selectedRecord.email || "No learner email"}
                    </p>
                  </div>
                  <div className={styles.previewActions}>
                    <button
                      type="button"
                      className={styles.ghostAction}
                      onClick={() => void handleDownloadSelectedPdf()}
                      disabled={!canDownloadOutputs}
                    >
                      Download Transcript
                    </button>
                    <button
                      type="button"
                      className={styles.secondaryAction}
                      onClick={handleDownloadSelectedClr}
                      disabled={!canDownloadOutputs}
                    >
                      Download CLR JSON
                    </button>
                  </div>
                </div>

                <div className={styles.previewCanvas}>
                  <TranscriptPreview
                    record={selectedRecord.transcript}
                    customization={generatedCustomization}
                    previewRef={previewRef}
                    template={generatedSession.settings.template}
                  />
                </div>
              </>
            ) : (
              <div className={styles.emptyState}>
                <p className={styles.emptyTitle}>Preview unlocks after generation</p>
                <p className={styles.panelMeta}>
                  Upload data, choose a template, and run Generate All
                  Transcripts. The learner list and preview will appear here when
                  the batch is ready.
                </p>
              </div>
            )}
          </section>
        </div>
      </section>

      <div className={styles.batchStage} aria-hidden="true">
        {batchPreviewState ? (
          <TranscriptPreview
            record={batchPreviewState.record.transcript}
            customization={buildBulkTranscriptCustomization(batchPreviewState.settings)}
            previewRef={batchPreviewRef}
            template={batchPreviewState.settings.template}
          />
        ) : null}
      </div>
    </main>
  );
}
