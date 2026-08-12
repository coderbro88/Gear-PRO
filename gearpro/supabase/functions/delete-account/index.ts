import Stripe from 'npm:stripe@17.5.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { accountDeletedHtml, accountDeletedSubject, sendEmail } from '../_shared/email.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const headers = corsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');
    const token = authHeader.replace('Bearer ', '');

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) throw new Error('Not authenticated');
    const userId = userData.user.id;
    const userEmail = userData.user.email;

    // Cancel any active Stripe subscription first -- once user_profiles is
    // deleted below, the stripe_customer_id link is gone, and a still-active
    // subscription would keep billing with no account left to see or cancel it.
    const { data: profile } = await admin
      .from('user_profiles')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (profile?.stripe_customer_id) {
      const subscriptions = await stripe.subscriptions.list({
        customer: profile.stripe_customer_id,
        status: 'all',
      });
      await Promise.all(
        subscriptions.data
          .filter((sub) => ['active', 'trialing', 'past_due'].includes(sub.status))
          .map((sub) => stripe.subscriptions.cancel(sub.id)),
      );
    }

    // Children before parents (FK order). Each app-owned table is scoped to
    // user_id, so this is a full account wipe, not just an auth row delete.
    await admin.from('assignments').delete().eq('user_id', userId);
    await admin.from('bags').delete().eq('user_id', userId);
    await admin.from('trips').delete().eq('user_id', userId);
    await admin.from('gear_items').delete().eq('user_id', userId);
    await admin.from('user_access_grants').delete().eq('user_id', userId);
    await admin.from('user_profiles').delete().eq('user_id', userId);

    const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);
    if (deleteUserError) throw deleteUserError;

    if (userEmail) {
      void sendEmail({
        to: userEmail,
        bcc: 'austin@hevelgroup.com',
        subject: accountDeletedSubject(),
        html: accountDeletedHtml(),
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 400,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }
});
