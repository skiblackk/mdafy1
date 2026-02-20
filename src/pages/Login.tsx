import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/use-toast";

const Login = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAdminMode = searchParams.get("role") === "admin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast({
          title: "Check your email",
          description: "We've sent you a verification link.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        if (isAdminMode) {
          // Check if user has admin role
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const { data: roleData } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", session.user.id)
              .eq("role", "admin")
              .maybeSingle();
            
            if (roleData) {
              navigate("/admin");
            } else {
              toast({ title: "Access Denied", description: "You don't have admin privileges.", variant: "destructive" });
              await supabase.auth.signOut();
            }
          }
        } else {
          navigate("/dashboard");
        }
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="block text-center font-display text-3xl font-bold text-gold-gradient mb-8">
          Daffy FX
        </Link>
        <div className="glass-card rounded-lg p-8">
          <h2 className="font-display text-xl font-bold mb-6 text-center">
            {isAdminMode ? "Admin Login" : isSignUp ? "Create Account" : "Client Login"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-md border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-md border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-md bg-gold-gradient py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
            >
              {isLoading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
            </button>
          </form>
          {!isAdminMode && (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button onClick={() => setIsSignUp(!isSignUp)} className="text-gold underline">
                {isSignUp ? "Sign In" : "Sign Up"}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
