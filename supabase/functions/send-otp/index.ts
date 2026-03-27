import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
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
      from: "Chennai Beauty Swap <onboarding@resend.dev>",
      to: [to],
      subject: `Your verification code: ${otp}`,
      html: `
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #ec4899, #f472b6); display: inline-flex; align-items: center; justify-content: center; font-size: 28px;">✿</div>
          </div>
          <h2 style="text-align: center; color: #1a1a2e; margin-bottom: 8px;">Verify Your Email</h2>
          <p style="text-align: center; color: #6b7280; font-size: 14px;">Hi ${fullName}, use the code below to verify your account on Chennai Beauty Swap.</p>
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

      // Check OTP in database
      const { data: otpRecord } = await supabase
        .from("otp_verifications")
        .select("*")
        .eq("email", email.toLowerCase())
        .eq("otp", userOtp)
        .eq("verified", false)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!otpRecord) {
        return new Response(JSON.stringify({ error: "Invalid or expired OTP. Please try again." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark OTP as verified
      await supabase
        .from("otp_verifications")
        .update({ verified: true })
        .eq("id", otpRecord.id);

      // Create the user manually using the admin API so they bypass email confirmation
      const { data: listData } = await supabase.auth.admin.listUsers();
      const existingUser = listData?.users?.find((u: any) => u.email === email.toLowerCase());

      if (existingUser) {
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
          gender: gender || "female"
        }
      });

      if (createError) {
        return new Response(JSON.stringify({ error: "Failed to create user: " + createError.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, message: "Account created and verified" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── SEND OTP ───
    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedEmail = email.toLowerCase();
    
    // Check if already registered before sending OTP
    const { data: listData } = await supabase.auth.admin.listUsers();
    const existingUser = listData?.users?.find((u: any) => u.email === normalizedEmail);
    if (existingUser) {
      return new Response(JSON.stringify({ error: "This email is already registered. Please sign in instead." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Clean up old OTPs for this email
    await supabase
      .from("otp_verifications")
      .delete()
      .eq("email", normalizedEmail);

    // Store new OTP
    const { error: insertErr } = await supabase
      .from("otp_verifications")
      .insert({
        email: normalizedEmail,
        otp: code,
        expires_at: expiresAt,
        verified: false,
      });

    if (insertErr) {
      return new Response(JSON.stringify({ error: "Failed to store OTP: " + insertErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send email via Resend
    await sendEmail(normalizedEmail, code, fullName || "there");

    return new Response(JSON.stringify({ success: true, message: "OTP sent to your email" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
