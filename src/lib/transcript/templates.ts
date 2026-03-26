import type { TranscriptTemplate } from "@/lib/clr/types";

export interface TranscriptTemplateOption {
  id: TranscriptTemplate;
  name: string;
  description: string;
}

export const transcriptTemplateOptions: TranscriptTemplateOption[] = [
  {
    id: "heritage",
    name: "Heritage",
    description: "A clean print-first academic sheet with warm heritage detailing.",
  },
  {
    id: "scholar",
    name: "Scholar",
    description: "A certificate-style editorial layout with a bold scholarly masthead.",
  },
  {
    id: "modern",
    name: "Modern",
    description: "A contemporary card-driven layout with rounded surfaces and soft depth.",
  },
  {
    id: "executive",
    name: "Executive",
    description: "A formal institutional sheet with a corporate header and side metrics rail.",
  },
  {
    id: "ledger",
    name: "Ledger",
    description: "A registry-style ledger with ruled paper, square panels, and tabular density.",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "A restrained high-whitespace layout built from lines, spacing, and air.",
  },
];
