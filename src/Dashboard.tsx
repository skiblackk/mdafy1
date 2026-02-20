import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingUp, Calendar, LogOut, LinkIcon, ExternalLink, BarChart3 } from "lucide-react";
import BrokerCredentialsForm from "@/components/BrokerCredentialsForm";
import AgreementModal from "@/components/AgreementModal";
import PaymentSection from "@/components/PaymentSection";
import ChatWidget from "@/components/ChatWidget";

interface ClientData {
  id: string;
  full_name: string;
  account_balance: number;
  total_profit: number;
  last_updated: string;
  status: string;
  starting_balance: number;
  activation_status: string;
  agreement_accepted: boolean;
  user_id: string;
}

const brokers = [
  { name: "MetaTrader 4", icon: "MT4", description: "Connect via Investor Password", link: "https://www.metatrader4.com" },
  { name: "MetaTrader 5", icon: "MT5", description: "Connect via Investor Password", link: "https://www.metatrader5.com" },
  { name: "cTrader", icon: "cT", description: "Link via cTrader ID", link: "https://www.ctrader.com" },
  { name: "TradingView", icon: "TV", description: "Connect broker account", link: "https://www.tradingview.com" },
];

const statusBadge = (status: string) => {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    pending_sunday_activation: { bg: "bg-gold/10", text: "text-gold", label: "Pending Sunday Activation" },
    active: { bg: "bg-green-400/10", text: "text-green-400", label: "Active" },
    pending_settlement: { bg: "bg-orange-400/10", text: "text-orange-400", label: "Pending Settlement" },
    settled: { bg: "bg-blue-400/10", text: "text-blue-400", label: "Settled" },
  };
  const s = map[status] || map.pending_sunday_activation;
  return <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${s.bg} ${s.text}`}>{s.label}</span>;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [client, setClient] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAgreement, setShowAgreement] = useState(false);
  const [sessionUserId, setSessionUserId] = useState<string>("");

  useEffect(() => {
    const fetchClient = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }

      setSessionUserId(session.user.id);

      let { data } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!data && session.user.email) {
        const { data: emailMatch } = await supabase
          .from("clients")
          .select("*")
          .eq("email", session.user.email)
          .maybeSingle();

        if (emailMatch) {
          await supabase.from("clients").update({ user_id: session.user.id }).eq("id", emailMatch.id);
          data = { ...emailMatch, user_id: session.user.id };
        }
      }

      if (data) {
        const c = data as ClientData;
        setClient(c);
        if ((c.status === "approved" || c.status === "active") && !c.agreement_accepted) {
          setShowAgreement(true);
        }
      }
      setLoading(false);
    };

    fetchClient();

    const channel = supabase
      .channel('client-status-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'clients' }, (payload) => {
        if (client && payload.new.id === client.id) {
          setClient(payload.new as ClientData);
        }
      })
      .subscribe();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate("/login");
    });

    return () => { subscription.unsubscribe(); supabase.removeChannel(channel); };
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-gold border-t-transparent animate-spin" />
      </div>
    );
  }

  // Agreement modal
  if (showAgreement && client) {
    return (
      <>
        <AgreementModal clientId={client.id} onAccepted={() => {
          setShowAgreement(false);
          setClient((prev) => prev ? { ...prev, agreement_accepted: true } : prev);
        }} />
        <ChatWidget />
      </>
    );
  }

  const netProfit = client ? client.account_balance - client.starting_balance : 0;
  const daffyShare = netProfit > 0 ? netProfit * 0.5 : 0;

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/" className="font-display text-2xl font-bold text-gold-gradient">Daffy FX</Link>
          <button onClick={handleSignOut} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-2 font-display text-2xl font-bold">
          Welcome back{client ? `, ${client.full_name.split(" ")[0]}` : ""}
        </h1>
        <p className="mb-8 text-sm text-muted-foreground">Your account overview</p>

        {!client ? (
          <div className="glass-card rounded-lg p-8 text-center">
            <p className="text-muted-foreground">Your application is being reviewed. You'll be notified via WhatsApp once approved.</p>
          </div>
        ) : client.status !== "approved" && client.status !== "active" ? (
          <div className="glass-card rounded-lg p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold/10">
              <Calendar className="h-6 w-6 text-gold" />
            </div>
            <h3 className="font-display text-lg font-semibold mb-2">Application Pending</h3>
            <p className="text-sm text-muted-foreground">
              Your application is being reviewed. Status: <span className="capitalize text-gold">{client.status?.replace("_", " ")}</span>
            </p>
          </div>
        ) : (
          <>
            {/* Status Badge */}
            <div className="mb-6">{statusBadge(client.activation_status)}</div>

            {/* Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              <StatCard icon={DollarSign} label="Starting Balance" value={`$${client.starting_balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}`} />
              <StatCard icon={TrendingUp} label="Current Balance" value={`$${client.account_balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}`} />
              <StatCard icon={BarChart3} label="Net Profit" value={`$${netProfit.toLocaleString("en-US", { minimumFractionDigits: 2 })}`} positive={netProfit > 0} negative={netProfit < 0} />
              <StatCard icon={DollarSign} label="Daffy Share (50%)" value={`$${daffyShare.toLocaleString("en-US", { minimumFractionDigits: 2 })}`} />
            </div>

            <StatCard icon={Calendar} label="Last Updated" value={client.last_updated ? new Date(client.last_updated).toLocaleDateString() : "—"} />

            {/* Payment Section — only show when profit > 0 */}
            {netProfit > 0 && (
              <PaymentSection clientId={client.id} userId={sessionUserId} daffyShare={daffyShare} />
            )}

            {/* Broker Connection Section */}
            <div className="mt-8">
              <h2 className="mb-4 font-display text-xl font-bold flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-gold" />
                Connect Your Broker
              </h2>
              <p className="mb-6 text-sm text-muted-foreground">
                Link your trading account for read-only access so your balance reflects here automatically.
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {brokers.map((broker) => (
                  <div key={broker.name} className="glass-card rounded-lg p-5 flex flex-col items-start gap-3 transition-all hover:border-gold/30">
                    <div className="flex items-center gap-3 w-full">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/10 text-lg font-bold text-gold">{broker.icon}</div>
                      <div>
                        <p className="font-medium text-sm">{broker.name}</p>
                        <p className="text-xs text-muted-foreground">{broker.description}</p>
                      </div>
                    </div>
                    <a href={broker.link} target="_blank" rel="noopener noreferrer" className="mt-auto flex items-center gap-1.5 rounded-md border border-gold/30 px-4 py-2 text-xs font-medium text-gold transition-all hover:bg-gold/10">
                      <ExternalLink className="h-3 w-3" /> Connect
                    </a>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                ⚠️ All connections are <span className="text-gold font-medium">read-only</span> — we can only view your balance, not place trades or withdraw funds.
              </p>
            </div>

            <BrokerCredentialsForm />
          </>
        )}
      </div>
      <ChatWidget />
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, positive, negative }: { icon: any; label: string; value: string; positive?: boolean; negative?: boolean }) => (
  <div className="glass-card rounded-lg p-6">
    <div className="flex items-center gap-3 mb-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/10">
        <Icon className="h-5 w-5 text-gold" />
      </div>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
    <p className={`font-display text-2xl font-bold ${positive ? "text-green-400" : negative ? "text-destructive" : ""}`}>{value}</p>
  </div>
);

export default Dashboard;
