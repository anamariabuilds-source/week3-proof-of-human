export type ComparisonState = "match" | "mismatch" | "unverified";

export type ComparisonSource = {
  name: string;
  value: string | null;
};

export type ComparisonResult = {
  id: "rfc" | "fiscal-name" | "clabe" | "bank-name" | "beneficiary-name";
  relationship: string;
  sourceA: ComparisonSource;
  sourceB: ComparisonSource;
  state: ComparisonState;
  label: "Coincide" | "No coincide" | "No verificado";
  explanation: string;
  boundary: string;
  limitation?: string;
};

export type ReviewedEvidence = {
  whatsapp: {
    displayedName: string;
    rfc: string;
    bankName: string;
    clabe: string;
  };
  fiscal?: {
    legalName: string;
    rfc: string;
  };
  bank?: {
    beneficiaryName: string;
    bankName: string;
    clabe: string;
    sourceName: string;
  };
};

type RelationshipDefinition = {
  id: ComparisonResult["id"];
  relationship: string;
  sourceA: ComparisonSource;
  sourceB: ComparisonSource;
  normalize: (value: string) => string;
  limitation?: string;
};

const stateCopy = {
  mismatch: {
    label: "No coincide",
    explanation: "Hay dos valores comparables y son diferentes.",
    boundary: "Estos datos no son iguales entre las fuentes. Esto no demuestra fraude. Revisa la diferencia antes de continuar.",
  },
  unverified: {
    label: "No verificado",
    explanation: "Falta al menos uno de los valores necesarios para comparar.",
    boundary: "No hay suficiente información comparable para confirmar si estos datos coinciden. Esto no es una señal negativa por sí sola.",
  },
  match: {
    label: "Coincide",
    explanation: "Los valores comparables son iguales después de la normalización indicada.",
    boundary: "Estos datos son consistentes entre estas fuentes. Esto no demuestra que la contraparte sea segura o confiable.",
  },
} as const;

const stateOrder: Record<ComparisonState, number> = { mismatch: 0, unverified: 1, match: 2 };

export function normalizeComparableName(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("es-MX")
    .replace(/[.,]/g, "")
    .replace(/[\p{P}\p{S}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeRfc(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeClabe(value: string): string {
  return value.trim();
}

function compareRelationship(definition: RelationshipDefinition): ComparisonResult {
  const valueA = definition.sourceA.value?.trim() ?? "";
  const valueB = definition.sourceB.value?.trim() ?? "";
  const state: ComparisonState = !valueA || !valueB
    ? "unverified"
    : definition.normalize(valueA) === definition.normalize(valueB)
      ? "match"
      : "mismatch";

  return {
    id: definition.id,
    relationship: definition.relationship,
    sourceA: { ...definition.sourceA, value: valueA || null },
    sourceB: { ...definition.sourceB, value: valueB || null },
    state,
    ...stateCopy[state],
    limitation: definition.limitation,
  };
}

export function buildComparisonResults(evidence: ReviewedEvidence): ComparisonResult[] {
  const fiscal = evidence.fiscal;
  const bank = evidence.bank;
  const relationships: RelationshipDefinition[] = [
    {
      id: "rfc",
      relationship: "RFC de la contraparte",
      sourceA: { name: "Captura de WhatsApp", value: evidence.whatsapp.rfc },
      sourceB: { name: "Documento fiscal (no verificado por SAT)", value: fiscal?.rfc ?? null },
      normalize: normalizeRfc,
    },
    {
      id: "fiscal-name",
      relationship: "Nombre comercial o mostrado vs. nombre legal",
      sourceA: { name: "Captura de WhatsApp", value: evidence.whatsapp.displayedName },
      sourceB: { name: "Documento fiscal (no verificado por SAT)", value: fiscal?.legalName ?? null },
      normalize: normalizeComparableName,
      limitation: "Un nombre comercial puede ser distinto de la razón social. Esta comparación solo muestra si los textos normalizados son iguales.",
    },
    {
      id: "clabe",
      relationship: "CLABE de destino",
      sourceA: { name: "Captura de WhatsApp", value: evidence.whatsapp.clabe },
      sourceB: { name: bank?.sourceName ?? "Información bancaria no agregada", value: bank?.clabe ?? null },
      normalize: normalizeClabe,
    },
    {
      id: "bank-name",
      relationship: "Banco indicado",
      sourceA: { name: "Captura de WhatsApp", value: evidence.whatsapp.bankName },
      sourceB: { name: bank?.sourceName ?? "Información bancaria no agregada", value: bank?.bankName ?? null },
      normalize: normalizeComparableName,
    },
    {
      id: "beneficiary-name",
      relationship: "Nombre mostrado vs. beneficiario bancario",
      sourceA: { name: "Captura de WhatsApp", value: evidence.whatsapp.displayedName },
      sourceB: { name: bank?.sourceName ?? "Información bancaria no agregada", value: bank?.beneficiaryName ?? null },
      normalize: normalizeComparableName,
      limitation: "El beneficiario bancario puede mostrar un nombre legal o personal diferente del nombre comercial. Una diferencia no demuestra fraude.",
    },
  ];

  return relationships
    .map(compareRelationship)
    .sort((a, b) => stateOrder[a.state] - stateOrder[b.state]);
}
