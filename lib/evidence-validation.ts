export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type EvidenceFields = Record<string, string>;

export function validateImage(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    return "Usa una imagen JPG, PNG o WebP.";
  }

  if (file.size === 0) {
    return "El archivo está vacío.";
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return "La imagen debe pesar 4 MB o menos.";
  }

  if (file.name.length > 120) {
    return "El nombre del archivo es demasiado largo.";
  }

  return null;
}

export function validateName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length < 2) return "Escribe al menos 2 caracteres.";
  if (trimmed.length > 100) return "Usa 100 caracteres o menos.";
  return null;
}

export function validateBankName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length < 2) return "Escribe al menos 2 caracteres.";
  if (trimmed.length > 60) return "Usa 60 caracteres o menos.";
  return null;
}

export function validateRfc(value: string): string | null {
  const normalized = value.trim().toUpperCase();
  if (!normalized) return null;
  if (!/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(normalized)) {
    return "Usa un RFC de 12 o 13 caracteres, sin espacios ni guiones.";
  }
  return null;
}

export function validateClabe(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{18}$/.test(trimmed)) return "La CLABE debe tener exactamente 18 dígitos.";
  return null;
}

export function hasAtLeastOneValue(fields: EvidenceFields): boolean {
  return Object.values(fields).some((value) => value.trim().length > 0);
}
