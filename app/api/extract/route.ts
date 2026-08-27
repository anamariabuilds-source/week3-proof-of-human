import { NextResponse } from "next/server";
import { z } from "zod";
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/evidence-validation";
import { evidenceSourceSchema } from "@/lib/extraction-schema";
import { extractWithGemini, GeminiConfigurationError } from "@/lib/gemini-extraction";

export const runtime = "nodejs";

function detectedMimeType(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "image/webp";
  return null;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const sourceResult = evidenceSourceSchema.safeParse(formData.get("sourceType"));
    const image = formData.get("image");

    if (!sourceResult.success || !(image instanceof File)) {
      return NextResponse.json({ error: "Solicitud de extracción inválida." }, { status: 400 });
    }

    if (
      !ACCEPTED_IMAGE_TYPES.includes(image.type as (typeof ACCEPTED_IMAGE_TYPES)[number]) ||
      image.size === 0 ||
      image.size > MAX_IMAGE_BYTES ||
      image.name.length > 120
    ) {
      return NextResponse.json({ error: "La imagen debe ser JPG, PNG o WebP y pesar 4 MB o menos." }, { status: 400 });
    }

    const bytes = new Uint8Array(await image.arrayBuffer());
    if (detectedMimeType(bytes) !== image.type) {
      return NextResponse.json({ error: "El contenido del archivo no coincide con un formato de imagen permitido." }, { status: 400 });
    }

    const extraction = await extractWithGemini(sourceResult.data, bytes, image.type);
    return NextResponse.json(extraction, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof GeminiConfigurationError) {
      return NextResponse.json({ error: "La extracción no está configurada. Puedes capturar los datos manualmente." }, { status: 503 });
    }
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return NextResponse.json({ error: "La respuesta de extracción no fue válida. Revisa los datos manualmente." }, { status: 502 });
    }
    return NextResponse.json({ error: "No pudimos extraer la información. Puedes revisarla y capturarla manualmente." }, { status: 502 });
  }
}
