import "server-only";

import { GoogleGenAI } from "@google/genai";
import {
  EvidenceSource,
  ExtractionResult,
  extractionJsonSchemas,
  parseExtractionResponse,
} from "@/lib/extraction-schema";
import {
  classifyProviderError,
  providerHttpStatus,
  withOneProviderRetry,
} from "@/lib/provider-retry";

const MODEL = "gemini-3.5-flash-lite";

const fieldInstructions: Record<EvidenceSource, string> = {
  whatsapp: `
- displayedName: nombre de la contraparte, proveedor o negocio explícitamente visible.
- rfc: solo si está explícitamente identificado como RFC.
- bankName: solo el banco explícitamente nombrado.
- clabe: solo si está explícitamente identificada como CLABE; no conviertas otros números en CLABE.`,
  fiscal: `
- legalName: razón social o nombre legal explícitamente visible.
- rfc: solo el RFC explícitamente visible.`,
  bank: `
- beneficiaryName: nombre de beneficiario mostrado por la aplicación bancaria.
- bankName: banco o institución explícitamente visible.
- clabe: solo si está explícitamente identificada como CLABE; no conviertas otros números en CLABE.`,
};

function promptFor(sourceType: EvidenceSource) {
  return `Extrae únicamente texto visible de esta imagen ficticia para llenar el esquema proporcionado.

Campos permitidos:${fieldInstructions[sourceType]}

Reglas obligatorias:
- Transcribe; no infieras, completes, corrijas ni normalices datos ausentes.
- Usa state "extracted" y el texto visible solo cuando sea legible y corresponda exactamente al campo.
- Usa state "not_found" y value null cuando el campo no aparezca.
- Usa state "uncertain" y value null cuando sea ilegible, ambiguo, incompleto o no puedas confirmar que corresponde al campo.
- No evalúes confianza, seguridad, fraude, identidad, titularidad, autenticidad ni validez institucional.
- No agregues explicaciones ni campos adicionales.`;
}

export class GeminiConfigurationError extends Error {}

export async function extractWithGemini(sourceType: EvidenceSource, bytes: Uint8Array, mimeType: string): Promise<ExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiConfigurationError("GEMINI_API_KEY is not configured");

  const ai = new GoogleGenAI({ apiKey });
  const response = await withOneProviderRetry(
    () =>
      ai.models.generateContent({
        model: MODEL,
        contents: [
          { inlineData: { data: Buffer.from(bytes).toString("base64"), mimeType } },
          { text: promptFor(sourceType) },
        ],
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: extractionJsonSchemas[sourceType],
          temperature: 0,
        },
      }),
    (error) => {
      console.error("Vision provider request failed", {
        provider: "google-gemini",
        httpStatus: providerHttpStatus(error),
        category: classifyProviderError(error),
      });
    },
  );

  if (!response.text) throw new Error("Gemini returned no extraction payload");
  return parseExtractionResponse(sourceType, JSON.parse(response.text));
}
