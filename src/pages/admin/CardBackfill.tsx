import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

interface BackfillResult {
  distinct_sessions_processed?: number;
  updated_tickets?: number;
  skipped_no_card?: number;
  error?: string;
  message?: string;
}

const CardBackfill = () => {
  const [batchSize, setBatchSize] = useState(100);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BackfillResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBackfill = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(
        "https://hvpytasddzeprgqkwlbu.supabase.co/functions/v1/stripe-backfill-card-details",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization:
              "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2cHl0YXNkZHplcHJncWt3bGJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDMyODQsImV4cCI6MjA4MjE3OTI4NH0.R1wPgBpyO7MHs0YL_pW0XBKkX8QweJ8MuhHUpuDSuKk",
          },
          body: JSON.stringify({ batchSize }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to process backfill");
        setResult(data);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsLoading(false);
    }
  };

  const isComplete = result?.updated_tickets === 0 && !error;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          🔄 Stripe Card BIN / Issuer Backfill
        </h1>
        <p className="text-muted-foreground mt-1">
          Popuni nedostajuće podatke o karticama za stare kupovine
        </p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg">Backfill Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Warning Alert */}
          <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
              ⚠️ Klikni 'Start Backfill' više puta dok updated_tickets ne bude 0
            </AlertDescription>
          </Alert>

          {/* Batch Size Input */}
          <div className="space-y-2">
            <Label htmlFor="batchSize">Batch Size</Label>
            <Input
              id="batchSize"
              type="number"
              min={1}
              max={500}
              value={batchSize}
              onChange={(e) =>
                setBatchSize(Math.min(500, Math.max(1, parseInt(e.target.value) || 1)))
              }
              className="max-w-[200px]"
            />
          </div>

          {/* Start Button */}
          <Button
            onClick={handleBackfill}
            disabled={isLoading}
            className="bg-[#635bff] hover:bg-[#5851db] text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "🚀 Start Backfill"
            )}
          </Button>

          {/* Complete Message */}
          {isComplete && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-900/20">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                ✅ GOTOVO! Nema više karata za ažuriranje.
              </AlertDescription>
            </Alert>
          )}

          {/* Stats Grid */}
          {result && !error && (
            <div className="grid grid-cols-3 gap-4 mt-6">
              <Card className="bg-muted/50">
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {result.distinct_sessions_processed ?? 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Sessions Processed</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/50">
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {result.updated_tickets ?? 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Tickets Updated</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/50">
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {result.skipped_no_card ?? 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Skipped</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Result JSON */}
          {(result || error) && (
            <div className="mt-6">
              <Label>Response</Label>
              <pre
                className={`mt-2 p-4 rounded-lg text-sm overflow-auto max-h-[300px] ${
                  error
                    ? "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800"
                    : "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800"
                }`}
              >
                {JSON.stringify(result || { error }, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CardBackfill;
