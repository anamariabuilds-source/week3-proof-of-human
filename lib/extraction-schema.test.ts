import { describe, expect, it } from "vitest";
import { parseExtractionResponse } from "./extraction-schema";

const field = (value: string | null, state: "extracted" | "not_found" | "uncertain") => ({ value, state });

describe("parseExtractionResponse", () => {
  it("accepts and normalizes a strict WhatsApp extraction", () => {
    const result = parseExtractionResponse("whatsapp", {
      sourceType: "whatsapp",
      fields: {
        displayedName: field(" Proveedora Horizonte ", "extracted"),
        rfc: field("pho240101ab1", "extracted"),
        bankName: field("Banco Ejemplo", "extracted"),
        clabe: field("012345678901234567", "extracted"),
      },
    });

    expect(result.fields.displayedName.value).toBe("Proveedora Horizonte");
    expect(result.fields.rfc.value).toBe("PHO240101AB1");
  });

  it("rejects extra response fields", () => {
    expect(() =>
      parseExtractionResponse("fiscal", {
        sourceType: "fiscal",
        fields: { legalName: field("Empresa Ficticia SA de CV", "extracted"), rfc: field(null, "not_found"), satVerified: true },
      }),
    ).toThrow();
  });

  it("keeps missing and uncertain values unresolved", () => {
    const result = parseExtractionResponse("fiscal", {
      sourceType: "fiscal",
      fields: { legalName: field("texto que no debe conservarse", "uncertain"), rfc: field(null, "not_found") },
    });

    expect(result.fields.legalName).toEqual(field(null, "uncertain"));
    expect(result.fields.rfc).toEqual(field(null, "not_found"));
  });

  it("converts invalid extracted identifiers to unresolved", () => {
    const result = parseExtractionResponse("bank", {
      sourceType: "bank",
      fields: {
        beneficiaryName: field("Persona Ficticia", "extracted"),
        bankName: field("Banco Demo", "extracted"),
        clabe: field("1234", "extracted"),
      },
    });

    expect(result.fields.clabe).toEqual(field(null, "uncertain"));
  });

  it("converts extracted text outside local length boundaries to unresolved", () => {
    const result = parseExtractionResponse("fiscal", {
      sourceType: "fiscal",
      fields: {
        legalName: field("A".repeat(101), "extracted"),
        rfc: field("EFI240101AB1", "extracted"),
      },
    });

    expect(result.fields.legalName).toEqual(field(null, "uncertain"));
    expect(result.fields.rfc.value).toBe("EFI240101AB1");
  });

  it("rejects a response for the wrong source", () => {
    expect(() =>
      parseExtractionResponse("bank", {
        sourceType: "whatsapp",
        fields: { beneficiaryName: field(null, "not_found"), bankName: field(null, "not_found"), clabe: field(null, "not_found") },
      }),
    ).toThrow();
  });
});
