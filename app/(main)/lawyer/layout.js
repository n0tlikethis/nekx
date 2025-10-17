import { Gavel, Stethoscope } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export const metadata = {
  title: "Lawyer Dashboard - AdvoChat",
  description: "Manage your appointments and availability",
};

export default async function LawyerDashboardLayout({ children }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader icon={<Gavel />} title="Lawyer Dashboard" />

      {children}
    </div>
  );
}
