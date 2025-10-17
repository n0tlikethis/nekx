import { ClipboardCheck, AlertCircle, XCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getCurrentUser } from "@/actions/onboarding";
import { redirect } from "next/navigation";

export default async function VerificationPage() {
  // Get complete user profile
  const user = await getCurrentUser();

  // If already verified, redirect to dashboard
  if (user?.verificationStatus === "VERIFIED") {
    redirect("/lawyer");
  }

  const isRejected = user?.verificationStatus === "REJECTED";

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <Card className="border-emerald-900/20">
          <CardHeader className="text-center">
            <div
              className={`mx-auto p-4 ${
                isRejected ? "bg-red-900/20" : "bg-amber-900/20"
              } rounded-full mb-4 w-fit`}
            >
              {isRejected ? (
                <XCircle className="h-8 w-8 text-red-400" />
              ) : (
                <ClipboardCheck className="h-8 w-8 text-amber-400" />
              )}
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              {isRejected
                ? "Verifikasi Ditolak"
                : "Verifikasi Sedang Proses"}
            </CardTitle>
            <CardDescription className="text-lg">
              {isRejected
                ? "Sayangnya, pengajuan Anda perlu revisi"
                : "Terima kasih telah mengirimkan informasi Anda"}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            {isRejected ? (
              <div className="bg-red-900/10 border border-red-900/20 rounded-lg p-4 mb-6 flex items-start">
                <AlertCircle className="h-5 w-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" />
                <div className="text-muted-foreground text-left">
                  <p className="mb-2">
                    Tim administrasi kami telah meninjau pengajuan Anda dan menemukan bahwa pengajuan Anda tidak memenuhi persyaratan kami saat ini. Alasan umum penolakan meliputi:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 mb-3">
                    <li>Dokumen pendukung yang tidak cukup atau tidak jelas</li>
                    <li>Persyaratan pengalaman kerja yang tidak terpenuhi</li>
                    <li>Deskripsi layanan yang tidak lengkap atau ambigu</li>
                  </ul>
                  <p>
                    Anda dapat memperbarui pengajuan Anda dengan informasi lebih lengkap dan mengirimkannya kembali untuk ditinjau.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-amber-900/10 border border-amber-900/20 rounded-lg p-4 mb-6 flex items-start">
                <AlertCircle className="h-5 w-5 text-amber-400 mr-3 mt-0.5 flex-shrink-0" />
                <p className="text-muted-foreground text-left">
                  Profil Anda saat ini sedang ditinjau oleh tim administrasi kami. Proses ini biasanya memakan waktu 1-2 hari kerja.
                  Anda akan menerima pemberitahuan melalui email setelah akun Anda terverifikasi.
                </p>
              </div>
            )}

            <p className="text-muted-foreground mb-6">
              {isRejected
                ? "Anda dapat memperbarui profil pengacara Anda dan mengirimkannya kembali untuk verifikasi."
                : "Sambil menunggu, Anda dapat mempelajari platform kami atau menghubungi Contact Support kami jika Anda memiliki pertanyaan."}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isRejected ? (
                <>
                  <Button
                    asChild
                    variant="outline"
                    className="border-emerald-900/30"
                  >
                    <Link href="/">Kembali ke Beranda</Link>
                  </Button>
                  <Button
                    asChild
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Link href="/lawyer/update-profile">Update Profile</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    asChild
                    variant="outline"
                    className="border-emerald-900/30"
                  >
                    <Link href="/">Kembali ke Beranda</Link>
                  </Button>
                  <Button
                    asChild
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Link href="/contact-support">Contact Support</Link>
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
