// Serves Apple Pay domain verification file required by Stripe
// https://stripe.com/docs/stripe-js/elements/payment-request-button#verifying-your-domain-with-apple-pay
export async function GET() {
  const res = await fetch(
    "https://stripe.com/files/apple-pay/apple-developer-merchantid-domain-association",
    { cache: "no-store" },
  );
  const text = await res.text();
  return new Response(text, {
    headers: { "Content-Type": "text/plain" },
  });
}
