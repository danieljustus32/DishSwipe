import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { registerSchema, loginSchema, type RegisterData, type LoginData } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";

interface EmailAuthProps {
  onSuccess?: () => void;
}

export function EmailAuth({ onSuccess }: EmailAuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const { toast } = useToast();
  

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onChange"
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
    },
    mode: "onChange"
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      const response = await fetch("/api/login/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        
        // Create a detailed error with status
        const detailedError = new Error(error.message || "Login failed");
        (detailedError as any).status = response.status;
        throw detailedError;
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Welcome back!",
        description: "You have been successfully logged in.",
      });
      onSuccess?.();
      // Redirect to home page
      window.location.href = "/";
    },
    onError: (error: any) => {
      let title = "Login failed";
      let description = error.message;
      
      // Handle specific error cases with better messages
      if (error.status === 401) {
        title = "Incorrect login";
        description = "The email or password you entered is incorrect. Please try again or create a new account.";
      } else if (error.status === 404) {
        title = "Account not found";
        description = "We couldn't find an account with that email. Would you like to create one instead?";
      } else if (error.status === 400) {
        title = "Invalid information";
        description = "Please enter a valid email address and password.";
      } else if (error.status === 500) {
        title = "Server error";
        description = "Something went wrong on our end. Please try again in a moment.";
      } else if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
        title = "Connection error";
        description = "Please check your internet connection and try again.";
      }
      
      toast({
        title,
        description,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      // Remove confirmPassword before sending to server
      const { confirmPassword, ...registerData } = data;
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        
        // Create a detailed error with status and response data
        const detailedError = new Error(error.message || "Registration failed");
        (detailedError as any).status = response.status;
        (detailedError as any).errors = error.errors;
        throw detailedError;
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Welcome to FlavorSwipe!",
        description: "Your account has been created successfully.",
      });
      onSuccess?.();
      // Redirect to home page
      window.location.href = "/";
    },
    onError: (error: any) => {
      let title = "Registration failed";
      let description = error.message;
      
      // Handle specific error cases with better messages
      if (error.status === 409) {
        title = "Account already exists";
        description = "An account with that email already exists. Did you mean to sign in instead?";
        
        // Automatically switch to login and prefill email for convenience
        const currentEmail = registerForm.getValues("email");
        setTimeout(() => {
          setIsLogin(true);
          loginForm.setValue("email", currentEmail);
        }, 2000); // Small delay to let user read the message
      } else if (error.status === 400 && error.errors) {
        // Handle validation errors
        const validationErrors = error.errors;
        const passwordError = validationErrors.find((err: any) => 
          err.path?.includes("password") || err.path?.includes("confirmPassword")
        );
        const emailError = validationErrors.find((err: any) => 
          err.path?.includes("email")
        );
        const nameError = validationErrors.find((err: any) => 
          err.path?.includes("firstName") || err.path?.includes("lastName")
        );
        
        if (passwordError) {
          title = "Password issue";
          description = passwordError.message;
        } else if (emailError) {
          title = "Email issue";
          description = emailError.message;
        } else if (nameError) {
          title = "Name required";
          description = nameError.message;
        } else {
          title = "Invalid information";
          description = "Please check your information and try again.";
        }
      } else if (error.status === 500) {
        title = "Server error";
        description = "Something went wrong on our end. Please try again in a moment.";
      } else if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
        title = "Connection error";
        description = "Please check your internet connection and try again.";
      }
      
      toast({
        title,
        description,
        variant: "destructive",
      });
    },
  });

  const onLoginSubmit = (data: LoginData) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: RegisterData) => {
    registerMutation.mutate(data);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-center">
          {isLogin ? "Sign In" : "Create Account"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLogin ? (
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
              <FormField
                control={loginForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        data-testid="input-login-email"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter your password"
                        data-testid="input-login-password"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
                data-testid="button-login-submit"
              >
                {loginMutation.isPending ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </Form>
        ) : (
          <Form {...registerForm}>
            <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={registerForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="First name"
                          data-testid="input-register-firstname"
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={registerForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Last name"
                          data-testid="input-register-lastname"
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  data-testid="input-register-email"
                  value={registerForm.watch("email") || ""}
                  onChange={(e) => registerForm.setValue("email", e.target.value)}
                  autoComplete="email"
                />
                {registerForm.formState.errors.email && (
                  <p className="text-sm text-red-600">{registerForm.formState.errors.email.message}</p>
                )}
              </div>
              <FormField
                control={registerForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Create a strong password"
                        data-testid="input-register-password"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                      />
                    </FormControl>
                    <FormMessage />
                    <div className="text-xs text-muted-foreground">
                      Password must be at least 8 characters with a number and special character
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={registerForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Re-enter your password"
                        data-testid="input-register-confirm-password"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={registerMutation.isPending}
                data-testid="button-register-submit"
              >
                {registerMutation.isPending ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </Form>
        )}

        <Separator className="my-4" />

        <div className="text-center">
          <Button
            variant="link"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm"
            data-testid="button-toggle-auth-mode"
          >
            {isLogin ? "Don't have an account? Create one" : "Already have an account? Sign in"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}