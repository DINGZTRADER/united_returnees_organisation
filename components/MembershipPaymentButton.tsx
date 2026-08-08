"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function MembershipPaymentButton({ renewal = false }: { renewal?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function startPayment() {
    setBusy(true);
    setMessage("");
    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke("flutterwave-membership", {
      body: { action: "checkout" },
    });

    if (error || !data?.link) {
      setBusy(false);
      setMessage(data?.error ?? "Online payment is not available yet. Please contact the URO membership desk if this continues.");
      return;
    }

    window.location.assign(data.link);
  }

  return (
    <div className="payment-action">
      <button className="button payment-button" type="button" onClick={startPayment} disabled={busy}>
        {busy ? "Opening secure checkout…" : renewal ? "Renew membership — USD 100" : "Pay annual membership — USD 100"}
      </button>
      <small>Secure card checkout. URO activates membership only after server-side payment verification.</small>
      {message && <p className="form-message fallback">{message}</p>}
    </div>
  );
}
