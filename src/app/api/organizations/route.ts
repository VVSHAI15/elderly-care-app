import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";

// POST /api/organizations - Register a new company + admin account
export async function POST(request: NextRequest) {
  try {
    const { companyName, adminName, adminEmail, adminPassword } = await request.json();

    if (!companyName || !adminEmail || !adminPassword || !adminName) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (adminPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    // Create org + admin in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: companyName },
      });

      const admin = await tx.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: adminName,
          role: "ADMIN",
          organizationId: org.id,
        },
      });

      return { org, admin };
    });

    return NextResponse.json({
      organizationId: result.org.id,
      adminId: result.admin.id,
      message: "Organization created successfully",
    });
  } catch (error) {
    console.error("Organization creation error:", error);
    return NextResponse.json({ error: "Failed to create organization" }, { status: 500 });
  }
}
