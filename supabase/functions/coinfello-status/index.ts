// Poll CoinFello status & sync DB.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "../_shared/cors.ts";
import { getClient } from "../_shared/coinfello.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const paymentRowId = url.searchParams.get("id");
    if (!paymentRowId) {
      return new Response(JSON.stringify({ error: "id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: row } = await supabase.from("payments")
      .select("*").eq("id", paymentRowId).eq("user_id", user.id).maybeSingle();
    if (!row) {
      return new Response(JSON.stringify({ error: "not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!row.coinfello_payment_id) {
      return new Response(JSON.stringify({ status: row.status }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = getClient();
    const status = await client.status(row.coinfello_payment_id);

    const newStatus = status.status === "settled" ? "settled"
      : status.status === "failed" ? "failed"
      : status.status === "submitted" ? "submitted" : row.status;

    await supabase.from("payments").update({
      status: newStatus,
      stellar_tx_hash: status.stellar_tx_hash ?? row.stellar_tx_hash,
    }).eq("id", paymentRowId).eq("user_id", user.id);

    return new Response(JSON.stringify({ status: newStatus, stellar_tx_hash: status.stellar_tx_hash }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("coinfello-status error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
