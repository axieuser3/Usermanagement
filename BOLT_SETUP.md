# ⚡ Bolt.new Quick Setup Guide

## 🚀 **INSTANT SETUP FOR BOLT.NEW**

This project is **100% compatible** with Bolt.new! Follow these steps for instant development:

### 1. **Import to Bolt.new**
- Open [Bolt.new](https://bolt.new)
- Import this GitHub repository
- Bolt.new will automatically detect the React/Vite project

### 2. **Install Dependencies**
```bash
npm install
```
*This happens automatically in Bolt.new!*

### 3. **Configure Environment**
```bash
# Copy the environment template
cp .env.example .env.local

# Edit .env.local with your credentials:
# - Supabase URL and API key
# - Stripe publishable key
```

### 4. **Start Development**
```bash
npm run dev
```
*The preview will be available immediately in Bolt.new!*

## 🔧 **BOLT.NEW OPTIMIZATIONS**

This project includes Bolt.new specific optimizations:

### ✅ **Vite Configuration**
- `--host` flag for external access
- Optimized for hot reload
- Fast build times

### ✅ **Package.json Scripts**
- `npm run dev` - Start with host binding
- `npm run preview` - Preview build with host binding  
- `npm run start` - Alias for dev (Bolt.new compatibility)
- `npm run setup` - Quick setup helper

### ✅ **Environment Setup**
- `.env.example` template provided
- Clear configuration instructions
- Development-friendly defaults

## 🎯 **WHAT WORKS OUT OF THE BOX**

### ✅ **Frontend Features**
- React 18 with TypeScript
- Tailwind CSS styling
- React Router for navigation
- Lucide React icons
- Responsive design

### ✅ **Development Experience**
- Hot module replacement
- TypeScript support
- ESLint configuration
- Fast Vite builds
- Instant preview updates

### ⚠️ **BACKEND SETUP REQUIRED**

The frontend will work immediately, but you'll need to set up:

1. **Supabase Database**
   - Create project at [supabase.com](https://supabase.com)
   - Apply migration: `supabase/migrations/20250813160527_shy_bird.sql`
   - Get URL and API key

2. **Stripe Account**
   - Create account at [stripe.com](https://stripe.com)
   - Get publishable key
   - Create products/prices

3. **Environment Variables**
   - Copy `.env.example` to `.env.local`
   - Fill in your credentials

## 🎮 **DEMO MODE**

Even without backend setup, you can:
- ✅ View all UI components
- ✅ Navigate between pages
- ✅ See the design system
- ✅ Test responsive layout
- ⚠️ Backend features will show connection errors (expected)

## 📱 **PREVIEW FEATURES**

In Bolt.new, you'll see:
- **Login/Signup Forms** - UI components work
- **Dashboard Layout** - Responsive design
- **Trial Status Components** - Static UI
- **Subscription Cards** - Product layouts
- **Admin Interface** - Management UI

## 🔗 **USEFUL BOLT.NEW COMMANDS**

```bash
# Quick start
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint

# Quick setup helper
npm run setup
```

## 🆘 **TROUBLESHOOTING**

### **Port Issues**
If preview doesn't work:
```bash
npm run dev -- --port 3000
```

### **Environment Variables**
Make sure `.env.local` exists:
```bash
ls -la .env*
```

### **Dependencies**
If modules are missing:
```bash
rm -rf node_modules package-lock.json
npm install
```

## 🎉 **YOU'RE READY!**

Your Axie Studio User Management System is now running in Bolt.new!

- **Frontend**: ✅ Working immediately
- **Backend**: ⚠️ Requires Supabase/Stripe setup
- **Preview**: ✅ Available at the Bolt.new preview URL

For full functionality, follow the complete setup guide in `docs/SETUP_GUIDE.md`

---

**Happy coding in Bolt.new! 🚀**
