# FlavorSwipe - Recipe Discovery App

## Overview

FlavorSwipe is a modern recipe discovery application built as a full-stack web app. It allows users to swipe through recipes (similar to dating apps), save favorites to their cookbook, and generate shopping lists from saved recipes. The app integrates with the Spoonacular API for recipe data and uses Replit's authentication system for user management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a monorepo structure with clear separation between client and server code:

```
├── client/          # React frontend
├── server/          # Express.js backend
├── shared/          # Shared TypeScript schemas and types
└── migrations/      # Database migration files
```

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management
- **UI Framework**: Radix UI components with shadcn/ui styling
- **Styling**: Tailwind CSS with CSS variables for theming
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit's OIDC authentication system with Passport.js
- **Session Management**: PostgreSQL-backed sessions using connect-pg-simple
- **API Integration**: Spoonacular API for recipe data

## Key Components

### Database Schema
- **users**: User profile information (required for Replit Auth)
- **sessions**: Session storage (required for Replit Auth)
- **recipes**: Recipe data from Spoonacular API
- **userRecipes**: User's saved recipes (cookbook)
- **shoppingListItems**: Shopping list items with grocery aisle categorization
- **userPreferences**: User's like/dislike preferences for recipes

### Authentication Flow
1. Users authenticate via Replit's OIDC system
2. Sessions are stored in PostgreSQL for persistence
3. User data is automatically synced from Replit profile
4. All API endpoints require authentication

### Recipe Discovery Flow
1. Frontend requests random recipes from backend
2. Backend fetches from Spoonacular API, filtering out previously rated recipes
3. Users swipe left (dislike) or right (like) on recipes
4. Preferences are stored for future recommendations and filtering
5. Users can view detailed recipe information via modal
6. System ensures users never see the same recipe twice in discovery mode

### Cookbook Management
1. Users can save liked recipes to their personal cookbook
2. Recipes are stored locally to reduce API calls
3. Duplicate prevention ensures no recipe can be saved twice
4. Users can view, organize, and remove saved recipes
5. Recipe modal from cookbook hides "Add to Cookbook" button
6. Recipe details include ingredients, instructions, and metadata

### Shopping List Generation
1. Users can add recipe ingredients to shopping list
2. Items are automatically categorized by grocery store aisle
3. Shopping list supports checking off items and bulk operations
4. Items can be manually added, edited, or removed

## Data Flow

1. **Authentication**: Replit OIDC → Passport.js → PostgreSQL sessions
2. **Recipe Data**: Spoonacular API → Backend cache → Frontend display
3. **User Preferences**: Frontend swipes → Backend storage → Future recommendations
4. **Cookbook**: User saves → PostgreSQL → Frontend cookbook view
5. **Shopping List**: Recipe ingredients → Aisle categorization → PostgreSQL → Frontend list

## External Dependencies

### Required Services
- **Spoonacular API**: Recipe data source (requires API key)
- **Neon Database**: PostgreSQL hosting (serverless)
- **Replit Authentication**: OIDC provider for user management

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `SPOONACULAR_API_KEY`: API key for recipe data
- `SESSION_SECRET`: Secret for session encryption
- `REPLIT_DOMAINS`: Authorized domains for OIDC
- `ISSUER_URL`: OIDC issuer URL (defaults to Replit)

### Key Libraries
- **@neondatabase/serverless**: PostgreSQL client optimized for serverless
- **drizzle-orm**: Type-safe ORM for database operations
- **@tanstack/react-query**: Server state management
- **@radix-ui/react-***: Headless UI components
- **wouter**: Lightweight React router
- **passport**: Authentication middleware

## Deployment Strategy

### Development
- Vite dev server for frontend with HMR
- tsx for running TypeScript server with hot reload
- Drizzle for database schema management and migrations

### Production Build
- Frontend: Vite build → static assets in `dist/public`
- Backend: esbuild bundle → single file in `dist/index.js`
- Database: Drizzle push for schema deployment

### Replit Integration
- Configured for Replit development environment
- Automatic database provisioning through Replit
- OIDC authentication tied to Replit workspace
- Development banner injection for external access

The application is designed to run seamlessly on Replit with minimal configuration, while maintaining the flexibility to deploy on other platforms with appropriate environment variable configuration.

## Recent Changes

**January 29, 2025**
- ✓ Implemented recipe filtering system to prevent showing previously liked/disliked recipes
- ✓ Added duplicate prevention for cookbook entries with graceful error handling
- ✓ Enhanced recipe modal to hide "Add to Cookbook" button when viewed from cookbook
- ✓ Improved user experience with better toast notifications for duplicate scenarios
- ✓ Added getUserRatedSpoonacularIds() method to storage interface for efficient filtering
- ✓ Fixed recipe placeholder image display with proper fallback handling
- ✓ Enhanced cookbook layout with proper text ellipsis and full-height recipe images
- ✓ Added line-clamp utility classes for better text overflow management