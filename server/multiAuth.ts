import * as client from "openid-client";
import { Strategy as ReplitStrategy, type VerifyFunction } from "openid-client/passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as AppleStrategy } from "passport-apple";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

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
    passport.use(new AppleStrategy({
      clientID: process.env.APPLE_CLIENT_ID,
      teamID: process.env.APPLE_TEAM_ID,
      keyID: process.env.APPLE_KEY_ID,
      key: process.env.APPLE_PRIVATE_KEY,
      callbackURL: "/api/callback/apple",
      scope: ['name', 'email']
    } as any,
    async (accessToken: any, refreshToken: any, idToken: any, profile: any, done: any) => {
      try {
        await upsertUserFromProvider(profile, 'apple');
        return done(null, { 
          provider: 'apple', 
          profile,
          access_token: accessToken,
          refresh_token: refreshToken 
        });
      } catch (error) {
        return done(error, false);
      }
    }));
  }

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
  app.get("/api/login/apple", 
    passport.authenticate("apple")
  );

  app.get("/api/callback/apple", 
    passport.authenticate("apple", { 
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login"
    })
  );

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