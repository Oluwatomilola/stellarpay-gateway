import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ExternalLink, CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { shortAddr, stellarExpertTx, stellarExpertAccount } from "@/lib/stellar";

interface Payment {
  id: string;
  destination: string;
  amount: number;
  asset_code: string;
  memo: string | null;
  status: "pending" | "quoted" | "submitted" | "settled" | "failed";
  stellar_tx_hash: string | null;
  coinfello_payment_id: string | null;
  created_at: string;
}

const statusConfig: Record<Payment["status"], { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  pending:   { label: "Pending",   cls: "text-muted-foreground bg-muted/30 border-border", icon: Clock },
  quoted:    { label: "Quoted",    cls: "text-primary bg-primary/10 border-primary/30",     icon: Loader2 },
  submitted: { label: "Submitted", cls: "text-warning bg-warning/10 border-warning/30",     icon: Loader2 },
  settled:   { label: "Settled",   cls: "text-success bg-success/10 border-success/30",     icon: CheckCircle2 },
  failed:    { label: "Failed",    cls: "text-destructive bg-destructive/10 border-destructive/30", icon: XCircle },
};

export function PaymentsHistory({ userId }: { userId: string }) {
  const qc = useQueryClient();

  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Payment[];
    },
  });

  // Realtime: refresh on any change
  useEffect(() => {
    const channel = supabase
      .channel("payments-stream")
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => {
        qc.invalidateQueries({ queryKey: ["payments"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  // Poll status of in-flight payments
  useEffect(() => {
    const inflight = payments.filter((p) => p.status === "submitted" || p.status === "quoted");
    if (inflight.length === 0) return;
    const t = setInterval(async () => {
      for (const p of inflight) {
        if ((p as any)._optimistic) continue;
        try {
          await supabase.functions.invoke("coinfello-status", { body: null, method: "GET" as any, headers: {} } as any);
        } catch { /* noop */ }
        // Use direct fetch with query param fallback
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coinfello-status?id=${p.id}`;
          await fetch(url, {
            headers: {
              Authorization: `Bearer ${session?.access_token ?? ""}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
          });
        } catch { /* noop */ }
      }
      qc.invalidateQueries({ queryKey: ["payments"] });
    }, 4000);
    return () => clearInterval(t);
  }, [payments, qc]);

  if (payments.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Clock className="h-5 w-5 text-primary" />
        </div>
        <p className="font-display text-lg font-semibold">No payments yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Your first transaction will appear here.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="glass overflow-hidden rounded-2xl shadow-card"
    >
      <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
        <h3 className="font-display text-lg font-semibold">Recent payments</h3>
        <span className="text-xs text-muted-foreground">{payments.length} total</span>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="border-border/50 hover:bg-transparent">
            <TableHead className="text-xs uppercase tracking-wider">Status</TableHead>
            <TableHead className="text-xs uppercase tracking-wider">Destination</TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-right">Amount</TableHead>
            <TableHead className="text-xs uppercase tracking-wider">Tx</TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-right">When</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((p) => {
            const cfg = statusConfig[p.status];
            const Icon = cfg.icon;
            const inflight = p.status === "submitted" || p.status === "quoted" || p.status === "pending";
            return (
              <TableRow key={p.id} className="border-border/40 hover:bg-muted/20 transition-colors">
                <TableCell>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${cfg.cls}`}>
                    <Icon className={`h-3 w-3 ${inflight && p.status !== "pending" ? "animate-spin" : ""}`} />
                    {cfg.label}
                  </span>
                </TableCell>
                <TableCell>
                  <a
                    href={stellarExpertAccount(p.destination)}
                    target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-xs hover:text-primary transition-colors"
                  >
                    {shortAddr(p.destination)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  {p.memo && <div className="mt-0.5 text-[11px] text-muted-foreground italic">"{p.memo}"</div>}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {Number(p.amount).toLocaleString(undefined, { maximumFractionDigits: 7 })}{" "}
                  <span className="text-muted-foreground">{p.asset_code}</span>
                </TableCell>
                <TableCell>
                  {p.stellar_tx_hash ? (
                    <a
                      href={stellarExpertTx(p.stellar_tx_hash)}
                      target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                    >
                      {shortAddr(p.stellar_tx_hash, 4)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">
                  {timeAgo(p.created_at)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </motion.div>
  );
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
