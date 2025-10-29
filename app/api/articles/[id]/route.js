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

// GET - Ambil artikel berdasarkan ID
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const article = articles.find(a => a.id === id);

    if (!article) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error("Error fetching article:", error);
    return NextResponse.json(
      { error: "Failed to fetch article" },
      { status: 500 }
    );
  }
}

// PUT - Update artikel
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { title, author, excerpt } = body;

    // Validasi input
    if (!title || !author || !excerpt) {
      return NextResponse.json(
        { error: "Title, author, and excerpt are required" },
        { status: 400 }
      );
    }

    // Cari artikel
    const articleIndex = articles.findIndex(a => a.id === id);
    if (articleIndex === -1) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }

    // Update artikel
    articles[articleIndex] = {
      ...articles[articleIndex],
      title: title.trim(),
      author: author.trim(),
      excerpt: excerpt.trim(),
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json(articles[articleIndex]);
  } catch (error) {
    console.error("Error updating article:", error);
    return NextResponse.json(
      { error: "Failed to update article" },
      { status: 500 }
    );
  }
}

// DELETE - Hapus artikel
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const articleIndex = articles.findIndex(a => a.id === id);

    if (articleIndex === -1) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }

    // Hapus artikel
    const deletedArticle = articles.splice(articleIndex, 1)[0];

    return NextResponse.json(
      { message: "Article deleted successfully", article: deletedArticle }
    );
  } catch (error) {
    console.error("Error deleting article:", error);
    return NextResponse.json(
      { error: "Failed to delete article" },
      { status: 500 }
    );
  }
}
