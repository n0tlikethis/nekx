import { setUserRole, getCurrentUser } from "@/actions/onboarding";
import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

// Mock dependencies
jest.mock("@/lib/prisma", () => ({
  db: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

describe("Onboarding Actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("setUserRole", () => {
    const mockUserId = "clerk_user_123";
    const mockDbUser = {
      id: "db_user_123",
      clerkUserId: mockUserId,
      email: "test@example.com",
      role: "UNASSIGNED",
    };

    beforeEach(() => {
      auth.mockResolvedValue({ userId: mockUserId });
      db.user.findUnique.mockResolvedValue(mockDbUser);
    });

    describe("Authorization", () => {
      it("harusnya error kalo user ngak teridentifikasi", async () => {
        auth.mockResolvedValue({ userId: null });

        const formData = new FormData();
        formData.append("role", "CLIENT");

        await expect(setUserRole(formData)).rejects.toThrow("Unauthorized");
      });

      it("harusnya error kalo user ngak ketemu di database", async () => {
        db.user.findUnique.mockResolvedValue(null);

        const formData = new FormData();
        formData.append("role", "CLIENT");

        await expect(setUserRole(formData)).rejects.toThrow(
          "User not found in database"
        );
      });
    });

    describe("Role Validation", () => {
      it("harusnya error kalo role ngak diisi", async () => {
        const formData = new FormData();

        await expect(setUserRole(formData)).rejects.toThrow(
          "Invalid role selection"
        );
      });

      it("harusnya error kalo role ngak valid", async () => {
        const formData = new FormData();
        formData.append("role", "INVALID_ROLE");

        await expect(setUserRole(formData)).rejects.toThrow(
          "Invalid role selection"
        );
      });

      it("harusnya error kalo role nya ADMIN", async () => {
        const formData = new FormData();
        formData.append("role", "ADMIN");

        await expect(setUserRole(formData)).rejects.toThrow(
          "Invalid role selection"
        );
      });
    });

    describe("CLIENT Role", () => {
      it("harusnya berhasil ngatur role user menjadi CLIENT", async () => {
        db.user.update.mockResolvedValue({
          ...mockDbUser,
          role: "CLIENT",
        });

        const formData = new FormData();
        formData.append("role", "CLIENT");

        const result = await setUserRole(formData);

        expect(db.user.update).toHaveBeenCalledWith({
          where: { clerkUserId: mockUserId },
          data: { role: "CLIENT" },
        });
        expect(revalidatePath).toHaveBeenCalledWith("/");
        expect(result).toEqual({
          success: true,
          redirect: "/lawyers",
        });
      });
    });

    describe("LAWYER Role", () => {
      const validLawyerData = {
        role: "LAWYER",
        specialty: "Corporate Law",
        experience: "5",
        credentialUrl: "https://example.com/credential.pdf",
        description: "Experienced corporate lawyer",
      };

      it("harusnya berhasil mengatur role user menjadi LAWYER kalo semua field sesuai", async () => {
        db.user.update.mockResolvedValue({
          ...mockDbUser,
          role: "LAWYER",
          ...validLawyerData,
          experience: 5,
        });

        const formData = new FormData();
        Object.entries(validLawyerData).forEach(([key, value]) => {
          formData.append(key, value);
        });

        const result = await setUserRole(formData);

        expect(db.user.update).toHaveBeenCalledWith({
          where: { clerkUserId: mockUserId },
          data: {
            role: "LAWYER",
            specialty: "Corporate Law",
            experience: 5,
            credentialUrl: "https://example.com/credential.pdf",
            description: "Experienced corporate lawyer",
            verificationStatus: "PENDING",
          },
        });
        expect(revalidatePath).toHaveBeenCalledWith("/");
        expect(result).toEqual({
          success: true,
          redirect: "/lawyer/verification",
        });
      });

      it("harusnya error kalo speciality ngak diisi", async () => {
        const formData = new FormData();
        formData.append("role", "LAWYER");
        formData.append("experience", "5");
        formData.append("credentialUrl", "https://example.com/credential.pdf");
        formData.append("description", "Experienced lawyer");

        await expect(setUserRole(formData)).rejects.toThrow(
          "All fields are required"
        );
      });

      it("harusnya error kalo experience ngak diisi", async () => {
        const formData = new FormData();
        formData.append("role", "LAWYER");
        formData.append("specialty", "Corporate Law");
        formData.append("credentialUrl", "https://example.com/credential.pdf");
        formData.append("description", "Experienced lawyer");

        await expect(setUserRole(formData)).rejects.toThrow(
          "All fields are required"
        );
      });

      it("harusnya error kalo credential ngak diisi", async () => {
        const formData = new FormData();
        formData.append("role", "LAWYER");
        formData.append("specialty", "Corporate Law");
        formData.append("experience", "5");
        formData.append("description", "Experienced lawyer");

        await expect(setUserRole(formData)).rejects.toThrow(
          "All fields are required"
        );
      });

      it("harusnya error kalo deskripsi ngak diisi", async () => {
        const formData = new FormData();
        formData.append("role", "LAWYER");
        formData.append("specialty", "Corporate Law");
        formData.append("experience", "5");
        formData.append("credentialUrl", "https://example.com/credential.pdf");

        await expect(setUserRole(formData)).rejects.toThrow(
          "All fields are required"
        );
      });

      it("parse experience sebagai integer", async () => {
        db.user.update.mockResolvedValue(mockDbUser);

        const formData = new FormData();
        Object.entries(validLawyerData).forEach(([key, value]) => {
          formData.append(key, value);
        });

        await setUserRole(formData);

        expect(db.user.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              experience: 5, // Should be number, not string
            }),
          })
        );
      });
    });

    describe("Error Handling", () => {
      it("handling kalo ada gangguan di database", async () => {
        db.user.update.mockRejectedValue(
          new Error("Database connection failed")
        );

        const formData = new FormData();
        formData.append("role", "CLIENT");

        await expect(setUserRole(formData)).rejects.toThrow(
          "Failed to update user profile: Database connection failed"
        );
      });
    });
  });

  describe("getCurrentUser", () => {
    const mockUserId = "clerk_user_123";
    const mockUser = {
      id: "db_user_123",
      clerkUserId: mockUserId,
      email: "test@example.com",
      name: "Test User",
      role: "CLIENT",
    };

    it("ngembaliin null kalo user ngak ter-auth", async () => {
      auth.mockResolvedValue({ userId: null });

      const result = await getCurrentUser();

      expect(result).toBeNull();
      expect(db.user.findUnique).not.toHaveBeenCalled();
    });

    it("ngembaliin user data kalo user ter-auth", async () => {
      auth.mockResolvedValue({ userId: mockUserId });
      db.user.findUnique.mockResolvedValue(mockUser);

      const result = await getCurrentUser();

      expect(db.user.findUnique).toHaveBeenCalledWith({
        where: { clerkUserId: mockUserId },
      });
      expect(result).toEqual(mockUser);
    });

    it("ngembaliin null kalo ada masalah di database", async () => {
      auth.mockResolvedValue({ userId: mockUserId });
      db.user.findUnique.mockRejectedValue(new Error("Database error"));

      const result = await getCurrentUser();

      expect(result).toBeNull();
    });

    it("ngembaliin null kalo user ngak ditemukan di database", async () => {
      auth.mockResolvedValue({ userId: mockUserId });
      db.user.findUnique.mockResolvedValue(null);

      const result = await getCurrentUser();

      expect(result).toBeNull();
    });
  });
});
