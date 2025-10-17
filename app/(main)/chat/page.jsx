import { redirect } from "next/navigation";
import { generateChatToken, getChatChannelForAppointment } from "@/actions/appointments";
import ChatUI from "./chat-ui";

export default async function ChatPage({ searchParams }) {
  const { appointmentId } = await searchParams;

  if (!appointmentId) {
    redirect("/appointments");
  }

  try {
    // Generate chat token for the user
    const tokenData = await generateChatToken();

    if (!tokenData.success) {
      throw new Error("Failed to generate chat token");
    }

    // Get chat channel for the appointment
    const channelData = await getChatChannelForAppointment(appointmentId);

    if (!channelData.success) {
      throw new Error("Failed to get chat channel");
    }

    return (
      <ChatUI
        channelId={channelData.channelId}
        token={tokenData.token}
        userId={tokenData.userId}
        userName={tokenData.userName}
        appointment={channelData.appointment}
      />
    );
  } catch (error) {
    console.error("Error loading chat:", error);
    redirect("/appointments");
  }
}
