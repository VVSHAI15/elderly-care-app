import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";

// Only available in development - creates test data
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  try {
    const { action } = await request.json();

    if (action === "createTestUsers") {
      const hashedPassword = await bcrypt.hash("password123", 12);

      // Create test patient
      const testPatient = await prisma.user.upsert({
        where: { email: "patient@test.com" },
        update: {},
        create: {
          email: "patient@test.com",
          password: hashedPassword,
          name: "Test Patient",
          role: "PATIENT",
          patient: {
            create: {
              dateOfBirth: new Date("1945-05-15"),
              medicalNotes: "Test patient for development",
              emergencyContact: "555-123-4567",
            },
          },
        },
        include: { patient: true },
      });

      // Create test family member
      const testFamily = await prisma.user.upsert({
        where: { email: "family@test.com" },
        update: {},
        create: {
          email: "family@test.com",
          password: hashedPassword,
          name: "Test Family Member",
          role: "FAMILY_MEMBER",
        },
      });

      // Create test caregiver
      const testCaregiver = await prisma.user.upsert({
        where: { email: "caregiver@test.com" },
        update: {},
        create: {
          email: "caregiver@test.com",
          password: hashedPassword,
          name: "Test Caregiver",
          role: "CAREGIVER",
        },
      });

      return NextResponse.json({
        message: "Test users created",
        users: [
          { email: testPatient.email, role: testPatient.role },
          { email: testFamily.email, role: testFamily.role },
          { email: testCaregiver.email, role: testCaregiver.role },
        ],
        note: "Password for all: password123",
      });
    }

    if (action === "createTestTasks") {
      // Find first patient
      const patient = await prisma.patient.findFirst();
      if (!patient) {
        return NextResponse.json({ error: "Create a patient first" }, { status: 400 });
      }

      const tasks = await prisma.task.createMany({
        data: [
          {
            patientId: patient.id,
            title: "Take morning medication",
            description: "Blood pressure and vitamins",
            category: "MEDICATION",
            priority: "HIGH",
            dueTime: "08:00",
            isRecurring: true,
            recurrence: "daily",
          },
          {
            patientId: patient.id,
            title: "Morning walk",
            description: "15 minute walk around the block",
            category: "EXERCISE",
            priority: "MEDIUM",
            dueTime: "09:00",
            isRecurring: true,
            recurrence: "daily",
          },
          {
            patientId: patient.id,
            title: "Doctor appointment",
            description: "Annual checkup with Dr. Smith",
            category: "APPOINTMENT",
            priority: "HIGH",
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            dueTime: "14:00",
          },
          {
            patientId: patient.id,
            title: "Take evening medication",
            description: "Heart medication",
            category: "MEDICATION",
            priority: "HIGH",
            dueTime: "20:00",
            isRecurring: true,
            recurrence: "daily",
          },
        ],
      });

      return NextResponse.json({
        message: `Created ${tasks.count} test tasks`,
        patientId: patient.id,
      });
    }

    if (action === "createTestMedications") {
      const patient = await prisma.patient.findFirst();
      if (!patient) {
        return NextResponse.json({ error: "Create a patient first" }, { status: 400 });
      }

      const medications = await prisma.medication.createMany({
        data: [
          {
            patientId: patient.id,
            name: "Lisinopril",
            dosage: "10mg",
            frequency: "once daily",
            instructions: "Take in the morning with water",
            startDate: new Date(),
            prescriber: "Dr. Smith",
            pharmacy: "CVS Pharmacy",
          },
          {
            patientId: patient.id,
            name: "Metformin",
            dosage: "500mg",
            frequency: "twice daily",
            instructions: "Take with meals",
            startDate: new Date(),
            prescriber: "Dr. Johnson",
            pharmacy: "Walgreens",
          },
          {
            patientId: patient.id,
            name: "Aspirin",
            dosage: "81mg",
            frequency: "once daily",
            instructions: "Take with food",
            startDate: new Date(),
            prescriber: "Dr. Smith",
          },
        ],
      });

      return NextResponse.json({
        message: `Created ${medications.count} test medications`,
        patientId: patient.id,
      });
    }

    if (action === "clearAll") {
      // Delete in order to respect foreign keys
      await prisma.notification.deleteMany();
      await prisma.task.deleteMany();
      await prisma.medication.deleteMany();
      await prisma.document.deleteMany();
      await prisma.inviteCode.deleteMany();
      await prisma.patient.deleteMany();
      await prisma.session.deleteMany();
      await prisma.account.deleteMany();
      await prisma.user.deleteMany();

      return NextResponse.json({ message: "All data cleared" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Failed to seed data" }, { status: 500 });
  }
}
