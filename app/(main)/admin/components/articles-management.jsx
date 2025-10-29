"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileText, Plus, Trash2, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { toast } from "sonner";

export function ArticlesManagement() {
  const [articles, setArticles] = useState([]);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("Admin");
  const [excerpt, setExcerpt] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔹 Ambil data dari backend API
  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const res = await fetch("/api/articles");
      if (res.ok) {
        const data = await res.json();
        setArticles(data);
      }
    } catch (error) {
      console.error("Failed to fetch articles:", error);
      setArticles([]);
    }
  };

  // 🔹 Tambahkan artikel baru (POST)
  async function addArticle(e) {
    e.preventDefault();
    if (!title.trim() || !excerpt.trim()) {
      toast.error("Judul dan ringkasan harus diisi");
      return;
    }

    setLoading(true);
    try {
      const newArticle = {
        title,
        author,
        excerpt,
      };

      const res = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newArticle),
      });

      if (res.ok) {
        const created = await res.json();
        setArticles((prev) => [created, ...prev]);
        setTitle("");
        setExcerpt("");
        toast.success("Artikel berhasil ditambahkan");
      } else {
        toast.error("Gagal menambahkan artikel");
      }
    } catch (error) {
      console.error("Error adding article:", error);
      toast.error("Terjadi kesalahan saat menambahkan artikel");
    } finally {
      setLoading(false);
    }
  }

  // 🔹 Hapus artikel (DELETE)
  async function removeArticle(id) {
    if (!confirm("Apakah Anda yakin ingin menghapus artikel ini?")) {
      return;
    }

    try {
      const res = await fetch(`/api/articles/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setArticles((prev) => prev.filter((a) => a.id !== id));
        toast.success("Artikel berhasil dihapus");
      } else {
        toast.error("Gagal menghapus artikel");
      }
    } catch (error) {
      console.error("Error removing article:", error);
      toast.error("Terjadi kesalahan saat menghapus artikel");
    }
  }

  return (
    <div className="space-y-6">
      {/* Form Tambah Artikel */}
      <Card className="bg-muted/20 border-emerald-900/20">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Plus className="h-5 w-5 text-emerald-400" />
            Tambah Artikel Baru
          </CardTitle>
          <CardDescription>
            Buat artikel baru untuk platform konsultasi hukum
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={addArticle} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium text-white">
                  Judul Artikel
                </Label>
                <Input
                  id="title"
                  className="bg-background border-emerald-900/20"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Masukkan judul artikel"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="author" className="text-sm font-medium text-white">
                  Penulis
                </Label>
                <Input
                  id="author"
                  className="bg-background border-emerald-900/20"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Nama penulis"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="excerpt" className="text-sm font-medium text-white">
                Ringkasan Artikel
              </Label>
              <Textarea
                id="excerpt"
                className="bg-background border-emerald-900/20"
                rows={4}
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Tulis ringkasan artikel"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? "Menyimpan..." : "Simpan Artikel"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Daftar Artikel */}
      <Card className="bg-muted/20 border-emerald-900/20">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-400" />
            Daftar Artikel
          </CardTitle>
          <CardDescription>
            Kelola semua artikel yang telah dipublikasikan
          </CardDescription>
        </CardHeader>
        <CardContent>
          {articles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Belum ada artikel yang dipublikasikan</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {articles.map((article) => (
                <Card
                  key={article.id}
                  className="bg-background border-emerald-900/20 hover:border-emerald-700/30 transition-all"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-white">
                            {article.title}
                          </h3>
                          <Badge
                            variant="outline"
                            className="bg-emerald-900/20 border-emerald-900/30 text-emerald-400"
                          >
                            Published
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {article.author} • {format(new Date(article.date), "PPP")}
                        </p>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {article.excerpt}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-emerald-900/30 hover:bg-muted/80"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeArticle(article.id)}
                          className="border-red-900/30 hover:bg-red-900/10 text-red-400"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Hapus
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
    </div>
  );
}
