import { describe, expect, it } from "vitest";
import {
  ReviewedEvidence,
  buildComparisonResults,
  normalizeComparableName,
} from "./evidence-comparison";

const completeEvidence: ReviewedEvidence = {
  whatsapp: {
    displayedName: "Comercializadora Ejemplo, S.A. de C.V.",
    rfc: "CEJ240101AB1",
    bankName: "Banco Ejemplo",
    clabe: "012345678901234567",
  },
  fiscal: {
    legalName: "comercializadora ejemplo sa de cv",
    rfc: "CEJ240101AB1",
  },
  bank: {
    beneficiaryName: "Comercializadora Ejemplo SA de CV",
    bankName: "  banco   ejemplo ",
    clabe: "012345678901234567",
    sourceName: "Captura ficticia de app bancaria",
  },
};

function result(id: ReturnType<typeof buildComparisonResults>[number]["id"], evidence = completeEvidence) {
  return buildComparisonResults(evidence).find((item) => item.id === id)!;
}

describe("deterministic evidence comparison", () => {
  it("matches exact and transparently normalized names", () => {
    expect(normalizeComparableName("  Empresa,   S.A. de C.V. ")).toBe("empresa sa de cv");
    expect(result("fiscal-name").state).toBe("match");
    expect(result("beneficiary-name").state).toBe("match");
  });

  it("marks different names as a mismatch without semantic guessing", () => {
    const evidence = structuredClone(completeEvidence);
    evidence.fiscal!.legalName = "Servicios Ficticios del Centro";
    expect(result("fiscal-name", evidence).state).toBe("mismatch");
  });

  it("keeps missing evidence unverified", () => {
    const evidence: ReviewedEvidence = { whatsapp: completeEvidence.whatsapp };
    expect(result("rfc", evidence).state).toBe("unverified");
    expect(result("clabe", evidence).state).toBe("unverified");
  });

  it("matches the same CLABE", () => {
    expect(result("clabe").state).toBe("match");
  });

  it("marks different CLABEs as a mismatch", () => {
    const evidence = structuredClone(completeEvidence);
    evidence.bank!.clabe = "987654321098765432";
    expect(result("clabe", evidence).state).toBe("mismatch");
  });

  it("matches the same RFC", () => {
    expect(result("rfc").state).toBe("match");
  });

  it("marks different RFCs as a mismatch", () => {
    const evidence = structuredClone(completeEvidence);
    evidence.fiscal!.rfc = "SFC240101CD2";
    expect(result("rfc", evidence).state).toBe("mismatch");
  });

  it("keeps a legitimate incomplete commercial-name case unverified", () => {
    const evidence: ReviewedEvidence = {
      whatsapp: {
        displayedName: "Abarrotes Lupita",
        rfc: "",
        bankName: "",
        clabe: "",
      },
    };
    const results = buildComparisonResults(evidence);
    expect(results.every((item) => item.state === "unverified")).toBe(true);
  });

  it("orders mismatch, then unverified, then match", () => {
    const evidence = structuredClone(completeEvidence);
    evidence.fiscal!.rfc = "SFC240101CD2";
    evidence.bank!.bankName = "";
    const states = buildComparisonResults(evidence).map((item) => item.state);
    expect(states).toEqual(["mismatch", "unverified", "match", "match", "match"]);
  });
});
