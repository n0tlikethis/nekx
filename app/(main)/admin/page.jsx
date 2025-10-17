import { TabsContent } from "@/components/ui/tabs";
import { PendingLawyers } from "./components/pending-lawyers";
import { VerifiedLawyers } from "./components/verified-lawyers";
import { PendingPayouts } from "./components/pending-payouts";
import {
  getPendingLawyers,
  getVerifiedLawyers,
  getPendingPayouts,
} from "@/actions/admin";

export default async function AdminPage() {
  // Fetch all data in parallel
  const [pendingLawyersData, verifiedLawyersData, pendingPayoutsData] =
    await Promise.all([
      getPendingLawyers(),
      getVerifiedLawyers(),
      getPendingPayouts(),
    ]);

  return (
    <>
      <TabsContent value="pending" className="border-none p-0">
        <PendingLawyers lawyers={pendingLawyersData.lawyers || []} />
      </TabsContent>

      <TabsContent value="lawyers" className="border-none p-0">
        <VerifiedLawyers lawyers={verifiedLawyersData.lawyers || []} />
      </TabsContent>

      <TabsContent value="payouts" className="border-none p-0">
        <PendingPayouts payouts={pendingPayoutsData.payouts || []} />
      </TabsContent>
    </>
  );
}
