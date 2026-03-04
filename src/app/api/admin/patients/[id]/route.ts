import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import prisma from "@/lib/db";
import nodemailer from "nodemailer";
import { updatePatientCareProfile } from "@/lib/care-profile-update";

function generateCode(length = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// GET /api/admin/patients/[id] - Get patient detail
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN" || !session.user.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [patient, pendingInvites] = await Promise.all([
    prisma.patient.findFirst({
      where: { id, organizationId: session.user.organizationId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        familyMembers: { select: { id: true, name: true, email: true, role: true } },
        medications: { where: { isActive: true }, select: { id: true, name: true, refillDate: true } },
        _count: { select: { tasks: true, documents: true, shifts: true, healthMetrics: true } },
      },
    }),
    prisma.inviteCode.findMany({
      where: { patientId: id, inviteType: "FAMILY", usedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, targetEmail: true, expiresAt: true, createdAt: true },
    }),
  ]);

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  return NextResponse.json({
    patientId: patient.id,
    userId: patient.user.id,
    name: patient.user.name,
    email: patient.user.email,
    dateOfBirth: patient.dateOfBirth,
    medicalNotes: patient.medicalNotes,
    emergencyContact: patient.emergencyContact,
    familyMembers: patient.familyMembers,
    pendingFamilyInvites: pendingInvites,
    visibility: {
      tasks: patient.familyCanViewTasks,
      meds: patient.familyCanViewMeds,
      metrics: patient.familyCanViewMetrics,
      shifts: patient.familyCanViewShifts,
    },
    counts: patient._count,
    // Care profile fields
    dischargeInfo: patient.dischargeInfo,
    exerciseGuidelines: patient.exerciseGuidelines,
    dietRestrictions: patient.dietRestrictions,
    warningSigns: patient.warningSigns,
    careContacts: patient.careContacts,
    followUpAppointments: patient.followUpAppointments,
    allergies: (patient as Record<string, unknown>).allergies ?? null,
    conditions: (patient as Record<string, unknown>).conditions ?? null,
    healthHistory: (patient as Record<string, unknown>).healthHistory ?? null,
    illnessHistory: (patient as Record<string, unknown>).illnessHistory ?? null,
  });
}

// PATCH /api/admin/patients/[id] - Update patient: assign caregiver, visibility, or info
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN" || !session.user.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const patient = await prisma.patient.findFirst({
    where: { id, organizationId: session.user.organizationId },
  });
  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  // Assign caregiver
  if (body.assignCaregiverId) {
    const caregiver = await prisma.user.findFirst({
      where: { id: body.assignCaregiverId, organizationId: session.user.organizationId, role: "CAREGIVER" },
    });
    if (!caregiver) {
      return NextResponse.json({ error: "Caregiver not found in this organization" }, { status: 404 });
    }
    await prisma.patient.update({
      where: { id },
      data: { familyMembers: { connect: { id: body.assignCaregiverId } } },
    });
    return NextResponse.json({ message: "Caregiver assigned" });
  }

  // Unassign caregiver
  if (body.unassignCaregiverId) {
    await prisma.patient.update({
      where: { id },
      data: { familyMembers: { disconnect: { id: body.unassignCaregiverId } } },
    });
    return NextResponse.json({ message: "Caregiver unassigned" });
  }

  // Connect family member via email (or send invite if no account yet)
  if (body.connectFamilyEmail) {
    const email = body.connectFamilyEmail as string;
    const familyUser = await prisma.user.findUnique({ where: { email } });

    if (familyUser) {
      // User exists — connect directly
      await prisma.patient.update({
        where: { id },
        data: { familyMembers: { connect: { id: familyUser.id } } },
      });
      // Update role to FAMILY_MEMBER if they registered as something else that makes sense
      return NextResponse.json({ message: "Family member connected", action: "connected" });
    }

    // No account — create FAMILY invite and send email
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [patientDetail, org] = await Promise.all([
      prisma.patient.findUnique({ where: { id }, include: { user: { select: { name: true } } } }),
      prisma.organization.findUnique({ where: { id: session.user.organizationId! } }),
    ]);

    await prisma.inviteCode.create({
      data: {
        code,
        patientId: id,
        targetEmail: email,
        inviteType: "FAMILY",
        createdBy: session.user.id,
        expiresAt,
      },
    });

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/register?familyInvite=${code}`;

    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      });
      await transporter.sendMail({
        from: `"guardian.ai" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `You've been invited to view ${patientDetail?.user.name ?? "a patient"}'s care on guardian.ai`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2f5f9f;">You've been invited to guardian.ai</h2>
            <p>${org?.name ?? "A care team"} has given you access to view ${patientDetail?.user.name ?? "your family member"}'s care updates, medication adherence, and health trends.</p>
            <p>Click the button below to create your free family account:</p>
            <a href="${inviteUrl}" style="display: inline-block; background: #2f5f9f; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">
              View Care Dashboard
            </a>
            <p style="color: #666; font-size: 14px;">This invite expires in 7 days. If you weren't expecting this, you can ignore this email.</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send family invite email:", emailError);
    }

    return NextResponse.json({ message: "Invite sent", action: "invited" });
  }

  // Update care profile
  if (body.careProfile !== undefined) {
    const cp = body.careProfile as Record<string, unknown>;
    const updateData: Record<string, unknown> = {};
    const fields = ["dischargeInfo", "exerciseGuidelines", "dietRestrictions", "warningSigns",
      "careContacts", "followUpAppointments", "allergies", "conditions", "healthHistory", "illnessHistory"];
    for (const field of fields) {
      if (cp[field] !== undefined) updateData[field] = cp[field];
    }
    await updatePatientCareProfile(id, updateData);
    return NextResponse.json({ message: "Care profile updated" });
  }

  // Update visibility settings
  const visibilityFields: Record<string, keyof typeof patient> = {
    familyCanViewTasks: "familyCanViewTasks",
    familyCanViewMeds: "familyCanViewMeds",
    familyCanViewMetrics: "familyCanViewMetrics",
    familyCanViewShifts: "familyCanViewShifts",
  };

  const updateData: Record<string, unknown> = {};
  for (const [key] of Object.entries(visibilityFields)) {
    if (key in body) updateData[key] = body[key];
  }
  if (body.medicalNotes !== undefined) updateData.medicalNotes = body.medicalNotes;
  if (body.emergencyContact !== undefined) updateData.emergencyContact = body.emergencyContact;

  if (Object.keys(updateData).length > 0) {
    await prisma.patient.update({ where: { id }, data: updateData });
  }

  return NextResponse.json({ message: "Patient updated" });
}
