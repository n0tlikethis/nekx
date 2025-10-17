import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getLawyerAppointments, getLawyerAvailability } from "@/actions/lawyer";
import { AvailabilitySettings } from "./_components/availability-settings";
import { getCurrentUser } from "@/actions/onboarding";
import { redirect } from "next/navigation";
import { Calendar, Clock, DollarSign } from "lucide-react";
import LawyerAppointmentsList from "./_components/appointments-list";
import { getLawyerEarnings, getLawyerPayouts } from "@/actions/payout";
import { LawyerEarnings } from "./_components/lawyer-earnings";

export default async function LawyerDashboardPage() {
  const user = await getCurrentUser();

  const [appointmentsData, availabilityData, earningsData, payoutsData] =
    await Promise.all([
      getLawyerAppointments(),
      getLawyerAvailability(),
      getLawyerEarnings(),
      getLawyerPayouts(),
    ]);

  //   // Redirect if not a lawyer
  if (user?.role !== "LAWYER") {
    redirect("/onboarding");
  }

  // If already verified, redirect to dashboard
  if (user?.verificationStatus !== "VERIFIED") {
    redirect("/lawyer/verification");
  }

  return (
    <Tabs
      defaultValue="earnings"
      className="grid grid-cols-1 md:grid-cols-4 gap-6"
    >
      <TabsList className="md:col-span-1 bg-muted/30 border h-14 md:h-40 flex sm:flex-row md:flex-col w-full p-2 md:p-1 rounded-md md:space-y-2 sm:space-x-2 md:space-x-0">
        <TabsTrigger
          value="earnings"
          className="flex-1 md:flex md:items-center md:justify-start md:px-4 md:py-3 w-full"
        >
          <DollarSign className="h-4 w-4 mr-2 hidden md:inline" />
          <span>Pendapatan</span>
        </TabsTrigger>
        <TabsTrigger
          value="appointments"
          className="flex-1 md:flex md:items-center md:justify-start md:px-4 md:py-3 w-full"
        >
          <Calendar className="h-4 w-4 mr-2 hidden md:inline" />
          <span>Konsultasi</span>
        </TabsTrigger>
        <TabsTrigger
          value="availability"
          className="flex-1 md:flex md:items-center md:justify-start md:px-4 md:py-3 w-full"
        >
          <Clock className="h-4 w-4 mr-2 hidden md:inline" />
          <span>Jadwal</span>
        </TabsTrigger>
      </TabsList>
      <div className="md:col-span-3">
        <TabsContent value="appointments" className="border-none p-0">
          <LawyerAppointmentsList
            appointments={appointmentsData.appointments || []}
          />
        </TabsContent>
        <TabsContent value="availability" className="border-none p-0">
          <AvailabilitySettings slots={availabilityData.slots || []} />
        </TabsContent>
        <TabsContent value="earnings" className="border-none p-0">
          <LawyerEarnings
            earnings={earningsData.earnings || {}}
            payouts={payoutsData.payouts || []}
          />
        </TabsContent>
      </div>
    </Tabs>
  );
}
