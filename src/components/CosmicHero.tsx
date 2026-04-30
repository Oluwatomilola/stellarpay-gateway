import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export function CosmicHero({ children }: { children?: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden">
      {/* Orbiting blob */}
      <div className="pointer-events-none absolute inset-0 stars-bg" />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-24 h-[420px] w-[420px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(closest-side, hsl(var(--primary) / 0.45), transparent)" }}
        animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-20 h-[480px] w-[480px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(closest-side, hsl(var(--accent) / 0.4), transparent)" }}
        animate={{ x: [0, -30, 0], y: [0, -25, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 mx-auto max-w-6xl px-6 pt-20 pb-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary backdrop-blur"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Stellar Testnet · CoinFello Agent · Soroban
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl"
        >
          Pay anyone, anywhere
          <br />
          <span className="text-gradient">at the speed of Stellar.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground md:text-lg"
        >
          StellaPay turns any Stellar address into a destination. Get a live quote from
          CoinFello, execute the payment, and watch it settle on-chain — all in seconds.
        </motion.p>

        {children}
      </div>
    </div>
  );
}
