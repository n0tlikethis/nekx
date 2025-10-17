"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { deductCreditsForAppointment } from "@/actions/credits";
import { addDays, addMinutes, format, isBefore, endOfDay } from "date-fns";
import { StreamChat } from "stream-chat";

// Initialize Stream Chat client
const serverClient = StreamChat.getInstance(
  process.env.NEXT_PUBLIC_STREAM_API_KEY,
  process.env.STREAM_API_SECRET
);

/**
 * Book a new appointment with a lawyer
 */
export async function bookAppointment(formData) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  try {
    // Get the client user
    const client = await db.user.findUnique({
      where: {
        clerkUserId: userId,
        role: "CLIENT",
      },
    });

    if (!client) {
      throw new Error("Client not found");
    }

    // Parse form data
    const lawyerId = formData.get("lawyerId");
    const startTime = new Date(formData.get("startTime"));
    const endTime = new Date(formData.get("endTime"));
    const clientDescription = formData.get("description") || null;

    // Validate input
    if (!lawyerId || !startTime || !endTime) {
      throw new Error("Lawyer, start time, and end time are required");
    }

    // Check if the lawyer exists and is verified
    const lawyer = await db.user.findUnique({
      where: {
        id: lawyerId,
        role: "LAWYER",
        verificationStatus: "VERIFIED",
      },
    });

    if (!lawyer) {
      throw new Error("Lawyer not found or not verified");
    }

    // Check if the client has enough credits (2 credits per appointment)
    if (client.credits < 2) {
      throw new Error("Insufficient credits to book an appointment");
    }

    // Check if the requested time slot is available
    const overlappingAppointment = await db.appointment.findFirst({
      where: {
        lawyerId: lawyerId,
        status: "SCHEDULED",
        OR: [
          {
            startTime: {
              lte: startTime,
            },
            endTime: {
              gt: startTime,
            },
          },
          {
            startTime: {
              lt: endTime,
            },
            endTime: {
              gte: endTime,
            },
          },
          {
            startTime: {
              gte: startTime,
            },
            endTime: {
              lte: endTime,
            },
          },
        ],
      },
    });

    if (overlappingAppointment) {
      throw new Error("This time slot is already booked");
    }

    // Create a chat channel for this appointment
    const channelId = await createChatChannel(client.id, lawyer.id);

    // Deduct credits from client and add to lawyer
    const { success, error } = await deductCreditsForAppointment(
      client.id,
      lawyer.id
    );

    if (!success) {
      throw new Error(error || "Failed to deduct credits");
    }

    // Create the appointment with the chat channel ID
    const appointment = await db.appointment.create({
      data: {
        clientId: client.id,
        lawyerId: lawyer.id,
        startTime,
        endTime,
        clientDescription,
        status: "SCHEDULED",
        chatChannelId: channelId, // Store the Stream.io channel ID
      },
    });

    revalidatePath("/appointments");
    return { success: true, appointment: appointment };
  } catch (error) {
    console.error("Failed to book appointment:", error);
    throw new Error("Failed to book appointment: " + error.message);
  }
}

/**
 * Create a Stream.io chat channel for the appointment
 */
// async function createChatChannel(clientId, lawyerId) {
//   try {
//     // Create a unique channel ID based on client and lawyer IDs
//     const channelId = `appointment-${clientId}-${lawyerId}-${Date.now()}`;

//     // Create the channel
//     const channel = serverClient.channel("messaging", channelId, {
//       created_by_id: clientId,
//       members: [clientId, lawyerId],
//     });

//     await channel.create();

//     return channelId;
//   } catch (error) {
//     throw new Error("Failed to create chat channel: " + error.message);
//   }
// }
async function createChatChannel(clientId, lawyerId) {
  try {
    // First, fetch the client and lawyer details from database
    const [client, lawyer] = await Promise.all([
      db.user.findUnique({ where: { id: clientId } }),
      db.user.findUnique({ where: { id: lawyerId } }),
    ]);

    if (!client || !lawyer) {
      throw new Error("Client or lawyer not found");
    }

    // Upsert users in Stream.io before creating channel
    await serverClient.upsertUsers([
      {
        id: client.id,
        name: client.name,
        // role: client.role.toLowerCase(),
        image: client.imageUrl || undefined,
      },
      {
        id: lawyer.id,
        name: lawyer.name,
        // role: lawyer.role.toLowerCase(),
        image: lawyer.imageUrl || undefined,
      },
    ]);

    // Create a unique channel ID - must be max 64 characters
    // Use a shorter format with timestamp
    const timestamp = Date.now().toString(36); // Convert to base36 for shorter string
    const channelId = `apt-${timestamp}-${clientId.slice(
      0,
      8
    )}-${lawyerId.slice(0, 8)}`;

    // Ensure channel ID is within 64 character limit
    if (channelId.length > 64) {
      throw new Error("Channel ID exceeds maximum length");
    }

    // Create the channel
    const channel = serverClient.channel("messaging", channelId, {
      created_by_id: clientId,
      members: [clientId, lawyerId],
      name: `Consultation: ${client.name} & ${lawyer.name}`,
    });

    await channel.create();

    return channelId;
  } catch (error) {
    throw new Error("Failed to create chat channel: " + error.message);
  }
}

/**
 * Generate a Stream.io user token for authentication
 */
