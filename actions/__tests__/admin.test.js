import {
  verifyAdmin,
  getPendingLawyers,
  getVerifiedLawyers,
  updateLawyerStatus,
  updateLawyerActiveStatus,
  getPendingPayouts,
  approvePayout,
} from "@/actions/admin";
import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

// Mock dependencies
jest.mock("@/lib/prisma", () => ({
  db: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    payout: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    creditTransaction: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

describe("Admin Actions", () => {
  const mockAdminUserId = "clerk_admin_123";
  const mockAdminUser = {
    id: "db_admin_123",
    clerkUserId: mockAdminUserId,
    email: "admin@example.com",
    role: "ADMIN",
  };

  const mockRegularUserId = "clerk_user_123";
  const mockRegularUser = {
    id: "db_user_123",
    clerkUserId: mockRegularUserId,
    email: "user@example.com",
    role: "CLIENT",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("verifyAdmin", () => {
    it("ngembaliin false kalo user ngak ter-auth", async () => {
      auth.mockResolvedValue({ userId: null });

      const result = await verifyAdmin();

      expect(result).toBe(false);
      expect(db.user.findUnique).not.toHaveBeenCalled();
    });

    it("ngembaliin true kalo user adalah admin", async () => {
      auth.mockResolvedValue({ userId: mockAdminUserId });
      db.user.findUnique.mockResolvedValue(mockAdminUser);

      const result = await verifyAdmin();

      expect(db.user.findUnique).toHaveBeenCalledWith({
        where: { clerkUserId: mockAdminUserId },
      });
      expect(result).toBe(true);
    });

    it("ngembaliin false kalo user bukan admin", async () => {
      auth.mockResolvedValue({ userId: mockRegularUserId });
      db.user.findUnique.mockResolvedValue(mockRegularUser);

      const result = await verifyAdmin();

      expect(result).toBe(false);
    });

    it("ngembaliin false kalo ada masalah di database", async () => {
      auth.mockResolvedValue({ userId: mockAdminUserId });
      db.user.findUnique.mockRejectedValue(new Error("Database error"));

      const result = await verifyAdmin();

      expect(result).toBe(false);
    });

    it("ngembaliin false kalo user ngak ditemukan", async () => {
      auth.mockResolvedValue({ userId: mockAdminUserId });
      db.user.findUnique.mockResolvedValue(null);

      const result = await verifyAdmin();

      expect(result).toBe(false);
    });
  });

  describe("getPendingLawyers", () => {
    const mockPendingLawyers = [
      {
        id: "lawyer_1",
        email: "lawyer1@example.com",
        role: "LAWYER",
        verificationStatus: "PENDING",
        specialty: "Corporate Law",
        experience: 5,
      },
      {
        id: "lawyer_2",
        email: "lawyer2@example.com",
        role: "LAWYER",
        verificationStatus: "PENDING",
        specialty: "Criminal Law",
        experience: 3,
      },
    ];

    beforeEach(() => {
      auth.mockResolvedValue({ userId: mockAdminUserId });
      db.user.findUnique.mockResolvedValue(mockAdminUser);
    });

    it("harusnya error kalo user bukan admin", async () => {
      db.user.findUnique.mockResolvedValue(mockRegularUser);

      await expect(getPendingLawyers()).rejects.toThrow("Unauthorized");
    });

    it("harusnya berhasil ngambil daftar lawyer pending", async () => {
      db.user.findMany.mockResolvedValue(mockPendingLawyers);

      const result = await getPendingLawyers();

      expect(db.user.findMany).toHaveBeenCalledWith({
        where: {
          role: "LAWYER",
          verificationStatus: "PENDING",
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      expect(result).toEqual({ lawyers: mockPendingLawyers });
    });

    it("harusnya error kalo ada masalah di database", async () => {
      db.user.findMany.mockRejectedValue(new Error("Database error"));

      await expect(getPendingLawyers()).rejects.toThrow(
        "Failed to fetch pending lawyers"
      );
    });
  });

  describe("getVerifiedLawyers", () => {
    const mockVerifiedLawyers = [
      {
        id: "lawyer_1",
        email: "lawyer1@example.com",
        role: "LAWYER",
        verificationStatus: "VERIFIED",
        name: "Alice Lawyer",
      },
      {
        id: "lawyer_2",
        email: "lawyer2@example.com",
        role: "LAWYER",
        verificationStatus: "VERIFIED",
        name: "Bob Lawyer",
      },
    ];

    beforeEach(() => {
      auth.mockResolvedValue({ userId: mockAdminUserId });
      db.user.findUnique.mockResolvedValue(mockAdminUser);
    });

    it("harusnya error kalo user bukan admin", async () => {
      db.user.findUnique.mockResolvedValue(mockRegularUser);

      await expect(getVerifiedLawyers()).rejects.toThrow("Unauthorized");
    });

    it("harusnya berhasil ngambil daftar lawyer verified", async () => {
      db.user.findMany.mockResolvedValue(mockVerifiedLawyers);

      const result = await getVerifiedLawyers();

      expect(db.user.findMany).toHaveBeenCalledWith({
        where: {
          role: "LAWYER",
          verificationStatus: "VERIFIED",
        },
        orderBy: {
          name: "asc",
        },
      });
      expect(result).toEqual({ lawyers: mockVerifiedLawyers });
    });

    it("harusnya ngembaliin error object kalo ada masalah di database", async () => {
      db.user.findMany.mockRejectedValue(new Error("Database error"));

      const result = await getVerifiedLawyers();

      expect(result).toEqual({ error: "Failed to fetch verified lawyers" });
    });
  });

  describe("updateLawyerStatus", () => {
    beforeEach(() => {
      auth.mockResolvedValue({ userId: mockAdminUserId });
      db.user.findUnique.mockResolvedValue(mockAdminUser);
    });

    it("harusnya error kalo user bukan admin", async () => {
      db.user.findUnique.mockResolvedValue(mockRegularUser);

      const formData = new FormData();
      formData.append("lawyerId", "lawyer_123");
      formData.append("status", "VERIFIED");

      await expect(updateLawyerStatus(formData)).rejects.toThrow(
        "Unauthorized"
      );
    });

    it("harusnya error kalo lawyerId ngak diisi", async () => {
      const formData = new FormData();
      formData.append("status", "VERIFIED");

      await expect(updateLawyerStatus(formData)).rejects.toThrow(
        "Invalid input"
      );
    });

    it("harusnya error kalo status ngak valid", async () => {
      const formData = new FormData();
      formData.append("lawyerId", "lawyer_123");
      formData.append("status", "INVALID_STATUS");

      await expect(updateLawyerStatus(formData)).rejects.toThrow(
        "Invalid input"
      );
    });

    it("harusnya berhasil update status menjadi VERIFIED", async () => {
      db.user.update.mockResolvedValue({
        id: "lawyer_123",
        verificationStatus: "VERIFIED",
      });

      const formData = new FormData();
      formData.append("lawyerId", "lawyer_123");
      formData.append("status", "VERIFIED");

      const result = await updateLawyerStatus(formData);

      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: "lawyer_123" },
        data: { verificationStatus: "VERIFIED" },
      });
      expect(revalidatePath).toHaveBeenCalledWith("/admin");
      expect(result).toEqual({ success: true });
    });

    it("harusnya berhasil update status menjadi REJECTED", async () => {
      db.user.update.mockResolvedValue({
        id: "lawyer_123",
        verificationStatus: "REJECTED",
      });

      const formData = new FormData();
      formData.append("lawyerId", "lawyer_123");
      formData.append("status", "REJECTED");

      const result = await updateLawyerStatus(formData);

      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: "lawyer_123" },
        data: { verificationStatus: "REJECTED" },
      });
      expect(result).toEqual({ success: true });
    });

    it("harusnya error kalo ada masalah di database", async () => {
      db.user.update.mockRejectedValue(new Error("Database error"));

      const formData = new FormData();
      formData.append("lawyerId", "lawyer_123");
      formData.append("status", "VERIFIED");

      await expect(updateLawyerStatus(formData)).rejects.toThrow(
        "Failed to update lawyer status: Database error"
      );
    });
  });

  describe("updateLawyerActiveStatus", () => {
    beforeEach(() => {
      auth.mockResolvedValue({ userId: mockAdminUserId });
      db.user.findUnique.mockResolvedValue(mockAdminUser);
    });

    it("harusnya error kalo user bukan admin", async () => {
      db.user.findUnique.mockResolvedValue(mockRegularUser);

      const formData = new FormData();
      formData.append("lawyerId", "lawyer_123");
      formData.append("suspend", "true");

      await expect(updateLawyerActiveStatus(formData)).rejects.toThrow(
        "Unauthorized"
      );
    });

    it("harusnya error kalo lawyerId ngak diisi", async () => {
      const formData = new FormData();
      formData.append("suspend", "true");

      await expect(updateLawyerActiveStatus(formData)).rejects.toThrow(
        "Lawyer ID is required"
      );
    });

    it("harusnya suspend lawyer (set status PENDING)", async () => {
      db.user.update.mockResolvedValue({
        id: "lawyer_123",
        verificationStatus: "PENDING",
      });

      const formData = new FormData();
      formData.append("lawyerId", "lawyer_123");
      formData.append("suspend", "true");

      const result = await updateLawyerActiveStatus(formData);

      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: "lawyer_123" },
        data: { verificationStatus: "PENDING" },
      });
      expect(revalidatePath).toHaveBeenCalledWith("/admin");
      expect(result).toEqual({ success: true });
    });

    it("harusnya reinstate lawyer (set status VERIFIED)", async () => {
      db.user.update.mockResolvedValue({
        id: "lawyer_123",
        verificationStatus: "VERIFIED",
      });

      const formData = new FormData();
      formData.append("lawyerId", "lawyer_123");
      formData.append("suspend", "false");

      const result = await updateLawyerActiveStatus(formData);

      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: "lawyer_123" },
        data: { verificationStatus: "VERIFIED" },
      });
      expect(result).toEqual({ success: true });
    });

    it("harusnya error kalo ada masalah di database", async () => {
      db.user.update.mockRejectedValue(new Error("Database error"));

      const formData = new FormData();
      formData.append("lawyerId", "lawyer_123");
      formData.append("suspend", "true");

      await expect(updateLawyerActiveStatus(formData)).rejects.toThrow(
        "Failed to update lawyer status: Database error"
      );
    });
  });

  describe("getPendingPayouts", () => {
    const mockPendingPayouts = [
      {
        id: "payout_1",
        lawyerId: "lawyer_1",
        amount: 80,
        credits: 10,
        platformFee: 20,
        netAmount: 80,
        paypalEmail: "lawyer1@paypal.com",
        status: "PROCESSING",
        lawyer: {
          id: "lawyer_1",
          name: "Alice Lawyer",
          email: "lawyer1@example.com",
          specialty: "Corporate Law",
          credits: 15,
        },
      },
    ];

    beforeEach(() => {
      auth.mockResolvedValue({ userId: mockAdminUserId });
      db.user.findUnique.mockResolvedValue(mockAdminUser);
    });

    it("harusnya error kalo user bukan admin", async () => {
      db.user.findUnique.mockResolvedValue(mockRegularUser);

      await expect(getPendingPayouts()).rejects.toThrow("Unauthorized");
    });

    it("harusnya berhasil ngambil daftar payout pending", async () => {
      db.payout.findMany.mockResolvedValue(mockPendingPayouts);

      const result = await getPendingPayouts();

      expect(db.payout.findMany).toHaveBeenCalledWith({
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
      expect(result).toEqual({ payouts: mockPendingPayouts });
    });

    it("harusnya error kalo ada masalah di database", async () => {
      db.payout.findMany.mockRejectedValue(new Error("Database error"));

      await expect(getPendingPayouts()).rejects.toThrow(
        "Failed to fetch pending payouts"
      );
    });
  });

  describe("approvePayout", () => {
    const mockPayout = {
      id: "payout_123",
      lawyerId: "lawyer_1",
      credits: 10,
      status: "PROCESSING",
      lawyer: {
        id: "lawyer_1",
        credits: 15,
      },
    };

    beforeEach(() => {
      auth.mockResolvedValue({ userId: mockAdminUserId });
      db.user.findUnique.mockResolvedValue(mockAdminUser);
    });

    it("harusnya error kalo user bukan admin", async () => {
      db.user.findUnique.mockResolvedValue(mockRegularUser);

      const formData = new FormData();
      formData.append("payoutId", "payout_123");

      await expect(approvePayout(formData)).rejects.toThrow("Unauthorized");
    });

    it("harusnya error kalo payoutId ngak diisi", async () => {
      const formData = new FormData();

      await expect(approvePayout(formData)).rejects.toThrow(
        "Payout ID is required"
      );
    });

    it("harusnya error kalo payout ngak ditemukan", async () => {
      db.payout.findUnique.mockResolvedValue(null);

      const formData = new FormData();
      formData.append("payoutId", "payout_123");

      await expect(approvePayout(formData)).rejects.toThrow(
        "Failed to approve payout: Payout request not found or already processed"
      );
    });

    it("harusnya error kalo lawyer ngak punya cukup credits", async () => {
      db.payout.findUnique.mockResolvedValue({
        ...mockPayout,
        credits: 20, // More than lawyer has
      });

      const formData = new FormData();
      formData.append("payoutId", "payout_123");

      await expect(approvePayout(formData)).rejects.toThrow(
        "Failed to approve payout: Lawyer doesn't have enough credits for this payout"
      );
    });

    it("harusnya berhasil approve payout dan deduct credits", async () => {
      db.payout.findUnique.mockResolvedValue(mockPayout);

      // Mock transaction to execute the callback
      db.$transaction.mockImplementation(async (callback) => {
        return await callback({
          payout: {
            update: jest.fn().mockResolvedValue({}),
          },
          user: {
            update: jest.fn().mockResolvedValue({}),
          },
          creditTransaction: {
            create: jest.fn().mockResolvedValue({}),
          },
        });
      });

      const formData = new FormData();
      formData.append("payoutId", "payout_123");

      const result = await approvePayout(formData);

      expect(db.$transaction).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith("/admin");
      expect(result).toEqual({ success: true });
    });

    it("harusnya update payout status dengan processedBy yang benar", async () => {
      db.payout.findUnique.mockResolvedValue(mockPayout);

      const mockTx = {
        payout: {
          update: jest.fn().mockResolvedValue({}),
        },
        user: {
          update: jest.fn().mockResolvedValue({}),
        },
        creditTransaction: {
          create: jest.fn().mockResolvedValue({}),
        },
      };

      db.$transaction.mockImplementation(async (callback) => {
        return await callback(mockTx);
      });

      const formData = new FormData();
      formData.append("payoutId", "payout_123");

      await approvePayout(formData);

      expect(mockTx.payout.update).toHaveBeenCalledWith({
        where: { id: "payout_123" },
        data: {
          status: "PROCESSED",
          processedAt: expect.any(Date),
          processedBy: mockAdminUser.id,
        },
      });
    });

    it("harusnya deduct credits dari lawyer account", async () => {
      db.payout.findUnique.mockResolvedValue(mockPayout);

      const mockTx = {
        payout: {
          update: jest.fn().mockResolvedValue({}),
        },
        user: {
          update: jest.fn().mockResolvedValue({}),
        },
        creditTransaction: {
          create: jest.fn().mockResolvedValue({}),
        },
      };

      db.$transaction.mockImplementation(async (callback) => {
        return await callback(mockTx);
      });

      const formData = new FormData();
      formData.append("payoutId", "payout_123");

      await approvePayout(formData);

      expect(mockTx.user.update).toHaveBeenCalledWith({
        where: { id: "lawyer_1" },
        data: {
          credits: {
            decrement: 10,
          },
        },
      });
    });

    it("harusnya create credit transaction record", async () => {
      db.payout.findUnique.mockResolvedValue(mockPayout);

      const mockTx = {
        payout: {
          update: jest.fn().mockResolvedValue({}),
        },
        user: {
          update: jest.fn().mockResolvedValue({}),
        },
        creditTransaction: {
          create: jest.fn().mockResolvedValue({}),
        },
      };

      db.$transaction.mockImplementation(async (callback) => {
        return await callback(mockTx);
      });

      const formData = new FormData();
      formData.append("payoutId", "payout_123");

      await approvePayout(formData);

      expect(mockTx.creditTransaction.create).toHaveBeenCalledWith({
        data: {
          userId: "lawyer_1",
          amount: -10,
          type: "ADMIN_ADJUSTMENT",
        },
      });
    });

    it("harusnya error kalo transaksi database gagal", async () => {
      db.payout.findUnique.mockResolvedValue(mockPayout);
      db.$transaction.mockRejectedValue(new Error("Transaction failed"));

      const formData = new FormData();
      formData.append("payoutId", "payout_123");

      await expect(approvePayout(formData)).rejects.toThrow(
        "Failed to approve payout: Transaction failed"
      );
    });
  });
});
