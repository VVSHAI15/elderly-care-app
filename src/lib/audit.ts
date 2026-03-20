import prisma from "@/lib/db";
import { NextRequest } from "next/server";

/**
 * Write an audit log entry for a sensitive action.
 * Failures are swallowed so audit logging never crashes the main request flow.
 */
export async function auditLog({
  userId,
  action,
  resourceId,
  resourceType,
  request,
  metadata,
}: {
  userId: string;
  action: string;
  resourceId?: string;
  resourceType?: string;
  request?: NextRequest;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resourceId: resourceId ?? null,
        resourceType: resourceType ?? null,
        ipAddress:
          request?.headers.get("x-forwarded-for") ??
          request?.headers.get("x-real-ip") ??
          null,
        userAgent: request?.headers.get("user-agent") ?? null,
        metadata: metadata ?? undefined,
      },
    });
  } catch {
    // Never let audit logging crash the main request
    console.error("[audit] Failed to write audit log:", action);
  }
}
