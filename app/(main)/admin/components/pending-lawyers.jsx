"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, User, Medal, FileText, ExternalLink } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { updateLawyerStatus } from "@/actions/admin";
import useFetch from "@/hooks/use-fetch";
import { useEffect } from "react";
import { BarLoader } from "react-spinners";

export function PendingLawyers({ lawyers }) {
  const [selectedLawyer, setSelectedLawyer] = useState(null);

  // Custom hook for approve/reject server action
  const {
    loading,
    data,
    fn: submitStatusUpdate,
  } = useFetch(updateLawyerStatus);

  // Open lawyer details dialog
  const handleViewDetails = (lawyer) => {
    setSelectedLawyer(lawyer);
  };

  // Close lawyer details dialog
  const handleCloseDialog = () => {
    setSelectedLawyer(null);
  };

  // Handle approve or reject lawyer
  const handleUpdateStatus = async (lawyerId, status) => {
    if (loading) return;

    const formData = new FormData();
    formData.append("lawyerId", lawyerId);
    formData.append("status", status);

    await submitStatusUpdate(formData);
  };

  useEffect(() => {
    if (data && data?.success) {
      handleCloseDialog();
    }
  }, [data]);

  return (
    <div>
      <Card className="bg-muted/20 border-emerald-900/20">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-white">
            Pending Verifikasi Advokat
          </CardTitle>
          <CardDescription>
            Review dan approve pengajuan advokat
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lawyers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Tidak ada permintaan verifikasi untuk saat ini.
            </div>
          ) : (
            <div className="space-y-4">
              {lawyers.map((lawyer) => (
                <Card
                  key={lawyer.id}
                  className="bg-background border-emerald-900/20 hover:border-emerald-700/30 transition-all"
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-muted/20 rounded-full p-2">
                          <User className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div>
                          <h3 className="font-medium text-white">
                            {lawyer.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {lawyer.specialty} • {lawyer.experience} tahun pengalaman
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end md:self-auto">
                        <Badge
                          variant="outline"
                          className="bg-amber-900/20 border-amber-900/30 text-amber-400"
                        >
                          Pending
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(lawyer)}
                          className="border-emerald-900/30 hover:bg-muted/80"
                        >
                          Lihat Detail
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lawyer Details Dialog */}
      {selectedLawyer && (
        <Dialog open={!!selectedLawyer} onOpenChange={handleCloseDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white">
                Detail Verifikasi Advokat
              </DialogTitle>
              <DialogDescription>
                Review data advokat dengan hati-hati sebelum membuat keputusan
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="flex flex-col md:flex-row gap-6">
                <div className="space-y-1 flex-1">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Nama Lengkap
                  </h4>
                  <p className="text-base font-medium text-white">
                    {selectedLawyer.name}
                  </p>
                </div>
                <div className="space-y-1 flex-1">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Email
                  </h4>
                  <p className="text-base font-medium text-white">
                    {selectedLawyer.email}
                  </p>
                </div>
                <div className="space-y-1 flex-1">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Tanggal Mendaftar
                  </h4>
                  <p className="text-base font-medium text-white">
                    {format(new Date(selectedLawyer.createdAt), "PPP")}
                  </p>
                </div>
              </div>

              <Separator className="bg-emerald-900/20" />

              {/* Professional Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Medal className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-white font-medium">
                    Detail Profesional
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6">
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Spesialisasi
                    </h4>
                    <p className="text-white">{selectedLawyer.specialty}</p>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Tahun Pengalaman
                    </h4>
                    <p className="text-white">
                      {selectedLawyer.experience} tahun
                    </p>
                  </div>

                  <div className="space-y-1 col-span-2">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Dokumen
                    </h4>
                    <div className="flex items-center">
                      <a
                        href={selectedLawyer.credentialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:text-emerald-300 flex items-center"
                      >
                        Lihat Dokumen
                        <ExternalLink className="h-4 w-4 ml-1" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="bg-emerald-900/20" />

              {/* Description */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-white font-medium">
                    Deskripsi
                  </h3>
                </div>
                <p className="text-muted-foreground whitespace-pre-line">
                  {selectedLawyer.description}
                </p>
              </div>
            </div>

            {loading && <BarLoader width={"100%"} color="#36d7b7" />}

            <DialogFooter className="flex sm:justify-between">
              <Button
                variant="destructive"
                onClick={() =>
                  handleUpdateStatus(selectedLawyer.id, "REJECTED")
                }
                disabled={loading}
                className="bg-red-600 hover:bg-red-700"
              >
                <X className="mr-2 h-4 w-4" />
                Reject
              </Button>
              <Button
                onClick={() =>
                  handleUpdateStatus(selectedLawyer.id, "VERIFIED")
                }
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Check className="mr-2 h-4 w-4" />
                Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
