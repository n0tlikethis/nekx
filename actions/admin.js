"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

/**
 * Verifies if current user has admin role
 */
export async function verifyAdmin() {
  const { userId } = await auth();

  if (!userId) {
    return false;
  }

  try {
    const user = await db.user.findUnique({
      where: {
        clerkUserId: userId,
      },
    });

    return user?.role === "ADMIN";
  } catch (error) {
    console.error("Failed to verify admin:", error);
    return false;
  }
}

/**
 * Gets all lawyers with pending verification
 */
export async function getPendingLawyers() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) throw new Error("Unauthorized");

  try {
    const pendingLawyers = await db.user.findMany({
      where: {
        role: "LAWYER",
        verificationStatus: "PENDING",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { lawyers: pendingLawyers };
  } catch (error) {
    throw new Error("Failed to fetch pending lawyers");
  }
}

/**
 * Gets all verified lawyers
 */
export async function getVerifiedLawyers() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) throw new Error("Unauthorized");

  try {
    const verifiedLawyers = await db.user.findMany({
      where: {
        role: "LAWYER",
        verificationStatus: "VERIFIED",
      },
      orderBy: {
        name: "asc",
      },
    });

    return { lawyers: verifiedLawyers };
  } catch (error) {
    console.error("Failed to get verified lawyers:", error);
    return { error: "Failed to fetch verified lawyers" };
  }
}

/**
 * Updates a lawyer's verification status
 */
export async function updateLawyerStatus(formData) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) throw new Error("Unauthorized");

  const lawyerId = formData.get("lawyerId");
  const status = formData.get("status");

  if (!lawyerId || !["VERIFIED", "REJECTED"].includes(status)) {
    throw new Error("Invalid input");
  }

  try {
    await db.user.update({
      where: {
        id: lawyerId,
      },
      data: {
        verificationStatus: status,
      },
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Failed to update lawyer status:", error);
    throw new Error(`Failed to update lawyer status: ${error.message}`);
  }
}

/**
 * Suspends or reinstates a lawyer
 */
export async function updateLawyerActiveStatus(formData) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) throw new Error("Unauthorized");

  const lawyerId = formData.get("lawyerId");
  const suspend = formData.get("suspend") === "true";

  if (!lawyerId) {
    throw new Error("Lawyer ID is required");
  }

  try {
    const status = suspend ? "PENDING" : "VERIFIED";

    await db.user.update({
      where: {
        id: lawyerId,
      },
      data: {
        verificationStatus: status,
      },
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Failed to update lawyer active status:", error);
    throw new Error(`Failed to update lawyer status: ${error.message}`);
  }
}

/**
 * Gets all pending payouts that need admin approval
 */
export async function getPendingPayouts() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) throw new Error("Unauthorized");

  try {
    const pendingPayouts = await db.payout.findMany({
      where: {
        status: "PROCESSING",
      },
      include: {
        lawyer: {
          select: {
            id: true,
            name: true,
            email: true,
            specialty: true,
            credits: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { payouts: pendingPayouts };
  } catch (error) {
    console.error("Failed to fetch pending payouts:", error);
    throw new Error("Failed to fetch pending payouts");
  }
}

/**
 * Approves a payout request and deducts credits from lawyer's account
 */
export async function approvePayout(formData) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) throw new Error("Unauthorized");

  const payoutId = formData.get("payoutId");

  if (!payoutId) {
    throw new Error("Payout ID is required");
  }

  try {
    // Get admin user info
    const { userId } = await auth();
    const admin = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    // Find the payout request
    const payout = await db.payout.findUnique({
      where: {
        id: payoutId,
        status: "PROCESSING",
      },
      include: {
        lawyer: true,
      },
    });

    if (!payout) {
      throw new Error("Payout request not found or already processed");
    }

    // Check if lawyer has enough credits
    if (payout.lawyer.credits < payout.credits) {
      throw new Error("Lawyer doesn't have enough credits for this payout");
    }

    // Process the payout in a transaction
    await db.$transaction(async (tx) => {
      // Update payout status to PROCESSED
      await tx.payout.update({
        where: {
          id: payoutId,
        },
        data: {
          status: "PROCESSED",
          processedAt: new Date(),
          processedBy: admin?.id || "unknown",
        },
      });

      // Deduct credits from lawyer's account
      await tx.user.update({
        where: {
          id: payout.lawyerId,
        },
        data: {
          credits: {
            decrement: payout.credits,
          },
        },
      });

      // Create a transaction record for the deduction
      await tx.creditTransaction.create({
        data: {
          userId: payout.lawyerId,
          amount: -payout.credits,
          type: "ADMIN_ADJUSTMENT",
        },
      });
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Failed to approve payout:", error);
    throw new Error(`Failed to approve payout: ${error.message}`);
  }
}
