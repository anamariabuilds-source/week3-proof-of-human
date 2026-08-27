"use client";

import { useState } from "react";

const steps = [
  {
    eyebrow: "Evidencia requerida",
    title: "Instrucciones de WhatsApp",
    description: "Agregarás una captura ficticia con las instrucciones de pago que recibiste.",
    badge: "Requerida",
    badgeStyle: "bg-jade text-white",
  },
  {
    eyebrow: "Evidencia adicional",
    title: "Documento fiscal",
    description: "Podrás agregar un documento fiscal ficticio si lo tienes disponible.",
    badge: "Opcional",
    badgeStyle: "bg-mint text-jade",
  },
  {
    eyebrow: "Evidencia adicional",
    title: "Información bancaria",
    description: "Podrás capturarla manualmente o agregar una captura ficticia de una app bancaria.",
    badge: "Opcional",
    badgeStyle: "bg-mint text-jade",
  },
  {
    eyebrow: "Antes de transferir",
    title: "Revisar la información disponible",
    description: "Más adelante podrás revisar las fuentes y decidir qué hacer antes de autorizar la transferencia.",
    badge: "Tu decisión",
    badgeStyle: "bg-amber text-ink",
  },
] as const;

export default function Home() {
  const [currentStep, setCurrentStep] = useState(0);
  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-6 sm:py-10">
      <header className="mb-7">
        <div className="mb-5 flex items-center justify-between gap-3">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-jade">Antes de transferir</p>
          <span className="rounded-full border border-ink/15 bg-white/70 px-3 py-1 text-xs font-semibold">
            Prototipo · datos ficticios
          </span>
        </div>
        <h1 className="max-w-sm text-4xl font-semibold leading-[1.05] tracking-[-0.04em]">
          Compara lo que tienes a la mano.
        </h1>
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
            <span
              className={`h-1.5 flex-1 rounded-full ${index <= currentStep ? "bg-jade" : "bg-ink/10"}`}
              key={item.title}
            />
          ))}
        </div>

        <div className="mt-8 flex flex-1 flex-col">
          <div className="flex items-start justify-between gap-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-jade">{step.eyebrow}</p>
            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${step.badgeStyle}`}>
              {step.badge}
            </span>
          </div>
          <h2 className="mt-4 text-2xl font-semibold tracking-[-0.025em]">{step.title}</h2>
          <p className="mt-3 text-base leading-7 text-ink/65">{step.description}</p>

          <div className="mt-8 rounded-2xl border border-dashed border-ink/20 bg-paper/60 p-5 text-center">
            <p className="text-sm font-semibold">Esta función se agregará en el siguiente incremento.</p>
            <p className="mt-1 text-xs leading-5 text-ink/55">En este commit solo puedes recorrer el flujo local.</p>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-3">
          {currentStep > 0 && (
            <button
              className="min-h-12 rounded-xl border border-ink/20 px-5 text-sm font-bold transition hover:bg-paper"
              onClick={() => setCurrentStep((value) => value - 1)}
              type="button"
            >
              Atrás
            </button>
          )}
          <button
            className="min-h-12 flex-1 rounded-xl bg-jade px-5 text-sm font-bold text-white transition hover:bg-jade/90 disabled:cursor-not-allowed disabled:bg-ink/25"
            disabled={isLastStep}
            onClick={() => setCurrentStep((value) => Math.min(value + 1, steps.length - 1))}
            type="button"
          >
            {isLastStep ? "Fin del flujo de muestra" : "Continuar"}
          </button>
        </div>
      </section>

      <footer className="px-3 pb-2 pt-6 text-center text-xs leading-5 text-ink/50">
        No envía, aprueba, rechaza, pausa ni bloquea transferencias.
      </footer>
    </main>
  );
}
