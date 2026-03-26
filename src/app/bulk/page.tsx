import type { Metadata } from "next";
import { BulkTranscriptStudio } from "@/components/bulk/bulk-transcript-studio";

export const metadata: Metadata = {
  title: "Bulk CLR Transcript Studio",
  description:
    "Upload Excel or CSV learner credential sheets, generate CLR JSON in bulk, and export printable transcripts for multiple learners.",
};

export default function BulkPage() {
  return <BulkTranscriptStudio />;
}
