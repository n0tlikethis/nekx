"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StreamChat } from "stream-chat";
import {
  Chat,
  Channel,
  ChannelHeader,
  MessageInput,
  MessageList,
  Thread,
  Window,
} from "stream-chat-react";
import "stream-chat-react/dist/css/v2/index.css";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function ChatUI({ channelId, token, userId, userName, appointment }) {
  const [client, setClient] = useState(null);
  const [channel, setChannel] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initChat = async () => {
      try {
        // Initialize Stream Chat client
        const chatClient = StreamChat.getInstance(
          process.env.NEXT_PUBLIC_STREAM_API_KEY
        );

        // Connect user
        await chatClient.connectUser(
          {
            id: userId,
            name: userName,
          },
          token
        );

        // Get the channel
        const chatChannel = chatClient.channel("messaging", channelId);
        await chatChannel.watch();

        setClient(chatClient);
        setChannel(chatChannel);
        setIsLoading(false);
      } catch (error) {
        console.error("Error initializing chat:", error);
        toast.error("Failed to connect to chat");
        setIsLoading(false);
      }
    };

    if (channelId && token && userId) {
      initChat();
    }

    // Cleanup on unmount
    return () => {
      if (client) {
        client.disconnectUser();
      }
    };
  }, [channelId, token, userId, userName]);

  const handleBackToAppointments = () => {
    router.push("/appointments");
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 text-emerald-400 animate-spin mb-4" />
        <p className="text-white text-lg">Connecting to chat...</p>
      </div>
    );
  }

  if (!client || !channel) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-3xl font-bold text-white mb-4">
          Unable to Connect to Chat
        </h1>
        <p className="text-muted-foreground mb-6">
          There was a problem connecting to the chat. Please try again.
        </p>
        <Button
          onClick={handleBackToAppointments}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          Back to Appointments
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 h-screen flex flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackToAppointments}
            className="border-emerald-900/30"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">
              Consultation Chat
            </h1>
            <p className="text-sm text-muted-foreground">
              {appointment.client.name} & {appointment.lawyer.name}
            </p>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 border border-emerald-900/20 rounded-lg overflow-hidden bg-background">
        <Chat client={client} theme="str-chat__theme-dark">
          <Channel channel={channel}>
            <Window>
              <ChannelHeader />
              <MessageList />
              <MessageInput />
            </Window>
            <Thread />
          </Channel>
        </Chat>
      </div>

      {/* Info Footer */}
      <div className="mt-4 text-center">
        <p className="text-sm text-muted-foreground">
          This chat is only available during your scheduled appointment time
        </p>
      </div>
    </div>
  );
}
