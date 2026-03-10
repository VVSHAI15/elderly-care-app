import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import prisma from "@/lib/db";
import { sendNotification } from "@/lib/notifications";

// GET /api/schedule/requests - List shift requests
// Caregivers see their own; Admins see all in org
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");

  const role = session.user.role;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (role === "CAREGIVER") {
    where.requesterId = session.user.id;
  } else if (role === "ADMIN") {
    // Show requests from caregivers in the same org
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true },
    });
    if (admin?.organizationId) {
      where.requester = { organizationId: admin.organizationId };
    }
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (status) where.status = status;

  const requests = await prisma.shiftRequest.findMany({
    where,
    include: {
      requester: { select: { id: true, name: true, email: true } },
      coveredBy: { select: { id: true, name: true, email: true } },
      scheduledShift: {
        include: {
          patient: { select: { id: true, user: { select: { name: true } } } },
        },
      },
      offeredShift: {
        include: {
          patient: { select: { id: true, user: { select: { name: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
}

// POST /api/schedule/requests - Caregiver creates a request (day off, cover, swap)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== "CAREGIVER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { type, scheduledShiftId, offeredShiftId, requestDate, message } = body;

  if (!type || !["DAY_OFF", "COVER_REQUEST", "SWAP_REQUEST"].includes(type)) {
    return NextResponse.json(
      { error: "type must be DAY_OFF, COVER_REQUEST, or SWAP_REQUEST" },
      { status: 400 }
    );
  }

  if (type === "DAY_OFF" && !requestDate) {
    return NextResponse.json({ error: "requestDate is required for DAY_OFF" }, { status: 400 });
  }

  if ((type === "COVER_REQUEST" || type === "SWAP_REQUEST") && !scheduledShiftId) {
    return NextResponse.json(
      { error: "scheduledShiftId is required for COVER_REQUEST and SWAP_REQUEST" },
      { status: 400 }
    );
  }

  if (type === "SWAP_REQUEST" && !offeredShiftId) {
    return NextResponse.json(
      { error: "offeredShiftId is required for SWAP_REQUEST" },
      { status: 400 }
    );
  }

  // Validate ownership of shifts mentioned
  if (scheduledShiftId) {
    const shift = await prisma.scheduledShift.findUnique({
      where: { id: scheduledShiftId },
    });
    if (!shift) {
      return NextResponse.json({ error: "Scheduled shift not found" }, { status: 404 });
    }
    if (shift.caregiverId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only request changes to your own shifts" },
        { status: 403 }
      );
    }
  }

  if (offeredShiftId) {
    const offered = await prisma.scheduledShift.findUnique({
      where: { id: offeredShiftId },
    });
    if (!offered) {
      return NextResponse.json({ error: "Offered shift not found" }, { status: 404 });
    }
    if (offered.caregiverId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only offer your own shifts in a swap" },
        { status: 403 }
      );
    }
  }

  // Check for duplicate pending request of same type for same shift
  if (scheduledShiftId) {
    const duplicate = await prisma.shiftRequest.findFirst({
      where: {
        requesterId: session.user.id,
        scheduledShiftId,
        type,
        status: "PENDING",
      },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "You already have a pending request for this shift" },
        { status: 409 }
      );
    }
  }

  const shiftRequest = await prisma.shiftRequest.create({
    data: {
      requesterId: session.user.id,
      type,
      scheduledShiftId: scheduledShiftId ?? null,
      offeredShiftId: offeredShiftId ?? null,
      requestDate: requestDate ? new Date(requestDate) : null,
      message: message ?? null,
    },
    include: {
      requester: { select: { id: true, name: true, email: true } },
      scheduledShift: {
        include: {
          patient: { select: { user: { select: { name: true } } } },
        },
      },
    },
  });

  // Notify org admins of the new request
  const orgAdmins = await prisma.user.findMany({
    where: {
      role: "ADMIN",
      organizationId: (
        await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { organizationId: true },
        })
      )?.organizationId ?? undefined,
    },
  });

  const typeLabels: Record<string, string> = {
    DAY_OFF: "Day-Off Request",
    COVER_REQUEST: "Cover Request",
    SWAP_REQUEST: "Swap Request",
  };

  await Promise.all(
    orgAdmins.map((admin) =>
      sendNotification({
        userId: admin.id,
        type: "SHIFT_REQUEST",
        title: `New ${typeLabels[type]}`,
        message: `${shiftRequest.requester.name} submitted a ${typeLabels[type].toLowerCase()}${message ? `: "${message}"` : "."}`,
      })
    )
  );

  return NextResponse.json(shiftRequest, { status: 201 });
}
