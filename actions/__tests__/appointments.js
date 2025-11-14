import {
  bookAppointment,
  generateChatToken,
  getChatChannelForAppointment,
  getLawyerById,
  getAvailableTimeSlots,
} from "@/actions/appointments";
import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { deductCreditsForAppointment } from "@/actions/credits";
import { StreamChat } from "stream-chat";

// Mock dependencies
jest.mock("@/lib/prisma", () => ({
  db: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    appointment: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    availability: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

jest.mock("@/actions/credits", () => ({
  deductCreditsForAppointment: jest.fn(),
}));

jest.mock("stream-chat", () => ({
  StreamChat: {
    getInstance: jest.fn(() => ({
      upsertUsers: jest.fn().mockResolvedValue({}),
      upsertUser: jest.fn().mockResolvedValue({}),
      createToken: jest.fn().mockReturnValue("mock_token"),
      channel: jest.fn(() => ({
        create: jest.fn().mockResolvedValue({}),
      })),
    })),
  },
}));

describe("Appointments Actions", () => {
  const mockClientUserId = "clerk_client_123";
  const mockClient = {
    id: "db_client_123",
    clerkUserId: mockClientUserId,
    email: "client@example.com",
    name: "Client Name",
    role: "CLIENT",
    credits: 5,
  };

  const mockLawyer = {
    id: "db_lawyer_123",
    clerkUserId: "clerk_lawyer_123",
    email: "lawyer@example.com",
    name: "Lawyer Name",
    role: "LAWYER",
    verificationStatus: "VERIFIED",
    specialty: "Corporate Law",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("bookAppointment", () => {
    const validBookingData = {
      lawyerId: "db_lawyer_123",
      startTime: "2025-11-15T10:00:00Z",
      endTime: "2025-11-15T10:30:00Z",
      description: "Legal consultation",
    };

    beforeEach(() => {
      auth.mockResolvedValue({ userId: mockClientUserId });
      db.user.findUnique.mockImplementation((params) => {
        if (params.where.clerkUserId === mockClientUserId) {
          return Promise.resolve(mockClient);
        }
        if (params.where.id === mockLawyer.id) {
          return Promise.resolve(mockLawyer);
        }
        return Promise.resolve(null);
      });
    });

    describe("Authorization", () => {
      it("harusnya error kalo user ngak teridentifikasi", async () => {
        auth.mockResolvedValue({ userId: null });

        const formData = new FormData();
        formData.append("lawyerId", validBookingData.lawyerId);
        formData.append("startTime", validBookingData.startTime);
        formData.append("endTime", validBookingData.endTime);

        await expect(bookAppointment(formData)).rejects.toThrow("Unauthorized");
      });

      it("harusnya error kalo user bukan client", async () => {
        db.user.findUnique.mockResolvedValueOnce(null);

        const formData = new FormData();
        formData.append("lawyerId", validBookingData.lawyerId);
        formData.append("startTime", validBookingData.startTime);
        formData.append("endTime", validBookingData.endTime);

        await expect(bookAppointment(formData)).rejects.toThrow(
          "Failed to book appointment: Client not found"
        );
      });
    });

    describe("Input Validation", () => {
      it("harusnya error kalo lawyerId ngak diisi", async () => {
        const formData = new FormData();
        formData.append("startTime", validBookingData.startTime);
        formData.append("endTime", validBookingData.endTime);

        await expect(bookAppointment(formData)).rejects.toThrow(
          "Failed to book appointment: Lawyer, start time, and end time are required"
        );
      });

      it("harusnya error kalo startTime ngak diisi", async () => {
        const formData = new FormData();
        formData.append("lawyerId", validBookingData.lawyerId);
        formData.append("endTime", validBookingData.endTime);

        await expect(bookAppointment(formData)).rejects.toThrow(
          "Failed to book appointment: Lawyer, start time, and end time are required"
        );
      });

      it("harusnya error kalo endTime ngak diisi", async () => {
        const formData = new FormData();
        formData.append("lawyerId", validBookingData.lawyerId);
        formData.append("startTime", validBookingData.startTime);

        await expect(bookAppointment(formData)).rejects.toThrow(
          "Failed to book appointment: Lawyer, start time, and end time are required"
        );
      });

      it("harusnya error kalo lawyer ngak ditemukan", async () => {
        db.user.findUnique.mockImplementation((params) => {
          if (params.where.clerkUserId === mockClientUserId) {
            return Promise.resolve(mockClient);
          }
          return Promise.resolve(null);
        });

        const formData = new FormData();
        formData.append("lawyerId", "invalid_lawyer");
        formData.append("startTime", validBookingData.startTime);
        formData.append("endTime", validBookingData.endTime);

        await expect(bookAppointment(formData)).rejects.toThrow(
          "Failed to book appointment: Lawyer not found or not verified"
        );
      });

      it("harusnya error kalo lawyer belum verified", async () => {
        db.user.findUnique.mockImplementation((params) => {
          if (params.where.clerkUserId === mockClientUserId) {
            return Promise.resolve(mockClient);
          }
          if (params.where.id === mockLawyer.id) {
            return Promise.resolve(null); // Not verified
          }
          return Promise.resolve(null);
        });

        const formData = new FormData();
        formData.append("lawyerId", validBookingData.lawyerId);
        formData.append("startTime", validBookingData.startTime);
        formData.append("endTime", validBookingData.endTime);

        await expect(bookAppointment(formData)).rejects.toThrow(
          "Failed to book appointment: Lawyer not found or not verified"
        );
      });
    });

    describe("Credit Validation", () => {
      //   it("harusnya error kalo client ngak punya cukup credits", async () => {
      //     const poorClient = { ...mockClient, credits: 1 };
      //     db.user.findUnique.mockImplementation((params) => {
      //       if (params.where.clerkUserId === mockClientUserId) {
      //         return Promise.resolve(poorClient);
      //       }
      //       if (params.where.id === mockLawyer.id) {
      //         return Promise.resolve(mockLawyer);
      //       }
      //       return Promise.resolve(null);
      //     });

      //     const formData = new FormData();
      //     formData.append("lawyerId", validBookingData.lawyerId);
      //     formData.append("startTime", validBookingData.startTime);
      //     formData.append("endTime", validBookingData.endTime);

      //     await expect(bookAppointment(formData)).rejects.toThrow(
      //       "Failed to book appointment: Insufficient credits to book an appointment"
      //     );
      //   });
      // });

      describe("Time Slot Validation", () => {
        it("harusnya error kalo time slot sudah dibooking", async () => {
          db.appointment.findFirst.mockResolvedValue({
            id: "existing_appointment",
            lawyerId: mockLawyer.id,
            status: "SCHEDULED",
          });

          const formData = new FormData();
          formData.append("lawyerId", validBookingData.lawyerId);
          formData.append("startTime", validBookingData.startTime);
          formData.append("endTime", validBookingData.endTime);

          await expect(bookAppointment(formData)).rejects.toThrow(
            "Failed to book appointment: This time slot is already booked"
          );
        });

        it("harusnya check overlapping appointments dengan benar", async () => {
          db.appointment.findFirst.mockResolvedValue(null);

          const formData = new FormData();
          formData.append("lawyerId", validBookingData.lawyerId);
          formData.append("startTime", validBookingData.startTime);
          formData.append("endTime", validBookingData.endTime);

          deductCreditsForAppointment.mockResolvedValue({ success: true });
          db.appointment.create.mockResolvedValue({
            id: "appointment_1",
            clientId: mockClient.id,
            lawyerId: mockLawyer.id,
          });

          await bookAppointment(formData);

          expect(db.appointment.findFirst).toHaveBeenCalledWith({
            where: {
              lawyerId: validBookingData.lawyerId,
              status: "SCHEDULED",
              OR: expect.any(Array),
            },
          });
        });
      });

      describe("Successful Booking", () => {
        beforeEach(() => {
          db.appointment.findFirst.mockResolvedValue(null);
          deductCreditsForAppointment.mockResolvedValue({ success: true });
          db.user.findUnique.mockImplementation((params) => {
            if (params.where.clerkUserId === mockClientUserId) {
              return Promise.resolve(mockClient);
            }
            if (params.where.id === mockClient.id) {
              return Promise.resolve(mockClient);
            }
            if (params.where.id === mockLawyer.id) {
              return Promise.resolve(mockLawyer);
            }
            return Promise.resolve(null);
          });
        });

        it("harusnya berhasil booking appointment", async () => {
          const createdAppointment = {
            id: "appointment_1",
            clientId: mockClient.id,
            lawyerId: mockLawyer.id,
            startTime: new Date(validBookingData.startTime),
            endTime: new Date(validBookingData.endTime),
            status: "SCHEDULED",
            chatChannelId: expect.any(String),
          };

          db.appointment.create.mockResolvedValue(createdAppointment);

          const formData = new FormData();
          formData.append("lawyerId", validBookingData.lawyerId);
          formData.append("startTime", validBookingData.startTime);
          formData.append("endTime", validBookingData.endTime);
          formData.append("description", validBookingData.description);

          const result = await bookAppointment(formData);

          expect(result.success).toBe(true);
          expect(result.appointment).toBeDefined();
          expect(revalidatePath).toHaveBeenCalledWith("/appointments");
        });

        it("harusnya deduct credits dari client", async () => {
          db.appointment.create.mockResolvedValue({
            id: "appointment_1",
          });

          const formData = new FormData();
          formData.append("lawyerId", validBookingData.lawyerId);
          formData.append("startTime", validBookingData.startTime);
          formData.append("endTime", validBookingData.endTime);

          await bookAppointment(formData);

          expect(deductCreditsForAppointment).toHaveBeenCalledWith(
            mockClient.id,
            mockLawyer.id
          );
        });

        it("harusnya create chat channel", async () => {
          db.appointment.create.mockResolvedValue({
            id: "appointment_1",
            chatChannelId: "apt-123-client-lawyer",
          });

          const formData = new FormData();
          formData.append("lawyerId", validBookingData.lawyerId);
          formData.append("startTime", validBookingData.startTime);
          formData.append("endTime", validBookingData.endTime);

          const result = await bookAppointment(formData);

          expect(result.appointment.chatChannelId).toBeDefined();
        });

        it("harusnya save client description kalo ada", async () => {
          db.appointment.create.mockResolvedValue({
            id: "appointment_1",
            clientDescription: validBookingData.description,
          });

          const formData = new FormData();
          formData.append("lawyerId", validBookingData.lawyerId);
          formData.append("startTime", validBookingData.startTime);
          formData.append("endTime", validBookingData.endTime);
          formData.append("description", validBookingData.description);

          await bookAppointment(formData);

          expect(db.appointment.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
              clientDescription: validBookingData.description,
            }),
          });
        });

        it("harusnya handle description null", async () => {
          db.appointment.create.mockResolvedValue({
            id: "appointment_1",
            clientDescription: null,
          });

          const formData = new FormData();
          formData.append("lawyerId", validBookingData.lawyerId);
          formData.append("startTime", validBookingData.startTime);
          formData.append("endTime", validBookingData.endTime);

          await bookAppointment(formData);

          expect(db.appointment.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
              clientDescription: null,
            }),
          });
        });
      });

      describe("Error Handling", () => {
        it("harusnya error kalo deduct credits gagal", async () => {
          db.appointment.findFirst.mockResolvedValue(null);
          deductCreditsForAppointment.mockResolvedValue({
            success: false,
            error: "Insufficient credits",
          });

          const formData = new FormData();
          formData.append("lawyerId", validBookingData.lawyerId);
          formData.append("startTime", validBookingData.startTime);
          formData.append("endTime", validBookingData.endTime);

          await expect(bookAppointment(formData)).rejects.toThrow(
            "Failed to book appointment: Insufficient credits"
          );
        });

        it("harusnya error kalo create appointment gagal", async () => {
          db.appointment.findFirst.mockResolvedValue(null);
          deductCreditsForAppointment.mockResolvedValue({ success: true });
          db.user.findUnique.mockImplementation((params) => {
            if (params.where.clerkUserId) return Promise.resolve(mockClient);
            if (params.where.id === mockClient.id)
              return Promise.resolve(mockClient);
            if (params.where.id === mockLawyer.id)
              return Promise.resolve(mockLawyer);
            return Promise.resolve(null);
          });
          db.appointment.create.mockRejectedValue(new Error("Database error"));

          const formData = new FormData();
          formData.append("lawyerId", validBookingData.lawyerId);
          formData.append("startTime", validBookingData.startTime);
          formData.append("endTime", validBookingData.endTime);

          await expect(bookAppointment(formData)).rejects.toThrow(
            "Failed to book appointment"
          );
        });
      });
    });

    describe("generateChatToken", () => {
      beforeEach(() => {
        auth.mockResolvedValue({ userId: mockClientUserId });
        db.user.findUnique.mockResolvedValue(mockClient);
      });

      describe("Authorization", () => {
        it("harusnya error kalo user ngak teridentifikasi", async () => {
          auth.mockResolvedValue({ userId: null });

          await expect(generateChatToken()).rejects.toThrow("Unauthorized");
        });

        it("harusnya error kalo user ngak ditemukan", async () => {
          db.user.findUnique.mockResolvedValue(null);

          await expect(generateChatToken()).rejects.toThrow(
            "Failed to generate chat token: User not found"
          );
        });
      });

      describe("Generate Token", () => {
        it("harusnya berhasil generate chat token", async () => {
          const result = await generateChatToken();

          expect(result.success).toBe(true);
          expect(result.token).toBe("mock_token");
          expect(result.userId).toBe(mockClient.id);
          expect(result.userName).toBe(mockClient.name);
        });

        it("harusnya upsert user di Stream.io", async () => {
          const mockStreamClient = StreamChat.getInstance();

          await generateChatToken();

          expect(mockStreamClient.upsertUser).toHaveBeenCalledWith({
            id: mockClient.id,
            name: mockClient.name,
          });
        });

        it("harusnya create token dengan user id yang benar", async () => {
          const mockStreamClient = StreamChat.getInstance();

          await generateChatToken();

          expect(mockStreamClient.createToken).toHaveBeenCalledWith(
            mockClient.id
          );
        });
      });

      describe("Error Handling", () => {
        it("harusnya error kalo Stream.io gagal", async () => {
          const mockStreamClient = StreamChat.getInstance();
          mockStreamClient.upsertUser.mockRejectedValue(
            new Error("Stream.io error")
          );

          await expect(generateChatToken()).rejects.toThrow(
            "Failed to generate chat token"
          );
        });
      });
    });

    describe("getChatChannelForAppointment", () => {
      const mockAppointment = {
        id: "appointment_1",
        clientId: mockClient.id,
        lawyerId: mockLawyer.id,
        startTime: new Date("2025-11-15T10:00:00Z"),
        endTime: new Date("2025-11-15T10:30:00Z"),
        status: "SCHEDULED",
        chatChannelId: "channel_123",
        client: mockClient,
        lawyer: mockLawyer,
      };

      beforeEach(() => {
        auth.mockResolvedValue({ userId: mockClientUserId });
        db.user.findUnique.mockResolvedValue(mockClient);
        db.appointment.findUnique.mockResolvedValue(mockAppointment);
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2025-11-15T09:50:00Z")); // 10 minutes before
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      describe("Authorization", () => {
        it("harusnya error kalo user ngak teridentifikasi", async () => {
          auth.mockResolvedValue({ userId: null });

          await expect(
            getChatChannelForAppointment("appointment_1")
          ).rejects.toThrow("Unauthorized");
        });

        it("harusnya error kalo user ngak ditemukan", async () => {
          db.user.findUnique.mockResolvedValue(null);

          await expect(
            getChatChannelForAppointment("appointment_1")
          ).rejects.toThrow("Failed to get chat channel: User not found");
        });

        it("harusnya error kalo appointment ngak ditemukan", async () => {
          db.appointment.findUnique.mockResolvedValue(null);

          await expect(
            getChatChannelForAppointment("appointment_1")
          ).rejects.toThrow(
            "Failed to get chat channel: Appointment not found"
          );
        });

        it("harusnya error kalo user bukan lawyer atau client", async () => {
          const otherUser = {
            id: "other_user",
            clerkUserId: "clerk_other",
            role: "CLIENT",
          };
          db.user.findUnique.mockResolvedValue(otherUser);

          await expect(
            getChatChannelForAppointment("appointment_1")
          ).rejects.toThrow(
            "Failed to get chat channel: You are not authorized to access this chat"
          );
        });

        it("harusnya error kalo appointment status bukan SCHEDULED", async () => {
          db.appointment.findUnique.mockResolvedValue({
            ...mockAppointment,
            status: "COMPLETED",
          });

          await expect(
            getChatChannelForAppointment("appointment_1")
          ).rejects.toThrow(
            "Failed to get chat channel: This appointment is not currently active"
          );
        });
      });

      describe("Time Validation", () => {
        it("harusnya error kalo lebih dari 15 menit sebelum appointment", async () => {
          jest.setSystemTime(new Date("2025-11-15T09:30:00Z")); // 30 minutes before

          await expect(
            getChatChannelForAppointment("appointment_1")
          ).rejects.toThrow(
            "Failed to get chat channel: The chat will be available 15 minutes before the scheduled time"
          );
        });

        it("harusnya berhasil kalo tepat 15 menit sebelum appointment", async () => {
          jest.setSystemTime(new Date("2025-11-15T09:45:00Z")); // 15 minutes before

          const result = await getChatChannelForAppointment("appointment_1");

          expect(result.success).toBe(true);
          expect(result.channelId).toBe("channel_123");
        });

        it("harusnya berhasil kalo dalam waktu appointment", async () => {
          jest.setSystemTime(new Date("2025-11-15T10:10:00Z")); // During appointment

          const result = await getChatChannelForAppointment("appointment_1");

          expect(result.success).toBe(true);
        });
      });

      describe("Successful Access", () => {
        it("harusnya berhasil get chat channel", async () => {
          const result = await getChatChannelForAppointment("appointment_1");

          expect(result.success).toBe(true);
          expect(result.channelId).toBe("channel_123");
          expect(result.appointment).toBeDefined();
        });

        it("harusnya return appointment details", async () => {
          const result = await getChatChannelForAppointment("appointment_1");

          expect(result.appointment).toEqual({
            id: mockAppointment.id,
            startTime: mockAppointment.startTime,
            endTime: mockAppointment.endTime,
            client: {
              id: mockClient.id,
              name: mockClient.name,
            },
            lawyer: {
              id: mockLawyer.id,
              name: mockLawyer.name,
            },
          });
        });
      });
    });

    describe("getLawyerById", () => {
      describe("Fetch Lawyer", () => {
        it("harusnya berhasil ngambil lawyer by ID", async () => {
          db.user.findUnique.mockResolvedValue(mockLawyer);

          const result = await getLawyerById("db_lawyer_123");

          expect(db.user.findUnique).toHaveBeenCalledWith({
            where: {
              id: "db_lawyer_123",
              role: "LAWYER",
              verificationStatus: "VERIFIED",
            },
          });
          expect(result).toEqual({ lawyer: mockLawyer });
        });

        it("harusnya error kalo lawyer ngak ditemukan", async () => {
          db.user.findUnique.mockResolvedValue(null);

          await expect(getLawyerById("invalid_id")).rejects.toThrow(
            "Failed to fetch lawyer details"
          );
        });

        it("harusnya hanya fetch verified lawyers", async () => {
          db.user.findUnique.mockResolvedValue(mockLawyer);

          await getLawyerById("db_lawyer_123");

          expect(db.user.findUnique).toHaveBeenCalledWith(
            expect.objectContaining({
              where: expect.objectContaining({
                verificationStatus: "VERIFIED",
              }),
            })
          );
        });
      });

      describe("Error Handling", () => {
        it("harusnya error kalo database gagal", async () => {
          db.user.findUnique.mockRejectedValue(new Error("Database error"));

          await expect(getLawyerById("db_lawyer_123")).rejects.toThrow(
            "Failed to fetch lawyer details"
          );
        });
      });
    });

    describe("getAvailableTimeSlots", () => {
      const mockAvailability = {
        id: "availability_1",
        lawyerId: mockLawyer.id,
        startTime: new Date("2025-11-14T09:00:00Z"),
        endTime: new Date("2025-11-14T17:00:00Z"),
        status: "AVAILABLE",
      };

      beforeEach(() => {
        db.user.findUnique.mockResolvedValue(mockLawyer);
        db.availability.findFirst.mockResolvedValue(mockAvailability);
        db.appointment.findMany.mockResolvedValue([]);
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2025-11-14T08:00:00Z"));
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      describe("Validation", () => {
        it("harusnya error kalo lawyer ngak ditemukan", async () => {
          db.user.findUnique.mockResolvedValue(null);

          await expect(getAvailableTimeSlots("invalid_id")).rejects.toThrow(
            "Failed to fetch available time slots: Lawyer not found or not verified"
          );
        });

        it("harusnya error kalo lawyer belum verified", async () => {
          db.user.findUnique.mockResolvedValue({
            ...mockLawyer,
            verificationStatus: "PENDING",
          });

          await expect(getAvailableTimeSlots(mockLawyer.id)).rejects.toThrow(
            "Failed to fetch available time slots: Lawyer not found or not verified"
          );
        });

        it("harusnya error kalo lawyer belum set availability", async () => {
          db.availability.findFirst.mockResolvedValue(null);

          await expect(getAvailableTimeSlots(mockLawyer.id)).rejects.toThrow(
            "Failed to fetch available time slots: No availability set by lawyer"
          );
        });
      });

      describe("Generate Time Slots", () => {
        it("harusnya berhasil generate available slots untuk 4 hari ke depan", async () => {
          const result = await getAvailableTimeSlots(mockLawyer.id);

          expect(result.days).toHaveLength(4);
          expect(result.days[0]).toHaveProperty("date");
          expect(result.days[0]).toHaveProperty("displayDate");
          expect(result.days[0]).toHaveProperty("slots");
        });

        it("harusnya generate 30-minute slots", async () => {
          const result = await getAvailableTimeSlots(mockLawyer.id);

          const firstDaySlots = result.days[0].slots;
          if (firstDaySlots.length > 0) {
            const slot = firstDaySlots[0];
            const start = new Date(slot.startTime);
            const end = new Date(slot.endTime);
            const diffMinutes = (end - start) / (1000 * 60);

            expect(diffMinutes).toBe(30);
          }
        });

        it("harusnya exclude past time slots", async () => {
          const result = await getAvailableTimeSlots(mockLawyer.id);

          result.days.forEach((day) => {
            day.slots.forEach((slot) => {
              const slotStart = new Date(slot.startTime);
              const now = new Date();
              expect(slotStart >= now).toBe(true);
            });
          });
        });

        it("harusnya exclude booked slots", async () => {
          const bookedAppointment = {
            id: "appointment_1",
            lawyerId: mockLawyer.id,
            startTime: new Date("2025-11-14T10:00:00Z"),
            endTime: new Date("2025-11-14T10:30:00Z"),
            status: "SCHEDULED",
          };

          db.appointment.findMany.mockResolvedValue([bookedAppointment]);

          const result = await getAvailableTimeSlots(mockLawyer.id);

          const allSlots = result.days.flatMap((day) => day.slots);
          const conflictingSlot = allSlots.find((slot) => {
            const start = new Date(slot.startTime);
            const end = new Date(slot.endTime);
            return (
              start.getTime() === bookedAppointment.startTime.getTime() &&
              end.getTime() === bookedAppointment.endTime.getTime()
            );
          });

          expect(conflictingSlot).toBeUndefined();
        });

        it("harusnya fetch existing appointments dalam range 4 hari", async () => {
          await getAvailableTimeSlots(mockLawyer.id);

          expect(db.appointment.findMany).toHaveBeenCalledWith({
            where: {
              lawyerId: mockLawyer.id,
              status: "SCHEDULED",
              startTime: {
                lte: expect.any(Date),
              },
            },
          });
        });
      });

      describe("Slot Formatting", () => {
        it("harusnya format slot dengan readable time", async () => {
          const result = await getAvailableTimeSlots(mockLawyer.id);

          const firstDaySlots = result.days[0].slots;
          if (firstDaySlots.length > 0) {
            expect(firstDaySlots[0]).toHaveProperty("formatted");
            expect(firstDaySlots[0].formatted).toMatch(/\d+:\d+ [AP]M/);
          }
        });

        it("harusnya include day information", async () => {
          const result = await getAvailableTimeSlots(mockLawyer.id);

          const firstDaySlots = result.days[0].slots;
          if (firstDaySlots.length > 0) {
            expect(firstDaySlots[0]).toHaveProperty("day");
            expect(firstDaySlots[0].day).toMatch(/\w+, \w+ \d+/);
          }
        });

        it("harusnya return ISO format untuk startTime dan endTime", async () => {
          const result = await getAvailableTimeSlots(mockLawyer.id);

          const firstDaySlots = result.days[0].slots;
          if (firstDaySlots.length > 0) {
            expect(() => new Date(firstDaySlots[0].startTime)).not.toThrow();
            expect(() => new Date(firstDaySlots[0].endTime)).not.toThrow();
          }
        });
      });

      describe("Edge Cases", () => {
        it("harusnya handle hari tanpa available slots", async () => {
          // Mock all time as booked
          const manyAppointments = [];
          const start = new Date("2025-11-14T09:00:00Z");
          const end = new Date("2025-11-14T17:00:00Z");

          let current = new Date(start);
          while (current < end) {
            const next = new Date(current.getTime() + 30 * 60000);
            manyAppointments.push({
              id: `appointment_${current.getTime()}`,
              lawyerId: mockLawyer.id,
              startTime: new Date(current),
              endTime: next,
              status: "SCHEDULED",
            });
            current = next;
          }

          db.appointment.findMany.mockResolvedValue(manyAppointments);

          const result = await getAvailableTimeSlots(mockLawyer.id);

          const fullyBookedDay = result.days.find(
            (day) => day.slots.length === 0
          );
          expect(fullyBookedDay).toBeDefined();
        });

        it("harusnya handle availability yang melewati hari", async () => {
          const overnightAvailability = {
            ...mockAvailability,
            startTime: new Date("2025-11-14T22:00:00Z"),
            endTime: new Date("2025-11-15T02:00:00Z"),
          };

          db.availability.findFirst.mockResolvedValue(overnightAvailability);

          const result = await getAvailableTimeSlots(mockLawyer.id);

          expect(result.days).toBeDefined();
          expect(result.days.length).toBe(4);
        });

        it("harusnya handle availability dengan duration kurang dari 30 menit", async () => {
          const shortAvailability = {
            ...mockAvailability,
            startTime: new Date("2025-11-14T09:00:00Z"),
            endTime: new Date("2025-11-14T09:15:00Z"), // Only 15 minutes
          };

          db.availability.findFirst.mockResolvedValue(shortAvailability);

          const result = await getAvailableTimeSlots(mockLawyer.id);

          // Should have no slots for days with less than 30 min availability
          expect(result.days).toBeDefined();
        });
      });

      describe("Error Handling", () => {
        it("harusnya error kalo database gagal fetch lawyer", async () => {
          db.user.findUnique.mockRejectedValue(new Error("Database error"));

          await expect(getAvailableTimeSlots(mockLawyer.id)).rejects.toThrow(
            "Failed to fetch available time slots"
          );
        });

        it("harusnya error kalo database gagal fetch availability", async () => {
          db.availability.findFirst.mockRejectedValue(
            new Error("Database error")
          );

          await expect(getAvailableTimeSlots(mockLawyer.id)).rejects.toThrow(
            "Failed to fetch available time slots"
          );
        });

        it("harusnya error kalo database gagal fetch appointments", async () => {
          db.appointment.findMany.mockRejectedValue(
            new Error("Database error")
          );

          await expect(getAvailableTimeSlots(mockLawyer.id)).rejects.toThrow(
            "Failed to fetch available time slots"
          );
        });
      });

      describe("Overlapping Detection", () => {
        it("harusnya detect overlapping appointment di awal slot", async () => {
          const overlappingAppointment = {
            id: "appointment_1",
            lawyerId: mockLawyer.id,
            startTime: new Date("2025-11-14T09:15:00Z"),
            endTime: new Date("2025-11-14T09:45:00Z"),
            status: "SCHEDULED",
          };

          db.appointment.findMany.mockResolvedValue([overlappingAppointment]);

          const result = await getAvailableTimeSlots(mockLawyer.id);

          const allSlots = result.days.flatMap((day) => day.slots);
          const conflictingSlot = allSlots.find((slot) => {
            const start = new Date(slot.startTime);
            return (
              start.getTime() === new Date("2025-11-14T09:00:00Z").getTime()
            );
          });

          expect(conflictingSlot).toBeUndefined();
        });

        it("harusnya detect overlapping appointment di akhir slot", async () => {
          const overlappingAppointment = {
            id: "appointment_1",
            lawyerId: mockLawyer.id,
            startTime: new Date("2025-11-14T09:15:00Z"),
            endTime: new Date("2025-11-14T09:45:00Z"),
            status: "SCHEDULED",
          };

          db.appointment.findMany.mockResolvedValue([overlappingAppointment]);

          const result = await getAvailableTimeSlots(mockLawyer.id);

          const allSlots = result.days.flatMap((day) => day.slots);
          const conflictingSlot = allSlots.find((slot) => {
            const start = new Date(slot.startTime);
            return (
              start.getTime() === new Date("2025-11-14T09:30:00Z").getTime()
            );
          });

          expect(conflictingSlot).toBeUndefined();
        });

        it("harusnya detect appointment yang cover entire slot", async () => {
          const coveringAppointment = {
            id: "appointment_1",
            lawyerId: mockLawyer.id,
            startTime: new Date("2025-11-14T08:00:00Z"),
            endTime: new Date("2025-11-14T11:00:00Z"),
            status: "SCHEDULED",
          };

          db.appointment.findMany.mockResolvedValue([coveringAppointment]);

          const result = await getAvailableTimeSlots(mockLawyer.id);

          const morningSlots = result.days[0].slots.filter((slot) => {
            const start = new Date(slot.startTime);
            return (
              start >= new Date("2025-11-14T08:00:00Z") &&
              start < new Date("2025-11-14T11:00:00Z")
            );
          });

          expect(morningSlots.length).toBe(0);
        });
      });

      describe("Performance", () => {
        it("harusnya fetch appointments hanya sekali", async () => {
          await getAvailableTimeSlots(mockLawyer.id);

          expect(db.appointment.findMany).toHaveBeenCalledTimes(1);
        });

        it("harusnya fetch availability hanya sekali", async () => {
          await getAvailableTimeSlots(mockLawyer.id);

          expect(db.availability.findFirst).toHaveBeenCalledTimes(1);
        });

        it("harusnya handle large number of appointments efficiently", async () => {
          const manyAppointments = Array.from({ length: 100 }, (_, i) => ({
            id: `appointment_${i}`,
            lawyerId: mockLawyer.id,
            startTime: new Date(
              `2025-11-14T${9 + Math.floor(i / 2)}:${(i % 2) * 30}:00Z`
            ),
            endTime: new Date(
              `2025-11-14T${9 + Math.floor(i / 2)}:${(i % 2) * 30 + 30}:00Z`
            ),
            status: "SCHEDULED",
          }));

          db.appointment.findMany.mockResolvedValue(manyAppointments);

          const result = await getAvailableTimeSlots(mockLawyer.id);

          expect(result.days).toBeDefined();
          expect(Array.isArray(result.days)).toBe(true);
        });
      });

      describe("Date Handling", () => {
        it("harusnya generate slots untuk exactly 4 hari", async () => {
          const result = await getAvailableTimeSlots(mockLawyer.id);

          expect(result.days).toHaveLength(4);
        });

        it("harusnya start dari hari ini", async () => {
          const result = await getAvailableTimeSlots(mockLawyer.id);

          const firstDate = new Date(result.days[0].date);
          const today = new Date("2025-11-14");

          expect(firstDate.toDateString()).toBe(today.toDateString());
        });

        it("harusnya include consecutive days", async () => {
          const result = await getAvailableTimeSlots(mockLawyer.id);

          for (let i = 1; i < result.days.length; i++) {
            const prevDate = new Date(result.days[i - 1].date);
            const currDate = new Date(result.days[i].date);
            const diffDays = (currDate - prevDate) / (1000 * 60 * 60 * 24);

            expect(diffDays).toBe(1);
          }
        });

        it("harusnya handle timezone correctly", async () => {
          const result = await getAvailableTimeSlots(mockLawyer.id);

          const firstDaySlots = result.days[0].slots;
          if (firstDaySlots.length > 0) {
            const slotTime = new Date(firstDaySlots[0].startTime);
            expect(slotTime.toISOString()).toMatch(/Z$/); // Should be in UTC
          }
        });
      });

      describe("Boundary Conditions", () => {
        it("harusnya handle availability exactly at midnight", async () => {
          const midnightAvailability = {
            ...mockAvailability,
            startTime: new Date("2025-11-14T00:00:00Z"),
            endTime: new Date("2025-11-14T08:00:00Z"),
          };

          db.availability.findFirst.mockResolvedValue(midnightAvailability);

          const result = await getAvailableTimeSlots(mockLawyer.id);

          expect(result.days).toBeDefined();
        });

        it("harusnya handle availability ending exactly at midnight", async () => {
          const endMidnightAvailability = {
            ...mockAvailability,
            startTime: new Date("2025-11-14T16:00:00Z"),
            endTime: new Date("2025-11-15T00:00:00Z"),
          };

          db.availability.findFirst.mockResolvedValue(endMidnightAvailability);

          const result = await getAvailableTimeSlots(mockLawyer.id);

          expect(result.days).toBeDefined();
        });

        it("harusnya handle last slot of the day", async () => {
          const lateAvailability = {
            ...mockAvailability,
            startTime: new Date("2025-11-14T23:00:00Z"),
            endTime: new Date("2025-11-14T23:30:00Z"),
          };

          db.availability.findFirst.mockResolvedValue(lateAvailability);

          const result = await getAvailableTimeSlots(mockLawyer.id);

          expect(result.days).toBeDefined();
        });
      });
    });
  });
});
