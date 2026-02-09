# Datama-BookRentals

A modern, Vue.js-based Book Rental Management System with Supabase backend.

## Features
- **User Authentication**: Secure Login/Register with Supabase Auth.
- **Role-Based Access**: Specialized views for Customers (Rent & Browse) and Admins (Inventory & Records).
- **Admin Dashboard**:
  - Manage Book Inventory (CRUD operations).
  - Approve/Reject Rental Requests.
  - Track Stock Levels and Overdue Rentals.
- **Customer Features**:
  - Browse Books with rich filtering.
  - Add to Cart & Checkout multiple books.
  - View rental history.

## Tech Stack
- **Frontend**: Vue 3 + Vite
- **Backend**: Supabase (Database & Auth)
- **Styling**: Vanilla CSS (Custom Responsive Design)

## Setup
1. Clone the repository.
2. Run `npm install`.
3. Configure Supabase environment variables.
4. Run `npm run dev`.