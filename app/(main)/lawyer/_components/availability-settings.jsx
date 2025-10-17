"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Plus, Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { setAvailabilitySlots } from "@/actions/lawyer";
import useFetch from "@/hooks/use-fetch";
import { toast } from "sonner";

export function AvailabilitySettings({ slots }) {
  const [showForm, setShowForm] = useState(false);

  // Custom hook for server action
  const { loading, fn: submitSlots, data } = useFetch(setAvailabilitySlots);

  // React Hook Form
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      startTime: "",
      endTime: "",
    },
  });

  function createLocalDateFromTime(timeStr) {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const now = new Date();
    const date = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hours,
      minutes
    );
    return date;
  }

  // Handle slot submission
  const onSubmit = async (data) => {
    if (loading) return;

    const formData = new FormData();

    const today = new Date().toISOString().split("T")[0];

    // Create date objects
    const startDate = createLocalDateFromTime(data.startTime);
    const endDate = createLocalDateFromTime(data.endTime);

    if (startDate >= endDate) {
      toast.error("End time harus setelah start time");
      return;
    }

    // Add to form data
    formData.append("startTime", startDate.toISOString());
    formData.append("endTime", endDate.toISOString());

    await submitSlots(formData);
  };

  useEffect(() => {
    if (data && data?.success) {
      setShowForm(false);
      toast.success("Slot konsultasi berhasil diperbarui");
    }
  }, [data]);

  // Format time string for display
  const formatTimeString = (dateString) => {
    try {
      return format(new Date(dateString), "hh:mm");
    } catch (e) {
      return "Invalid time";
    }
  };

  return (
    <Card className="border-emerald-900/20">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-white flex items-center">
          <Clock className="h-5 w-5 mr-2 text-emerald-400" />
          Pengaturan Penjadwalan
        </CardTitle>
        <CardDescription>
          Tetapkan jadwal harian Anda untuk konsultasi klien
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Current Availability Display */}
        {!showForm ? (
          <>
            <div className="mb-6">
              <h3 className="text-lg font-medium text-white mb-3">
                Jadwal Saat Ini
              </h3>

              {slots.length === 0 ? (
                <p className="text-muted-foreground">
                  Anda belum mengatur slot konsultasi. Tambahkan jadwal Anda untuk mulai menerima janji temu.
                </p>
              ) : (
                <div className="space-y-3">
                  {slots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center p-3 rounded-md bg-muted/20 border border-emerald-900/20"
                    >
                      <div className="bg-emerald-900/20 p-2 rounded-full mr-3">
                        <Clock className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {formatTimeString(slot.startTime)} -{" "}
                          {formatTimeString(slot.endTime)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {slot.appointment ? "Booked" : "Available"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              onClick={() => setShowForm(true)}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Set Waktu Konsultasi
            </Button>
          </>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4 border border-emerald-900/20 rounded-md p-4"
          >
            <h3 className="text-lg font-medium text-white mb-2">
              Set Konsultasi Harian
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  {...register("startTime", {
                    required: "Start time is required",
                  })}
                  className="bg-background border-emerald-900/20"
                />
                {errors.startTime && (
                  <p className="text-sm font-medium text-red-500">
                    {errors.startTime.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  {...register("endTime", { required: "End time is required" })}
                  className="bg-background border-emerald-900/20"
                />
                {errors.endTime && (
                  <p className="text-sm font-medium text-red-500">
                    {errors.endTime.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
                disabled={loading}
                className="border-emerald-900/30"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </form>
        )}

        <div className="mt-6 p-4 bg-muted/10 border border-emerald-900/10 rounded-md">
          <h4 className="font-medium text-white mb-2 flex items-center">
            <AlertCircle className="h-4 w-4 mr-2 text-emerald-400" />
              Cara Kerja Penjadwalan
          </h4>
          <p className="text-muted-foreground text-sm">
            Dengan mengatur jadwal harian Anda, klien dapat menjadwalkan konsultasi selama jam-jam tersebut. Jadwal yang sama berlaku untuk semua hari. Anda dapat memperbarui jadwal kapan saja, tetapi konsultasi yang sudah dipesan tidak akan terpengaruh.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
