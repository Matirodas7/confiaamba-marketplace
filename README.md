# Trusted Connect

Project Title: Professional High-Trust Services Marketplace (AMBA Region)

Architecture & Security:

Stack: React, Tailwind CSS, Supabase (Auth, Database, Storage, Edge Functions).

Security: Implement "Government-grade" security using Supabase Row-Level Security (RLS) to ensure users only access their own data. All API calls must be authenticated. Use SSL/HTTPS protocols.

Routing: Implement protected routes for 3 distinct roles: admin, professional, and client.

1. Role-Based Dashboards & Workflows:

Admin Dashboard:

Panel to verify Professional IDs (KYC) and background checks.

User management (block/unblock).

Platform-wide analytics (revenue, active bookings).

Content moderation for reviews and comments.

Professional Dashboard:

Onboarding: Multi-step form to upload experience, certifications, and ID documents for verification.

Profile Management: Set service categories, work radius (KM), and "Starting Price".

Lead Management: View incoming requests from clients (based on the image provided) and send quotes.

Earnings Tracker: Statistics of completed jobs and pending payments.

Client Dashboard:

Active requests and history of hired services.

Profile settings and payment methods.

Review system: Interface to leave star ratings (1-5) and text comments after a service is marked as "Completed".

2. Main Features (UI/UX):

Landing Page: Professional header (Login/Register), Location Selector (AMBA neighborhoods), and Service Search.

Service Request Flow (Based on Image):

Create a multi-step form: "Personaliza tu pedido" -> "Revisa y Confirma".

Fields: "Describe el trabajo a realizar" (Textarea), "Categoría" (Dropdown), "Dirección", "Zona/Barrio" (Dropdown for AMBA: CABA, Norte, Sur, Oeste).

Success State: "Recibe presupuestos gratis y sin compromiso".

Search & Discovery: Results list showing "Verified Professional" badges, average rating, distance in KM, and real user comments.

3. Database Schema (Supabase):

profiles (id, role, full_name, avatar, location, security_verified).

pro_details (pro_id, bio, certificates_url, categories[], hourly_rate, rating_avg).

service_requests (id, client_id, category, description, zone, status [pending/quoted/accepted/done]).

quotes (id, request_id, pro_id, price_offered, message).

reviews (id, pro_id, client_id, stars, comment, created_at).

4. Visual Style & Responsiveness:

Design: Modern, minimalist, and high-trust. Use a palette of Blue (#0F172A), Emerald for "Verified" actions, and Clean White.

Responsiveness: Full mobile-first optimization. Desktop view should feel like a robust SaaS, Mobile view like a native app.


Agrega funcionalidad de marketing y monetización: 1) Permite que los administradores marquen a ciertos profesionales como 'Destacados' para que aparezcan primeros en las búsquedas. 2) Integra slots para Google Analytics y Google Tag Manager en el Header para medir conversiones de anuncios. 3) Crea una vista de 'Suscripción Premium' en el Dashboard del Profesional donde puedan ver los beneficios de aparecer con prioridad en el sistema.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```