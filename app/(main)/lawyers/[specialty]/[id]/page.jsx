import { getLawyerById, getAvailableTimeSlots } from "@/actions/appointments";
import { LawyerProfile } from "./_components/lawyer-profile";
import { redirect } from "next/navigation";

export default async function LawyerProfilePage({ params }) {
  const { id } = await params;

  try {
    // Fetch lawyer data and available slots in parallel
    const [lawyerData, slotsData] = await Promise.all([
      getLawyerById(id),
      getAvailableTimeSlots(id),
    ]);

    return (
      <LawyerProfile
        lawyer={lawyerData.lawyer}
        availableDays={slotsData.days || []}
      />
    );
  } catch (error) {
    console.error("Error loading lawyer profile:", error);
    redirect("/lawyers");
  }
}
