import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("userId");
  const unreadOnly = searchParams.get("unreadOnly") === "true";

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
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
  const body = await request.json();
  const { id, ids, isRead } = body;

  // Mark single notification as read
  if (id) {
    const notification = await prisma.notification.update({
      where: { id },
      data: {
        isRead,
        readAt: isRead ? new Date() : null,
      },
    });
    return NextResponse.json(notification);
  }

  // Mark multiple notifications as read
  if (ids && Array.isArray(ids)) {
    await prisma.notification.updateMany({
      where: { id: { in: ids } },
      data: {
        isRead,
        readAt: isRead ? new Date() : null,
      },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Notification ID(s) required" }, { status: 400 });
}
