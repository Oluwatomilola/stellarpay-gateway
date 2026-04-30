import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Send, Loader2, Sparkles, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useFreighter } from "@/hooks/useFreighter";

const STELLAR_ADDR = /^G[A-Z2-7]{55}$/;

const schema = z.object({
  destination: z.string().regex(STELLAR_ADDR, "Must be a valid Stellar G… address"),
  amount: z.coerce.number().positive("Amount must be positive"),
  asset_code: z.string().min(2).max(12).default("XLM"),
  memo: z.string().max(28).optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

interface Quote {
  quote_id: string;
  rate: number;
  fee: string;
  estimated_total: string;
  expires_at: string;
}

export function PaymentForm({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { address } = useFreighter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [mock, setMock] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { destination: "", amount: 10, asset_code: "XLM", memo: "" },
  });

  const quoteMut = useMutation({
    mutationFn: async (values: FormValues) => {
      const { data, error } = await supabase.functions.invoke("coinfello-quote", {
        body: values,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { quote: Quote; mock: boolean };
    },
    onSuccess: (data) => {
      setQuote(data.quote);
      setMock(data.mock);
    },
    onError: (e) => {
      toast({ title: "Quote failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    },
  });

  const payMut = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!quote) throw new Error("Get a quote first");

      // 1. Optimistic insert
      const { data: row, error: insertErr } = await supabase.from("payments").insert({
        user_id: userId,
        destination: values.destination,
        amount: values.amount,
        asset_code: values.asset_code,
        memo: values.memo || null,
        status: "quoted",
        coinfello_quote: quote as never,
      }).select().single();
      if (insertErr) throw insertErr;

      // 2. Execute
      const { data, error } = await supabase.functions.invoke("coinfello-execute", {
        body: {
          ...values,
          quote_id: quote.quote_id,
          source_account: address,
          payment_row_id: row.id,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return { row, result: data.result };
    },
    onMutate: async (values) => {
      await qc.cancelQueries({ queryKey: ["payments"] });
      const prev = qc.getQueryData(["payments"]);
      qc.setQueryData(["payments"], (old: any[] = []) => [
        {
          id: `optimistic-${Date.now()}`,
          user_id: userId,
          destination: values.destination,
          amount: values.amount,
          asset_code: values.asset_code,
          memo: values.memo,
          status: "pending",
          stellar_tx_hash: null,
          created_at: new Date().toISOString(),
          _optimistic: true,
        },
        ...old,
      ]);
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["payments"], ctx.prev);
      toast({ title: "Payment failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    },
    onSuccess: () => {
      toast({ title: "Payment submitted", description: "Tracking on-chain settlement…" });
      setQuote(null);
      form.reset({ destination: "", amount: 10, asset_code: "XLM", memo: "" });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["payments"] }),
  });

  const values = form.watch();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="glass relative overflow-hidden rounded-2xl p-1 shadow-elevated"
    >
      <div className="rounded-[14px] bg-card/40 p-6 md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="font-display text-xl font-semibold">Send a payment</h3>
            <p className="text-sm text-muted-foreground">Routed via CoinFello → Stellar Testnet</p>
          </div>
          <div className="hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary shadow-glow">
            <Send className="h-4 w-4 text-primary-foreground" />
          </div>
        </div>

        <form
          onSubmit={form.handleSubmit((v) => (quote ? payMut.mutate(v) : quoteMut.mutate(v)))}
          className="space-y-4"
        >
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Destination</Label>
            <Input
              {...form.register("destination")}
              placeholder="GA...XYZ"
              className="mt-1.5 font-mono text-sm bg-input/50 border-border/60 focus-visible:ring-primary"
            />
            {form.formState.errors.destination && (
              <p className="mt-1 text-xs text-destructive">{form.formState.errors.destination.message}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Amount</Label>
              <Input
                type="number" step="0.0000001" min={0}
                {...form.register("amount")}
                className="mt-1.5 font-mono bg-input/50 border-border/60 focus-visible:ring-primary"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Asset</Label>
              <Input
                {...form.register("asset_code")}
                className="mt-1.5 font-mono bg-input/50 border-border/60 focus-visible:ring-primary"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Memo (optional)</Label>
            <Textarea
              {...form.register("memo")}
              rows={2} maxLength={28}
              placeholder="invoice #1234"
              className="mt-1.5 bg-input/50 border-border/60 focus-visible:ring-primary"
            />
          </div>

          <AnimatePresence>
            {quote && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    Quote {mock && <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[10px] text-warning">MOCK</span>}
                  </div>
                  <div className="mt-3 space-y-1.5 font-mono text-sm">
                    <Row label="Amount" value={`${values.amount} ${values.asset_code}`} />
                    <Row label="Network fee" value={`${quote.fee} ${values.asset_code}`} />
                    <div className="my-2 border-t border-border/50" />
                    <Row label="Estimated total" value={`${quote.estimated_total} ${values.asset_code}`} strong />
                    <Row label="Expires" value={new Date(quote.expires_at).toLocaleTimeString()} muted />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-2 pt-2">
            {quote && (
              <Button
                type="button" variant="outline"
                onClick={() => setQuote(null)}
                className="border-border/60"
              >
                <RefreshCw className="h-4 w-4" />
                New quote
              </Button>
            )}
            <Button
              type="submit"
              disabled={quoteMut.isPending || payMut.isPending}
              className="flex-1 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow"
            >
              {(quoteMut.isPending || payMut.isPending) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : quote ? (
                <Send className="h-4 w-4" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              {quote ? "Confirm & send" : "Get quote"}
            </Button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}

function Row({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-xs text-muted-foreground" : "text-muted-foreground"}>{label}</span>
      <span className={strong ? "text-base font-semibold text-foreground" : muted ? "text-xs text-muted-foreground" : "text-foreground"}>
        {value}
      </span>
    </div>
  );
}
