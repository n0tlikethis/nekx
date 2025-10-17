import { getCurrentUser } from "@/actions/onboarding";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Onboarding - AdvoChat",
  description: "Complete your profile to get started with AdvoChat",
};

export default async function OnboardingLayout({ children }) {
  // Get complete user profile
  const user = await getCurrentUser();

  // Redirect users who have already completed onboarding
  if (user) {
    if (user.role === "CLIENT") {
      redirect("/lawyers");
    } else if (user.role === "LAWYER") {
      // Check verification status for lawyers
      if (user.verificationStatus === "VERIFIED") {
        redirect("/lawyer");
      } else {
        redirect("/lawyer/verification");
      }
    } else if (user.role === "ADMIN") {
      redirect("/admin");
    }
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">
            Selamat Datang di AdvoChat
          </h1>
          <p className="text-muted-foreground text-lg">
            Beritahu kami bagaimana Anda ingin menggunakan platform ini
          </p>
        </div>

        {children}
      </div>
    </div>
  );
}
