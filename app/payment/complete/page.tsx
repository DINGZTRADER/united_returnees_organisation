import { PaymentVerification } from "@/components/PaymentVerification";

export const metadata = { title: "Membership Payment" };

export default async function PaymentComplete({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const value = (key: string) => {
    const item = params[key];
    return Array.isArray(item) ? item[0] ?? "" : item ?? "";
  };

  return (
    <section className="section payment-result-page">
      <div className="container narrow-container">
        <PaymentVerification
          status={value("status")}
          transactionId={value("transaction_id")}
          txRef={value("tx_ref")}
        />
      </div>
    </section>
  );
}
