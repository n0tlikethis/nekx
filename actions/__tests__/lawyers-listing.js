import { getLawyersBySpecialty } from "@/actions/lawyers-listing";
import { db } from "@/lib/prisma";

// Mock dependencies
jest.mock("@/lib/prisma", () => ({
  db: {
    user: {
      findMany: jest.fn(),
    },
  },
}));

describe("Lawyers Listing Actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getLawyersBySpecialty", () => {
    const mockLawyers = [
      {
        id: "lawyer_1",
        clerkUserId: "clerk_lawyer_1",
        email: "alice@example.com",
        name: "Alice Lawyer",
        role: "LAWYER",
        specialty: "Corporate Law",
        experience: 5,
        verificationStatus: "VERIFIED",
        description: "Experienced corporate lawyer",
        imageUrl: "https://example.com/alice.jpg",
      },
      {
        id: "lawyer_2",
        clerkUserId: "clerk_lawyer_2",
        email: "bob@example.com",
        name: "Bob Lawyer",
        role: "LAWYER",
        specialty: "Corporate Law",
        experience: 8,
        verificationStatus: "VERIFIED",
        description: "Senior corporate lawyer",
        imageUrl: "https://example.com/bob.jpg",
      },
    ];

    describe("Fetch Lawyers by Specialty", () => {
      it("harusnya berhasil ngambil lawyers berdasarkan specialty", async () => {
        db.user.findMany.mockResolvedValue(mockLawyers);

        const result = await getLawyersBySpecialty("Corporate Law");

        expect(db.user.findMany).toHaveBeenCalledWith({
          where: {
            role: "LAWYER",
            verificationStatus: "VERIFIED",
            specialty: "Corporate Law",
          },
          orderBy: {
            name: "asc",
          },
        });
        expect(result).toEqual({ lawyers: mockLawyers });
      });

      it("harusnya handle URL encoded specialty (dengan %20)", async () => {
        db.user.findMany.mockResolvedValue(mockLawyers);

        const result = await getLawyersBySpecialty("Corporate%20Law");

        expect(db.user.findMany).toHaveBeenCalledWith({
          where: {
            role: "LAWYER",
            verificationStatus: "VERIFIED",
            specialty: "Corporate Law", // Decoded from %20 to space
          },
          orderBy: {
            name: "asc",
          },
        });
        expect(result).toEqual({ lawyers: mockLawyers });
      });

      it("harusnya handle multiple spaces dalam specialty", async () => {
        db.user.findMany.mockResolvedValue([]);

        await getLawyersBySpecialty("Family%20Law%20and%20Divorce");

        expect(db.user.findMany).toHaveBeenCalledWith({
          where: {
            role: "LAWYER",
            verificationStatus: "VERIFIED",
            specialty: "Family Law and Divorce",
          },
          orderBy: {
            name: "asc",
          },
        });
      });

      it("harusnya ngembaliin array kosong kalo ngak ada lawyers", async () => {
        db.user.findMany.mockResolvedValue([]);

        const result = await getLawyersBySpecialty("Tax Law");

        expect(result).toEqual({ lawyers: [] });
      });

      it("harusnya sort lawyers berdasarkan name ascending", async () => {
        db.user.findMany.mockResolvedValue(mockLawyers);

        await getLawyersBySpecialty("Corporate Law");

        expect(db.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: {
              name: "asc",
            },
          })
        );
      });
    });

    describe("Query Filters", () => {
      it("harusnya hanya fetch lawyers dengan role LAWYER", async () => {
        db.user.findMany.mockResolvedValue(mockLawyers);

        await getLawyersBySpecialty("Corporate Law");

        expect(db.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              role: "LAWYER",
            }),
          })
        );
      });

      it("harusnya hanya fetch lawyers dengan verificationStatus VERIFIED", async () => {
        db.user.findMany.mockResolvedValue(mockLawyers);

        await getLawyersBySpecialty("Corporate Law");

        expect(db.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              verificationStatus: "VERIFIED",
            }),
          })
        );
      });

      it("harusnya filter berdasarkan specialty yang tepat", async () => {
        db.user.findMany.mockResolvedValue(mockLawyers);

        await getLawyersBySpecialty("Criminal Law");

        expect(db.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              specialty: "Criminal Law",
            }),
          })
        );
      });

      it("harusnya apply semua filters secara bersamaan", async () => {
        db.user.findMany.mockResolvedValue(mockLawyers);

        await getLawyersBySpecialty("Family Law");

        expect(db.user.findMany).toHaveBeenCalledWith({
          where: {
            role: "LAWYER",
            verificationStatus: "VERIFIED",
            specialty: "Family Law",
          },
          orderBy: {
            name: "asc",
          },
        });
      });
    });

    describe("Different Specialties", () => {
      it("harusnya handle Criminal Law specialty", async () => {
        const criminalLawyers = [
          {
            ...mockLawyers[0],
            specialty: "Criminal Law",
          },
        ];

        db.user.findMany.mockResolvedValue(criminalLawyers);

        const result = await getLawyersBySpecialty("Criminal Law");

        expect(result.lawyers[0].specialty).toBe("Criminal Law");
      });

      it("harusnya handle Family Law specialty", async () => {
        const familyLawyers = [
          {
            ...mockLawyers[0],
            specialty: "Family Law",
          },
        ];

        db.user.findMany.mockResolvedValue(familyLawyers);

        const result = await getLawyersBySpecialty("Family Law");

        expect(result.lawyers[0].specialty).toBe("Family Law");
      });

      it("harusnya handle Tax Law specialty", async () => {
        const taxLawyers = [
          {
            ...mockLawyers[0],
            specialty: "Tax Law",
          },
        ];

        db.user.findMany.mockResolvedValue(taxLawyers);

        const result = await getLawyersBySpecialty("Tax Law");

        expect(result.lawyers[0].specialty).toBe("Tax Law");
      });

      it("harusnya handle specialty dengan karakter khusus", async () => {
        db.user.findMany.mockResolvedValue([]);

        await getLawyersBySpecialty("IP%20&%20Technology%20Law");

        expect(db.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              specialty: "IP & Technology Law",
            }),
          })
        );
      });
    });

    describe("Data Integrity", () => {
      it("harusnya preserve semua lawyer data fields", async () => {
        db.user.findMany.mockResolvedValue(mockLawyers);

        const result = await getLawyersBySpecialty("Corporate Law");

        expect(result.lawyers[0]).toHaveProperty("id");
        expect(result.lawyers[0]).toHaveProperty("name");
        expect(result.lawyers[0]).toHaveProperty("email");
        expect(result.lawyers[0]).toHaveProperty("specialty");
        expect(result.lawyers[0]).toHaveProperty("experience");
        expect(result.lawyers[0]).toHaveProperty("verificationStatus");
        expect(result.lawyers[0]).toHaveProperty("description");
      });

      it("harusnya handle lawyers dengan imageUrl null", async () => {
        const lawyersWithNullImage = [
          {
            ...mockLawyers[0],
            imageUrl: null,
          },
        ];

        db.user.findMany.mockResolvedValue(lawyersWithNullImage);

        const result = await getLawyersBySpecialty("Corporate Law");

        expect(result.lawyers[0].imageUrl).toBeNull();
      });

      it("harusnya handle lawyers dengan description null", async () => {
        const lawyersWithNullDescription = [
          {
            ...mockLawyers[0],
            description: null,
          },
        ];

        db.user.findMany.mockResolvedValue(lawyersWithNullDescription);

        const result = await getLawyersBySpecialty("Corporate Law");

        expect(result.lawyers[0].description).toBeNull();
      });

      it("harusnya return multiple lawyers dalam order yang benar", async () => {
        const multipleLawyers = [
          { ...mockLawyers[0], name: "Alice Lawyer" },
          { ...mockLawyers[1], name: "Bob Lawyer" },
          {
            ...mockLawyers[0],
            id: "lawyer_3",
            name: "Charlie Lawyer",
          },
        ];

        db.user.findMany.mockResolvedValue(multipleLawyers);

        const result = await getLawyersBySpecialty("Corporate Law");

        expect(result.lawyers).toHaveLength(3);
        expect(result.lawyers[0].name).toBe("Alice Lawyer");
        expect(result.lawyers[1].name).toBe("Bob Lawyer");
        expect(result.lawyers[2].name).toBe("Charlie Lawyer");
      });
    });

    describe("Edge Cases", () => {
      it("harusnya handle specialty dengan leading/trailing spaces", async () => {
        db.user.findMany.mockResolvedValue(mockLawyers);

        await getLawyersBySpecialty("  Corporate Law  ");

        // Specialty with spaces should still work
        expect(db.user.findMany).toHaveBeenCalled();
      });

      it("harusnya handle empty specialty string", async () => {
        db.user.findMany.mockResolvedValue([]);

        const result = await getLawyersBySpecialty("");

        expect(db.user.findMany).toHaveBeenCalledWith({
          where: {
            role: "LAWYER",
            verificationStatus: "VERIFIED",
            specialty: "",
          },
          orderBy: {
            name: "asc",
          },
        });
        expect(result).toEqual({ lawyers: [] });
      });

      it("harusnya handle specialty case sensitive", async () => {
        db.user.findMany.mockResolvedValue([]);

        await getLawyersBySpecialty("corporate law");

        expect(db.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              specialty: "corporate law", // Case preserved
            }),
          })
        );
      });

      it("harusnya handle specialty dengan angka", async () => {
        db.user.findMany.mockResolvedValue([]);

        await getLawyersBySpecialty("Section%20377%20Law");

        expect(db.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              specialty: "Section 377 Law",
            }),
          })
        );
      });
    });

    describe("Error Handling", () => {
      it("harusnya ngembaliin error object kalo database gagal", async () => {
        db.user.findMany.mockRejectedValue(
          new Error("Database connection failed")
        );

        const result = await getLawyersBySpecialty("Corporate Law");

        expect(result).toEqual({ error: "Failed to fetch lawyers" });
      });

      it("harusnya handle database timeout", async () => {
        db.user.findMany.mockRejectedValue(new Error("Query timeout"));

        const result = await getLawyersBySpecialty("Criminal Law");

        expect(result).toEqual({ error: "Failed to fetch lawyers" });
      });

      it("harusnya handle invalid database query", async () => {
        db.user.findMany.mockRejectedValue(new Error("Invalid query"));

        const result = await getLawyersBySpecialty("Family Law");

        expect(result).toEqual({ error: "Failed to fetch lawyers" });
      });

      it("harusnya handle unexpected errors gracefully", async () => {
        db.user.findMany.mockRejectedValue(new Error("Unexpected error"));

        const result = await getLawyersBySpecialty("Tax Law");

        expect(result).toHaveProperty("error");
        expect(typeof result.error).toBe("string");
      });

      it("harusnya log error ke console", async () => {
        const consoleErrorSpy = jest
          .spyOn(console, "error")
          .mockImplementation(() => {});

        db.user.findMany.mockRejectedValue(new Error("Database error"));

        await getLawyersBySpecialty("Corporate Law");

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Failed to fetch lawyers by specialty:",
          expect.any(Error)
        );

        consoleErrorSpy.mockRestore();
      });
    });

    describe("Performance & Optimization", () => {
      it("harusnya hanya query database sekali per call", async () => {
        db.user.findMany.mockResolvedValue(mockLawyers);

        await getLawyersBySpecialty("Corporate Law");

        expect(db.user.findMany).toHaveBeenCalledTimes(1);
      });

      it("harusnya handle large result sets", async () => {
        const largeLawyerList = Array.from({ length: 100 }, (_, i) => ({
          ...mockLawyers[0],
          id: `lawyer_${i}`,
          name: `Lawyer ${i}`,
        }));

        db.user.findMany.mockResolvedValue(largeLawyerList);

        const result = await getLawyersBySpecialty("Corporate Law");

        expect(result.lawyers).toHaveLength(100);
      });

      it("harusnya use efficient query dengan proper indexes", async () => {
        db.user.findMany.mockResolvedValue(mockLawyers);

        await getLawyersBySpecialty("Corporate Law");

        // Verify query uses indexed fields: role, verificationStatus, specialty
        expect(db.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              role: "LAWYER",
              verificationStatus: "VERIFIED",
              specialty: "Corporate Law",
            },
          })
        );
      });
    });

    describe("URL Encoding Edge Cases", () => {
      it("harusnya decode single %20", async () => {
        db.user.findMany.mockResolvedValue([]);

        await getLawyersBySpecialty("Tax%20Law");

        expect(db.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              specialty: "Tax Law",
            }),
          })
        );
      });

      it("harusnya decode multiple consecutive %20", async () => {
        db.user.findMany.mockResolvedValue([]);

        await getLawyersBySpecialty("Corporate%20%20Law");

        expect(db.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              specialty: "Corporate  Law", // Double space preserved
            }),
          })
        );
      });

      it("harusnya handle mixed encoded dan unencoded spaces", async () => {
        db.user.findMany.mockResolvedValue([]);

        await getLawyersBySpecialty("Family Law%20and Divorce");

        expect(db.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              specialty: "Family Law and Divorce",
            }),
          })
        );
      });

      it("harusnya handle specialty tanpa encoding", async () => {
        db.user.findMany.mockResolvedValue(mockLawyers);

        await getLawyersBySpecialty("CorporateLaw");

        expect(db.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              specialty: "CorporateLaw",
            }),
          })
        );
      });
    });
  });
});
