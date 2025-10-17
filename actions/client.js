import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

/**
 * Get all appointments for the authenticated client
 */
export async function getClientAppointments() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  try {
    const user = await db.user.findUnique({
      where: {
        clerkUserId: userId,
        role: "CLIENT",
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new Error("Client not found");
    }

    const appointments = await db.appointment.findMany({
      where: {
        clientId: user.id,
      },
      include: {
        lawyer: {
          select: {
            id: true,
            name: true,
            specialty: true,
            imageUrl: true,
          },
        },
      },
      orderBy: {
        startTime: "asc",
      },
    });

    return { appointments };
  } catch (error) {
    console.error("Failed to get client appointments:", error);
    return { error: "Failed to fetch appointments" };
  }
}
