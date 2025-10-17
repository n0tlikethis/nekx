"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  TrendingUp,
  Calendar,
  BarChart3,
  CreditCard,
  Loader2,
  AlertCircle,
  Coins,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { requestPayout } from "@/actions/payout";
import useFetch from "@/hooks/use-fetch";
import { toast } from "sonner";

export function LawyerEarnings({ earnings, payouts = [] }) {
  const [showPayoutDialog, setShowPayoutDialog] = useState(false);
  const [paypalEmail, setPaypalEmail] = useState("");

  const {
    thisMonthEarnings = 0,
    completedAppointments = 0,
    averageEarningsPerMonth = 0,
    availableCredits = 0,
    availablePayout = 0,
  } = earnings;

  // Custom hook for payout request
  const { loading, data, fn: submitPayoutRequest } = useFetch(requestPayout);

  // Check if there's any pending payout
  const pendingPayout = payouts.find(
    (payout) => payout.status === "PROCESSING"
  );

  const handlePayoutRequest = async (e) => {
    e.preventDefault();

    if (!paypalEmail) {
      toast.error("PayPal email is required");
      return;
    }

    const formData = new FormData();
    formData.append("paypalEmail", paypalEmail);

    await submitPayoutRequest(formData);
  };

  useEffect(() => {
    if (data?.success) {
      setShowPayoutDialog(false);
      setPaypalEmail("");
      toast.success("Payout request submitted successfully!");
    }
  }, [data]);

  const platformFee = availableCredits * 2; // $2 per credit

  return (
    <div className="space-y-6">
      {/* Earnings Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-emerald-900/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Available Credits
                </p>
                <p className="text-3xl font-bold text-white">
                  {availableCredits}
                </p>
                <p className="text-xs text-muted-foreground">
                  ${availablePayout.toFixed(2)} available for payout
                </p>
              </div>
              <div className="bg-emerald-900/20 p-3 rounded-full">
                <Coins className="h-6 w-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-900/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-3xl font-bold text-white">
                  ${thisMonthEarnings.toFixed(2)}
                </p>
              </div>
              <div className="bg-emerald-900/20 p-3 rounded-full">
                <TrendingUp className="h-6 w-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-900/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Total Appointments
                </p>
                <p className="text-3xl font-bold text-white">
                  {completedAppointments}
                </p>
                <p className="text-xs text-muted-foreground">completed</p>
              </div>
              <div className="bg-emerald-900/20 p-3 rounded-full">
                <Calendar className="h-6 w-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-900/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg/Month</p>
                <p className="text-3xl font-bold text-white">
                  ${averageEarningsPerMonth.toFixed(2)}
                </p>
              </div>
              <div className="bg-emerald-900/20 p-3 rounded-full">
                <BarChart3 className="h-6 w-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
