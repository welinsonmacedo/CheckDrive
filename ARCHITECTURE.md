# Architecture Document - CheckDrive PWA

## Overview
CheckDrive PWA is a application focused on fleet management, allowing drivers to perform checklists (start of day, end of day, fuel, etc) and administrators to oversee maintenance, checklists, driver schedules, and audits.

## Tech Stack
- **Frontend Framework**: React 18 with Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Database / Auth / Storage**: Supabase
- **Routing**: React Router DOM (v6+)

## Project Structure
- **/src/components**: Reusable, modular UI components divided by domain (admin, driver, generic, auth).
- **/src/contexts**: React Contexts for global state management (`AuthContext`, `AlertContext`, `ConfirmContext`).
- **/src/pages**: Main view components representing routes (e.g., Admin Dashboard, Driver Home, Checklist Flow).
- **/src/routes**: Application routing setup (`AppRoutes.tsx`).
- **/src/lib**: Utilities and external service initialization (e.g., `supabase.ts`).
- **/src/types**: Global TypeScript types mirroring our database schema.

## Core Features
1. **Driver Flow**:
   - Home screen showing assigned schedules and types of actions (Start checklist, End checklist, Fuel).
   - Checklist flow for selecting conditions of different vehicle parts and logging defects with photos.
   - Points/Performance system summary for the logged-in driver.
2. **Administrator Flow**:
   - Tab-based modular dashboard.
   - **Overview**: High-level statistics and recent activity.
   - **Reports**: Table-based review of all checklist submissions.
   - **Maintenance**: Management of pending issues/defects reported by drivers.
   - **Fuel**: Review fuel entries and liters.
   - **Schedules**: Create and assign working schedules to drivers.
   - **Audit**: Log of all automated or administrative score changes.
   - **Settings & Setup**: Manage checklist items, vehicle registries, trailers, routes, and admin users.

## Security & Database
- **Row Level Security (RLS)** is enforced in Supabase, meaning drivers can only see and write checklists assigned to them, while administrative actions require the user role 'admin'.

## Global UI/UX
- **Alert System**: We intercept native `window.alert` internally through `AlertContext` to provide visually consistent, non-blocking animated alert dialogs, enhancing the user experience without refactoring every existing native alert.
- **Confirmations**: `ConfirmContext` provides modern dialogue to replace `window.confirm`.
- **Loading State**: A dedicated loading screen (`ProtectedRoute`) intercepts access while the Auth state and User Profiles are being fully hydrated, preventing unwanted Layout-Shifts and premature redirection into wrong user roles.

## Deployment
Built as a progressive web app with a responsive mobile-first UI for truck drivers, scaling up to an advanced management view for desktop-using admins.
