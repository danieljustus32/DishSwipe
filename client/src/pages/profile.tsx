import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Crown, Star, Zap, ChefHat } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

// Load Stripe (optional for development)
const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

interface UserStatus {
  isGoldMember: boolean;
  remainingLikes: number;
  email: string;
  firstName?: string;
  lastName?: string;
}

function SubscriptionForm({ clientSecret }: { clientSecret: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + "/profile",
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Welcome to FlavorSwipe Gold!",
        description: "Your subscription is now active. Enjoy unlimited recipe likes!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user/status'] });
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe || !elements || isLoading}
        className="w-full"
        size="lg"
      >
        {isLoading ? "Processing..." : "Subscribe to FlavorSwipe Gold"}
      </Button>
    </form>
  );
}

function SubscriptionCard() {
  const [clientSecret, setClientSecret] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const createSubscription = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/create-subscription");
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
      } else {
        toast({
          title: "Already Subscribed",
          description: "You're already a FlavorSwipe Gold member!",
        });
      }
      setIsCreating(false);
    },
    onError: (error) => {
      console.error("Subscription error:", error);
      toast({
        title: "Subscription Error", 
        description: "Failed to create subscription. Please try again.",
        variant: "destructive",
      });
      setIsCreating(false);
    },
  });

  const handleSubscribe = () => {
    setIsCreating(true);
    createSubscription.mutate();
  };

  if (clientSecret && stripePromise) {
    return (
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Complete Your FlavorSwipe Gold Subscription
            </CardTitle>
            <CardDescription>
              Enter your payment details to activate unlimited recipe likes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SubscriptionForm clientSecret={clientSecret} />
          </CardContent>
        </Card>
      </Elements>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-yellow-500" />
          FlavorSwipe Gold
        </CardTitle>
        <CardDescription>
          Upgrade to unlimited recipe likes and premium features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <div className="text-3xl font-bold">$9.99</div>
          <div className="text-sm text-muted-foreground">per month</div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Zap className="h-4 w-4 text-yellow-500" />
            <span>Unlimited recipe likes per day</span>
          </div>
          <div className="flex items-center gap-3">
            <Star className="h-4 w-4 text-yellow-500" />
            <span>Priority access to new features</span>
          </div>
          <div className="flex items-center gap-3">
            <ChefHat className="h-4 w-4 text-yellow-500" />
            <span>Advanced recipe recommendations</span>
          </div>
        </div>

        {stripePromise ? (
          <Button 
            onClick={handleSubscribe}
            disabled={isCreating}
            className="w-full"
            size="lg"
          >
            {isCreating ? "Setting up..." : "Subscribe to Gold"}
          </Button>
        ) : (
          <div className="text-center space-y-2">
            <div className="text-sm text-muted-foreground p-3 bg-muted rounded">
              Stripe integration is not configured. Please contact support to set up your subscription.
            </div>
            <Button 
              variant="outline"
              className="w-full"
              disabled
            >
              Contact Support
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: userStatus, isLoading } = useQuery<UserStatus>({
    queryKey: ['/api/user/status'],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!userStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Unable to load profile</h2>
          <p className="text-muted-foreground">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  const usagePercentage = userStatus.isGoldMember 
    ? 0 
    : ((50 - userStatus.remainingLikes) / 50) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center py-8">
          <h1 className="text-3xl font-bold mb-2">Your Profile</h1>
          <p className="text-muted-foreground">Manage your account and subscription</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Email</label>
                <div className="text-sm text-muted-foreground mt-1">
                  {userStatus.email || "No email set"}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Name</label>
                <div className="text-sm text-muted-foreground mt-1">
                  {userStatus.firstName && userStatus.lastName 
                    ? `${userStatus.firstName} ${userStatus.lastName}`
                    : "No name set"
                  }
                </div>
              </div>

              <div className="pt-4">
                <Button variant="outline" className="w-full">
                  Update Profile Information
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  To update your email or password, please contact support
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Usage Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {userStatus.isGoldMember ? (
                  <>
                    <Crown className="h-5 w-5 text-yellow-500" />
                    FlavorSwipe Gold
                  </>
                ) : (
                  "Free Account"
                )}
              </CardTitle>
              <CardDescription>
                {userStatus.isGoldMember 
                  ? "You have unlimited access to all features"
                  : "Track your daily usage"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userStatus.isGoldMember ? (
                <div className="text-center py-6">
                  <Crown className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Premium Member</h3>
                  <p className="text-muted-foreground">
                    You have unlimited recipe likes and access to all premium features
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Daily Likes Used</span>
                      <span>{50 - userStatus.remainingLikes} / 50</span>
                    </div>
                    <Progress value={usagePercentage} className="h-2" />
                  </div>
                  
                  <div className="text-center text-muted-foreground">
                    <span className="font-medium">{userStatus.remainingLikes}</span> likes remaining today
                  </div>
                  
                  {userStatus.remainingLikes <= 10 && (
                    <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                      <p className="text-sm text-orange-700 dark:text-orange-300">
                        You're running low on likes! Upgrade to Gold for unlimited access.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Subscription Management */}
        {!userStatus.isGoldMember && (
          <SubscriptionCard />
        )}
      </div>
    </div>
  );
}