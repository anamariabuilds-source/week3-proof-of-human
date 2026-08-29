import { describe, expect, it } from "vitest";
import { ReviewedEvidence, buildComparisonResults } from "./evidence-comparison";
import { buildNextStepSections, decisionOptions, summarizeResults } from "./result-guidance";

const mixedEvidence: ReviewedEvidence = {
  whatsapp: {
    displayedName: "Distribuidora Sol",
    rfc: "DSO240101AB1",
    bankName: "Banco Ejemplo",
    clabe: "012345678901234567",
  },
  fiscal: { legalName: "Distribuidora Sol", rfc: "OTR240101CD2" },
  bank: {
    beneficiaryName: "",
    bankName: "Banco Ejemplo",
    clabe: "012345678901234567",
    sourceName: "Captura ficticia de app bancaria",
  },
};

describe("final result guidance", () => {
  it("counts a mixed result without producing a score", () => {
    const summary = summarizeResults(buildComparisonResults(mixedEvidence));
    expect(summary).toEqual({ mismatch: 1, unverified: 1, match: 3 });
    expect(Object.keys(summary)).toEqual(["mismatch", "unverified", "match"]);
  });

  it("keeps repeated missing evidence neutral and unverified", () => {
    const incomplete: ReviewedEvidence = {
      whatsapp: { displayedName: "Taller La Esperanza", rfc: "", bankName: "", clabe: "" },
    };
    const results = buildComparisonResults(incomplete);
    const summary = summarizeResults(results);
    const sections = buildNextStepSections(results);

    expect(summary).toEqual({ mismatch: 0, unverified: 5, match: 0 });
    expect(sections).toHaveLength(1);
    expect(sections[0].tone).toBe("neutral");
    expect(sections[0].boundary).toContain("no es sospechosa");
  });

  it("maps each present state to neutral, non-binding next steps", () => {
    const sections = buildNextStepSections(buildComparisonResults(mixedEvidence));
    expect(sections.map((section) => section.state)).toEqual(["mismatch", "unverified", "match"]);
    expect(sections.find((section) => section.state === "mismatch")?.guidance).toContain("Considera pausar");
    expect(sections.find((section) => section.state === "unverified")?.guidance).toContain("Puedes obtener otra evidencia");
    expect(sections.find((section) => section.state === "match")?.boundary).toContain("no demuestra");
  });

  it("does not emit forbidden verdicts, scoring, or payment commands", () => {
    const output = JSON.stringify({
      summary: summarizeResults(buildComparisonResults(mixedEvidence)),
      sections: buildNextStepSections(buildComparisonResults(mixedEvidence)),
    });
    expect(output).not.toMatch(/\bSAFE\b|\bFRAUD\b|puntaje|porcentaje de confianza|nivel de riesgo/i);
    expect(output).not.toMatch(/aprueba el pago|rechaza el pago|procede de forma segura/i);
  });

  it("exposes decision options as labels only, without actions or persistence", () => {
    expect(decisionOptions.map((option) => option.label)).toEqual([
      "Verificaría un dato antes de pagar",
      "Buscaría otra fuente de información",
      "Continuaría con mi proceso normal",
      "Todavía no sé qué hacer",
    ]);
    for (const option of decisionOptions) {
      expect(Object.keys(option).sort()).toEqual(["id", "label"]);
    }
  });
});
