import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import prisma from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("userId");
  const unreadOnly = searchParams.get("unreadOnly") === "true";

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  // Users can only fetch their own notifications
  if (userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      ...(unreadOnly && { isRead: false }),
    },
    include: {
      task: true,
    },
    orderBy: { sentAt: "desc" },
    take: 50,
  });

  return NextResponse.json(notifications);
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, ids, isRead } = body;

  // Mark single notification as read — verify it belongs to the session user
  if (id) {
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        isRead,
        readAt: isRead ? new Date() : null,
      },
    });
    return NextResponse.json(updated);
  }

  // Mark multiple notifications as read — scope to session user only
  if (ids && Array.isArray(ids)) {
    await prisma.notification.updateMany({
      where: { id: { in: ids }, userId: session.user.id },
      data: {
        isRead,
        readAt: isRead ? new Date() : null,
      },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Notification ID(s) required" }, { status: 400 });
}
