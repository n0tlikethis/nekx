"use client";

import { useEffect } from "react";
import { getLawyerAppointments } from "@/actions/lawyer";
import { AppointmentCard } from "@/components/appointment-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import useFetch from "@/hooks/use-fetch";

export default function LawyerAppointmentsList() {
  const {
    loading,
    data,
    fn: fetchAppointments,
  } = useFetch(getLawyerAppointments);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const appointments = data?.appointments || [];

  return (
    <Card className="border-emerald-900/20">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-white flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-emerald-400" />
          Jadwal Konsultasi
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading jadwal...</p>
          </div>
        ) : appointments.length > 0 ? (
          <div className="space-y-4">
            {appointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                userRole="LAWYER"
                refetchAppointments={fetchAppointments}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-xl font-medium text-white mb-2">
              Tidak ada permintaan konsultasi
            </h3>
            <p className="text-muted-foreground">
              Anda belum memiliki jadwal konsultasi untuk sekarang. Pastikan Anda telah mengatur ketersediaan agar klien dapat memesan.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
