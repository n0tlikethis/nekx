import { User, Star, Calendar, Contact } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function LawyerCard({ lawyer }) {
  return (
    <Card className="border-emerald-900/20 hover:border-emerald-700/40 transition-all">
      <CardContent>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-900/20 flex items-center justify-center flex-shrink-0">
            {lawyer.imageUrl ? (
              <img
                src={lawyer.imageUrl}
                alt={lawyer.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <User className="h-6 w-6 text-emerald-400" />
            )}
          </div>

          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
              <h3 className="font-medium text-white text-lg">{lawyer.name}</h3>
              <Badge
                variant="outline"
                className="bg-emerald-900/20 border-emerald-900/30 text-emerald-400 self-start"
              >
                <Star className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground mb-1">
              {lawyer.specialty} • {lawyer.experience} tahun pengalaman
            </p>

            <div className="mt-4 line-clamp-2 text-sm text-muted-foreground mb-4">
              {lawyer.description}
            </div>

            <Button
              asChild
              className="w-full bg-emerald-500 hover:bg-emerald-600 mt-2"
            >
              <Link href={`/lawyers/${lawyer.specialty}/${lawyer.id}`}>
                <Contact className="h-4 w-4 mr-2" />
                Lihat Profil
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
