import { z } from "zod";
import { validateBankName, validateClabe, validateName, validateRfc } from "./evidence-validation";

export const evidenceSourceSchema = z.enum(["whatsapp", "fiscal", "bank"]);
export type EvidenceSource = z.infer<typeof evidenceSourceSchema>;

const extractionStateSchema = z.enum(["extracted", "not_found", "uncertain"]);
const rawFieldSchema = z
  .object({
    value: z.string().max(500).nullable(),
    state: extractionStateSchema,
  })
  .strict();

const whatsappResponseSchema = z
  .object({
    sourceType: z.literal("whatsapp"),
    fields: z
      .object({
        displayedName: rawFieldSchema,
        rfc: rawFieldSchema,
        bankName: rawFieldSchema,
        clabe: rawFieldSchema,
      })
      .strict(),
  })
  .strict();

const fiscalResponseSchema = z
  .object({
    sourceType: z.literal("fiscal"),
    fields: z
      .object({
        legalName: rawFieldSchema,
        rfc: rawFieldSchema,
      })
      .strict(),
  })
  .strict();

const bankResponseSchema = z
  .object({
    sourceType: z.literal("bank"),
    fields: z
      .object({
        beneficiaryName: rawFieldSchema,
        bankName: rawFieldSchema,
        clabe: rawFieldSchema,
      })
      .strict(),
  })
  .strict();

const responseSchemas = {
  whatsapp: whatsappResponseSchema,
  fiscal: fiscalResponseSchema,
  bank: bankResponseSchema,
} as const;

export type ExtractedField = {
  value: string | null;
  state: "extracted" | "not_found" | "uncertain";
};

export type WhatsAppExtraction = {
  sourceType: "whatsapp";
  fields: {
    displayedName: ExtractedField;
    rfc: ExtractedField;
    bankName: ExtractedField;
    clabe: ExtractedField;
  };
};

export type FiscalExtraction = {
  sourceType: "fiscal";
  fields: { legalName: ExtractedField; rfc: ExtractedField };
};

export type BankExtraction = {
  sourceType: "bank";
  fields: { beneficiaryName: ExtractedField; bankName: ExtractedField; clabe: ExtractedField };
};

export type ExtractionResult = WhatsAppExtraction | FiscalExtraction | BankExtraction;

type FieldValidator = (value: string) => string | null;

function unresolved(state: "not_found" | "uncertain" = "uncertain"): ExtractedField {
  return { value: null, state };
}

function sanitizeField(field: z.infer<typeof rawFieldSchema>, validator: FieldValidator, normalize?: (value: string) => string): ExtractedField {
  if (field.state !== "extracted" || field.value === null) {
    return unresolved(field.state === "not_found" ? "not_found" : "uncertain");
  }

  const value = (normalize ? normalize(field.value) : field.value.trim()).trim();
  if (!value || validator(value)) return unresolved();
  return { value, state: "extracted" };
}

export function parseExtractionResponse(sourceType: "whatsapp", input: unknown): WhatsAppExtraction;
export function parseExtractionResponse(sourceType: "fiscal", input: unknown): FiscalExtraction;
export function parseExtractionResponse(sourceType: "bank", input: unknown): BankExtraction;
export function parseExtractionResponse(sourceType: EvidenceSource, input: unknown): ExtractionResult;
export function parseExtractionResponse(sourceType: EvidenceSource, input: unknown): ExtractionResult {
  if (sourceType === "whatsapp") {
    const parsed = responseSchemas.whatsapp.parse(input);
    return {
      sourceType,
      fields: {
        displayedName: sanitizeField(parsed.fields.displayedName, validateName),
        rfc: sanitizeField(parsed.fields.rfc, validateRfc, (value) => value.toUpperCase()),
        bankName: sanitizeField(parsed.fields.bankName, validateBankName),
        clabe: sanitizeField(parsed.fields.clabe, validateClabe),
      },
    };
  }

  if (sourceType === "fiscal") {
    const parsed = responseSchemas.fiscal.parse(input);
    return {
      sourceType,
      fields: {
        legalName: sanitizeField(parsed.fields.legalName, validateName),
        rfc: sanitizeField(parsed.fields.rfc, validateRfc, (value) => value.toUpperCase()),
      },
    };
  }

  const parsed = responseSchemas.bank.parse(input);
  return {
    sourceType,
    fields: {
      beneficiaryName: sanitizeField(parsed.fields.beneficiaryName, validateName),
      bankName: sanitizeField(parsed.fields.bankName, validateBankName),
      clabe: sanitizeField(parsed.fields.clabe, validateClabe),
    },
  };
}

const jsonFieldSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    value: { type: ["string", "null"] },
    state: { type: "string", enum: ["extracted", "not_found", "uncertain"] },
  },
  required: ["value", "state"],
} as const;

function responseJsonSchema(sourceType: EvidenceSource, fieldNames: readonly string[]) {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      sourceType: { type: "string", enum: [sourceType] },
      fields: {
        type: "object",
        additionalProperties: false,
        properties: Object.fromEntries(fieldNames.map((name) => [name, jsonFieldSchema])),
        required: fieldNames,
      },
    },
    required: ["sourceType", "fields"],
  };
}

export const extractionJsonSchemas = {
  whatsapp: responseJsonSchema("whatsapp", ["displayedName", "rfc", "bankName", "clabe"]),
  fiscal: responseJsonSchema("fiscal", ["legalName", "rfc"]),
  bank: responseJsonSchema("bank", ["beneficiaryName", "bankName", "clabe"]),
} as const;
