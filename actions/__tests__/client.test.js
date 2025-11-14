import { getClientAppointments } from "@/actions/client";
import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

// Mock dependencies
jest.mock("@/lib/prisma", () => ({
  db: {
    user: {
      findUnique: jest.fn(),
    },
    appointment: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));

describe("Client Actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getClientAppointments", () => {
    const mockClientUserId = "clerk_client_123";
    const mockClientDbUser = {
      id: "db_client_123",
      clerkUserId: mockClientUserId,
      email: "client@example.com",
      role: "CLIENT",
    };

    const mockAppointments = [
      {
        id: "appointment_1",
        clientId: "db_client_123",
        lawyerId: "lawyer_1",
        startTime: new Date("2025-11-01T10:00:00Z"),
        endTime: new Date("2025-11-01T11:00:00Z"),
        status: "SCHEDULED",
        notes: "Initial consultation",
        lawyer: {
          id: "lawyer_1",
          name: "Alice Lawyer",
          specialty: "Corporate Law",
          imageUrl: "https://example.com/alice.jpg",
        },
      },
      {
        id: "appointment_2",
        clientId: "db_client_123",
        lawyerId: "lawyer_2",
        startTime: new Date("2025-11-05T14:00:00Z"),
        endTime: new Date("2025-11-05T15:00:00Z"),
        status: "SCHEDULED",
        notes: null,
        lawyer: {
          id: "lawyer_2",
          name: "Bob Lawyer",
          specialty: "Criminal Law",
          imageUrl: "https://example.com/bob.jpg",
        },
      },
    ];

    describe("Authorization", () => {
      it("harusnya error kalo user ngak teridentifikasi", async () => {
        auth.mockResolvedValue({ userId: null });

        await expect(getClientAppointments()).rejects.toThrow("Unauthorized");
        expect(db.user.findUnique).not.toHaveBeenCalled();
      });

      it("harusnya error kalo user bukan client", async () => {
        auth.mockResolvedValue({ userId: "clerk_lawyer_123" });
        db.user.findUnique.mockResolvedValue(null);

        const result = await getClientAppointments();

        expect(db.user.findUnique).toHaveBeenCalledWith({
          where: {
            clerkUserId: "clerk_lawyer_123",
            role: "CLIENT",
          },
          select: {
            id: true,
          },
        });
        expect(result).toEqual({ error: "Failed to fetch appointments" });
      });

      it("harusnya error kalo client ngak ditemukan di database", async () => {
        auth.mockResolvedValue({ userId: mockClientUserId });
        db.user.findUnique.mockResolvedValue(null);

        const result = await getClientAppointments();

        expect(result).toEqual({ error: "Failed to fetch appointments" });
      });
    });

    describe("Fetch Appointments", () => {
      beforeEach(() => {
        auth.mockResolvedValue({ userId: mockClientUserId });
        db.user.findUnique.mockResolvedValue(mockClientDbUser);
      });

      it("harusnya berhasil ngambil semua appointments client", async () => {
        db.appointment.findMany.mockResolvedValue(mockAppointments);

        const result = await getClientAppointments();

        expect(db.appointment.findMany).toHaveBeenCalledWith({
          where: {
            clientId: mockClientDbUser.id,
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
        expect(result).toEqual({ appointments: mockAppointments });
      });

      it("harusnya ngembaliin array kosong kalo client belum punya appointment", async () => {
        db.appointment.findMany.mockResolvedValue([]);

        const result = await getClientAppointments();

        expect(result).toEqual({ appointments: [] });
      });

      it("harusnya sort appointments berdasarkan startTime ascending", async () => {
        db.appointment.findMany.mockResolvedValue(mockAppointments);

        await getClientAppointments();

        expect(db.appointment.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: {
              startTime: "asc",
            },
          })
        );
      });

      it("harusnya include lawyer details dalam response", async () => {
        db.appointment.findMany.mockResolvedValue(mockAppointments);

        const result = await getClientAppointments();

        expect(result.appointments[0].lawyer).toHaveProperty("id");
        expect(result.appointments[0].lawyer).toHaveProperty("name");
        expect(result.appointments[0].lawyer).toHaveProperty("specialty");
        expect(result.appointments[0].lawyer).toHaveProperty("imageUrl");
      });

      it("harusnya hanya select field lawyer yang dibutuhkan", async () => {
        db.appointment.findMany.mockResolvedValue(mockAppointments);

        await getClientAppointments();

        expect(db.appointment.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
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
          })
        );
      });
    });

    describe("Error Handling", () => {
      beforeEach(() => {
        auth.mockResolvedValue({ userId: mockClientUserId });
        db.user.findUnique.mockResolvedValue(mockClientDbUser);
      });

      it("harusnya ngembaliin error object kalo ada masalah database saat fetch appointments", async () => {
        db.appointment.findMany.mockRejectedValue(
          new Error("Database connection failed")
        );

        const result = await getClientAppointments();

        expect(result).toEqual({ error: "Failed to fetch appointments" });
      });

      it("harusnya ngembaliin error object kalo ada masalah database saat find user", async () => {
        auth.mockResolvedValue({ userId: mockClientUserId });
        db.user.findUnique.mockRejectedValue(
          new Error("Database connection failed")
        );

        const result = await getClientAppointments();

        expect(result).toEqual({ error: "Failed to fetch appointments" });
      });

      it("harusnya handle error dengan gracefully tanpa crash", async () => {
        db.appointment.findMany.mockRejectedValue(
          new Error("Unexpected error")
        );

        const result = await getClientAppointments();

        expect(result).toHaveProperty("error");
        expect(typeof result.error).toBe("string");
      });
    });

    describe("Query Filters", () => {
      beforeEach(() => {
        auth.mockResolvedValue({ userId: mockClientUserId });
        db.user.findUnique.mockResolvedValue(mockClientDbUser);
        db.appointment.findMany.mockResolvedValue(mockAppointments);
      });

      it("harusnya filter appointments berdasarkan clientId", async () => {
        await getClientAppointments();

        expect(db.appointment.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              clientId: mockClientDbUser.id,
            },
          })
        );
      });

      it("harusnya ngambil appointments dari client yang benar", async () => {
        const differentClient = {
          id: "different_client_123",
          clerkUserId: "different_clerk_123",
          role: "CLIENT",
        };

        auth.mockResolvedValue({ userId: differentClient.clerkUserId });
        db.user.findUnique.mockResolvedValue(differentClient);

        await getClientAppointments();

        expect(db.appointment.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              clientId: differentClient.id,
            },
          })
        );
      });
    });

    describe("Data Integrity", () => {
      beforeEach(() => {
        auth.mockResolvedValue({ userId: mockClientUserId });
        db.user.findUnique.mockResolvedValue(mockClientDbUser);
      });

      it("harusnya preserve semua appointment data", async () => {
        db.appointment.findMany.mockResolvedValue(mockAppointments);

        const result = await getClientAppointments();

        expect(result.appointments).toHaveLength(2);
        expect(result.appointments[0]).toHaveProperty("id");
        expect(result.appointments[0]).toHaveProperty("clientId");
        expect(result.appointments[0]).toHaveProperty("lawyerId");
        expect(result.appointments[0]).toHaveProperty("startTime");
        expect(result.appointments[0]).toHaveProperty("endTime");
        expect(result.appointments[0]).toHaveProperty("status");
      });

      it("harusnya handle appointments dengan notes null", async () => {
        const appointmentWithNullNotes = [
          {
            ...mockAppointments[0],
            notes: null,
          },
        ];

        db.appointment.findMany.mockResolvedValue(appointmentWithNullNotes);

        const result = await getClientAppointments();

        expect(result.appointments[0].notes).toBeNull();
      });

      it("harusnya handle lawyer dengan imageUrl null", async () => {
        const appointmentWithNullImage = [
          {
            ...mockAppointments[0],
            lawyer: {
              ...mockAppointments[0].lawyer,
              imageUrl: null,
            },
          },
        ];

        db.appointment.findMany.mockResolvedValue(appointmentWithNullImage);

        const result = await getClientAppointments();

        expect(result.appointments[0].lawyer.imageUrl).toBeNull();
      });
    });
  });
});
