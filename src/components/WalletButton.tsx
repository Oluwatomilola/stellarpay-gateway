import { Button } from "@/components/ui/button";
import { useFreighter } from "@/hooks/useFreighter";
import { Wallet, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";

export function WalletButton() {
  const { address, short, connecting, connect, disconnect, network, error } = useFreighter();

  const handleConnect = async () => {
    try {
      await connect();
    } catch {
      // error is set in hook; surface to user
    }
    if (error) {
      toast({
        title: "Freighter not detected",
        description: "Install the Freighter browser extension from freighter.app and refresh.",
        variant: "destructive",
      });
    }
  };

  return (
    <AnimatePresence mode="wait">
      {address ? (
        <motion.div
          key="connected"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 rounded-full border border-success/40 bg-success/10 pl-4 pr-1 py-1"
        >
          <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
          <span className="font-mono text-xs text-success">{short}</span>
          {network && (
            <span className="hidden md:inline rounded-full bg-success/20 px-2 py-0.5 text-[10px] uppercase tracking-wider text-success">
              {network}
            </span>
          )}
          <button
            onClick={disconnect}
            className="ml-1 rounded-full p-1.5 text-success/80 hover:bg-success/20 hover:text-success transition-colors"
            aria-label="Disconnect"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      ) : (
        <motion.div key="disconnected" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Button
            onClick={handleConnect}
            disabled={connecting}
            className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-full px-5"
          >
            <Wallet className="h-4 w-4" />
            {connecting ? "Connecting…" : "Connect Freighter"}
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
