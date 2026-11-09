import { NextResponse } from "next/server";
import { clearSessionCookie, getSession } from "@/lib/auth";

/**
 * ENDPOINT: `POST /api/auth/logout`
 * Elimina la cookie `httpOnly` de sesión para cerrar la sesión del usuario de forma segura.
 */
export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({
    status: "success",
    message: "Sesión cerrada exitosamente.",
  });
}

/**
 * ENDPOINT: `GET /api/auth/logout` (o consulta de sesión activa)
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, session });
}

