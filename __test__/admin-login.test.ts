// @ts-ignore: Allow top-level await in Jest tests
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
export {};

(async () => {
  await (jest as any).unstable_mockModule('../lib/prisma', async () => {
    return {
      db: { user: { findUnique: jest.fn() } },
    };
  });

  await (jest as any).unstable_mockModule('@clerk/nextjs/server', async () => {
    return { auth: jest.fn() };
  });

  const { db } = await import('../lib/prisma');
  const { auth } = await import('@clerk/nextjs/server');
  const { verifyAdmin } = await import('../actions/admin.js');

  describe('verifyAdmin (admin login check)', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns false when no user is authenticated', async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: null });
      const result = await verifyAdmin();
      expect(result).toBe(false);
      expect(auth).toHaveBeenCalled();
    });

    it('returns true when authenticated user role is ADMIN', async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: 'user_123' });
      (db.user.findUnique as unknown as jest.Mock).mockResolvedValue({ id: 'u1', role: 'ADMIN' });

      const result = await verifyAdmin();
      expect(result).toBe(true);
    });

    it('returns false when authenticated user role is not ADMIN', async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: 'user_456' });
      (db.user.findUnique as unknown as jest.Mock).mockResolvedValue({ id: 'u2', role: 'LAWYER' });

      const result = await verifyAdmin();
      expect(result).toBe(false);
    });

    it('returns false when database lookup throws', async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: 'user_789' });
      (db.user.findUnique as unknown as jest.Mock).mockRejectedValue(new Error('DB error'));

      const result = await verifyAdmin();
      expect(result).toBe(false);
    });
  });
})();
