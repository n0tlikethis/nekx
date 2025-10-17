"use server";

import { db } from "@/lib/prisma";

/**
 * Get lawyers by specialty
 */
export async function getLawyersBySpecialty(specialty) {
  try {
    const lawyers = await db.user.findMany({
      where: {
        role: "LAWYER",
        verificationStatus: "VERIFIED",
        specialty: specialty.split("%20").join(" "),
      },
      orderBy: {
        name: "asc",
      },
    });

    return { lawyers };
  } catch (error) {
    console.error("Failed to fetch lawyers by specialty:", error);
    return { error: "Failed to fetch lawyers" };
  }
}
