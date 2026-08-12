// Called by a DB trigger (trial_welcome_webhook, via pg_net) right after
// handle_new_user() creates a new profile. Never blocks signup -- pg_net
// fires this asynchronously and ignores the response.
//
// GearPro is free (donations are optional, no paid plan) -- this just sends
// the welcome email, no trial/subscription copy.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { sendEmail, welcomeSubject, welcomeHtml } from './_shared/email.ts';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

function authorized(req: Request): boolean {
  const secret = Deno.env.get('WEBHOOK_SHARED_SECRET');
  if (!secret) return false;
  const auth = req.headers.get('Authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

Deno.serve(async (req) => {
  if (!authorized(req)) return new Response('Unauthorized', { status: 401 });

  const { user_id } = await req.json().catch(() => ({}));
  if (!user_id) return new Response(JSON.stringify({ ok: false, error: 'user_id required' }), { status: 400 });

  const { data: profile } = await admin.from('user_profiles').select('email').eq('user_id', user_id).maybeSingle();
  if (!profile?.email) return new Response(JSON.stringify({ ok: false, error: 'no email on file' }), { status: 200 });

  const result = await sendEmail({ to: profile.email, bcc: 'austin@hevelgroup.com', subject: welcomeSubject(), html: welcomeHtml() });
  return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
});
