import {
  setAvailabilitySlots,
  getLawyerAvailability,
  getLawyerAppointments,
  cancelAppointment,
  addAppointmentNotes,
  markAppointmentCompleted,
} from "@/actions/lawyer";
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
    availability: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
    appointment: {
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

describe("Lawyer Actions", () => {
  const mockUserId = "clerk_user_123";
  const mockLawyer = {
    id: "lawyer_123",
    clerkUserId: mockUserId,
    email: "lawyer@example.com",
    role: "LAWYER",
    credits: 10,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("setAvailabilitySlots", () => {
    beforeEach(() => {
      auth.mockResolvedValue({ userId: mockUserId });
      db.user.findUnique.mockResolvedValue(mockLawyer);
    });

    describe("Authorization", () => {
      it("harusnya error kalo user ngak ter-auth", async () => {
        auth.mockResolvedValue({ userId: null });
        const formData = new FormData();
        formData.append("startTime", "2025-12-01T09:00:00Z");
        formData.append("endTime", "2025-12-01T17:00:00Z");

        await expect(setAvailabilitySlots(formData)).rejects.toThrow(
          "Unauthorized"
        );
      });

      it("harusnya error kalo user bukan lawyer", async () => {
        db.user.findUnique.mockResolvedValue(null);
        const formData = new FormData();
        formData.append("startTime", "2025-12-01T09:00:00Z");
        formData.append("endTime", "2025-12-01T17:00:00Z");

        await expect(setAvailabilitySlots(formData)).rejects.toThrow(
          "Lawyer not found"
        );
      });
    });

    describe("Validation", () => {
      it("harusnya error kalo startTime ngak diisi", async () => {
        const formData = new FormData();
        formData.append("endTime", "2025-12-01T17:00:00Z");

        await expect(setAvailabilitySlots(formData)).rejects.toThrow(
          "Start time and end time are required"
        );
      });

      it("harusnya error kalo endTime ngak diisi", async () => {
        const formData = new FormData();
        formData.append("startTime", "2025-12-01T09:00:00Z");

        await expect(setAvailabilitySlots(formData)).rejects.toThrow(
          "Start time and end time are required"
        );
      });

      it("harusnya error kalo startTime lebih besar atau sama dengan endTime", async () => {
        const formData = new FormData();
        formData.append("startTime", "2025-12-01T17:00:00Z");
        formData.append("endTime", "2025-12-01T09:00:00Z");

        await expect(setAvailabilitySlots(formData)).rejects.toThrow(
          "Start time must be before end time"
        );
      });
    });

    describe("Success Cases", () => {
      it("harusnya berhasil membuat availability slot baru", async () => {
        db.availability.findMany.mockResolvedValue([]);
        const mockSlot = {
          id: "slot_123",
          lawyerId: mockLawyer.id,
          startTime: new Date("2025-12-01T09:00:00Z"),
          endTime: new Date("2025-12-01T17:00:00Z"),
          status: "AVAILABLE",
        };
        db.availability.create.mockResolvedValue(mockSlot);

        const formData = new FormData();
        formData.append("startTime", "2025-12-01T09:00:00Z");
        formData.append("endTime", "2025-12-01T17:00:00Z");

        const result = await setAvailabilitySlots(formData);

        expect(db.availability.create).toHaveBeenCalledWith({
          data: {
            lawyerId: mockLawyer.id,
            startTime: new Date("2025-12-01T09:00:00Z"),
            endTime: new Date("2025-12-01T17:00:00Z"),
            status: "AVAILABLE",
          },
        });
        expect(revalidatePath).toHaveBeenCalledWith("/lawyer");
        expect(result).toEqual({ success: true, slot: mockSlot });
      });

      it("harusnya menghapus slot lama yang ngak ada appointment sebelum membuat slot baru", async () => {
        const existingSlots = [
          {
            id: "slot_old_1",
            lawyerId: mockLawyer.id,
            appointment: null,
          },
          {
            id: "slot_old_2",
            lawyerId: mockLawyer.id,
            appointment: null,
          },
        ];
        db.availability.findMany.mockResolvedValue(existingSlots);
        db.availability.deleteMany.mockResolvedValue({ count: 2 });
        db.availability.create.mockResolvedValue({
          id: "slot_new",
          lawyerId: mockLawyer.id,
          startTime: new Date("2025-12-01T09:00:00Z"),
          endTime: new Date("2025-12-01T17:00:00Z"),
          status: "AVAILABLE",
        });

        const formData = new FormData();
        formData.append("startTime", "2025-12-01T09:00:00Z");
        formData.append("endTime", "2025-12-01T17:00:00Z");

        await setAvailabilitySlots(formData);

        expect(db.availability.deleteMany).toHaveBeenCalledWith({
          where: {
            id: {
              in: ["slot_old_1", "slot_old_2"],
            },
          },
        });
      });
    });
  });

  describe("getLawyerAvailability", () => {
    beforeEach(() => {
      auth.mockResolvedValue({ userId: mockUserId });
      db.user.findUnique.mockResolvedValue(mockLawyer);
    });

    describe("Authorization", () => {
      it("harusnya error kalo user ngak ter-auth", async () => {
        auth.mockResolvedValue({ userId: null });

        await expect(getLawyerAvailability()).rejects.toThrow("Unauthorized");
      });

      it("harusnya error kalo user bukan lawyer", async () => {
        db.user.findUnique.mockResolvedValue(null);

        await expect(getLawyerAvailability()).rejects.toThrow(
          "Lawyer not found"
        );
      });
    });

    describe("Success Cases", () => {
      it("harusnya mengembalikan list availability slots", async () => {
        const mockSlots = [
          {
            id: "slot_1",
            lawyerId: mockLawyer.id,
            startTime: new Date("2025-12-01T09:00:00Z"),
            endTime: new Date("2025-12-01T10:00:00Z"),
            status: "AVAILABLE",
          },
          {
            id: "slot_2",
            lawyerId: mockLawyer.id,
            startTime: new Date("2025-12-01T10:00:00Z"),
            endTime: new Date("2025-12-01T11:00:00Z"),
            status: "BOOKED",
          },
        ];
        db.availability.findMany.mockResolvedValue(mockSlots);

        const result = await getLawyerAvailability();

        expect(db.availability.findMany).toHaveBeenCalledWith({
          where: { lawyerId: mockLawyer.id },
          orderBy: { startTime: "asc" },
        });
        expect(result).toEqual({ slots: mockSlots });
      });

      it("harusnya mengembalikan array kosong kalo ngak ada slots", async () => {
        db.availability.findMany.mockResolvedValue([]);

        const result = await getLawyerAvailability();

        expect(result).toEqual({ slots: [] });
      });
    });
  });

  describe("getLawyerAppointments", () => {
    beforeEach(() => {
      auth.mockResolvedValue({ userId: mockUserId });
      db.user.findUnique.mockResolvedValue(mockLawyer);
    });

    describe("Authorization", () => {
      it("harusnya error kalo user ngak ter-auth", async () => {
        auth.mockResolvedValue({ userId: null });

        await expect(getLawyerAppointments()).rejects.toThrow("Unauthorized");
      });

      it("harusnya error kalo user bukan lawyer", async () => {
        db.user.findUnique.mockResolvedValue(null);

        await expect(getLawyerAppointments()).rejects.toThrow(
          "Lawyer not found"
        );
      });
    });

    describe("Success Cases", () => {
      it("harusnya mengembalikan scheduled appointments dengan client data", async () => {
        const mockAppointments = [
          {
            id: "appt_1",
            clientId: "client_1",
            lawyerId: mockLawyer.id,
            startTime: new Date("2025-12-01T09:00:00Z"),
            endTime: new Date("2025-12-01T10:00:00Z"),
            status: "SCHEDULED",
            client: {
              id: "client_1",
              name: "John Doe",
              email: "john@example.com",
            },
          },
        ];
        db.appointment.findMany.mockResolvedValue(mockAppointments);

        const result = await getLawyerAppointments();

        expect(db.appointment.findMany).toHaveBeenCalledWith({
          where: {
            lawyerId: mockLawyer.id,
            status: { in: ["SCHEDULED"] },
          },
          include: { client: true },
          orderBy: { startTime: "asc" },
        });
        expect(result).toEqual({ appointments: mockAppointments });
      });

      it("harusnya mengembalikan array kosong kalo ngak ada appointments", async () => {
        db.appointment.findMany.mockResolvedValue([]);

        const result = await getLawyerAppointments();

        expect(result).toEqual({ appointments: [] });
      });
    });
  });

  describe("cancelAppointment", () => {
    const mockClient = {
      id: "client_123",
      clerkUserId: "clerk_client_123",
      email: "client@example.com",
      role: "CLIENT",
      credits: 0,
    };

    const mockAppointment = {
      id: "appt_123",
      clientId: mockClient.id,
      lawyerId: mockLawyer.id,
      startTime: new Date("2025-12-01T09:00:00Z"),
      endTime: new Date("2025-12-01T10:00:00Z"),
      status: "SCHEDULED",
      client: mockClient,
      lawyer: mockLawyer,
    };

    beforeEach(() => {
      auth.mockResolvedValue({ userId: mockUserId });
      db.user.findUnique.mockResolvedValue(mockLawyer);
      db.appointment.findUnique.mockResolvedValue(mockAppointment);
    });

    describe("Authorization", () => {
      it("harusnya error kalo user ngak ter-auth", async () => {
        auth.mockResolvedValue({ userId: null });
        const formData = new FormData();
        formData.append("appointmentId", "appt_123");

        await expect(cancelAppointment(formData)).rejects.toThrow(
          "Unauthorized"
        );
      });

      it("harusnya error kalo user ngak ditemukan", async () => {
        db.user.findUnique.mockResolvedValue(null);
        const formData = new FormData();
        formData.append("appointmentId", "appt_123");

        await expect(cancelAppointment(formData)).rejects.toThrow(
          "User not found"
        );
      });

      it("harusnya error kalo user bukan lawyer atau client dari appointment", async () => {
        const otherUser = {
          id: "other_user",
          clerkUserId: "clerk_other",
          role: "CLIENT",
        };
        db.user.findUnique.mockResolvedValue(otherUser);

        const formData = new FormData();
        formData.append("appointmentId", "appt_123");

        await expect(cancelAppointment(formData)).rejects.toThrow(
          "You are not authorized to cancel this appointment"
        );
      });
    });

    describe("Validation", () => {
      it("harusnya error kalo appointmentId ngak diisi", async () => {
        const formData = new FormData();

        await expect(cancelAppointment(formData)).rejects.toThrow(
          "Appointment ID is required"
        );
      });

      it("harusnya error kalo appointment ngak ditemukan", async () => {
        db.appointment.findUnique.mockResolvedValue(null);
        const formData = new FormData();
        formData.append("appointmentId", "invalid_id");

        await expect(cancelAppointment(formData)).rejects.toThrow(
          "Appointment not found"
        );
      });
    });

    describe("Success Cases", () => {
      it("harusnya berhasil cancel appointment dan refund credits", async () => {
        db.$transaction.mockImplementation(async (callback) => {
          return await callback({
            appointment: {
              update: jest.fn().mockResolvedValue({
                ...mockAppointment,
                status: "CANCELLED",
              }),
            },
            creditTransaction: {
              create: jest.fn().mockResolvedValue({}),
            },
            user: {
              update: jest.fn().mockResolvedValue({}),
            },
          });
        });

        const formData = new FormData();
        formData.append("appointmentId", "appt_123");

        const result = await cancelAppointment(formData);

        expect(db.$transaction).toHaveBeenCalled();
        expect(revalidatePath).toHaveBeenCalledWith("/lawyer");
        expect(result).toEqual({ success: true });
      });

      it("harusnya revalidate path /appointments kalo user adalah client", async () => {
        db.user.findUnique.mockResolvedValue(mockClient);
        db.$transaction.mockImplementation(async (callback) => {
          return await callback({
            appointment: {
              update: jest.fn().mockResolvedValue({
                ...mockAppointment,
                status: "CANCELLED",
              }),
            },
            creditTransaction: {
              create: jest.fn().mockResolvedValue({}),
            },
            user: {
              update: jest.fn().mockResolvedValue({}),
            },
          });
        });

        const formData = new FormData();
        formData.append("appointmentId", "appt_123");

        await cancelAppointment(formData);

        expect(revalidatePath).toHaveBeenCalledWith("/appointments");
      });
    });
  });

  describe("addAppointmentNotes", () => {
    const mockAppointment = {
      id: "appt_123",
      lawyerId: mockLawyer.id,
      notes: null,
    };

    beforeEach(() => {
      auth.mockResolvedValue({ userId: mockUserId });
      db.user.findUnique.mockResolvedValue(mockLawyer);
      db.appointment.findUnique.mockResolvedValue(mockAppointment);
    });

    describe("Authorization", () => {
      it("harusnya error kalo user ngak ter-auth", async () => {
        auth.mockResolvedValue({ userId: null });
        const formData = new FormData();
        formData.append("appointmentId", "appt_123");
        formData.append("notes", "Test notes");

        await expect(addAppointmentNotes(formData)).rejects.toThrow(
          "Unauthorized"
        );
      });

      it("harusnya error kalo user bukan lawyer", async () => {
        db.user.findUnique.mockResolvedValue(null);
        const formData = new FormData();
        formData.append("appointmentId", "appt_123");
        formData.append("notes", "Test notes");

        await expect(addAppointmentNotes(formData)).rejects.toThrow(
          "Lawyer not found"
        );
      });

      it("harusnya error kalo appointment bukan milik lawyer", async () => {
        db.appointment.findUnique.mockResolvedValue(null);
        const formData = new FormData();
        formData.append("appointmentId", "appt_123");
        formData.append("notes", "Test notes");

        await expect(addAppointmentNotes(formData)).rejects.toThrow(
          "Appointment not found"
        );
      });
    });

    describe("Validation", () => {
      it("harusnya error kalo appointmentId ngak diisi", async () => {
        const formData = new FormData();
        formData.append("notes", "Test notes");

        await expect(addAppointmentNotes(formData)).rejects.toThrow(
          "Appointment ID and notes are required"
        );
      });

      it("harusnya error kalo notes ngak diisi", async () => {
        const formData = new FormData();
        formData.append("appointmentId", "appt_123");

        await expect(addAppointmentNotes(formData)).rejects.toThrow(
          "Appointment ID and notes are required"
        );
      });
    });

    describe("Success Cases", () => {
      it("harusnya berhasil menambahkan notes ke appointment", async () => {
        const updatedAppointment = {
          ...mockAppointment,
          notes: "Test notes from lawyer",
        };
        db.appointment.update.mockResolvedValue(updatedAppointment);

        const formData = new FormData();
        formData.append("appointmentId", "appt_123");
        formData.append("notes", "Test notes from lawyer");

        const result = await addAppointmentNotes(formData);

        expect(db.appointment.update).toHaveBeenCalledWith({
          where: { id: "appt_123" },
          data: { notes: "Test notes from lawyer" },
        });
        expect(revalidatePath).toHaveBeenCalledWith("/lawyer");
        expect(result).toEqual({
          success: true,
          appointment: updatedAppointment,
        });
      });
    });
  });

  describe("markAppointmentCompleted", () => {
    beforeEach(() => {
      auth.mockResolvedValue({ userId: mockUserId });
      db.user.findUnique.mockResolvedValue(mockLawyer);
    });

    describe("Authorization", () => {
      it("harusnya error kalo user ngak ter-auth", async () => {
        auth.mockResolvedValue({ userId: null });
        const formData = new FormData();
        formData.append("appointmentId", "appt_123");

        await expect(markAppointmentCompleted(formData)).rejects.toThrow(
          "Unauthorized"
        );
      });

      it("harusnya error kalo user bukan lawyer", async () => {
        db.user.findUnique.mockResolvedValue(null);
        const formData = new FormData();
        formData.append("appointmentId", "appt_123");

        await expect(markAppointmentCompleted(formData)).rejects.toThrow(
          "Lawyer not found"
        );
      });

      it("harusnya error kalo appointment bukan milik lawyer", async () => {
        db.appointment.findUnique.mockResolvedValue(null);
        const formData = new FormData();
        formData.append("appointmentId", "appt_123");

        await expect(markAppointmentCompleted(formData)).rejects.toThrow(
          "Appointment not found or not authorized"
        );
      });
    });

    describe("Validation", () => {
      it("harusnya error kalo appointmentId ngak diisi", async () => {
        const formData = new FormData();

        await expect(markAppointmentCompleted(formData)).rejects.toThrow(
          "Appointment ID is required"
        );
      });

      it("harusnya error kalo appointment status bukan SCHEDULED", async () => {
        const mockAppointment = {
          id: "appt_123",
          lawyerId: mockLawyer.id,
          status: "COMPLETED",
          endTime: new Date(Date.now() - 3600000), // 1 hour ago
          client: { id: "client_123" },
        };
        db.appointment.findUnique.mockResolvedValue(mockAppointment);

        const formData = new FormData();
        formData.append("appointmentId", "appt_123");

        await expect(markAppointmentCompleted(formData)).rejects.toThrow(
          "Only scheduled appointments can be marked as completed"
        );
      });

      it("harusnya error kalo waktu sekarang belum melewati endTime", async () => {
        const mockAppointment = {
          id: "appt_123",
          lawyerId: mockLawyer.id,
          status: "SCHEDULED",
          endTime: new Date(Date.now() + 3600000), // 1 hour from now
          client: { id: "client_123" },
        };
        db.appointment.findUnique.mockResolvedValue(mockAppointment);

        const formData = new FormData();
        formData.append("appointmentId", "appt_123");

        await expect(markAppointmentCompleted(formData)).rejects.toThrow(
          "Cannot mark appointment as completed before the scheduled end time"
        );
      });
    });

    describe("Success Cases", () => {
      it("harusnya berhasil mark appointment sebagai completed", async () => {
        const mockAppointment = {
          id: "appt_123",
          lawyerId: mockLawyer.id,
          status: "SCHEDULED",
          endTime: new Date(Date.now() - 3600000), // 1 hour ago
          client: { id: "client_123" },
        };
        const updatedAppointment = {
          ...mockAppointment,
          status: "COMPLETED",
        };
        db.appointment.findUnique.mockResolvedValue(mockAppointment);
        db.appointment.update.mockResolvedValue(updatedAppointment);

        const formData = new FormData();
        formData.append("appointmentId", "appt_123");

        const result = await markAppointmentCompleted(formData);

        expect(db.appointment.update).toHaveBeenCalledWith({
          where: { id: "appt_123" },
          data: { status: "COMPLETED" },
        });
        expect(revalidatePath).toHaveBeenCalledWith("/lawyer");
        expect(result).toEqual({
          success: true,
          appointment: updatedAppointment,
        });
      });
    });
  });
});
