# Service Meiko

Applicazione web per la gestione del service post-vendita di lavastoviglie professionali Meiko.

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- Supabase
- React Router
- TanStack Query
- React Hook Form + Zod

## Setup rapido

1. Copia `.env.example` in `.env.local`
2. Inserisci le tue chiavi Supabase
3. Installa le dipendenze:
   npm install
4. Avvia l'app in locale:
   npm run dev

## Deploy su Vercel

1. Collega il repository a Vercel
2. Imposta le variabili d'ambiente:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
3. Build command: `npm run build`
4. Output directory: `dist`

## Database

Lo schema completo di Supabase si trova in `supabase/schema.sql`.

## Demo access

- manager@meiko.it / password123
- tecnico@meiko.it / password123
