import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Search, ShoppingCart } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

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

          {/* CTA Button */}
          <div className="pt-6">
            <Button 
              onClick={handleLogin}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 text-lg font-semibold"
              size="lg"
            >
              Get Started
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
