import { NextResponse } from "next/server";

// Mock data untuk artikel (dalam implementasi nyata, ini akan dari database)
let articles = [
  {
    id: "1",
    title: "Panduan Hukum Perkawinan di Indonesia",
    author: "Admin",
    date: "2024-01-15T10:00:00Z",
    excerpt: "Artikel ini membahas tentang prosedur dan persyaratan perkawinan menurut hukum Indonesia, termasuk dokumen yang diperlukan dan proses pernikahan yang sah."
  },
  {
    id: "2", 
    title: "Hak dan Kewajiban Konsumen dalam Transaksi Online",
    author: "Admin",
    date: "2024-01-10T14:30:00Z",
    excerpt: "Memahami perlindungan hukum yang diberikan kepada konsumen dalam transaksi e-commerce dan cara mengajukan komplain jika terjadi masalah."
  },
  {
    id: "3",
    title: "Prosedur Pendirian PT di Indonesia",
    author: "Admin", 
    date: "2024-01-05T09:15:00Z",
    excerpt: "Langkah-langkah lengkap untuk mendirikan Perseroan Terbatas (PT) di Indonesia, mulai dari persiapan dokumen hingga pengurusan izin usaha."
  }
];

// GET - Ambil semua artikel
export async function GET() {
  try {
    return NextResponse.json(articles);
  } catch (error) {
    console.error("Error fetching articles:", error);
    return NextResponse.json(
      { error: "Failed to fetch articles" },
      { status: 500 }
    );
  }
}

// POST - Tambah artikel baru
export async function POST(request) {
  try {
    const body = await request.json();
    const { title, author, excerpt } = body;

    // Validasi input
    if (!title || !author || !excerpt) {
      return NextResponse.json(
        { error: "Title, author, and excerpt are required" },
        { status: 400 }
      );
    }

    // Buat artikel baru
    const newArticle = {
      id: Date.now().toString(),
      title: title.trim(),
      author: author.trim(),
      date: new Date().toISOString(),
      excerpt: excerpt.trim()
    };

    // Tambahkan ke array
    articles.unshift(newArticle);

    return NextResponse.json(newArticle, { status: 201 });
  } catch (error) {
    console.error("Error creating article:", error);
    return NextResponse.json(
      { error: "Failed to create article" },
      { status: 500 }
    );
  }
}
