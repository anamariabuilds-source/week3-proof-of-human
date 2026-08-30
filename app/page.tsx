"use client";

import { ChangeEvent, ReactNode, useState } from "react";
import {
  EvidenceFields,
  hasAtLeastOneValue,
  validateBankName,
  validateClabe,
  validateImage,
  validateName,
  validateRfc,
} from "@/lib/evidence-validation";
import {
  EvidenceSource,
  ExtractionResult,
  parseExtractionResponse,
} from "@/lib/extraction-schema";
import {
  ComparisonResult,
  buildComparisonResults,
} from "@/lib/evidence-comparison";
import {
  NextStepSection,
  buildNextStepSections,
  comparisonPresentation,
  decisionOptions,
  summarizeResults,
} from "@/lib/result-guidance";

type FileSelection = { file: File | null; error: string | null };
type OptionalChoice = "pending" | "add" | "skip";
type BankChoice = "pending" | "manual" | "screenshot" | "skip";
type ExtractionUiState = { status: "idle" | "loading" | "success" | "error"; message: string | null };

const emptyFile: FileSelection = { file: null, error: null };
const idleExtraction: ExtractionUiState = { status: "idle", message: null };
const initialWhatsApp = { displayedName: "", rfc: "", bank: "", clabe: "" };
const initialFiscal = { legalName: "", rfc: "" };
const initialBank = { beneficiaryName: "", bank: "", clabe: "" };

const steps = [
  { title: "WhatsApp", badge: "Requerida", optional: false },
  { title: "Fiscal", badge: "Opcional", optional: true },
  { title: "Banco", badge: "Opcional", optional: true },
  { title: "Resultados", badge: "Comparación", optional: false },
] as const;

