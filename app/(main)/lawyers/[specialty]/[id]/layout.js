import { getLawyerById } from "@/actions/appointments";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";

export async function generateMetadata({ params }) {
  const { id } = await params;

  const { lawyer } = await getLawyerById(id);
  return {
    title: `${lawyer.name} - AdvoChat`,
    description: `Jadwalkan konsultasi dengan ${lawyer.name}, spesialis ${lawyer.specialty} dengan pengalaman ${lawyer.experience} tahun.`,
  };
}

export default async function LawyerProfileLayout({ children, params }) {
  const { id } = await params;
  const { lawyer } = await getLawyerById(id);

  if (!lawyer) redirect("/lawyers");

  return (
    <div className="container mx-auto">
      <PageHeader
        // icon={<Stethoscope />}
        title={lawyer.name}
        backLink={`/lawyers/${lawyer.specialty}`}
        backLabel={`Back to ${lawyer.specialty}`}
      />

      {children}
    </div>
  );
}
