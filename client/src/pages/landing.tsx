import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Heart, Search, ShoppingCart, Mail } from "lucide-react";
import { SiGoogle, SiApple } from "react-icons/si";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { EmailAuth } from "@/components/EmailAuth";

export default function Landing() {
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [showEmailAuth, setShowEmailAuth] = useState(false);

  // Fetch available authentication providers
  const { data: providersData } = useQuery({
    queryKey: ["/api/auth/providers"],
    retry: false,
  });

  useEffect(() => {
    if (providersData && 'providers' in providersData && Array.isArray(providersData.providers)) {
      setAvailableProviders(providersData.providers);
    }
  }, [providersData]);

  const handleLogin = (provider?: string) => {
    const baseUrl = provider ? `/api/login/${provider}` : "/api/login";
    window.location.href = baseUrl;
  };

  if (showEmailAuth) {
    return (
      <div className="min-h-screen bg-accent">
        <div className="max-w-md mx-auto bg-white shadow-xl min-h-screen">
          {/* Header */}
          <div className="bg-primary text-primary-foreground p-6 text-center">
            <h1 className="text-3xl font-bold mb-2">FlavorSwipe</h1>
            <p className="text-primary-foreground/80">Discover recipes you'll love</p>
          </div>

          <div className="p-6">
            <EmailAuth onSuccess={() => setShowEmailAuth(false)} />
            
            <div className="mt-6">
              <Button
                variant="outline"
                onClick={() => setShowEmailAuth(false)}
                className="w-full"
                data-testid="button-back-to-social-login"
              >
                ← Back to other sign-in options
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-accent">
      <div className="max-w-md mx-auto bg-white shadow-xl min-h-screen">
        {/* Header */}
        <div className="bg-primary text-primary-foreground p-6 text-center">
          <h1 className="text-3xl font-bold mb-2">FlavorSwipe</h1>
          <p className="text-primary-foreground/80">Discover recipes you'll love</p>
        </div>

        {/* Hero Content */}
        <div className="p-6 space-y-6">
          <div className="text-center space-y-4">
            <div className="w-24 h-24 bg-accent rounded-full mx-auto flex items-center justify-center">
              <Heart className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Swipe Your Way to Delicious</h2>
            <p className="text-muted-foreground">
              Discover new recipes with a simple swipe. Save your favorites and create shopping lists instantly.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <Card>
              <CardContent className="flex items-center space-x-4 p-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Search className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Discover</h3>
                  <p className="text-sm text-muted-foreground">Swipe through endless recipe possibilities</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center space-x-4 p-4">
                <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center">
                  <Heart className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <h3 className="font-semibold">Save</h3>
                  <p className="text-sm text-muted-foreground">Build your personal cookbook</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center space-x-4 p-4">
                <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6 text-success" />
                </div>
                <div>
                  <h3 className="font-semibold">Shop</h3>
                  <p className="text-sm text-muted-foreground">Create organized shopping lists</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* CTA Buttons */}
          <div className="pt-6 space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">Sign in to get started</p>
            </div>
            
            {/* Email/Password Sign In - Always available */}
            {availableProviders.includes('email') && (
              <Button
                onClick={() => setShowEmailAuth(true)}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 text-base font-semibold flex items-center justify-center gap-3"
                size="lg"
                data-testid="button-email-login"
              >
                <Mail className="w-5 h-5" />
                Continue with Email
              </Button>
            )}

            {/* Show separator if there are other providers */}
            {(availableProviders.includes('google') || availableProviders.includes('apple') || availableProviders.includes('replit')) && availableProviders.includes('email') && (
              <div className="flex items-center justify-center">
                <Separator className="flex-1" />
                <span className="px-4 text-xs text-muted-foreground">or</span>
                <Separator className="flex-1" />
              </div>
            )}
            
            {/* Google Sign In - Only show if available */}
            {availableProviders.includes('google') && (
              <Button 
                onClick={() => handleLogin('google')}
                variant="outline"
                className="w-full flex items-center justify-center gap-3 py-3 text-base font-medium border-2 hover:bg-gray-50"
                size="lg"
                data-testid="button-google-login"
              >
                <SiGoogle className="w-5 h-5 text-[#4285F4]" />
                Continue with Google
              </Button>
            )}

            {/* Apple Sign In - Only show if available */}
            {availableProviders.includes('apple') && (
              <Button 
                onClick={() => handleLogin('apple')}
                variant="outline"
                className="w-full flex items-center justify-center gap-3 py-3 text-base font-medium border-2 hover:bg-gray-50"
                size="lg"
                data-testid="button-apple-login"
              >
                <SiApple className="w-5 h-5" />
                Continue with Apple
              </Button>
            )}

            {/* Replit Sign In (Always available) */}
            <Button 
              onClick={() => handleLogin()}
              variant="outline"
              className="w-full flex items-center justify-center gap-3 py-3 text-base font-medium border-2 hover:bg-gray-50"
              size="lg"
              data-testid="button-replit-login"
            >
              Continue with Replit
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
