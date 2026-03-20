import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import prisma from "@/lib/db";
import { sendNotification } from "@/lib/notifications";
import { auditLog } from "@/lib/audit";

// PATCH /api/schedule/requests/[id]
// Admin: approve or reject a request
// Caregiver: volunteer to cover an open COVER_REQUEST
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { action, adminNote, coveredById } = body;
  // action: "approve" | "reject" | "volunteer" | "assign_cover"

  const role = session.user.role;

  const shiftRequest = await prisma.shiftRequest.findUnique({
    where: { id },
    include: {
      requester: { select: { id: true, name: true } },
      scheduledShift: {
        include: {
          patient: {
            select: {
              id: true,
              organizationId: true,
              user: { select: { name: true } },
            },
          },
        },
      },
      offeredShift: true,
    },
  });

  if (!shiftRequest) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  // === ADMIN actions: approve / reject ===
  if (action === "approve" || action === "reject") {
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Only admins can approve or reject requests" }, { status: 403 });
    }
    if (shiftRequest.status !== "PENDING") {
      return NextResponse.json({ error: "Request is no longer pending" }, { status: 409 });
    }

    // Verify the shift request is for a patient in the admin's org
    if (
      shiftRequest.scheduledShift &&
      shiftRequest.scheduledShift.patient.organizationId !== session.user.organizationId
    ) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const newStatus = action === "approve" ? "APPROVED" : "REJECTED";

    // If approving a DAY_OFF, cancel the scheduled shift
    if (action === "approve" && shiftRequest.type === "DAY_OFF" && shiftRequest.scheduledShiftId) {
      await prisma.scheduledShift.update({
        where: { id: shiftRequest.scheduledShiftId },
        data: { status: "CANCELLED" },
      });
    }

    // If approving a SWAP_REQUEST, swap the caregivers on both shifts
    if (action === "approve" && shiftRequest.type === "SWAP_REQUEST") {
      if (shiftRequest.scheduledShiftId && shiftRequest.offeredShiftId) {
        const affectedShift = await prisma.scheduledShift.findUnique({
          where: { id: shiftRequest.scheduledShiftId },
        });
        const offeredShift = await prisma.scheduledShift.findUnique({
          where: { id: shiftRequest.offeredShiftId },
        });

        if (affectedShift && offeredShift) {
          const swapConflict1 = await prisma.scheduledShift.findFirst({
            where: {
              id: { notIn: [affectedShift.id, offeredShift.id] },
              caregiverId: offeredShift.caregiverId,
              status: { not: "CANCELLED" },
              startTime: { lt: affectedShift.endTime },
              endTime: { gt: affectedShift.startTime },
            },
          });
          const swapConflict2 = await prisma.scheduledShift.findFirst({
            where: {
              id: { notIn: [affectedShift.id, offeredShift.id] },
              caregiverId: affectedShift.caregiverId,
              status: { not: "CANCELLED" },
              startTime: { lt: offeredShift.endTime },
              endTime: { gt: offeredShift.startTime },
            },
          });

          if (swapConflict1 || swapConflict2) {
            return NextResponse.json(
              { error: "Cannot approve swap: one or both caregivers have a conflicting shift after the swap" },
              { status: 409 }
            );
          }

          await prisma.$transaction([
            prisma.scheduledShift.update({
              where: { id: affectedShift.id },
              data: { caregiverId: offeredShift.caregiverId },
            }),
            prisma.scheduledShift.update({
              where: { id: offeredShift.id },
              data: { caregiverId: affectedShift.caregiverId },
            }),
          ]);
        }
      }
    }

    const updated = await prisma.shiftRequest.update({
      where: { id },
      data: {
        status: newStatus,
        adminNote: adminNote ?? null,
        resolvedById: session.user.id,
        resolvedAt: new Date(),
      },
    });

    await auditLog({
      userId: session.user.id,
      action: `shift_request.${action}`,
      resourceId: id,
      resourceType: "shift_request",
      request,
    });

    const notifType = action === "approve" ? "SHIFT_APPROVED" : "SHIFT_REJECTED";
    const labels: Record<string, string> = {
      DAY_OFF: "day-off request",
      COVER_REQUEST: "cover request",
      SWAP_REQUEST: "swap request",
    };
    await sendNotification({
      userId: shiftRequest.requesterId,
      type: notifType,
      title: `Shift request ${action === "approve" ? "approved" : "rejected"}`,
      message: `Your ${labels[shiftRequest.type]} has been ${action === "approve" ? "approved" : "rejected"}${adminNote ? `: ${adminNote}` : "."}`,
    });

    return NextResponse.json(updated);
  }

  // === CAREGIVER action: volunteer to cover ===
  if (action === "volunteer") {
    if (role !== "CAREGIVER") {
      return NextResponse.json({ error: "Only caregivers can volunteer to cover" }, { status: 403 });
    }
    if (shiftRequest.type !== "COVER_REQUEST") {
      return NextResponse.json({ error: "Can only volunteer for COVER_REQUEST" }, { status: 400 });
    }
    if (shiftRequest.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Can only volunteer for an approved cover request" },
        { status: 409 }
      );
    }
    if (session.user.id === shiftRequest.requesterId) {
      return NextResponse.json({ error: "You cannot cover your own request" }, { status: 400 });
    }

    // Volunteer must be in the same org as the patient
    if (
      shiftRequest.scheduledShift &&
      shiftRequest.scheduledShift.patient.organizationId !== session.user.organizationId
    ) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check the volunteer has no conflict
    if (shiftRequest.scheduledShift) {
      const conflict = await prisma.scheduledShift.findFirst({
        where: {
          caregiverId: session.user.id,
          status: { not: "CANCELLED" },
          startTime: { lt: shiftRequest.scheduledShift.endTime },
          endTime: { gt: shiftRequest.scheduledShift.startTime },
        },
      });
      if (conflict) {
        return NextResponse.json(
          { error: "You have a conflicting scheduled shift during this time" },
          { status: 409 }
        );
      }

      await prisma.scheduledShift.update({
        where: { id: shiftRequest.scheduledShift.id },
        data: { caregiverId: session.user.id },
      });
    }

    const updated = await prisma.shiftRequest.update({
      where: { id },
      data: {
        coveredById: session.user.id,
        status: "FULFILLED",
        resolvedAt: new Date(),
      },
    });

    const volunteer = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true },
    });

    await sendNotification({
      userId: shiftRequest.requesterId,
      type: "SHIFT_COVERED",
      title: "Your shift has been covered",
      message: `${volunteer?.name} has agreed to cover your shift${shiftRequest.scheduledShift ? ` on ${shiftRequest.scheduledShift.startTime.toLocaleDateString()}` : ""}.`,
    });

    return NextResponse.json(updated);
  }

  // === ADMIN action: manually assign a cover ===
  if (action === "assign_cover") {
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Only admins can assign coverage" }, { status: 403 });
    }
    if (!coveredById) {
      return NextResponse.json({ error: "coveredById is required" }, { status: 400 });
    }
    if (shiftRequest.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Request must be approved before assigning a cover" },
        { status: 409 }
      );
    }

    // Verify the shift request is for a patient in the admin's org
    if (
      shiftRequest.scheduledShift &&
      shiftRequest.scheduledShift.patient.organizationId !== session.user.organizationId
    ) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Verify the assigned caregiver is in the admin's org
    const coverCaregiver = await prisma.user.findFirst({
      where: { id: coveredById, organizationId: session.user.organizationId },
      select: { name: true },
    });
    if (!coverCaregiver) {
      return NextResponse.json({ error: "Caregiver not found in your organization" }, { status: 403 });
    }

    if (shiftRequest.scheduledShift) {
      const conflict = await prisma.scheduledShift.findFirst({
        where: {
          caregiverId: coveredById,
          status: { not: "CANCELLED" },
          startTime: { lt: shiftRequest.scheduledShift.endTime },
          endTime: { gt: shiftRequest.scheduledShift.startTime },
        },
      });
      if (conflict) {
        return NextResponse.json(
          { error: "The assigned caregiver has a conflicting scheduled shift" },
          { status: 409 }
        );
      }

      await prisma.scheduledShift.update({
        where: { id: shiftRequest.scheduledShift.id },
        data: { caregiverId: coveredById },
      });
    }

    const updated = await prisma.shiftRequest.update({
      where: { id },
      data: {
        coveredById,
        status: "FULFILLED",
        resolvedById: session.user.id,
        resolvedAt: new Date(),
        adminNote: adminNote ?? null,
      },
    });

    await auditLog({
      userId: session.user.id,
      action: "shift_request.assign_cover",
      resourceId: id,
      resourceType: "shift_request",
      request,
      metadata: { coveredById },
    });

    await sendNotification({
      userId: shiftRequest.requesterId,
      type: "SHIFT_COVERED",
      title: "Your shift has been covered",
      message: `${coverCaregiver.name} has been assigned to cover your shift.`,
    });
    await sendNotification({
      userId: coveredById,
      type: "SHIFT_REQUEST",
      title: "You have been assigned a shift",
      message: `You have been assigned to cover a shift for ${shiftRequest.requester.name}.`,
    });

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