function FileInput({
  id,
  label,
  selection,
  onSelect,
}: {
  id: string;
  label: string;
  selection: FileSelection;
  onSelect: (selection: FileSelection) => void;
}) {
  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const error = validateImage(file);
    onSelect(error ? { file: null, error } : { file, error: null });
    if (error) event.target.value = "";
  }

  return (
    <div>
      <label className="block text-sm font-bold" htmlFor={id}>
        {label}
      </label>
      <input
        accept="image/jpeg,image/png,image/webp"
        aria-describedby={`${id}-help ${selection.error ? `${id}-error` : ""}`}
        className="mt-2 block w-full rounded-xl border border-ink/20 bg-white p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-mint file:px-3 file:py-2 file:font-bold file:text-jade"
        id={id}
        onChange={handleFile}
        type="file"
      />
      <p className="mt-2 text-xs leading-5 text-ink/55" id={`${id}-help`}>
        Una imagen JPG, PNG o WebP de máximo 4 MB. No se guarda al salir o recargar.
      </p>
      {selection.file && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-mint px-3 py-2 text-sm">
          <span className="min-w-0 truncate font-semibold">{selection.file.name}</span>
          <button className="shrink-0 font-bold text-jade underline" onClick={() => onSelect(emptyFile)} type="button">
            Quitar
          </button>
        </div>
      )}
      {selection.error && (
        <p className="mt-2 text-sm font-semibold text-red-700" id={`${id}-error`} role="alert">
          {selection.error}
        </p>
      )}
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  validate,
  hint,
  inputMode,
  maxLength,
  multiline = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  validate: (value: string) => string | null;
  hint?: string;
  inputMode?: "text" | "numeric";
  maxLength: number;
  multiline?: boolean;
}) {
  const error = validate(value);
  return (
    <div>
      <label className="text-sm font-bold" htmlFor={id}>
        {label} <span className="font-normal text-ink/45">(si aparece)</span>
      </label>
      {multiline ? (
        <textarea
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          aria-invalid={Boolean(error)}
          className="mt-2 min-h-24 w-full resize-y rounded-xl border border-ink/20 bg-white px-3 py-3 text-base outline-none transition focus:border-jade focus:ring-2 focus:ring-jade/15"
          id={id}
          maxLength={maxLength}
          onChange={(event) => onChange(event.target.value)}
          rows={3}
          value={value}
        />
      ) : (
        <input
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          aria-invalid={Boolean(error)}
          className="mt-2 min-h-12 w-full rounded-xl border border-ink/20 bg-white px-3 text-base outline-none transition focus:border-jade focus:ring-2 focus:ring-jade/15"
          id={id}
          inputMode={inputMode}
          maxLength={maxLength}
          onChange={(event) => onChange(event.target.value)}
          type="text"
          value={value}
        />
      )}
      {hint && !error && (
        <p className="mt-1 text-xs text-ink/50" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="mt-1 text-xs font-semibold text-red-700" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

function ReviewConfirmation({
  id,
  checked,
  onChange,
  source,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  source: string;
}) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-xl border border-jade/20 bg-mint p-3 text-sm leading-5" htmlFor={id}>
      <input
        checked={checked}
        className="mt-0.5 size-5 accent-jade"
        id={id}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>
        Revisé y corregí los datos que capturé de <strong>{source}</strong>.
      </span>
    </label>
  );
}

function ChoiceButton({ selected, children, onClick }: { selected: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      aria-pressed={selected}
      className={`min-h-12 rounded-xl border px-4 text-left text-sm font-bold transition ${
        selected ? "border-jade bg-mint text-jade" : "border-ink/15 bg-white hover:border-jade/40"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function ExtractionPanel({
  sourceType,
  file,
  fictionalConfirmed,
  state,
  onExtract,
}: {
  sourceType: EvidenceSource;
  file: File;
  fictionalConfirmed: boolean;
  state: ExtractionUiState;
  onExtract: (sourceType: EvidenceSource, file: File) => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-amber/60 bg-amber/15 p-3 text-sm leading-5">
      <p>
        <strong>Antes de extraer:</strong> esta imagen ficticia se enviará a Google Gemini para transcribir únicamente los campos permitidos. No se usa para emitir juicios.
      </p>
      <p className="text-xs text-ink/65">En el nivel gratuito, Google puede usar entradas y respuestas para mejorar sus productos. No envíes datos reales, personales, sensibles ni confidenciales.</p>
      <button
        className="min-h-11 w-full rounded-xl bg-ink px-4 font-bold text-white disabled:cursor-not-allowed disabled:bg-ink/30"
        disabled={!fictionalConfirmed || state.status === "loading"}
        onClick={() => onExtract(sourceType, file)}
        type="button"
      >
        {state.status === "loading" ? "Extrayendo…" : state.status === "success" ? "Volver a extraer" : "Extraer campos con Gemini"}
      </button>
      {!fictionalConfirmed && <p className="text-xs text-ink/60">Confirma primero que la imagen contiene solo datos ficticios.</p>}
      {state.message && (
        <p className={state.status === "error" ? "font-semibold text-red-700" : "font-semibold text-jade"} role="status">
          {state.message}
        </p>
      )}
      <p className="text-xs text-ink/60">Si un dato queda vacío o la extracción falla, puedes capturarlo manualmente. Revisa y corrige todo antes de continuar.</p>
    </div>
  );
}

function ValidationMessage({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">
      {children}
    </p>
  );
}

export default function Home() {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);
  const [decisionAnswer, setDecisionAnswer] = useState<string>("");

  const [whatsAppFile, setWhatsAppFile] = useState<FileSelection>(emptyFile);
  const [whatsAppFields, setWhatsAppFields] = useState(initialWhatsApp);
  const [whatsAppFictional, setWhatsAppFictional] = useState(false);
  const [whatsAppReviewed, setWhatsAppReviewed] = useState(false);
  const [whatsAppExtraction, setWhatsAppExtraction] = useState<ExtractionUiState>(idleExtraction);

  const [fiscalChoice, setFiscalChoice] = useState<OptionalChoice>("pending");
  const [fiscalFile, setFiscalFile] = useState<FileSelection>(emptyFile);
  const [fiscalFields, setFiscalFields] = useState(initialFiscal);
  const [fiscalFictional, setFiscalFictional] = useState(false);
  const [fiscalReviewed, setFiscalReviewed] = useState(false);
  const [fiscalExtraction, setFiscalExtraction] = useState<ExtractionUiState>(idleExtraction);

  const [bankChoice, setBankChoice] = useState<BankChoice>("pending");
  const [bankFile, setBankFile] = useState<FileSelection>(emptyFile);
  const [bankFields, setBankFields] = useState(initialBank);
  const [bankFictional, setBankFictional] = useState(false);
  const [bankReviewed, setBankReviewed] = useState(false);
  const [bankExtraction, setBankExtraction] = useState<ExtractionUiState>(idleExtraction);

  function extractionSetter(sourceType: EvidenceSource) {
    if (sourceType === "whatsapp") return setWhatsAppExtraction;
    if (sourceType === "fiscal") return setFiscalExtraction;
    return setBankExtraction;
  }

  function applyExtraction(result: ExtractionResult) {
    if (result.sourceType === "whatsapp") {
      setWhatsAppFields((current) => ({
        displayedName: result.fields.displayedName.value ?? current.displayedName,
        rfc: result.fields.rfc.value ?? current.rfc,
        bank: result.fields.bankName.value ?? current.bank,
        clabe: result.fields.clabe.value ?? current.clabe,
      }));
      setWhatsAppReviewed(false);
      return Object.values(result.fields).filter((field) => field.state === "extracted").length;
    }

    if (result.sourceType === "fiscal") {
      setFiscalFields((current) => ({
        legalName: result.fields.legalName.value ?? current.legalName,
        rfc: result.fields.rfc.value ?? current.rfc,
      }));
      setFiscalReviewed(false);
      return Object.values(result.fields).filter((field) => field.state === "extracted").length;
    }

    setBankFields((current) => ({
      beneficiaryName: result.fields.beneficiaryName.value ?? current.beneficiaryName,
      bank: result.fields.bankName.value ?? current.bank,
      clabe: result.fields.clabe.value ?? current.clabe,
    }));
    setBankReviewed(false);
    return Object.values(result.fields).filter((field) => field.state === "extracted").length;
  }

  async function extractImage(sourceType: EvidenceSource, file: File) {
    const setExtraction = extractionSetter(sourceType);
    setExtraction({ status: "loading", message: null });

    try {
      const formData = new FormData();
      formData.append("sourceType", sourceType);
      formData.append("image", file);
      const response = await fetch("/api/extract", { method: "POST", body: formData });
      const payload: unknown = await response.json();

      if (!response.ok) {
        const message = typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string"
          ? payload.error
          : "No pudimos extraer la información. Captúrala manualmente.";
        setExtraction({ status: "error", message });
        return;
      }

      const result = parseExtractionResponse(sourceType, payload);
      const extractedCount = applyExtraction(result);
      setExtraction({
        status: "success",
        message: extractedCount > 0
          ? `Gemini llenó ${extractedCount} ${extractedCount === 1 ? "campo" : "campos"}. Lo demás quedó vacío; revisa y corrige todo.`
          : "No se identificaron campos legibles. Nada se adivinó; captura lo que puedas revisar manualmente.",
      });
    } catch {
      setExtraction({ status: "error", message: "No pudimos extraer la información. Puedes revisarla y capturarla manualmente." });
    }
  }

  function selectWhatsAppFile(selection: FileSelection) {
    setWhatsAppFile(selection);
    setWhatsAppExtraction(idleExtraction);
    setWhatsAppReviewed(false);
  }

  function selectFiscalFile(selection: FileSelection) {
    setFiscalFile(selection);
    setFiscalExtraction(idleExtraction);
    setFiscalReviewed(false);
  }

  function selectBankFile(selection: FileSelection) {
    setBankFile(selection);
    setBankExtraction(idleExtraction);
    setBankReviewed(false);
  }

  function updateField<T extends EvidenceFields>(fields: T, setter: (value: T) => void, key: keyof T, value: string) {
    setter({ ...fields, [key]: value });
  }

  function fieldsAreValid(fields: EvidenceFields, validators: Record<string, (value: string) => string | null>) {
    return Object.entries(fields).every(([key, value]) => !validators[key](value));
  }

  function validateCurrentStep(): string | null {
    if (currentStep === 0) {
      if (!whatsAppFile.file) return "Agrega la captura ficticia de WhatsApp para continuar.";
      if (!whatsAppFictional) return "Confirma que la captura contiene únicamente datos ficticios.";
      if (!hasAtLeastOneValue(whatsAppFields)) return "Captura al menos un dato visible en las instrucciones de pago.";
      if (!fieldsAreValid(whatsAppFields, { displayedName: validateName, rfc: validateRfc, bank: validateBankName, clabe: validateClabe })) {
        return "Corrige los campos marcados antes de continuar.";
      }
      if (!whatsAppReviewed) return "Confirma que revisaste los datos capturados de WhatsApp.";
    }

    if (currentStep === 1) {
      if (fiscalChoice === "pending") return "Elige agregar el documento fiscal o continuar sin él.";
      if (fiscalChoice === "add") {
        if (!fiscalFile.file) return "Agrega una imagen del documento fiscal ficticio.";
        if (!fiscalFictional) return "Confirma que el documento fiscal contiene únicamente datos ficticios.";
        if (!hasAtLeastOneValue(fiscalFields)) return "Captura al menos un dato visible en el documento fiscal.";
        if (!fieldsAreValid(fiscalFields, { legalName: validateName, rfc: validateRfc })) return "Corrige los campos marcados antes de continuar.";
        if (!fiscalReviewed) return "Confirma que revisaste los datos del documento fiscal.";
      }
    }

    if (currentStep === 2) {
      if (bankChoice === "pending") return "Elige cómo agregar información bancaria o continúa sin ella.";
      if (bankChoice === "screenshot" && !bankFile.file) return "Agrega una captura ficticia de la app bancaria.";
      if (bankChoice === "screenshot" && !bankFictional) return "Confirma que la captura bancaria contiene únicamente datos ficticios.";
      if (bankChoice !== "skip") {
        if (!hasAtLeastOneValue(bankFields)) return "Captura al menos un dato de la fuente bancaria elegida.";
        if (!fieldsAreValid(bankFields, { beneficiaryName: validateName, bank: validateBankName, clabe: validateClabe })) {
          return "Corrige los campos marcados antes de continuar.";
        }
        if (!bankReviewed) return "Confirma que revisaste la información bancaria capturada.";
      }
    }

    return null;
  }

  function goNext() {
    const error = validateCurrentStep();
    setStepError(error);
    if (!error) setCurrentStep((value) => Math.min(value + 1, steps.length - 1));
  }

  function goBack() {
    setStepError(null);
    setCurrentStep((value) => Math.max(value - 1, 0));
  }

  const step = steps[currentStep];
  const comparisonResults = buildComparisonResults({
    whatsapp: {
      displayedName: whatsAppFields.displayedName,
      rfc: whatsAppFields.rfc,
      bankName: whatsAppFields.bank,
      clabe: whatsAppFields.clabe,
    },
    fiscal: fiscalChoice === "add" ? fiscalFields : undefined,
    bank: bankChoice === "manual" || bankChoice === "screenshot"
      ? {
          beneficiaryName: bankFields.beneficiaryName,
          bankName: bankFields.bank,
          clabe: bankFields.clabe,
          sourceName: bankChoice === "manual" ? "Información bancaria capturada manualmente" : "Captura ficticia de app bancaria",
        }
      : undefined,
  });
  const resultSummary = summarizeResults(comparisonResults);
  const nextStepSections = buildNextStepSections(comparisonResults);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-6 sm:py-10">
      <header className="mb-7">
        <div className="mb-5 flex items-center justify-between gap-3">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-jade">Antes de transferir</p>
          <span className="rounded-full border border-ink/15 bg-white/70 px-3 py-1 text-xs font-semibold">Prototipo · datos ficticios</span>
        </div>
        <h1 className="max-w-sm text-4xl font-semibold leading-[1.05] tracking-[-0.04em]">Compara lo que tienes a la mano.</h1>
        <p className="mt-4 text-base leading-7 text-ink/70">
          Después de recibir instrucciones de pago por WhatsApp y antes de autorizar una transferencia bancaria.
        </p>
      </header>

      <aside className="mb-6 rounded-2xl border border-jade/20 bg-mint p-4" aria-label="Límites del prototipo">
        <p className="text-sm font-bold text-jade">Lo que hace este prototipo</p>
        <p className="mt-1 text-sm leading-6 text-ink/75">
          Compara la información disponible. No determina si una contraparte es segura, confiable o fraudulenta.
        </p>
      </aside>

      <section className="flex flex-1 flex-col rounded-[2rem] border border-ink/10 bg-white p-5 shadow-card sm:p-6">
        <div className="flex items-center gap-2" aria-label={`Paso ${currentStep + 1} de ${steps.length}`}>
          {steps.map((item, index) => (
            <span className={`h-1.5 flex-1 rounded-full ${index <= currentStep ? "bg-jade" : "bg-ink/10"}`} key={item.title} />
          ))}
        </div>

        <div className="mt-8 flex flex-1 flex-col">
          <div className="flex items-start justify-between gap-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-jade">Paso {currentStep + 1} · {step.title}</p>
            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${step.optional ? "bg-mint text-jade" : "bg-jade text-white"}`}>
              {step.badge}
            </span>
          </div>

          {currentStep === 0 && (
            <div className="mt-5 space-y-5">
              <div>
                <h2 className="text-2xl font-semibold tracking-[-0.025em]">Instrucciones de WhatsApp</h2>
                <p className="mt-2 text-sm leading-6 text-ink/65">Esta captura inicia la revisión y es la única evidencia requerida.</p>
              </div>
              <FileInput id="whatsapp-file" label="Captura ficticia de WhatsApp" onSelect={selectWhatsAppFile} selection={whatsAppFile} />
              <label className="flex gap-3 text-sm leading-5" htmlFor="whatsapp-fictional">
                <input checked={whatsAppFictional} className="mt-0.5 size-5 accent-jade" id="whatsapp-fictional" onChange={(event) => setWhatsAppFictional(event.target.checked)} type="checkbox" />
                Confirmo que esta imagen usa únicamente información ficticia o de demostración.
              </label>
              {whatsAppFile.file && (
                <div className="space-y-4 border-t border-ink/10 pt-5">
                  <ExtractionPanel file={whatsAppFile.file} fictionalConfirmed={whatsAppFictional} onExtract={extractImage} sourceType="whatsapp" state={whatsAppExtraction} />
                  <TextField id="wa-name" label="Nombre mostrado o negocio" maxLength={100} onChange={(value) => updateField(whatsAppFields, setWhatsAppFields, "displayedName", value)} validate={validateName} value={whatsAppFields.displayedName} />
                  <TextField id="wa-rfc" label="RFC" maxLength={13} onChange={(value) => updateField(whatsAppFields, setWhatsAppFields, "rfc", value.toUpperCase())} validate={validateRfc} value={whatsAppFields.rfc} />
                  <TextField id="wa-bank" label="Banco indicado" maxLength={60} onChange={(value) => updateField(whatsAppFields, setWhatsAppFields, "bank", value)} validate={validateBankName} value={whatsAppFields.bank} />
                  <TextField id="wa-clabe" inputMode="numeric" label="CLABE" maxLength={18} onChange={(value) => updateField(whatsAppFields, setWhatsAppFields, "clabe", value.replace(/\D/g, ""))} validate={validateClabe} value={whatsAppFields.clabe} />
                  <ReviewConfirmation checked={whatsAppReviewed} id="whatsapp-reviewed" onChange={setWhatsAppReviewed} source="la captura de WhatsApp" />
                </div>
              )}
            </div>
          )}

          {currentStep === 1 && (
            <div className="mt-5 space-y-5">
              <div>
                <h2 className="text-2xl font-semibold tracking-[-0.025em]">Documento fiscal</h2>
                <p className="mt-2 text-sm leading-6 text-ink/65">Es opcional. No tenerlo no cuenta como señal negativa.</p>
              </div>
              <div className="grid gap-3">
                <ChoiceButton onClick={() => { setFiscalChoice("add"); setStepError(null); }} selected={fiscalChoice === "add"}>Agregar imagen del documento</ChoiceButton>
                <ChoiceButton onClick={() => { setFiscalChoice("skip"); setStepError(null); }} selected={fiscalChoice === "skip"}>No agregar por ahora</ChoiceButton>
              </div>
              {fiscalChoice === "skip" && <p className="rounded-xl bg-paper p-3 text-sm leading-5 text-ink/65">Puedes continuar. La ausencia de este documento permanece como información no disponible, no como algo sospechoso.</p>}
              {fiscalChoice === "add" && (
                <div className="space-y-4 border-t border-ink/10 pt-5">
                  <FileInput id="fiscal-file" label="Imagen de documento fiscal ficticio" onSelect={selectFiscalFile} selection={fiscalFile} />
                  <label className="flex gap-3 text-sm leading-5" htmlFor="fiscal-fictional">
                    <input checked={fiscalFictional} className="mt-0.5 size-5 accent-jade" id="fiscal-fictional" onChange={(event) => setFiscalFictional(event.target.checked)} type="checkbox" />
                    Confirmo que el documento usa únicamente información ficticia o de demostración.
                  </label>
                  {fiscalFile.file && (
                    <>
                      <div className="rounded-xl border border-amber/60 bg-amber/15 p-3 text-sm leading-5"><strong>Fuente: documento aportado.</strong> Estos datos no están verificados ni autenticados por el SAT.</div>
                      <ExtractionPanel file={fiscalFile.file} fictionalConfirmed={fiscalFictional} onExtract={extractImage} sourceType="fiscal" state={fiscalExtraction} />
                      <TextField id="fiscal-name" label="Razón social o nombre legal" maxLength={100} multiline onChange={(value) => updateField(fiscalFields, setFiscalFields, "legalName", value)} validate={validateName} value={fiscalFields.legalName} />
                      <TextField id="fiscal-rfc" label="RFC" maxLength={13} onChange={(value) => updateField(fiscalFields, setFiscalFields, "rfc", value.toUpperCase())} validate={validateRfc} value={fiscalFields.rfc} />
                      <ReviewConfirmation checked={fiscalReviewed} id="fiscal-reviewed" onChange={setFiscalReviewed} source="el documento aportado (sin verificación SAT)" />
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {currentStep === 2 && (
            <div className="mt-5 space-y-5">
              <div>
                <h2 className="text-2xl font-semibold tracking-[-0.025em]">Información bancaria</h2>
                <p className="mt-2 text-sm leading-6 text-ink/65">Es opcional. Elige una fuente o continúa sin agregarla.</p>
              </div>
              <div className="grid gap-3">
                <ChoiceButton onClick={() => { setBankChoice("manual"); setStepError(null); }} selected={bankChoice === "manual"}>Capturar manualmente: beneficiario, banco y CLABE</ChoiceButton>
                <ChoiceButton onClick={() => { setBankChoice("screenshot"); setStepError(null); }} selected={bankChoice === "screenshot"}>Agregar captura de app bancaria</ChoiceButton>
                <ChoiceButton onClick={() => { setBankChoice("skip"); setStepError(null); }} selected={bankChoice === "skip"}>No agregar por ahora</ChoiceButton>
              </div>
              {bankChoice === "skip" && <p className="rounded-xl bg-paper p-3 text-sm leading-5 text-ink/65">Puedes continuar. No agregar información bancaria no crea una alerta ni un juicio negativo.</p>}
              {(bankChoice === "manual" || bankChoice === "screenshot") && (
                <div className="space-y-4 border-t border-ink/10 pt-5">
                  {bankChoice === "screenshot" && (
                    <>
                      <FileInput id="bank-file" label="Captura ficticia de app bancaria" onSelect={selectBankFile} selection={bankFile} />
                      <label className="flex gap-3 text-sm leading-5" htmlFor="bank-fictional">
                        <input checked={bankFictional} className="mt-0.5 size-5 accent-jade" id="bank-fictional" onChange={(event) => setBankFictional(event.target.checked)} type="checkbox" />
                        Confirmo que esta imagen usa únicamente información ficticia o de demostración.
                      </label>
                    </>
                  )}
                  {(bankChoice === "manual" || bankFile.file) && (
                    <>
                      <div className="rounded-xl border border-amber/60 bg-amber/15 p-3 text-sm leading-5"><strong>Fuente: {bankChoice === "manual" ? "captura manual del usuario" : "captura bancaria aportada"}.</strong> Esto no verifica de forma independiente quién es titular de la cuenta.</div>
                      {bankChoice === "screenshot" && bankFile.file && <ExtractionPanel file={bankFile.file} fictionalConfirmed={bankFictional} onExtract={extractImage} sourceType="bank" state={bankExtraction} />}
                      <TextField id="bank-beneficiary" label="Nombre de beneficiario mostrado" maxLength={100} onChange={(value) => updateField(bankFields, setBankFields, "beneficiaryName", value)} validate={validateName} value={bankFields.beneficiaryName} />
                      <TextField id="bank-name" label="Banco" maxLength={60} onChange={(value) => updateField(bankFields, setBankFields, "bank", value)} validate={validateBankName} value={bankFields.bank} />
                      <TextField id="bank-clabe" inputMode="numeric" label="CLABE" maxLength={18} onChange={(value) => updateField(bankFields, setBankFields, "clabe", value.replace(/\D/g, ""))} validate={validateClabe} value={bankFields.clabe} />
                      <ReviewConfirmation checked={bankReviewed} id="bank-reviewed" onChange={setBankReviewed} source={bankChoice === "manual" ? "la información capturada manualmente" : "la captura bancaria"} />
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="mt-5 space-y-5">
              <div>
                <h2 className="text-2xl font-semibold tracking-[-0.025em]">Relaciones entre tus fuentes</h2>
                <p className="mt-2 text-sm leading-6 text-ink/65">Comparamos únicamente los valores que revisaste y corregiste. Gemini no decide estos resultados.</p>
              </div>
              <div className="rounded-xl border border-ink/10 bg-paper p-4 text-sm leading-6 text-ink/70">
                <strong>Sin veredicto:</strong> estos resultados no determinan confianza, seguridad, fraude, legitimidad ni riesgo. La decisión de pago permanece contigo y ocurre fuera del prototipo.
              </div>
              <div className="grid grid-cols-3 gap-2" aria-label="Resumen de relaciones">
                <SummaryCount count={resultSummary.mismatch} label="No coincide" style="border-rose-300 bg-rose-50 text-rose-800" />
                <SummaryCount count={resultSummary.unverified} label="No verificado" style="border-amber/70 bg-amber/10 text-ink" />
                <SummaryCount count={resultSummary.match} label="Coincide" style="border-jade/25 bg-mint/60 text-jade" />
              </div>
              <div className="space-y-4">
                {comparisonResults.map((result) => <ComparisonCard key={result.id} result={result} />)}
              </div>
              <section className="space-y-4 border-t border-ink/10 pt-5" aria-labelledby="next-steps-title">
                <div>
                  <h2 className="text-xl font-semibold tracking-[-0.02em]" id="next-steps-title">¿Qué puedes hacer ahora?</h2>
                  <p className="mt-2 text-sm leading-6 text-ink/65">Estas son opciones neutrales según las relaciones mostradas; no son una orden de aprobar o rechazar el pago.</p>
                </div>
                {nextStepSections.map((section) => <NextStepCard key={section.state} section={section} />)}
              </section>
              <aside className="rounded-xl border border-ink/10 bg-paper p-4 text-xs leading-5 text-ink/65" aria-label="Límites de las fuentes">
                <p className="font-bold text-ink">Lo que estas fuentes no verifican</p>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  <li>El documento fiscal fue aportado y sus datos no están verificados por el SAT.</li>
                  <li>La información bancaria no verifica de forma autoritativa quién es titular de la cuenta.</li>
                  <li>La captura de WhatsApp no verifica quién es dueño del número.</li>
                  <li>La decisión final de pago permanece contigo.</li>
                </ul>
              </aside>
              <fieldset className="space-y-3 rounded-2xl border border-jade/20 bg-mint/60 p-4">
                <legend className="px-1 text-lg font-bold">Después de revisar esto, ¿qué harías ahora?</legend>
                <p className="text-xs leading-5 text-ink/60">Tu respuesta sirve para probar el prototipo. No ejecuta ninguna acción y no se guarda.</p>
                {decisionOptions.map((option) => (
                  <label className="flex cursor-pointer gap-3 rounded-xl bg-white/80 p-3 text-sm leading-5" htmlFor={`decision-${option.id}`} key={option.id}>
                    <input
                      checked={decisionAnswer === option.id}
                      className="mt-0.5 size-5 accent-jade"
                      id={`decision-${option.id}`}
                      name="next-decision"
                      onChange={() => setDecisionAnswer(option.id)}
                      type="radio"
                      value={option.id}
                    />
                    {option.label}
                  </label>
                ))}
              </fieldset>
              <div className="rounded-xl border border-jade/20 bg-mint p-4 text-sm leading-6 text-ink/75">
                <strong>La decisión sigue siendo tuya.</strong> Este prototipo no envía, aprueba, rechaza, pausa ni bloquea una transferencia.
              </div>
              <div className="rounded-xl bg-paper p-4 text-sm leading-6 text-ink/65">La información y estos resultados viven solo en esta página. Al recargar o cerrar, se eliminan.</div>
            </div>
          )}

          {stepError && <ValidationMessage>{stepError}</ValidationMessage>}
        </div>

        <div className="mt-8 flex items-center gap-3">
          {currentStep > 0 && <button className="min-h-12 rounded-xl border border-ink/20 px-5 text-sm font-bold transition hover:bg-paper" onClick={goBack} type="button">Atrás</button>}
          {currentStep < steps.length - 1 && <button className="min-h-12 flex-1 rounded-xl bg-jade px-5 text-sm font-bold text-white transition hover:bg-jade/90" onClick={goNext} type="button">Continuar</button>}
          {currentStep === steps.length - 1 && <button className="min-h-12 flex-1 rounded-xl bg-ink/15 px-5 text-sm font-bold text-ink/60" disabled type="button">Relaciones mostradas arriba</button>}
        </div>
      </section>

      <footer className="px-3 pb-2 pt-6 text-center text-xs leading-5 text-ink/50">No envía, aprueba, rechaza, pausa ni bloquea transferencias.</footer>
    </main>
  );
}

const comparisonStyles: Record<ComparisonResult["state"], string> = {
  mismatch: "border-rose-300 bg-rose-50",
  unverified: "border-amber/70 bg-amber/10",
  match: "border-jade/25 bg-mint/60",
};

function SummaryCount({ count, label, style }: { count: number; label: string; style: string }) {
  return (
    <div className={`rounded-xl border px-2 py-3 text-center ${style}`}>
      <p className="text-2xl font-bold leading-none">{count}</p>
      <p className="mt-2 text-[0.68rem] font-bold leading-4">{label}</p>
    </div>
  );
}

const nextStepStyles: Record<NextStepSection["tone"], string> = {
  attention: "border-rose-200 bg-rose-50",
  neutral: "border-amber/60 bg-amber/10",
  consistent: "border-jade/20 bg-mint/50",
};

function NextStepCard({ section }: { section: NextStepSection }) {
  return (
    <article className={`rounded-2xl border p-4 ${nextStepStyles[section.tone]}`}>
      <h3 className="font-bold">{section.title}</h3>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-5 text-ink/75">
        {section.details.map((detail) => <li key={detail}>{detail}</li>)}
      </ul>
      <p className="mt-3 text-sm font-semibold leading-5">{section.guidance}</p>
      <p className="mt-2 text-xs leading-5 text-ink/65">{section.boundary}</p>
    </article>
  );
}

const comparisonBadgeStyles: Record<ComparisonResult["state"], string> = {
  mismatch: "bg-rose-100 text-rose-800",
  unverified: "bg-amber/35 text-ink",
  match: "bg-jade text-white",
};

function ComparisonCard({ result }: { result: ComparisonResult }) {
  const presentation = comparisonPresentation(result);
  const isProportionalNameDifference = presentation.treatment === "proportional-name-difference";
  return (
    <article className={`rounded-2xl border p-4 ${isProportionalNameDifference ? "border-amber/70 bg-amber/10" : comparisonStyles[result.state]}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-bold leading-5">{result.relationship}</h3>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${isProportionalNameDifference ? "bg-amber/35 text-ink" : comparisonBadgeStyles[result.state]}`}>{result.label}</span>
      </div>
      {presentation.nearStateNote && <p className="mt-3 rounded-xl bg-white/70 p-3 text-sm font-semibold leading-5 text-ink/75">{presentation.nearStateNote}</p>}
      <dl className="mt-4 space-y-3 rounded-xl bg-white/70 p-3">
        {[result.sourceA, result.sourceB].map((source) => (
          <div key={source.name}>
            <dt className="text-xs font-bold uppercase tracking-[0.08em] text-ink/50">{source.name}</dt>
            <dd className="mt-1 break-words text-sm font-semibold">{source.value ?? "No disponible"}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm font-semibold leading-5">{result.explanation}</p>
      <p className="mt-2 text-sm leading-5 text-ink/70">{result.boundary}</p>
      {result.limitation && !presentation.nearStateNote && <p className="mt-3 border-t border-ink/10 pt-3 text-xs leading-5 text-ink/60"><strong>Límite:</strong> {result.limitation}</p>}
    </article>
  );
}
