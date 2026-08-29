import { ComparisonResult, ComparisonState } from "./evidence-comparison";

export type ResultSummary = {
  mismatch: number;
  unverified: number;
  match: number;
};

export type NextStepSection = {
  state: ComparisonState;
  title: string;
  details: string[];
  guidance: string;
  boundary: string;
  tone: "attention" | "neutral" | "consistent";
};

export const decisionOptions = [
  { id: "verify", label: "Verificaría un dato antes de pagar" },
  { id: "another-source", label: "Buscaría otra fuente de información" },
  { id: "normal-process", label: "Continuaría con mi proceso normal" },
  { id: "unsure", label: "Todavía no sé qué hacer" },
] as const;

export function summarizeResults(results: ComparisonResult[]): ResultSummary {
  return results.reduce<ResultSummary>(
    (summary, result) => ({ ...summary, [result.state]: summary[result.state] + 1 }),
    { mismatch: 0, unverified: 0, match: 0 },
  );
}

function quoted(value: string | null): string {
  return value ? `“${value}”` : "sin dato disponible";
}

function mismatchSection(results: ComparisonResult[]): NextStepSection {
  return {
    state: "mismatch",
    title: "Revisa estas diferencias antes de pagar",
    details: results.map(
      (result) =>
        `${result.relationship}: ${result.sourceA.name} muestra ${quoted(result.sourceA.value)} y ${result.sourceB.name} muestra ${quoted(result.sourceB.value)}.`,
    ),
    guidance: "Considera pausar antes del pago y confirmar la información diferente directamente con la contraparte, usando un contacto o canal conocido o confirmado de forma independiente cuando sea posible.",
    boundary: "Una diferencia entre fuentes no demuestra fraude y no rechaza automáticamente el pago.",
    tone: "attention",
  };
}

function unverifiedDetail(result: ComparisonResult): string {
  const missingSources = [result.sourceA, result.sourceB]
    .filter((source) => source.value === null)
    .map((source) => source.name);
  return `${result.relationship}: falta información comparable en ${missingSources.join(" y ")}.`;
}

function unverifiedSection(results: ComparisonResult[]): NextStepSection {
  return {
    state: "unverified",
    title: "Decide si necesitas más información",
    details: results.map(unverifiedDetail),
    guidance: "Puedes obtener otra evidencia o continuar con tu proceso normal de verificación antes del pago.",
    boundary: "La falta de información no es sospechosa ni una señal negativa por sí sola.",
    tone: "neutral",
  };
}

function matchSection(results: ComparisonResult[]): NextStepSection {
  return {
    state: "match",
    title: "Reconoce qué información es consistente",
    details: results.map(
      (result) => `${result.relationship}: los valores de ${result.sourceA.name} y ${result.sourceB.name} coinciden.`,
    ),
    guidance: "Puedes tomar en cuenta esta consistencia dentro de tu proceso normal de revisión.",
    boundary: "La consistencia no demuestra que la contraparte sea segura, legítima o confiable, ni recomienda proceder con el pago.",
    tone: "consistent",
  };
}

export function buildNextStepSections(results: ComparisonResult[]): NextStepSection[] {
  const grouped = {
    mismatch: results.filter((result) => result.state === "mismatch"),
    unverified: results.filter((result) => result.state === "unverified"),
    match: results.filter((result) => result.state === "match"),
  };

  return [
    ...(grouped.mismatch.length ? [mismatchSection(grouped.mismatch)] : []),
    ...(grouped.unverified.length ? [unverifiedSection(grouped.unverified)] : []),
    ...(grouped.match.length ? [matchSection(grouped.match)] : []),
  ];
}
