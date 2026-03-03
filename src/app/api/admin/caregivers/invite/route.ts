import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import prisma from "@/lib/db";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function generateCode(length = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// POST /api/admin/caregivers/invite - Send email invite to a caregiver
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.organizationId) {
    return NextResponse.json({ error: "No organization found" }, { status: 400 });
  }

  const { email, name } = await request.json();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Check if already a member
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "A user with this email already exists" }, { status: 400 });
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.inviteCode.create({
    data: {
      code,
      organizationId: session.user.organizationId,
      targetEmail: email,
      inviteType: "CAREGIVER_ORG",
      createdBy: session.user.id,
      expiresAt,
    },
  });

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
  });

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/register?orgInvite=${code}`;

  // Send invite email
  try {
    await resend.emails.send({
      from: "guardian.ai <notifications@carecheck.app>",
      to: email,
      subject: `You're invited to join ${org?.name} on guardian.ai`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2f5f9f;">You've been invited to guardian.ai</h2>
          <p>${org?.name} has invited you${name ? `, ${name},` : ""} to join their care team on guardian.ai.</p>
          <p>Click the button below to set up your account:</p>
          <a href="${inviteUrl}" style="display: inline-block; background: #2f5f9f; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">
            Accept Invitation
          </a>
          <p style="color: #666; font-size: 14px;">This invite expires in 7 days. If you didn't expect this email, you can ignore it.</p>
        </div>
      `,
    });
  } catch (emailError) {
    console.error("Failed to send invite email:", emailError);
    // Don't fail — code is still saved
  }

  return NextResponse.json({ message: "Invite sent", code, inviteUrl });
}
