import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Doar administratorul poate vizualiza lista de utilizatori" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      where: { role: { not: "ADMIN" } },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Fetch users error:", error);
    return NextResponse.json({ error: "Eroare la preluarea utilizatorilor" }, { status: 500 });
  }
}
