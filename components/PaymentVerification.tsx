"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  status: string;
  transactionId: string;
  txRef: string;
};

type VerificationState = "verifying" | "success" | "cancelled" | "error";

export function PaymentVerification({ status, transactionId, txRef }: Props) {
  const initialState: VerificationState = status === "cancelled" ? "cancelled" : "verifying";
  const [state, setState] = useState<VerificationState>(initialState);
  const [message, setMessage] = useState(status === "cancelled" ? "The payment was cancelled. No membership charge has been confirmed." : "Confirming your payment securely…");
  const [receiptId, setReceiptId] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");

  useEffect(() => {
    if (status === "cancelled") return;
    if (!transactionId || !txRef) {
      setState("error");
      setMessage("Payment details are incomplete. Open your member dashboard to check the latest status.");
      return;
    }

    let active = true;
    async function verify() {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke("flutterwave-membership", {
        body: { action: "verify", transaction_id: transactionId, tx_ref: txRef },
      });
      if (!active) return;
      if (error || !data?.ok) {
        setState("error");
        setMessage(data?.error ?? "We could not confirm the payment yet. Your dashboard will show the final status once verification completes.");
        return;
      }

      const activation = data.activation ?? data.receipt ?? {};
      setReceiptId(activation.receipt_id ?? activation.id ?? "");
      setReceiptNumber(activation.receipt_number ?? "");
      setState("success");
      setMessage("Payment verified. Your URO membership is active for the new annual period.");
    }
    verify();
    return () => { active = false; };
  }, [status, transactionId, txRef]);

  return (
    <article className="payment-result-card">
      <span className={`status-pill ${state === "success" ? "live" : ""}`}>{state}</span>
      <h1>{state === "success" ? "Membership activated" : state === "cancelled" ? "Payment cancelled" : state === "error" ? "Verification pending" : "Verifying payment"}</h1>
      <p>{message}</p>
      {receiptNumber && <p><strong>Receipt:</strong> {receiptNumber}</p>}
      <div className="payment-result-actions">
        {receiptId && <Link className="button" href={`/receipt/${receiptId}`}>View receipt</Link>}
        <Link className="button secondary" href="/dashboard">Return to dashboard</Link>
      </div>
    </article>
  );
}
