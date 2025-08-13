# 🎮 Axie Studio User Management System

A comprehensive user management system built with **React**, **TypeScript**, **Supabase**, and **Stripe** for managing user trials, subscriptions, and account lifecycle.

## ✨ Features

### 🔐 **Authentication & User Management**
- Supabase Auth integration with email/password
- Enterprise user profiles with metadata
- Role-based access control
- Super admin protection system

### 💳 **Subscription Management**
- Stripe integration for payments
- 7-day free trial system
- Subscription status tracking
- Payment method management

### 🎯 **Trial Management**
- Real-time trial countdown
- Automatic trial expiration handling
- Account deletion prevention for paying customers
- Re-signup abuse prevention

### 🏢 **Enterprise Features**
- Axie Studio account linking
- Centralized user state management
- Comprehensive admin dashboard
- System health monitoring

### 🛡️ **Safety & Security**
- Multiple safety checks for account deletion
- Super admin account protection
- Row Level Security (RLS) policies
- Comprehensive audit trails

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Supabase account
- Stripe account

### Installation

1. **Clone and install dependencies:**
```bash
git clone <your-repo>
cd axie-studio-user-management
npm install
```

2. **Set up environment variables:**
Create a `.env.local` file:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

3. **Set up the database:**
```bash
# Apply the migration
npm run db:migrate

# Check database status
npm run db:status
```

4. **Start development server:**
```bash
npm run dev
```

## 📊 Database Schema

The system uses a comprehensive database schema implemented in the migration file:
**`supabase/migrations/20250813160527_shy_bird.sql`**

### Key Tables:
- **`stripe_customers`** - Stripe customer data
- **`stripe_subscriptions`** - Subscription management
- **`stripe_orders`** - Order tracking
- **`user_trials`** - Trial management with safety checks
- **`user_profiles`** - Enterprise user profiles
- **`axie_studio_accounts`** - External account linking
- **`user_account_state`** - Centralized user state
- **`deleted_account_history`** - Trial abuse prevention

### Features Included:
- ✅ 8 core tables with proper relationships
- ✅ 4 enum types for status management
- ✅ 5 comprehensive views for data access
- ✅ 20+ functions for business logic
- ✅ Row Level Security (RLS) policies
- ✅ Automated triggers for data consistency
- ✅ Super admin protection system
- ✅ Trial abuse prevention mechanisms

## 🔧 Configuration

### Supabase Setup
1. Create a new Supabase project
2. Run the migration file: `supabase/migrations/20250813160527_shy_bird.sql`
3. Configure RLS policies (included in migration)

### Stripe Setup
1. Create Stripe products and prices
2. Configure webhooks for subscription events
3. Update price IDs in the application

## 📚 Documentation

- **[Setup Guide](docs/SETUP_GUIDE.md)** - Complete step-by-step setup instructions
- **[Database Setup Instructions](docs/DATABASE_SETUP_INSTRUCTIONS.md)** - Database configuration guide
- **[Testing Guide](docs/TESTING_GUIDE.md)** - How to test the system
- **[Enterprise Implementation](docs/ENTERPRISE_IMPLEMENTATION_GUIDE.md)** - Enterprise features guide
- **[Archive](docs/archive/)** - Historical documentation and development notes

## 🛠️ Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build
- `npm run db:migrate` - Apply database migrations
- `npm run db:reset` - Reset database
- `npm run db:status` - Check database status

### Project Structure
```
├── src/
│   ├── components/     # React components
│   ├── hooks/         # Custom React hooks
│   ├── lib/           # Supabase client
│   ├── pages/         # Page components
│   └── utils/         # Utility functions
├── supabase/
│   └── migrations/    # Database migrations
├── docs/              # Documentation
└── public/            # Static assets
```

## 🔒 Security Features

### Super Admin Protection
- Hardcoded super admin UUID: `b8782453-a343-4301-a947-67c5bb407d2b`
- Cannot be deleted or have trial expired
- Full system access

### Trial Abuse Prevention
- Email-based re-signup detection
- Account deletion history tracking
- Automatic subscription requirement for returning users

### Data Protection
- Row Level Security (RLS) on all tables
- User-specific data access policies
- Secure function execution

## 📈 Monitoring & Health Checks

The system includes comprehensive monitoring:
- Database health checker
- System metrics dashboard
- User access status tracking
- Subscription sync monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
1. Check the documentation in the `docs/` folder
2. Review the testing guide for troubleshooting
3. Check the database health dashboard
4. Contact the development team

---

**Built with ❤️ for Axie Studio**
