import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  Deno.env.get("ALLOWED_ORIGIN"),
  'https://swaptics.vercel.app',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:3000',
].filter(Boolean) as string[];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] || '*';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

// C-3 + M-7 FIX: Cryptographically secure OTP generation
function generateOTP(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return (100000 + (array[0] % 900000)).toString();
}

// C-3 FIX: Hash OTP with SHA-256 before storing
async function hashOTP(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sendEmail(to: string, otp: string, fullName: string) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "Swaptics <onboarding@resend.dev>",
      to: [to],
      subject: `Your verification code`,
      html: `
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #ec4899, #f472b6); display: inline-flex; align-items: center; justify-content: center; font-size: 28px;">✿</div>
          </div>
          <h2 style="text-align: center; color: #1a1a2e; margin-bottom: 8px;">Verify Your Email</h2>
          <p style="text-align: center; color: #6b7280; font-size: 14px;">Hi ${fullName}, use the code below to verify your account on Swaptics.</p>
          <div style="text-align: center; margin: 28px 0;">
            <div style="display: inline-block; background: #f3f4f6; border-radius: 12px; padding: 16px 32px; letter-spacing: 8px; font-size: 32px; font-weight: 700; color: #1a1a2e;">${otp}</div>
          </div>
          <p style="text-align: center; color: #9ca3af; font-size: 12px;">This code expires in 10 minutes. If you didn't request this code, you can safely ignore this email.</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Email send failed: ${err}`);
  }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { email, fullName, otp: userOtp, action, password, area, gender } = await req.json();

    // ─── VERIFY OTP ───
    if (action === "verify") {
      if (!email || !userOtp || !password) {
        return new Response(JSON.stringify({ error: "Email, OTP, and password are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // C-3 FIX: Compare hashed OTP
      const hashedInput = await hashOTP(userOtp);

      const { data: otpRecord } = await supabase
        .from("otp_verifications")
        .select("*")
        .eq("email", email.toLowerCase())
        .eq("otp_hash", hashedInput)      // compare against stored hash
        .eq("verified", false)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!otpRecord) {
        // M-1 FIX: Increment failed attempts
        await supabase
          .from("otp_verifications")
          .update({ failed_attempts: supabase.rpc("increment_attempts") })
          .eq("email", email.toLowerCase())
          .eq("verified", false);

        return new Response(JSON.stringify({ error: "Invalid or expired OTP. Please try again." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // M-1 FIX: Check if too many failed attempts (max 5)
      if ((otpRecord.failed_attempts || 0) >= 5) {
        return new Response(JSON.stringify({ error: "Too many failed attempts. Please request a new code." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark OTP as verified
      await supabase
        .from("otp_verifications")
        .update({ verified: true })
        .eq("id", otpRecord.id);

      // C-4 FIX: Use targeted profile lookup instead of listUsers()
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("user_id", (
          await supabase.auth.admin.getUserByEmail(email.toLowerCase())
            .catch(() => ({ data: { user: null } }))
        ).data?.user?.id || "")
        .maybeSingle();

      // Check by email via a direct admin API call (single user, not listing all)
      const { data: existingUserData } = await supabase.auth.admin.getUserByEmail(email.toLowerCase()).catch(() => ({ data: { user: null } }));

      if (existingUserData?.user) {
        return new Response(JSON.stringify({ error: "Email already registered" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email.toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName || "User",
          area: area || "Other",
          gender: gender || "female",
        },
      });

      if (createError) {
        // L-7 FIX: Generic error message to user, don't expose internals
        return new Response(JSON.stringify({ error: "Failed to create account. Please try again." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, message: "Account created and verified" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── SEND OTP ───
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedEmail = email.toLowerCase();

    // M-1 FIX: Rate limit — check if an OTP was sent within the last 60 seconds
    const { data: recentOtp } = await supabase
      .from("otp_verifications")
      .select("created_at")
      .eq("email", normalizedEmail)
      .eq("verified", false)
      .gte("created_at", new Date(Date.now() - 60 * 1000).toISOString())
      .limit(1)
      .maybeSingle();

    if (recentOtp) {
      return new Response(JSON.stringify({ error: "Please wait 60 seconds before requesting a new code." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // C-4 FIX: Use getUserByEmail instead of listUsers() to avoid loading all users
    const { data: existingUserCheck } = await supabase.auth.admin.getUserByEmail(normalizedEmail).catch(() => ({ data: { user: null } }));
    if (existingUserCheck?.user) {
      return new Response(JSON.stringify({ error: "This email is already registered. Please sign in instead." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // C-3 FIX: Hash OTP before storing
    const otpHash = await hashOTP(code);

    // Clean up old OTPs for this email
    await supabase
      .from("otp_verifications")
      .delete()
      .eq("email", normalizedEmail);

    // Store hashed OTP
    const { error: insertErr } = await supabase
      .from("otp_verifications")
      .insert({
        email: normalizedEmail,
        otp_hash: otpHash,      // store hash, not plaintext
        expires_at: expiresAt,
        verified: false,
        failed_attempts: 0,
      });

    if (insertErr) {
      return new Response(JSON.stringify({ error: "Failed to process request. Please try again." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send plaintext OTP to user via email (only they receive it)
    await sendEmail(normalizedEmail, code, fullName || "there");

    return new Response(JSON.stringify({ success: true, message: "OTP sent to your email" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    // L-7 FIX: Generic error — don't expose internal details
    return new Response(JSON.stringify({ error: "An error occurred. Please try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