export async function generateChatToken() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  try {
    const user = await db.user.findUnique({
      where: {
        clerkUserId: userId,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Upsert user in Stream.io
    await serverClient.upsertUser({
      id: user.id,
      name: user.name,
      // role: user.role.toLowerCase(),
    });

    // Generate token for the user
    const token = serverClient.createToken(user.id);

    return {
      success: true,
      token: token,
      userId: user.id,
      userName: user.name,
    };
  } catch (error) {
    console.error("Failed to generate chat token:", error);
    throw new Error("Failed to generate chat token: " + error.message);
  }
}

/**
 * Get chat channel details for an appointment
 */
export async function getChatChannelForAppointment(appointmentId) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  try {
    const user = await db.user.findUnique({
      where: {
        clerkUserId: userId,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Find the appointment and verify the user is part of it
    const appointment = await db.appointment.findUnique({
      where: {
        id: appointmentId,
      },
      include: {
        client: true,
        lawyer: true,
      },
    });

    if (!appointment) {
      throw new Error("Appointment not found");
    }

    // Verify the user is either the lawyer or the client for this appointment
    if (appointment.lawyerId !== user.id && appointment.clientId !== user.id) {
      throw new Error("You are not authorized to access this chat");
    }

    // Verify the appointment is scheduled
    if (appointment.status !== "SCHEDULED") {
      throw new Error("This appointment is not currently active");
    }

    // Check if appointment is within valid time range (15 minutes before to end time)
    const now = new Date();
    const appointmentTime = new Date(appointment.startTime);
    const appointmentEndTime = new Date(appointment.endTime);
    const timeDifference = (appointmentTime - now) / (1000 * 60);

    if (timeDifference > 15) {
      throw new Error(
        "The chat will be available 15 minutes before the scheduled time"
      );
      // } else if (now < appointmentEndTime) {
      //   throw new Error("The chat is expired");
    }

    return {
      success: true,
      channelId: appointment.chatChannelId,
      appointment: {
        id: appointment.id,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        client: {
          id: appointment.client.id,
          name: appointment.client.name,
        },
        lawyer: {
          id: appointment.lawyer.id,
          name: appointment.lawyer.name,
        },
      },
    };
  } catch (error) {
    console.error("Failed to get chat channel:", error);
    throw new Error("Failed to get chat channel: " + error.message);
  }
}

/**
 * Get lawyer by ID
 */
export async function getLawyerById(lawyerId) {
  try {
    const lawyer = await db.user.findUnique({
      where: {
        id: lawyerId,
        role: "LAWYER",
        verificationStatus: "VERIFIED",
      },
    });

    if (!lawyer) {
      throw new Error("Lawyer not found");
    }

    return { lawyer };
  } catch (error) {
    console.error("Failed to fetch lawyer:", error);
    throw new Error("Failed to fetch lawyer details");
  }
}

/**
 * Get available time slots for booking for the next 4 days
 */
export async function getAvailableTimeSlots(lawyerId) {
  try {
    // Validate lawyer existence and verification
    const lawyer = await db.user.findUnique({
      where: {
        id: lawyerId,
        role: "LAWYER",
        verificationStatus: "VERIFIED",
      },
    });

    if (!lawyer) {
      throw new Error("Lawyer not found or not verified");
    }

    // Fetch a single availability record
    const availability = await db.availability.findFirst({
      where: {
        lawyerId: lawyer.id,
        status: "AVAILABLE",
      },
    });

    if (!availability) {
      throw new Error("No availability set by lawyer");
    }

    // Get the next 4 days
    const now = new Date();
    const days = [now, addDays(now, 1), addDays(now, 2), addDays(now, 3)];

    // Fetch existing appointments for the lawyer over the next 4 days
    const lastDay = endOfDay(days[3]);
    const existingAppointments = await db.appointment.findMany({
      where: {
        lawyerId: lawyer.id,
        status: "SCHEDULED",
        startTime: {
          lte: lastDay,
        },
      },
    });

    const availableSlotsByDay = {};

    // For each of the next 4 days, generate available slots
    for (const day of days) {
      const dayString = format(day, "yyyy-MM-dd");
      availableSlotsByDay[dayString] = [];

      // Create a copy of the availability start/end times for this day
      const availabilityStart = new Date(availability.startTime);
      const availabilityEnd = new Date(availability.endTime);

      // Set the day to the current day we're processing
      availabilityStart.setFullYear(
        day.getFullYear(),
        day.getMonth(),
        day.getDate()
      );
      availabilityEnd.setFullYear(
        day.getFullYear(),
        day.getMonth(),
        day.getDate()
      );

      let current = new Date(availabilityStart);
      const end = new Date(availabilityEnd);

      while (
        isBefore(addMinutes(current, 30), end) ||
        +addMinutes(current, 30) === +end
      ) {
        const next = addMinutes(current, 30);

        // Skip past slots
        if (isBefore(current, now)) {
          current = next;
          continue;
        }

        const overlaps = existingAppointments.some((appointment) => {
          const aStart = new Date(appointment.startTime);
          const aEnd = new Date(appointment.endTime);

          return (
            (current >= aStart && current < aEnd) ||
            (next > aStart && next <= aEnd) ||
            (current <= aStart && next >= aEnd)
          );
        });

        if (!overlaps) {
          availableSlotsByDay[dayString].push({
            startTime: current.toISOString(),
            endTime: next.toISOString(),
            formatted: `${format(current, "h:mm a")} - ${format(
              next,
              "h:mm a"
            )}`,
            day: format(current, "EEEE, MMMM d"),
          });
        }

        current = next;
      }
    }

    // Convert to array of slots grouped by day for easier consumption by the UI
    const result = Object.entries(availableSlotsByDay).map(([date, slots]) => ({
      date,
      displayDate:
        slots.length > 0
          ? slots[0].day
          : format(new Date(date), "EEEE, MMMM d"),
      slots,
    }));

    return { days: result };
  } catch (error) {
    console.error("Failed to fetch available slots:", error);
    throw new Error("Failed to fetch available time slots: " + error.message);
  }
}
