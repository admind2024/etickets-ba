import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, CheckCircle } from "lucide-react";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const verifyToken = async () => {
      // Parse hash params from URL
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const tokenHash = hashParams.get("token_hash");
      const type = hashParams.get("type");

      if (!tokenHash || type !== "recovery") {
        setError("Nevažeći ili istekao link za resetovanje lozinke.");
        setIsVerifying(false);
        return;
      }

      try {
        // Verify the OTP token
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });

        if (verifyError) {
          console.error("Token verification error:", verifyError);
          setError("Nevažeći ili istekao link za resetovanje lozinke.");
        }
      } catch (err) {
        console.error("Verification error:", err);
        setError("Došlo je do greške prilikom verifikacije.");
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Greška",
        description: "Lozinka mora imati najmanje 6 karaktera.",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Greška",
        description: "Lozinke se ne podudaraju.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        throw error;
      }

      setIsSuccess(true);
      toast({
        title: "Uspješno!",
        description: "Vaša lozinka je uspješno promijenjena.",
      });

      // Redirect to admin login after 3 seconds
      setTimeout(() => {
        navigate("/admin-login");
      }, 3000);
    } catch (err: any) {
      console.error("Password reset error:", err);
      toast({
        variant: "destructive",
        title: "Greška",
        description: err.message || "Došlo je do greške prilikom promjene lozinke.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Verifikacija linka...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-destructive">Greška</h1>
            <p className="text-muted-foreground">{error}</p>
          </div>
          <Button onClick={() => navigate("/admin-login")} variant="outline">
            Nazad na prijavu
          </Button>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Lozinka promijenjena!</h1>
            <p className="text-muted-foreground">
              Vaša lozinka je uspješno promijenjena. Bićete preusmjereni na stranicu za prijavu...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Lock className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Resetovanje lozinke</h1>
          <p className="text-muted-foreground">
            Unesite novu lozinku za vaš nalog.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="password">Nova lozinka</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Unesite novu lozinku"
              required
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Potvrdite lozinku</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ponovite novu lozinku"
              required
              minLength={6}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Promjena lozinke...
              </>
            ) : (
              "Promijeni lozinku"
            )}
          </Button>
        </form>

        <div className="text-center">
          <Button
            variant="link"
            onClick={() => navigate("/admin-login")}
            className="text-muted-foreground"
          >
            Nazad na prijavu
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
