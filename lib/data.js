import {
  Calendar,
  Video,
  CreditCard,
  User,
  FileText,
  ShieldCheck,
  MessageCircle,
} from "lucide-react";

// JSON data for features
export const features = [
  {
    icon: <User className="h-6 w-6 text-emerald-400" />,
    title: "Create Your Profile",
    description:
      "Daftar dan lengkapi profil Anda untuk mendapatkan rekomendasi dan layanan hukum yang disesuaikan.",
  },
  {
    icon: <Calendar className="h-6 w-6 text-emerald-400" />,
    title: "Book Appointments",
    description:
      "Cari advokat, cek profil, dan mulai konsultasi yang sesuai dengan jadwal Anda.",
  },
  {
    icon: <MessageCircle className="h-6 w-6 text-emerald-400" />,
    title: "Chat Consultation",
    description:
      "Konsultasikan masalah hukum Anda melalui pesan secara aman tanpa perlu keluar rumah.",
  },
  {
    icon: <CreditCard className="h-6 w-6 text-emerald-400" />,
    title: "Consultation Fee",
    description:
      "Biaya konsultasi yang terjangkau sesuai dengan kebutuhan hukum Anda.",
  },
  {
    icon: <ShieldCheck className="h-6 w-6 text-emerald-400" />,
    title: "Verified Lawyers",
    description:
      "Semua advokat yang terdaftar telah diverifikasi dan dipastikan kualitasnya untuk memberikan pelayanan terbaik.",
  },
  {
    icon: <FileText className="h-6 w-6 text-emerald-400" />,
    title: "Legal Documentation",
    description:
      "Akses dan kelola riwayat konsultasi, catatan advokat, serta dokumen hukum yang relevan.",
  },
];

// JSON data for testimonials
export const testimonials = [
  {
    initials: "HD",
    name: "Helmi Dunks",
    role: "Mahasiswa Abadi",
    quote:
      "Gara-gara website ini aku bisa konsultasi soal tugas mata kuliah hukum ke advokat nya langsung, padahal cita-citaku ingin menjadi sosok leluhur kampus selama 7 tahun. Huft.",
  },
  {
    initials: "SD",
    name: "Ibu Scarlet Darkening",
    role: "Ibunya Helmi Dunks",
    quote:
      "Hanya di rezim ini ada websait yang membuat anak saya menjadi rajin mengerjakan tugas kuliahnya walaupun tidak menjadi pandai. Terima kasih Garena!",
  },
  {
    initials: "WH",
    name: "Wahyu Hayuk",
    role: "Ketua RT. 06",
    quote:
      "Pengiriman cepat,,, seller ramah,, packing juga rapih, tapi barangnya belom dicoba... saya kasih bintang satu dulu,,,, nanti kalo udah dicoba saya kasih bintang dua,,, nanti kalo udah peterpen jadi bintang di surga... xixixi... 😀😀😀😀😀",
  },
];

// JSON data for credit system benefits
export const creditBenefits = [
  "Setiap advokat memiliki <strong class='text-emerald-400'>harga yang variatif</strong>",
  "<strong class='text-emerald-400'>Tidak ada batasan</strong> pesan yang bisa dikirim",
  "Pengembalian dana <strong class='text-emerald-400'>secepatnya</strong> jika kurang puas",
  "Penanganan <strong class='text-emerald-400'>24 jam</strong> untuk setiap pengguna",
];
