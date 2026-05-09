import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const existingUsers = await prisma.user.count();

    if (existingUsers > 0) {
      return NextResponse.json(
        { message: "Database already seeded. No action taken." },
        { status: 200 }
      );
    }

    const hashedPassword = await hash("Innavik2024!", 12);

    const user = await prisma.user.create({
      data: {
        email: "turk@innavik.com",
        name: "Turk",
        password: hashedPassword,
        role: "ADMIN",
        active: true,
      },
    });

    return NextResponse.json(
      {
        message: "Seed successful. Admin user created.",
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { message: "Seed failed. See server logs for details." },
      { status: 500 }
    );
  }
}
