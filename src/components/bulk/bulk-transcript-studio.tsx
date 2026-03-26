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
import { getTranscriptPdfBlob } from "@/lib/transcript/pdf";
import { transcriptTemplateOptions } from "@/lib/transcript/templates";
import styles from "./bulk-transcript-studio.module.css";

const SETTINGS_STORAGE_KEY = "clr-bulk-global-settings";
const csvMimeType = "text/csv;charset=utf-8;";
const workbookMimeType =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const sampleLearnerCount = 10;

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

type ExportTask =
  | "idle"
  | "selected-pdf"
  | "record-pdf"
  | "all-pdfs"
  | "all-clr";

interface ExportProgress {
  task: ExportTask;
  completed: number;
  total: number;
  currentLearner: string;
  label: string;
}

const idleExportProgress: ExportProgress = {
  task: "idle",
  completed: 0,
  total: 0,
  currentLearner: "",
  label: "",
};

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
  const [sourceRows, setSourceRows] = useState(() =>
    createSampleBulkRows(sampleLearnerCount),
  );
  const [sourceRevision, setSourceRevision] = useState(1);
  const [settingsRevision, setSettingsRevision] = useState(1);
  const [selectedLearnerId, setSelectedLearnerId] = useState("");
  const [sourceLabel, setSourceLabel] = useState("Built-in sample workbook");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [busyMessage, setBusyMessage] = useState("");
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);
  const [showInstitutionDefaults, setShowInstitutionDefaults] = useState(false);
  const [generationStatus, setGenerationStatus] =
    useState<GenerationStatus>("idle");
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress>(
    {
      completed: 0,
      total: 0,
      currentLearner: "",
    },
  );
  const [exportProgress, setExportProgress] =
    useState<ExportProgress>(idleExportProgress);
  const [generatedSession, setGeneratedSession] = useState<GeneratedSession | null>(
    null,
  );
  const [batchPreviewState, setBatchPreviewState] =
    useState<BatchPreviewState | null>(null);

  const importedGroups = groupBulkImportRows(sourceRows);
  const generatedRecords = generatedSession?.records;
  const draftSelectedGroup =
    importedGroups.find((group) => group.learnerId === selectedLearnerId) ??
    importedGroups[0];
  let draftPreviewRecord: BulkGeneratedLearnerRecord | null = null;
  try {
    if (!generatedSession && draftSelectedGroup) {
      draftPreviewRecord = buildBulkLearnerRecord(draftSelectedGroup, settings);
    }
  } catch {
    draftPreviewRecord = null;
  }
  const selectedRecord =
    generatedRecords?.find((record) => record.learnerId === selectedLearnerId) ??
    generatedRecords?.[0];
  const activePreviewRecord = selectedRecord ?? draftPreviewRecord;
  const activePreviewCustomization = buildBulkTranscriptCustomization(
    generatedSession?.settings ?? settings,
  );
  const hasGeneratedOutput =
    generatedSession != null && (generatedRecords?.length ?? 0) > 0;
  const outputIsStale =
    generatedSession != null &&
    (generatedSession.sourceRevision !== sourceRevision ||
      generatedSession.settingsRevision !== settingsRevision);
  const isExporting = exportProgress.task !== "idle";
  const canDownloadOutputs =
    hasGeneratedOutput &&
    !outputIsStale &&
    generationStatus !== "running" &&
    !isExporting;
  const statusTitle =
    generationStatus === "running"
      ? `Generating ${generationProgress.completed} of ${generationProgress.total}`
      : generationStatus === "completed"
        ? "Generated Transcripts Ready"
        : generationStatus === "stopped"
          ? "Generation Stopped"
          : "Setup Your Batch";
  const statusDescription =
    generationStatus === "running"
      ? `Currently preparing ${generationProgress.currentLearner || "learner records"}.`
      : outputIsStale && generatedSession
        ? `Template or global settings changed after generation. Preview still shows the last generated ${templateName(generatedSession.settings.template)} batch until you regenerate.`
        : hasGeneratedOutput && generatedSession
          ? `Preview and downloads are using the generated ${templateName(generatedSession.settings.template)} batch.`
          : "Upload data, select a template, then generate the batch to lock the output for preview and downloads.";

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

  useEffect(() => {
    if (generatedSession || importedGroups.length === 0) {
      return;
    }

    if (!importedGroups.some((group) => group.learnerId === selectedLearnerId)) {
      setSelectedLearnerId(importedGroups[0].learnerId);
    }
  }, [generatedSession, importedGroups, selectedLearnerId]);

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
    setExportProgress(idleExportProgress);
    setBusyMessage(nextMessage);
  }

  async function waitForUiFrame() {
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });
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
        `Imported ${parsed.rows.length} learner credential rows. Select a template and generate transcripts.`,
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
    const sampleRows = createSampleBulkRows(sampleLearnerCount);
    startTransition(() => {
      setSourceRows(sampleRows);
      setWarnings([]);
      setSourceLabel("Built-in sample workbook");
      setSourceRevision((current) => current + 1);
    });
    setErrorMessage("");
    resetGeneratedOutput(
      `Loaded ${sampleLearnerCount} sample learners. Choose a template and click Generate All Transcripts.`,
    );
  }

  function handleDownloadCsvTemplate() {
    downloadBlob(
      new Blob([createSampleBulkCsv(sampleLearnerCount)], { type: csvMimeType }),
      "bulk-clr-import-sample.csv",
    );
  }

  function handleDownloadExcelTemplate() {
    downloadBlob(
      new Blob([createSampleBulkWorkbook(sampleLearnerCount)], {
        type: workbookMimeType,
      }),
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
    if (!generatedSession || !selectedRecord || !canDownloadOutputs) {
      return;
    }

    try {
      setExportProgress({
        task: "selected-pdf",
        completed: 1,
        total: 1,
        currentLearner: selectedRecord.learnerName,
        label: "Preparing preview PDF",
      });
      setBusyMessage(`Rendering transcript for ${selectedRecord.learnerName}...`);
      await waitForUiFrame();
      const pdfBlob = await renderPdfForRecord(
        selectedRecord,
        generatedSession.settings,
      );
      downloadBlob(pdfBlob, makeTranscriptFilename(selectedRecord));
      setBusyMessage(`Downloaded transcript for ${selectedRecord.learnerName}.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "The transcript PDF could not be created.",
      );
      setBusyMessage("");
    } finally {
      setBatchPreviewState(null);
      setExportProgress(idleExportProgress);
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

    await waitForUiFrame();
    await waitForUiFrame();

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
      setExportProgress({
        task: "record-pdf",
        completed: 1,
        total: 1,
        currentLearner: record.learnerName,
        label: "Preparing learner PDF",
      });
      setBusyMessage(`Rendering transcript for ${record.learnerName}...`);
      await waitForUiFrame();
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
      setExportProgress(idleExportProgress);
    }
  }

  async function handleDownloadAllClr() {
    if (!generatedSession || !canDownloadOutputs) {
      return;
    }

    setExportProgress({
      task: "all-clr",
      completed: 0,
      total: generatedSession.records.length,
      currentLearner: "",
      label: "Packaging CLR archive",
    });
    setBusyMessage(`Packaging ${generatedSession.records.length} CLR JSON files...`);
    setErrorMessage("");

    try {
      const zip = new JSZip();

      for (const [index, record] of generatedSession.records.entries()) {
        setExportProgress({
          task: "all-clr",
          completed: index + 1,
          total: generatedSession.records.length,
          currentLearner: record.learnerName,
          label: "Adding CLR files",
        });
        zip.file(makeClrFilename(record), JSON.stringify(record.clr, null, 2));
        await waitForUiFrame();
      }

      const archive = await zip.generateAsync(
        { type: "blob" },
        (metadata) => {
          setExportProgress({
            task: "all-clr",
            completed: generatedSession.records.length,
            total: generatedSession.records.length,
            currentLearner: "",
            label: `Finalizing archive ${Math.round(metadata.percent)}%`,
          });
        },
      );
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
    } finally {
      setExportProgress(idleExportProgress);
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
        setExportProgress({
          task: "all-pdfs",
          completed: index + 1,
          total: generatedSession.records.length,
          currentLearner: record.learnerName,
          label: "Rendering learner PDFs",
        });
        setBusyMessage(
          `Rendering transcript ${index + 1} of ${generatedSession.records.length}: ${record.learnerName}`,
        );
        await waitForUiFrame();
        const pdfBlob = await renderPdfForRecord(record, generatedSession.settings);
        zip.file(makeTranscriptFilename(record), pdfBlob);
      }

      const archive = await zip.generateAsync(
        { type: "blob" },
        (metadata) => {
          setExportProgress({
            task: "all-pdfs",
            completed: generatedSession.records.length,
            total: generatedSession.records.length,
            currentLearner: "",
            label: `Finalizing PDF archive ${Math.round(metadata.percent)}%`,
          });
        },
      );
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
      setExportProgress(idleExportProgress);
    }
  }

  return (
    <main className={styles.shell}>
      <section className={styles.workspace}>
        <section className={styles.panel} data-no-print>
          <div className={styles.panelTopBar}>
            <StudioSwitcher />
          </div>

          <div className={styles.section}>
            <span className={styles.eyebrow}>Advanced Batch Settings</span>
            <h2 className={styles.title}>Institution and transcript defaults</h2>
            <p className={styles.lede}>
              These values apply to every learner in the batch. Upload, template selection, and generation stay in the workflow steps below.
            </p>
          </div>

          <div className={styles.section}>
            <div className={styles.collapsibleHeader}>
              <span className={styles.sectionTitle}>Global Settings</span>
              <button
                type="button"
                className={styles.sectionToggle}
                onClick={() =>
                  setShowInstitutionDefaults((current) => !current)
                }
                aria-label={
                  showInstitutionDefaults
                    ? "Hide institution defaults"
                    : "Show institution defaults"
                }
                aria-expanded={showInstitutionDefaults}
              >
                <span
                  className={`${styles.sectionToggleIcon} ${showInstitutionDefaults ? styles.sectionToggleIconOpen : ""}`}
                  aria-hidden="true"
                />
              </button>
            </div>
            <p className={styles.hint}>
              Hidden by default to keep more space for the workflow and transcript review area.
            </p>

            {showInstitutionDefaults ? (
              <>
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
                      onChange={(event) =>
                        updateSetting("sealText", event.target.value)
                      }
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="bulk-board-name">Board / Authority</label>
                    <input
                      id="bulk-board-name"
                      className={styles.input}
                      value={settings.boardName}
                      onChange={(event) =>
                        updateSetting("boardName", event.target.value)
                      }
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
                    onChange={(event) =>
                      updateSetting("footerText", event.target.value)
                    }
                  />
                </div>
              </>
            ) : null}
          </div>

          <div className={styles.section}>
            <span className={styles.sectionTitle}>Current Batch</span>
            <p className={styles.hint}>
              {importedGroups.length} learners loaded from {sourceLabel}. Selected template:{" "}
              {templateName(settings.template)}.
            </p>
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
        </section>

        <section className={styles.workspaceIntro} data-no-print>
          <div>
            <p className={styles.toolbarLabel}>Bulk CLR and Transcript Studio</p>
            <h1 className={styles.workspaceTitle}>
              Upload data, choose a design, then generate the full transcript batch
            </h1>
          </div>
          <p className={styles.workspaceHint}>
            The setup stays at the top. Once the batch is generated, use the learner rail on the left and the larger transcript preview on the right to review outputs before downloading.
          </p>
        </section>

        <section className={styles.workflowGrid} data-no-print>
          <article className={styles.workflowCard}>
            <div className={styles.workflowHeader}>
              <div>
                <p className={styles.toolbarLabel}>Step 1</p>
                <h2 className={styles.panelTitle}>Upload or Load Bulk Data</h2>
              </div>
              <p className={styles.panelMeta}>
                Start with the sample file or upload your own CSV/Excel sheet.
              </p>
            </div>

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

            <div className={styles.workflowMeta}>
              <strong>{sourceLabel}</strong>
              <span>
                {importedGroups.length} learners | {sourceRows.length} credential rows
              </span>
            </div>
          </article>

          <article className={styles.workflowCard}>
            <div className={styles.workflowHeader}>
              <div>
                <p className={styles.toolbarLabel}>Step 2</p>
                <h2 className={styles.panelTitle}>Select Transcript Design</h2>
              </div>
              <p className={styles.panelMeta}>
                Pick the template first. The right panel updates immediately, and batch output updates after regeneration.
              </p>
            </div>

            <div className={styles.templateDockGrid}>
              {transcriptTemplateOptions.map((option) => (
                <button
                  key={`workflow-${option.id}`}
                  type="button"
                  className={`${styles.templateDockCard} ${settings.template === option.id ? styles.templateDockCardActive : ""}`}
                  onClick={() => updateSetting("template", option.id)}
                >
                  <strong>{option.name}</strong>
                  <span>{option.description}</span>
                </button>
              ))}
            </div>
          </article>

          <article
            className={`${styles.workflowCard} ${styles.workflowCardFull}`}
          >
            <div className={styles.workflowHeader}>
              <div>
                <p className={styles.toolbarLabel}>Step 3</p>
                <h2 className={styles.panelTitle}>Generate and Review Batch</h2>
              </div>
              <p className={styles.panelMeta}>
                Generate after upload and template selection. If you adjust the design or global defaults later, regenerate to refresh preview and downloads.
              </p>
            </div>

            <div className={styles.generateGrid}>
              <div className={styles.generateStatusCard}>
                <p className={styles.toolbarLabel}>Batch Status</p>
                <h3 className={styles.toolbarTitle}>{statusTitle}</h3>
                <p className={styles.toolbarMeta}>{statusDescription}</p>
                <div className={styles.workflowMeta}>
                  <strong>{importedGroups.length} learners ready</strong>
                  <span>
                    {sourceRows.length} credential rows | {warnings.length} warnings
                  </span>
                </div>
              </div>

              <div className={styles.generateActionsCard}>
                <div className={styles.toolbarActions}>
                  <button
                    type="button"
                    className={styles.primaryAction}
                    onClick={() => void handleGenerateAll()}
                    disabled={generationStatus === "running"}
                  >
                    {hasGeneratedOutput
                      ? "Regenerate All Transcripts"
                      : "Generate All Transcripts"}
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
                    <span className={styles.actionContent}>
                      {exportProgress.task === "all-pdfs" ? (
                        <span className={styles.loaderDot} aria-hidden="true" />
                      ) : null}
                      {exportProgress.task === "all-pdfs"
                        ? "Preparing PDFs"
                        : "Download All PDFs"}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryAction}
                    onClick={() => void handleDownloadAllClr()}
                    disabled={!canDownloadOutputs}
                  >
                    <span className={styles.actionContent}>
                      {exportProgress.task === "all-clr" ? (
                        <span className={styles.loaderDot} aria-hidden="true" />
                      ) : null}
                      {exportProgress.task === "all-clr"
                        ? "Preparing JSON"
                        : "Download All CLR JSON"}
                    </span>
                  </button>
                </div>
                {isExporting ? (
                  <div className={styles.exportStatus} aria-live="polite">
                    <div className={styles.exportStatusHeader}>
                      <span className={styles.loaderDot} aria-hidden="true" />
                      <strong>{exportProgress.label}</strong>
                      <span>
                        {exportProgress.total > 0
                          ? `${Math.min(exportProgress.completed, exportProgress.total)} / ${exportProgress.total}`
                          : "Starting"}
                      </span>
                    </div>
                    <p className={styles.exportStatusText}>
                      {exportProgress.currentLearner || "Keeping the download batch in sync with the preview design."}
                    </p>
                    {exportProgress.total > 0 ? (
                      <div className={styles.exportProgressTrack} aria-hidden="true">
                        <span
                          className={styles.exportProgressFill}
                          style={{
                            width: `${Math.max(
                              6,
                              (Math.min(exportProgress.completed, exportProgress.total) /
                                exportProgress.total) *
                                100,
                            )}%`,
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </article>
        </section>

        {outputIsStale ? (
          <div className={styles.noticePanel} data-no-print>
            Template or global settings changed after the last generation.
            Regenerate the batch to apply the new design and metadata to preview
            and downloads.
          </div>
        ) : null}

        <div className={styles.resultsHeader} data-no-print>
          <div>
            <p className={styles.toolbarLabel}>Generated Workspace</p>
            <h2 className={styles.panelTitle}>
              {hasGeneratedOutput ? "Generated Transcripts" : "Draft Transcript Preview"}
            </h2>
            <p className={styles.panelMeta}>
              {hasGeneratedOutput
                ? "Use the learner rail on the left to switch between generated transcripts."
                : "Use the learner rail on the left to inspect the selected design before generation."}
            </p>
          </div>
          <div className={styles.resultsMeta}>
            <span>{hasGeneratedOutput ? generatedRecords?.length ?? 0 : importedGroups.length} learners</span>
            <span>{sourceRows.length} entries</span>
            <span>{templateName(generatedSession?.settings.template ?? settings.template)}</span>
          </div>
        </div>

        <div className={styles.contentGrid}>
          <section className={styles.listPanel} data-no-print>
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>
                  {hasGeneratedOutput ? "Generated Learners" : "Imported Learners"}
                </h2>
                <p className={styles.panelMeta}>
                  {hasGeneratedOutput
                    ? "Select a learner to preview the generated transcript and download files."
                    : "Select a learner to inspect the draft transcript design before generation."}
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
                      <span>{record.courseCount} credential entries</span>
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
                        <span className={styles.actionContent}>
                          {exportProgress.task === "record-pdf" &&
                          exportProgress.currentLearner === record.learnerName ? (
                            <span className={styles.loaderDot} aria-hidden="true" />
                          ) : null}
                          {exportProgress.task === "record-pdf" &&
                          exportProgress.currentLearner === record.learnerName
                            ? "Preparing"
                            : "PDF"}
                        </span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : importedGroups.length > 0 ? (
              <div className={styles.learnerList}>
                {importedGroups.map((group) => {
                  const primary = group.rows[0];
                  const isActive =
                    (draftSelectedGroup?.learnerId ?? "") === group.learnerId;

                  return (
                    <article
                      key={group.learnerId}
                      className={`${styles.learnerCard} ${isActive ? styles.learnerActive : ""}`}
                    >
                      <button
                        type="button"
                        className={styles.learnerSelect}
                        onClick={() => setSelectedLearnerId(group.learnerId)}
                      >
                        <strong>{primary.fullName}</strong>
                        <span>{primary.studentNumber}</span>
                        <span>{group.rows.length} credential entries</span>
                      </button>
                      <div className={styles.inlineActions}>
                        <button
                          type="button"
                          className={styles.inlineAction}
                          onClick={() => setSelectedLearnerId(group.learnerId)}
                        >
                          Preview Design
                        </button>
                      </div>
                    </article>
                  );
                })}
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
            {activePreviewRecord ? (
              <>
                <div className={styles.previewHeader} data-no-print>
                  <div>
                    <h2 className={styles.panelTitle}>{activePreviewRecord.learnerName}</h2>
                    <p className={styles.panelMeta}>
                      {activePreviewRecord.studentNumber} | {activePreviewRecord.courseCount}{" "}
                      credential entries |{" "}
                      {hasGeneratedOutput
                        ? "Generated transcript"
                        : `${templateName(settings.template)} draft preview`}
                    </p>
                  </div>
                  <div className={styles.previewActions}>
                    <button
                      type="button"
                      className={styles.ghostAction}
                      onClick={() => void handleDownloadSelectedPdf()}
                      disabled={!canDownloadOutputs}
                    >
                      <span className={styles.actionContent}>
                        {exportProgress.task === "selected-pdf" ? (
                          <span className={styles.loaderDot} aria-hidden="true" />
                        ) : null}
                        {exportProgress.task === "selected-pdf"
                          ? "Preparing PDF"
                          : "Download Transcript"}
                      </span>
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
                    record={activePreviewRecord.transcript}
                    customization={activePreviewCustomization}
                    previewRef={previewRef}
                    template={generatedSession?.settings.template ?? settings.template}
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
