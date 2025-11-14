import {
  checkAndAllocateCredits,
  deductCreditsForAppointment,
} from "@/actions/credits";
import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { format } from "date-fns";

// Mock dependencies
jest.mock("@/lib/prisma", () => ({
  db: {
    user: {
      findUnique: jest.fn(),
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

jest.mock("date-fns", () => ({
  format: jest.fn(),
}));

describe("Credits Actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("checkAndAllocateCredits", () => {
    const mockClientUser = {
      id: "user_123",
      clerkUserId: "clerk_user_123",
      email: "client@example.com",
      role: "CLIENT",
      credits: 5,
      transactions: [],
    };

    describe("Input Validation", () => {
      it("harusnya return null kalo user ngak ada", async () => {
        const result = await checkAndAllocateCredits(null);
        expect(result).toBeNull();
      });

      it("harusnya return user tanpa alokasi kalo role bukan CLIENT", async () => {
        const lawyerUser = { ...mockClientUser, role: "LAWYER" };
        const result = await checkAndAllocateCredits(lawyerUser);
        expect(result).toEqual(lawyerUser);
        expect(db.$transaction).not.toHaveBeenCalled();
      });

      it("harusnya return user kalo ngak ada plan subscription", async () => {
        auth.mockResolvedValue({
          has: jest.fn().mockReturnValue(false),
        });

        const result = await checkAndAllocateCredits(mockClientUser);
        expect(result).toEqual(mockClientUser);
        expect(db.$transaction).not.toHaveBeenCalled();
      });
    });

    describe("Free User Plan", () => {
      beforeEach(() => {
        auth.mockResolvedValue({
          has: jest.fn((params) => {
            if (params.plan === "free_user") return true;
            return false;
          }),
        });
        format.mockReturnValue("2025-11");
      });

      it("harusnya alokasi 0 credits untuk free user plan di bulan baru", async () => {
        db.$transaction.mockImplementation(async (callback) => {
          return await callback({
            creditTransaction: {
              create: jest.fn().mockResolvedValue({}),
            },
            user: {
              update: jest.fn().mockResolvedValue({
                ...mockClientUser,
                credits: 5, // No increment
              }),
            },
          });
        });

        const result = await checkAndAllocateCredits(mockClientUser);

        expect(db.$transaction).toHaveBeenCalled();
        expect(revalidatePath).toHaveBeenCalledWith("/lawyers");
        expect(revalidatePath).toHaveBeenCalledWith("/appointments");
        expect(result.credits).toBe(5);
      });

      it("harusnya ngak alokasi credits kalo sudah ada transaction bulan ini dengan plan yang sama", async () => {
        const userWithTransaction = {
          ...mockClientUser,
          transactions: [
            {
              id: "trans_123",
              amount: 0,
              type: "CREDIT_PURCHASE",
              packageId: "free_user",
              createdAt: new Date("2025-11-01"),
            },
          ],
        };

        const result = await checkAndAllocateCredits(userWithTransaction);

        expect(result).toEqual(userWithTransaction);
        expect(db.$transaction).not.toHaveBeenCalled();
      });
    });

    describe("Standard Plan", () => {
      beforeEach(() => {
        auth.mockResolvedValue({
          has: jest.fn((params) => {
            if (params.plan === "standard") return true;
            return false;
          }),
        });
        format.mockReturnValue("2025-11");
      });

      it("harusnya alokasi 10 credits untuk standard plan di bulan baru", async () => {
        db.$transaction.mockImplementation(async (callback) => {
          return await callback({
            creditTransaction: {
              create: jest.fn().mockResolvedValue({}),
            },
            user: {
              update: jest.fn().mockResolvedValue({
                ...mockClientUser,
                credits: 15, // 5 + 10
              }),
            },
          });
        });

        const result = await checkAndAllocateCredits(mockClientUser);

        expect(db.$transaction).toHaveBeenCalled();
        expect(revalidatePath).toHaveBeenCalledWith("/lawyers");
        expect(revalidatePath).toHaveBeenCalledWith("/appointments");
        expect(result.credits).toBe(15);
      });

      it("harusnya ngak alokasi credits kalo sudah ada transaction bulan ini dengan plan yang sama", async () => {
        const userWithTransaction = {
          ...mockClientUser,
          transactions: [
            {
              id: "trans_123",
              amount: 10,
              type: "CREDIT_PURCHASE",
              packageId: "standard",
              createdAt: new Date("2025-11-01"),
            },
          ],
        };

        const result = await checkAndAllocateCredits(userWithTransaction);

        expect(result).toEqual(userWithTransaction);
        expect(db.$transaction).not.toHaveBeenCalled();
      });

      it("harusnya alokasi credits kalo bulan berbeda", async () => {
        format
          .mockReturnValueOnce("2025-10") // for transaction date
          .mockReturnValueOnce("2025-11"); // for current date

        const userWithOldTransaction = {
          ...mockClientUser,
          transactions: [
            {
              id: "trans_123",
              amount: 10,
              type: "CREDIT_PURCHASE",
              packageId: "standard",
              createdAt: new Date("2025-10-01"),
            },
          ],
        };

        db.$transaction.mockImplementation(async (callback) => {
          return await callback({
            creditTransaction: {
              create: jest.fn().mockResolvedValue({}),
            },
            user: {
              update: jest.fn().mockResolvedValue({
                ...mockClientUser,
                credits: 15,
              }),
            },
          });
        });

        const result = await checkAndAllocateCredits(userWithOldTransaction);

        expect(db.$transaction).toHaveBeenCalled();
        expect(result.credits).toBe(15);
      });

      it("harusnya alokasi credits kalo plan berbeda dari bulan ini", async () => {
        format.mockReturnValue("2025-11");

        const userWithDifferentPlan = {
          ...mockClientUser,
          transactions: [
            {
              id: "trans_123",
              amount: 0,
              type: "CREDIT_PURCHASE",
              packageId: "free_user", // Different plan
              createdAt: new Date("2025-11-01"),
            },
          ],
        };

        db.$transaction.mockImplementation(async (callback) => {
          return await callback({
            creditTransaction: {
              create: jest.fn().mockResolvedValue({}),
            },
            user: {
              update: jest.fn().mockResolvedValue({
                ...mockClientUser,
                credits: 15,
              }),
            },
          });
        });

        const result = await checkAndAllocateCredits(userWithDifferentPlan);

        expect(db.$transaction).toHaveBeenCalled();
        expect(result.credits).toBe(15);
      });
    });

    describe("Premium Plan", () => {
      beforeEach(() => {
        auth.mockResolvedValue({
          has: jest.fn((params) => {
            if (params.plan === "premium") return true;
            return false;
          }),
        });
        format.mockReturnValue("2025-11");
      });

      it("harusnya alokasi 24 credits untuk premium plan di bulan baru", async () => {
        db.$transaction.mockImplementation(async (callback) => {
          return await callback({
            creditTransaction: {
              create: jest.fn().mockResolvedValue({}),
            },
            user: {
              update: jest.fn().mockResolvedValue({
                ...mockClientUser,
                credits: 29, // 5 + 24
              }),
            },
          });
        });

        const result = await checkAndAllocateCredits(mockClientUser);

        expect(db.$transaction).toHaveBeenCalled();
        expect(revalidatePath).toHaveBeenCalledWith("/lawyers");
        expect(revalidatePath).toHaveBeenCalledWith("/appointments");
        expect(result.credits).toBe(29);
      });

      it("harusnya ngak alokasi credits kalo sudah ada transaction bulan ini dengan plan yang sama", async () => {
        const userWithTransaction = {
          ...mockClientUser,
          transactions: [
            {
              id: "trans_123",
              amount: 24,
              type: "CREDIT_PURCHASE",
              packageId: "premium",
              createdAt: new Date("2025-11-01"),
            },
          ],
        };

        const result = await checkAndAllocateCredits(userWithTransaction);

        expect(result).toEqual(userWithTransaction);
        expect(db.$transaction).not.toHaveBeenCalled();
      });
    });

    describe("Error Handling", () => {
      beforeEach(() => {
        auth.mockResolvedValue({
          has: jest.fn((params) => {
            if (params.plan === "standard") return true;
            return false;
          }),
        });
        format.mockReturnValue("2025-11");
      });

      it("harusnya return null kalo ada error di database", async () => {
        db.$transaction.mockRejectedValue(
          new Error("Database connection failed")
        );

        const result = await checkAndAllocateCredits(mockClientUser);

        expect(result).toBeNull();
      });
    });
  });

  describe("deductCreditsForAppointment", () => {
    const mockClient = {
      id: "client_123",
      clerkUserId: "clerk_client_123",
      email: "client@example.com",
      role: "CLIENT",
      credits: 10,
    };

    const mockLawyer = {
      id: "lawyer_123",
      clerkUserId: "clerk_lawyer_123",
      email: "lawyer@example.com",
      role: "LAWYER",
      credits: 5,
    };

    beforeEach(() => {
      db.user.findUnique
        .mockResolvedValueOnce(mockClient) // First call for client
        .mockResolvedValueOnce(mockLawyer); // Second call for lawyer
    });

    describe("Validation", () => {
      it("harusnya error kalo client ngak punya cukup credits", async () => {
        const poorClient = { ...mockClient, credits: 1 };
        db.user.findUnique
          .mockReset()
          .mockResolvedValueOnce(poorClient)
          .mockResolvedValueOnce(mockLawyer);

        const result = await deductCreditsForAppointment(
          "client_123",
          "lawyer_123"
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe(
          "Insufficient credits to book an appointment"
        );
        expect(db.$transaction).not.toHaveBeenCalled();
      });

      it("harusnya error kalo lawyer ngak ditemukan", async () => {
        db.user.findUnique
          .mockReset()
          .mockResolvedValueOnce(mockClient)
          .mockResolvedValueOnce(null);

        const result = await deductCreditsForAppointment(
          "client_123",
          "invalid_lawyer"
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe("Lawyer not found");
        expect(db.$transaction).not.toHaveBeenCalled();
      });
    });

    describe("Success Cases", () => {
      it("harusnya berhasil deduct 2 credits dari client dan add ke lawyer", async () => {
        const updatedClient = { ...mockClient, credits: 8 }; // 10 - 2
        const updatedLawyer = { ...mockLawyer, credits: 7 }; // 5 + 2

        db.$transaction.mockImplementation(async (callback) => {
          return await callback({
            creditTransaction: {
              create: jest.fn().mockResolvedValue({}),
            },
            user: {
              update: jest
                .fn()
                .mockResolvedValueOnce(updatedClient)
                .mockResolvedValueOnce(updatedLawyer),
            },
          });
        });

        const result = await deductCreditsForAppointment(
          "client_123",
          "lawyer_123"
        );

        expect(result.success).toBe(true);
        expect(result.user.credits).toBe(8);
        expect(db.$transaction).toHaveBeenCalled();
      });

      it("harusnya create 2 credit transactions (deduction untuk client, addition untuk lawyer)", async () => {
        const mockCreate = jest.fn().mockResolvedValue({});
        const mockUpdate = jest
          .fn()
          .mockResolvedValueOnce({ ...mockClient, credits: 8 })
          .mockResolvedValueOnce({ ...mockLawyer, credits: 7 });

        db.$transaction.mockImplementation(async (callback) => {
          return await callback({
            creditTransaction: {
              create: mockCreate,
            },
            user: {
              update: mockUpdate,
            },
          });
        });

        await deductCreditsForAppointment("client_123", "lawyer_123");

        // Check that create was called twice
        expect(mockCreate).toHaveBeenCalledTimes(2);

        // Check client deduction transaction
        expect(mockCreate).toHaveBeenCalledWith({
          data: {
            userId: "client_123",
            amount: -2,
            type: "APPOINTMENT_DEDUCTION",
          },
        });

        // Check lawyer addition transaction
        expect(mockCreate).toHaveBeenCalledWith({
          data: {
            userId: "lawyer_123",
            amount: 2,
            type: "APPOINTMENT_DEDUCTION",
          },
        });

        // Check that update was called twice
        expect(mockUpdate).toHaveBeenCalledTimes(2);

        // Check client update (decrement)
        expect(mockUpdate).toHaveBeenCalledWith({
          where: { id: "client_123" },
          data: { credits: { decrement: 2 } },
        });

        // Check lawyer update (increment)
        expect(mockUpdate).toHaveBeenCalledWith({
          where: { id: "lawyer_123" },
          data: { credits: { increment: 2 } },
        });
      });

      it("harusnya handle transaction dengan exact 2 credits", async () => {
        const clientWith2Credits = { ...mockClient, credits: 2 };
        db.user.findUnique
          .mockReset()
          .mockResolvedValueOnce(clientWith2Credits)
          .mockResolvedValueOnce(mockLawyer);

        db.$transaction.mockImplementation(async (callback) => {
          return await callback({
            creditTransaction: {
              create: jest.fn().mockResolvedValue({}),
            },
            user: {
              update: jest
                .fn()
                .mockResolvedValueOnce({ ...clientWith2Credits, credits: 0 })
                .mockResolvedValueOnce({ ...mockLawyer, credits: 7 }),
            },
          });
        });

        const result = await deductCreditsForAppointment(
          "client_123",
          "lawyer_123"
        );

        expect(result.success).toBe(true);
        expect(result.user.credits).toBe(0);
      });
    });

    describe("Error Handling", () => {
      it("harusnya return error kalo transaction gagal", async () => {
        db.$transaction.mockRejectedValue(new Error("Transaction failed"));

        const result = await deductCreditsForAppointment(
          "client_123",
          "lawyer_123"
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe("Transaction failed");
      });

      it("harusnya return error kalo user ngak ditemukan", async () => {
        db.user.findUnique.mockReset().mockResolvedValueOnce(null);

        const result = await deductCreditsForAppointment(
          "invalid_client",
          "lawyer_123"
        );

        expect(result.success).toBe(false);
      });
    });
  });
});
