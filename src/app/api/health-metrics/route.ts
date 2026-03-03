import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import prisma from "@/lib/db";

const METRIC_UNITS: Record<string, string> = {
  blood_pressure: "mmHg",
  blood_glucose: "mg/dL",
  weight: "lbs",
  heart_rate: "bpm",
  oxygen_saturation: "%",
  temperature: "°F",
};

// GET /api/health-metrics?patientId=X&type=blood_pressure&days=30
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const patientId = searchParams.get("patientId");
  const type = searchParams.get("type");
  const days = parseInt(searchParams.get("days") || "90");

  if (!patientId) {
    return NextResponse.json({ error: "patientId is required" }, { status: 400 });
  }

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const metrics = await prisma.healthMetric.findMany({
    where: {
      patientId,
      recordedAt: { gte: since },
      ...(type ? { type } : {}),
    },
    orderBy: { recordedAt: "asc" },
    select: {
      id: true,
      type: true,
      value: true,
      unit: true,
      recordedAt: true,
      notes: true,
      recordedById: true,
    },
  });

  // Group by type if no specific type requested
  if (!type) {
    const grouped: Record<string, typeof metrics> = {};
    for (const m of metrics) {
      if (!grouped[m.type]) grouped[m.type] = [];
      grouped[m.type].push(m);
    }
    return NextResponse.json({ grouped });
  }

  return NextResponse.json({ metrics });
}

// POST /api/health-metrics - Log a new health metric
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { patientId, type, value, unit, recordedAt, notes } = await request.json();

  if (!patientId || !type || !value) {
    return NextResponse.json({ error: "patientId, type, and value are required" }, { status: 400 });
  }

  const metric = await prisma.healthMetric.create({
    data: {
      patientId,
      type,
      value: String(value),
      unit: unit || METRIC_UNITS[type] || null,
      recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
      recordedById: session.user.id,
      notes,
    },
  });

  return NextResponse.json(metric);
}
