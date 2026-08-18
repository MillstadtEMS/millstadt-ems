import { z } from "zod";

export const AI_MONITOR_REPORT_TYPES = ["nightly_security", "weekly_analytics"] as const;
export type AiMonitorReportType = (typeof AI_MONITOR_REPORT_TYPES)[number];

export const AiMonitorFindingSchema = z.object({
  severity: z.enum(["critical", "high", "medium", "low", "information"]),
  title: z.string().min(1).max(120),
  evidence: z.array(z.string().min(1).max(240)).max(5),
  recommendation: z.string().min(1).max(600),
  confidence: z.number().min(0).max(1),
}).strict();

export const AiMonitorReportSchema = z.object({
  verdict: z.enum(["healthy", "needs_attention", "critical"]),
  summary: z.string().min(1).max(800),
  findings: z.array(AiMonitorFindingSchema).max(10),
  observations: z.array(z.string().min(1).max(300)).max(8),
}).strict();

export type AiMonitorReport = z.infer<typeof AiMonitorReportSchema>;

export const aiMonitorReportJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["verdict", "summary", "findings", "observations"],
  properties: {
    verdict: { type: "string", enum: ["healthy", "needs_attention", "critical"] },
    summary: { type: "string", minLength: 1, maxLength: 800 },
    findings: {
      type: "array",
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "title", "evidence", "recommendation", "confidence"],
        properties: {
          severity: {
            type: "string",
            enum: ["critical", "high", "medium", "low", "information"],
          },
          title: { type: "string", minLength: 1, maxLength: 120 },
          evidence: {
            type: "array",
            maxItems: 5,
            items: { type: "string", minLength: 1, maxLength: 240 },
          },
          recommendation: { type: "string", minLength: 1, maxLength: 600 },
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
      },
    },
    observations: {
      type: "array",
      maxItems: 8,
      items: { type: "string", minLength: 1, maxLength: 300 },
    },
  },
} as const;
