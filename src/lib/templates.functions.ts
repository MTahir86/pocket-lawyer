import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callGateway, GatewayError } from "./ai-gateway.server";
import type { LanguageId } from "./analysis.functions";

const LANGUAGES = ["english", "urdu", "roman-urdu"] as const;

const languageInstruction: Record<LanguageId, string> = {
  english: "Write the entire document in formal, professional English.",
  urdu: "Write the entire document in formal Urdu using Urdu script (اردو), as used in Pakistani legal documents.",
  "roman-urdu":
    "Write the entire document in formal Roman Urdu (Urdu written with English/Latin letters), as commonly used in Pakistani legal drafts.",
};

export type TemplateField = {
  key: string;
  label: string;
  placeholder: string;
};

export type TemplateDef = {
  id: string;
  name: string;
  description: string;
  fields: TemplateField[];
};

export const TEMPLATES: TemplateDef[] = [
  {
    id: "rent-agreement",
    name: "Rent Agreement (Karachi/Pakistan)",
    description: "Residential tenancy agreement with rent, deposit, and notice terms.",
    fields: [
      { key: "landlordName", label: "Landlord Name", placeholder: "e.g. Ahmed Khan" },
      { key: "landlordCnic", label: "Landlord CNIC", placeholder: "e.g. 42101-1234567-1" },
      { key: "tenantName", label: "Tenant Name", placeholder: "e.g. Bilal Ahmed" },
      { key: "tenantCnic", label: "Tenant CNIC", placeholder: "e.g. 42101-7654321-3" },
      { key: "propertyAddress", label: "Property Address", placeholder: "House/Flat No., Street, Area, Karachi" },
      { key: "monthlyRent", label: "Monthly Rent (PKR)", placeholder: "e.g. 45,000" },
      { key: "securityDeposit", label: "Security Deposit (PKR)", placeholder: "e.g. 90,000" },
      { key: "startDate", label: "Agreement Start Date", placeholder: "e.g. 1 October 2026" },
      { key: "duration", label: "Duration", placeholder: "e.g. 11 months" },
    ],
  },
  {
    id: "sale-deed",
    name: "Bike/Car Sale Deed",
    description: "Vehicle sale deed with ownership transfer and payment details.",
    fields: [
      { key: "sellerName", label: "Seller Name", placeholder: "e.g. Muhammad Asif" },
      { key: "sellerCnic", label: "Seller CNIC", placeholder: "e.g. 42201-1234567-9" },
      { key: "buyerName", label: "Buyer Name", placeholder: "e.g. Hassan Raza" },
      { key: "buyerCnic", label: "Buyer CNIC", placeholder: "e.g. 42201-9876543-1" },
      { key: "vehicleDetails", label: "Vehicle Details", placeholder: "Make, model, year, color" },
      { key: "registrationNo", label: "Registration Number", placeholder: "e.g. KHI-1234" },
      { key: "engineChassis", label: "Engine / Chassis No.", placeholder: "e.g. ENG-XXX / CHS-XXX" },
      { key: "saleAmount", label: "Sale Amount (PKR)", placeholder: "e.g. 850,000" },
      { key: "saleDate", label: "Date of Sale", placeholder: "e.g. 3 September 2026" },
    ],
  },
  {
    id: "affidavit",
    name: "General Affidavit",
    description: "Sworn statement of facts on stamp paper for general purposes.",
    fields: [
      { key: "deponentName", label: "Deponent Name", placeholder: "e.g. Fatima Bibi" },
      { key: "fatherName", label: "Father's / Husband's Name", placeholder: "e.g. Abdul Kareem" },
      { key: "cnic", label: "CNIC", placeholder: "e.g. 42101-1111111-2" },
      { key: "address", label: "Residential Address", placeholder: "Full address" },
      { key: "purpose", label: "Purpose of Affidavit", placeholder: "e.g. Name correction in records" },
      { key: "statement", label: "Facts to Declare", placeholder: "Briefly describe what you are declaring under oath" },
    ],
  },
];

const GenerateInput = z.object({
  templateId: z.string().min(1),
  language: z.enum(LANGUAGES),
  values: z.record(z.string(), z.string().trim().max(500)),
});

export const generateTemplate = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data }): Promise<string> => {
    const template = TEMPLATES.find((tpl) => tpl.id === data.templateId);
    if (!template) throw new Error("Unknown template.");

    const details = template.fields
      .map((f) => `- ${f.label}: ${data.values[f.key]?.trim() || "[Not provided]"}`)
      .join("\n");

    try {
      const text = await callGateway([
        {
          role: "system",
          content: `You are Pocket Lawyer AI, an expert Pakistani legal draftsman.
Draft a complete, professional "${template.name}" using the details provided.
${languageInstruction[data.language as LanguageId]}
Rules:
- Use proper legal structure: title, parties, recitals, numbered clauses, signature and witness blocks.
- Where a detail is missing, insert a clearly marked blank like ________ so the user can fill it in.
- Include standard protective clauses appropriate for this document type under Pakistani law.
- Output plain text only — no markdown, no bullet symbols like ** or ##, no commentary before or after the document.`,
        },
        {
          role: "user",
          content: `Draft the document with these details:\n${details}`,
        },
      ]);
      return text.trim();
    } catch (err) {
      if (err instanceof GatewayError) throw new Error(err.message);
      throw err instanceof Error ? err : new Error("Generation failed.");
    }
  });
