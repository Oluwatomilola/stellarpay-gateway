// Execute a CoinFello payment and persist the record.
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

    const body = await req.json();
    const { destination, amount, asset_code = "XLM", memo, quote_id, source_account, signed_xdr, payment_row_id } = body ?? {};
    if (!destination || !amount || !quote_id) {
      return new Response(JSON.stringify({ error: "destination, amount, quote_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = getClient();
    const result = await client.execute({
      quote_id, destination, amount, asset_code, memo, source_account, signed_xdr,
    });

    // Update the row created optimistically by the client (if provided)
    if (payment_row_id) {
      await supabase.from("payments").update({
        coinfello_payment_id: result.payment_id,
        stellar_tx_hash: result.stellar_tx_hash ?? null,
        status: result.status === "settled" ? "settled" : "submitted",
      }).eq("id", payment_row_id).eq("user_id", user.id);
    }

    return new Response(JSON.stringify({ result, mock: client.mock }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("coinfello-execute error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
