import * as client from "openid-client";
import { Strategy as ReplitStrategy, type VerifyFunction } from "openid-client/passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as AppleStrategy } from "passport-apple";
import { Strategy as LocalStrategy } from "passport-local";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { comparePasswords } from "./passwordUtils";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUserFromProvider(
  profile: any,
  provider: 'replit' | 'google' | 'apple'
) {
  let userData;
  
  switch (provider) {
    case 'replit':
      userData = {
        id: profile.sub || profile.id,
        replitId: profile.sub || profile.id,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        profileImageUrl: profile.profile_image_url,
        authProvider: 'replit' as const,
      };
      break;
    case 'google':
      userData = {
        googleId: profile.id,
        email: profile.emails?.[0]?.value || profile.email,
        firstName: profile.name?.givenName || profile.given_name,
        lastName: profile.name?.familyName || profile.family_name,
        profileImageUrl: profile.photos?.[0]?.value || profile.picture,
        authProvider: 'google' as const,
      };
      break;
    case 'apple':
      userData = {
        appleId: profile.id || profile.sub,
        email: profile.email,
        firstName: profile.name?.firstName || profile.given_name,
        lastName: profile.name?.lastName || profile.family_name,
        authProvider: 'apple' as const,
      };
      break;
  }

  // Check if user already exists with this provider ID
  const providerId = provider === 'replit' ? userData.replitId : 
                    provider === 'google' ? userData.googleId : 
                    userData.appleId;
  
  let existingUser = await storage.getUserByProviderId(providerId!, provider);
  
  if (!existingUser && userData.email) {
    // Check if user exists with same email from different provider
    const userByEmail = await storage.getUserByEmail(userData.email);
    if (userByEmail) {
      // Link this provider to existing user
      const updateData = {
        ...userByEmail,
        [`${provider}Id`]: providerId,
        updatedAt: new Date(),
      } as any;
      return await storage.upsertUser(updateData);
    }
  }

  if (!existingUser) {
    // Create new user
    const newUserData = {
      ...userData,
      id: userData.id || undefined, // Let database generate ID if not provided
    };
    return await storage.upsertUser(newUserData);
  } else {
    // Update existing user
    const updateData = {
      ...existingUser,
      ...userData,
      id: existingUser.id, // Keep existing ID
      updatedAt: new Date(),
    };
    return await storage.upsertUser(updateData);
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Replit OIDC Strategy
  const config = await getOidcConfig();

  const replitVerify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUserFromProvider(tokens.claims(), 'replit');
    verified(null, user);
  };

  for (const domain of process.env.REPLIT_DOMAINS!.split(",")) {
    const strategy = new ReplitStrategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback/replit`,
      },
      replitVerify,
    );
    passport.use(strategy);
  }

  // Configure Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/callback/google"
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        await upsertUserFromProvider(profile, 'google');
        return done(null, { 
          provider: 'google', 
          profile,
          access_token: accessToken,
          refresh_token: refreshToken 
        });
      } catch (error) {
        return done(error, false);
      }
    }));
  }

  // Configure Apple OAuth Strategy  
  if (process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY) {
    try {
      console.log("Configuring Apple Strategy with:");
      console.log("- Client ID:", process.env.APPLE_CLIENT_ID);
      console.log("- Team ID:", process.env.APPLE_TEAM_ID);
      console.log("- Key ID:", process.env.APPLE_KEY_ID);
      console.log("- Private Key length:", process.env.APPLE_PRIVATE_KEY.length);
      
      // Ensure private key is properly formatted for Apple
      let privateKey = process.env.APPLE_PRIVATE_KEY;
      
      if (!privateKey || privateKey.trim().length === 0) {
        throw new Error("APPLE_PRIVATE_KEY environment variable is empty or missing");
      }
      
      // Remove ALL whitespace first
      privateKey = privateKey.replace(/\s+/g, '');
      
      // Extract the key content between the headers
      const match = privateKey.match(/-----BEGINPRIVATEKEY-----(.*?)-----ENDPRIVATEKEY-----/);
      if (match) {
        const keyContent = match[1];
        // Properly format with line breaks every 64 characters
        const formattedContent = keyContent.match(/.{1,64}/g)?.join('\n') || keyContent;
        // Recreate the key with exact formatting
        privateKey = `-----BEGIN PRIVATE KEY-----\n${formattedContent}\n-----END PRIVATE KEY-----`;
        
      } else {
        console.error("Invalid Apple private key format - could not extract key content");
        console.error("Raw key preview:", process.env.APPLE_PRIVATE_KEY.substring(0, 50));
        throw new Error("Invalid Apple private key format");
      }
      
      // Final cleanup - ensure no extra spaces or characters
      privateKey = privateKey.trim();
      
      // Validate the final key format
      if (!privateKey.includes('-----BEGIN PRIVATE KEY-----') || !privateKey.includes('-----END PRIVATE KEY-----')) {
        throw new Error("Apple private key missing required PEM headers");
      }
      
      console.log("Formatted private key preview:", privateKey.substring(0, 100) + "...");
      console.log("Private key ends with:", privateKey.slice(-40));
      console.log("Final private key length:", privateKey.length);
      console.log("Private key validation: PASSED");
      
      passport.use('apple', new AppleStrategy({
        clientID: process.env.APPLE_CLIENT_ID,
        teamID: process.env.APPLE_TEAM_ID,
        keyID: process.env.APPLE_KEY_ID,
        privateKeyString: privateKey,
        callbackURL: "https://feastly.replit.app/api/callback/apple",
        scope: ['name', 'email'],
        response_mode: 'form_post',
        passReqToCallback: true
      } as any,
      async (req: any, accessToken: any, refreshToken: any, idToken: any, profile: any, done: any) => {
        try {
          console.log("=== APPLE AUTHENTICATION CALLBACK TRIGGERED ===");
          console.log("Access Token:", accessToken ? "Present" : "Missing");
          console.log("Refresh Token:", refreshToken ? "Present" : "Missing");
          console.log("ID Token:", idToken ? "Present" : "Missing");
          console.log("Profile received:", JSON.stringify(profile, null, 2));
          
          // For Apple, the profile info is actually in the ID token
          let appleProfile;
          if (idToken) {
            // Decode the ID token to get user info
            const decoded = jwt.decode(idToken);
            console.log("Decoded ID Token:", JSON.stringify(decoded, null, 2));
            
            appleProfile = {
              id: decoded.sub,
              sub: decoded.sub,
              email: decoded.email,
              name: {},
              given_name: decoded.given_name,
              family_name: decoded.family_name
            };
          } else {
            // Fallback to profile object
            appleProfile = {
              id: profile.sub || profile.id,
              sub: profile.sub || profile.id,
              email: profile.email,
              name: profile.name || {},
              given_name: profile.given_name,
              family_name: profile.family_name
            };
          }
          
          console.log("Normalized Apple profile:", JSON.stringify(appleProfile, null, 2));
          
          await upsertUserFromProvider(appleProfile, 'apple');
          return done(null, { 
            provider: 'apple', 
            profile: appleProfile,
            id_token: idToken
          });
        } catch (error: any) {
          console.error("=== ERROR IN APPLE AUTHENTICATION CALLBACK ===");
          console.error("Error details:", error);
          console.error("Error stack:", error.stack);
          return done(error, false);
        }
      }));
      console.log("Apple Strategy configured successfully");
    } catch (error: any) {
      console.error("Failed to configure Apple Strategy:", error);
      console.error("Error stack:", error.stack);
    }
  } else {
    console.log("Apple OAuth not configured - missing environment variables");
  }

  // Configure Local Strategy for email/password authentication
  passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  }, async (email, password, done) => {
    try {
      // Find user by email
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return done(null, false, { message: 'No account found with this email address' });
      }

      // Check if user has a password (OAuth users might not)
      if (!user.password) {
        return done(null, false, { message: 'This account uses social sign-in. Please use the appropriate sign-in method.' });
      }

      // Compare password
      const isValidPassword = await comparePasswords(password, user.password);
      
      if (!isValidPassword) {
        return done(null, false, { message: 'Incorrect password' });
      }

      // Authentication successful
      return done(null, {
        provider: 'email',
        profile: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl
        }
      });
    } catch (error) {
      console.error('Local authentication error:', error);
      return done(error, false);
    }
  }));

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // Auth routes for different providers
  
  // Replit routes
  app.get("/api/login/replit", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback/replit", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  // Google routes
  app.get("/api/login/google", 
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  app.get("/api/callback/google", 
    passport.authenticate("google", { 
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login"
    })
  );

  // Apple routes
  app.get("/api/login/apple", (req, res, next) => {
    console.log("=== APPLE LOGIN INITIATED ===");
    console.log("Request headers:", req.headers);
    console.log("Request query:", req.query);
    
    // Test if Apple strategy is available
    const strategy = passport._strategy('apple');
    console.log("Apple strategy available:", !!strategy);
    
    try {
      passport.authenticate("apple")(req, res, next);
    } catch (error) {
      console.error("Apple login error:", error);
      res.status(500).json({ error: "Apple login failed", details: error.message });
    }
  });

  // Apple uses form_post response mode, so it sends POST requests to the callback
  app.post("/api/callback/apple", (req, res, next) => {
    console.log("=== APPLE POST CALLBACK RECEIVED ===");
    console.log("Request URL:", req.url);
    console.log("Request method:", req.method);
    console.log("Request headers:", JSON.stringify(req.headers, null, 2));
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    console.log("Request query:", JSON.stringify(req.query, null, 2));
    console.log("Request params:", JSON.stringify(req.params, null, 2));
    
    passport.authenticate("apple", (err, user, info) => {
      console.log("=== PASSPORT AUTHENTICATE APPLE RESULT ===");
      if (err) {
        console.error("Apple authentication error:", err);
        console.error("Error type:", typeof err);
        console.error("Error message:", err.message);
        console.error("Error stack:", err.stack);
        return res.status(500).json({ message: "Failed to obtain access token", error: err.message, details: err.toString() });
      }
      if (!user) {
        console.error("Apple authentication failed - no user");
        console.error("Info object:", JSON.stringify(info, null, 2));
        return res.status(401).json({ message: "Authentication failed", info, details: "No user returned from Apple authentication" });
      }
      
      console.log("=== APPLE AUTHENTICATION SUCCESS ===");
      console.log("User object:", JSON.stringify(user, null, 2));
      
      req.logIn(user, (err) => {
        if (err) {
          console.error("=== LOGIN ERROR ===");
          console.error("Login error:", err);
          return res.status(500).json({ message: "Login failed", error: err.message });
        }
        console.log("=== APPLE AUTHENTICATION COMPLETE - REDIRECTING ===");
        return res.redirect("/");
      });
    })(req, res, next);
  });

  // Also handle GET requests for Apple callback (for compatibility)
  app.get("/api/callback/apple", (req, res, next) => {
    console.log("=== APPLE GET CALLBACK RECEIVED ===");
    console.log("Request URL:", req.url);
    console.log("Request method:", req.method);
    console.log("Request headers:", JSON.stringify(req.headers, null, 2));
    console.log("Request query:", JSON.stringify(req.query, null, 2));
    console.log("Request params:", JSON.stringify(req.params, null, 2));
    
    passport.authenticate("apple", (err, user, info) => {
      console.log("=== PASSPORT AUTHENTICATE APPLE RESULT (GET) ===");
      if (err) {
        console.error("Apple authentication error:", err);
        console.error("Error type:", typeof err);
        console.error("Error message:", err.message);
        console.error("Error stack:", err.stack);
        return res.status(500).json({ message: "Failed to obtain access token", error: err.message, details: err.toString() });
      }
      if (!user) {
        console.error("Apple authentication failed - no user");
        console.error("Info object:", JSON.stringify(info, null, 2));
        return res.status(401).json({ message: "Authentication failed", info, details: "No user returned from Apple authentication" });
      }
      
      console.log("=== APPLE AUTHENTICATION SUCCESS (GET) ===");
      console.log("User object:", JSON.stringify(user, null, 2));
      
      req.logIn(user, (err) => {
        if (err) {
          console.error("=== LOGIN ERROR (GET) ===");
          console.error("Login error:", err);
          return res.status(500).json({ message: "Login failed", error: err.message });
        }
        console.log("=== APPLE AUTHENTICATION COMPLETE - REDIRECTING (GET) ===");
        return res.redirect("/");
      });
    })(req, res, next);
  });

  // Email/password authentication routes
  app.post("/api/register", async (req, res) => {
    try {
      const { registerSchema } = await import("@shared/schema");
      const { hashPassword } = await import("./passwordUtils");
      
      // Validate request body
      console.log("Received registration data:", req.body);
      const validationResult = registerSchema.safeParse(req.body);
      if (!validationResult.success) {
        console.log("Validation failed:", validationResult.error.errors);
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validationResult.error.errors 
        });
      }

      const { email, password, firstName, lastName } = validationResult.data;

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ 
          message: "An account with this email address already exists" 
        });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user
      const newUser = await storage.createUserWithPassword({
        email,
        password: hashedPassword,
        firstName,
        lastName
      });

      // Log user in automatically after registration
      req.logIn({
        provider: 'email',
        profile: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          profileImageUrl: newUser.profileImageUrl
        }
      }, (err) => {
        if (err) {
          console.error('Auto-login after registration failed:', err);
          return res.status(500).json({ message: "Registration successful but auto-login failed" });
        }
        res.status(201).json({ message: "Registration successful", user: newUser });
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(500).json({ message: "Registration failed", error: error.message });
    }
  });

  app.post("/api/login/email", (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        console.error('Login error:', err);
        return res.status(500).json({ message: "Login failed", error: err.message });
      }
      
      if (!user) {
        return res.status(401).json({ 
          message: info?.message || "Authentication failed"
        });
      }

      req.logIn(user, (err) => {
        if (err) {
          console.error('Login session error:', err);
          return res.status(500).json({ message: "Login session failed" });
        }
        
        res.json({ message: "Login successful", user });
      });
    })(req, res, next);
  });

  // API route to get available auth providers
  app.get("/api/auth/providers", (req, res) => {
    const providers = ["replit", "email"]; // Replit and email are always available
    
    // Check if Google OAuth is configured
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      providers.push("google");
    }
    
    // Check if Apple OAuth is configured
    if (process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY) {
      providers.push("apple");
    }
    
    res.json({ providers });
  });

  // Generic login route (defaults to Replit for backward compatibility)
  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  // Logout route
  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      if (req.user && (req.user as any).provider === 'replit') {
        res.redirect(
          client.buildEndSessionUrl(config, {
            client_id: process.env.REPL_ID!,
            post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
          }).href
        );
      } else {
        res.redirect("/");
      }
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // For non-Replit providers, we don't need to check token expiration
  if (!user.expires_at) {
    return next();
  }

  // Handle Replit token refresh
  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};