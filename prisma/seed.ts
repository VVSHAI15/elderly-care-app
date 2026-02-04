import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create demo user
  const demoUser = await prisma.user.upsert({
    where: { id: "demo-user-123" },
    update: {},
    create: {
      id: "demo-user-123",
      email: "john@example.com",
      name: "John Doe",
      role: "PATIENT",
    },
  });

  console.log("Created demo user:", demoUser.id);

  // Create demo patient
  const demoPatient = await prisma.patient.upsert({
    where: { id: "demo-patient-123" },
    update: {},
    create: {
      id: "demo-patient-123",
      userId: demoUser.id,
      dateOfBirth: new Date("1950-05-15"),
      emergencyContact: "555-123-4567",
    },
  });

  console.log("Created demo patient:", demoPatient.id);

  // Create a family member
  const familyMember = await prisma.user.upsert({
    where: { id: "demo-family-123" },
    update: {},
    create: {
      id: "demo-family-123",
      email: "family@example.com",
      name: "Jane Doe",
      role: "FAMILY_MEMBER",
      familyOf: {
        connect: { id: demoPatient.id },
      },
    },
  });

  console.log("Created family member:", familyMember.id);

  // Create some sample tasks
  const tasks = await Promise.all([
    prisma.task.create({
      data: {
        patientId: demoPatient.id,
        title: "Take morning vitamins",
        description: "Vitamin D and B12 supplements",
        dueTime: "08:00",
        category: "MEDICATION",
        priority: "MEDIUM",
        isRecurring: true,
        recurrence: "daily",
      },
    }),
    prisma.task.create({
      data: {
        patientId: demoPatient.id,
        title: "Morning walk",
        description: "15-minute walk around the block",
        dueTime: "09:00",
        category: "EXERCISE",
        priority: "MEDIUM",
        isRecurring: true,
        recurrence: "daily",
      },
    }),
    prisma.task.create({
      data: {
        patientId: demoPatient.id,
        title: "Drink water",
        description: "Stay hydrated - aim for 8 glasses",
        category: "HYDRATION",
        priority: "LOW",
        isRecurring: true,
        recurrence: "daily",
      },
    }),
  ]);

  console.log("Created", tasks.length, "sample tasks");

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
