import Stripe from 'npm:stripe@17.5.0';
import { sendEmail, donationThankYouHtml, donationThankYouSubject } from '../_shared/email.ts';

// Stripe calls this server-to-server -- no browser involved, so no CORS needed.
// verify_jwt must be OFF for this function (Stripe doesn't send a Supabase JWT);
// the Stripe-Signature check below is what authenticates the caller instead.
//
// GearPro is free -- the only Stripe flow is stripe-donate's one-time "support
// the app" payment, so this only needs to handle checkout.session.completed.
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
const cryptoProvider = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature');
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
      undefined,
      cryptoProvider,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(`Webhook signature verification failed: ${message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const donorEmail = session.customer_details?.email ?? session.customer_email;
    if (donorEmail && session.amount_total != null) {
      const amountFormatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: session.currency ?? 'usd',
      }).format(session.amount_total / 100);
      void sendEmail({
        to: donorEmail,
        bcc: 'austin@hevelgroup.com',
        subject: donationThankYouSubject(),
        html: donationThankYouHtml(amountFormatted),
      });
    }
  }

  return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } });
});
