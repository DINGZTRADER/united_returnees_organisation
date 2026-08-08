"use client";

export function PrintReceiptButton() {
  return <button className="button secondary no-print" type="button" onClick={() => window.print()}>Print / save receipt</button>;
}
