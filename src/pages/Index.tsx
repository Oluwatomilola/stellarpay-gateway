import { motion } from "framer-motion";
import { Zap, Shield, Globe2, ExternalLink, LogOut } from "lucide-react";

import { CosmicHero } from "@/components/CosmicHero";
import { WalletButton } from "@/components/WalletButton";
import { AuthCard } from "@/components/AuthCard";
import { PaymentForm } from "@/components/PaymentForm";
import { PaymentsHistory } from "@/components/PaymentsHistory";
import { useSession } from "@/hooks/useSession";
import { useFreighter } from "@/hooks/useFreighter";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { STELLAR_CONTRACT_ID, stellarExpertContract, shortAddr } from "@/lib/stellar";

const Index = () => {
  const { user, loading } = useSession();
  const { address: walletAddress } = useFreighter();

  return (
    <div className="relative min-h-screen">
      {/* Top nav */}
      <header className="relative z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <a href="/" className="flex items-center gap-2.5">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
              <span className="font-display text-base font-bold text-primary-foreground">S</span>
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent animate-pulse" />
            </div>
            <div className="font-display text-lg font-semibold tracking-tight">
              Stella<span className="text-gradient">Pay</span>
            </div>
          </a>

          <div className="flex items-center gap-3">
            <WalletButton />
            {user && (
              <button
                onClick={() => supabase.auth.signOut()}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      <CosmicHero>
        {!user && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-12"
          >
            <AuthCard />
          </motion.div>
        )}
      </CosmicHero>

      {/* Feature strip */}
      {!user && (
        <section className="relative z-10 mx-auto max-w-6xl px-6 py-20">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Feature icon={Zap} title="Instant settlement" desc="Stellar finality in 3–5 seconds. CoinFello handles the rails." />
            <Feature icon={Shield} title="Non-custodial" desc="Your keys, your funds. Sign with Freighter, we never touch them." />
            <Feature icon={Globe2} title="Global by default" desc="Send to any G-address worldwide. Asset-aware routing built in." />
          </div>

          <div className="mt-12 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span>Soroban contract:</span>
            <a
              href={stellarExpertContract(STELLAR_CONTRACT_ID)}
              target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 font-mono text-primary hover:underline"
            >
              {shortAddr(STELLAR_CONTRACT_ID, 6)}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </section>
      )}

      {/* Authed app */}
      {user && (
        <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <PaymentForm userId={user.id} />
              {!walletAddress && (
                <div className="mt-3 rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs text-warning">
                  Connect Freighter to associate payments with your Stellar address.
                </div>
              )}
            </div>
            <div className="lg:col-span-3">
              <PaymentsHistory userId={user.id} />
            </div>
          </div>

          <div className="mt-10 text-center text-xs text-muted-foreground">
            Powered by{" "}
            <a className="text-primary hover:underline" href="https://docs.coinfello.com/agent/quickstart" target="_blank" rel="noreferrer">CoinFello Agent API</a>
            {" · "}
            Soroban contract:{" "}
            <a className="font-mono text-primary hover:underline" href={stellarExpertContract(STELLAR_CONTRACT_ID)} target="_blank" rel="noreferrer">
              {shortAddr(STELLAR_CONTRACT_ID, 6)}
            </a>
          </div>
        </section>
      )}
    </div>
  );
};

function Feature({ icon: Icon, title, desc }: { icon: typeof Zap; title: string; desc: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass rounded-2xl p-6 transition-all hover:border-primary/40 hover:shadow-glow"
    >
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
        <Icon className="h-5 w-5 text-primary-foreground" />
      </div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </motion.div>
  );
}

export default Index;
