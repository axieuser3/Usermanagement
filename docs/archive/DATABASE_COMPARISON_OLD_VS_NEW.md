# Database Schema Comparison: Old vs New

## 📊 Summary of Changes

| Component | Old Version | New Version | Change |
|-----------|-------------|-------------|---------|
| **Tables** | 6 | 7 | +1 (deleted_account_history) |
| **Functions** | 17 | 22 | +5 (re-signup prevention) |
| **Views** | 4 | 4 | No change |
| **Triggers** | 6 | 6 | Enhanced existing |
| **RLS Policies** | 6 tables | 7 tables | +1 table coverage |

## 🆕 NEW FEATURES ADDED

### 1. Account Deletion History Tracking
**NEW TABLE**: `deleted_account_history`
- Tracks all deleted accounts permanently
- Prevents trial abuse through re-signup
- Records trial usage and subscription history

### 2. Re-signup Prevention System
**NEW FUNCTIONS**:
- `check_email_trial_history(email)` - Check if email used before
- `record_account_deletion(user_id, email, reason)` - Track deletions
- `handle_user_resignup(user_id, email)` - Handle re-signup attempts
- `safely_delete_user_account(user_id)` - Safe deletion with tracking
- `restore_account_on_subscription(user_id, customer_id, subscription_id)` - Restore access

### 3. Enhanced User Creation Trigger
**ENHANCED**: `on_auth_user_created_enhanced()`
- Now detects returning users
- Prevents multiple free trials
- Forces subscription for returning users

## 🔄 BEHAVIORAL CHANGES

### Old System Behavior
```
User signs up → Gets 7-day trial → Trial expires → Account deleted
User signs up again (same email) → Gets ANOTHER 7-day trial ❌
```

### New System Behavior
```
User signs up → Gets 7-day trial → Trial expires → Account deleted + History recorded
User signs up again (same email) → NO TRIAL, must subscribe immediately ✅
```

## 📋 Detailed Comparison

### Tables

#### UNCHANGED TABLES
- `user_profiles` - No changes
- `user_account_state` - No changes  
- `user_trials` - No changes
- `stripe_customers` - No changes
- `stripe_subscriptions` - No changes
- `axie_studio_accounts` - No changes

#### NEW TABLE
```sql
-- NEW: deleted_account_history
CREATE TABLE deleted_account_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    original_user_id uuid NOT NULL,
    email text NOT NULL UNIQUE,
    full_name text,
    trial_used boolean DEFAULT true,
    trial_start_date timestamptz,
    trial_end_date timestamptz,
    trial_completed boolean DEFAULT false,
    ever_subscribed boolean DEFAULT false,
    last_subscription_status text,
    subscription_cancelled_date timestamptz,
    account_deleted_at timestamptz DEFAULT now(),
    deletion_reason text DEFAULT 'trial_expired',
    can_get_new_trial boolean DEFAULT false,
    requires_immediate_subscription boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
```

### Functions

#### UNCHANGED FUNCTIONS
- `sync_subscription_status()` - No changes
- `protect_paying_customers()` - No changes
- `get_user_access_level()` - No changes
- `check_expired_trials()` - No changes
- `initialize_user_trial()` - No changes
- `check_database_health()` - Updated counts only
- `mark_trial_converted()` - No changes
- `verify_user_protection()` - No changes
- `create_complete_user_profile()` - No changes
- `link_axie_studio_account()` - No changes
- `link_stripe_customer()` - No changes
- `sync_user_state()` - No changes
- `get_system_metrics()` - No changes
- `sync_all_users()` - No changes
- `on_subscription_change()` - No changes

#### ENHANCED FUNCTIONS
- `get_users_for_deletion()` - No changes to logic
- `on_auth_user_created_enhanced()` - **MAJOR ENHANCEMENT**: Now handles re-signup detection

#### NEW FUNCTIONS
1. `check_email_trial_history(email)` - Check trial history for email
2. `record_account_deletion(user_id, email, reason)` - Record deletion
3. `handle_user_resignup(user_id, email)` - Handle re-signup attempts  
4. `safely_delete_user_account(user_id)` - Safe deletion with tracking
5. `restore_account_on_subscription(user_id, customer_id, subscription_id)` - Restore access

### Views

#### UNCHANGED VIEWS
- `user_dashboard` - No changes
- `stripe_user_subscriptions` - No changes
- `user_trial_info` - No changes
- `user_access_status` - No changes

### RLS Policies

#### NEW POLICIES
```sql
-- Admin-only access to deletion history
CREATE POLICY "Admin can view deleted accounts" ON deleted_account_history 
FOR SELECT USING (auth.uid() = 'b8782453-a343-4301-a947-67c5bb407d2b'::uuid);

CREATE POLICY "Admin can manage deleted accounts" ON deleted_account_history 
FOR UPDATE USING (auth.uid() = 'b8782453-a343-4301-a947-67c5bb407d2b'::uuid);

CREATE POLICY "System can insert deleted accounts" ON deleted_account_history 
FOR INSERT WITH CHECK (true);
```

## 🔒 Security Enhancements

### Trial Abuse Prevention
- **Old**: Users could get unlimited trials by re-signing up
- **New**: Email-based tracking prevents multiple trials

### Data Integrity
- **Old**: No record of deleted accounts
- **New**: Permanent deletion history with audit trail

### Admin Protection
- **Old**: Basic admin protection
- **New**: Enhanced protection with deletion history access control

## 🚀 Migration Impact

### Backward Compatibility
✅ **Fully backward compatible**
- All existing tables unchanged
- All existing functions work as before
- No breaking changes to existing code

### New Capabilities
✅ **Enhanced functionality**
- Trial abuse prevention
- Account deletion tracking
- Re-signup detection
- Subscription-based restoration

### Performance Impact
✅ **Minimal performance impact**
- New table only accessed during signup/deletion
- Efficient indexes on email lookups
- No impact on existing user flows

## 🧪 Testing Requirements

### Regression Testing
- Verify all existing functionality works
- Test normal user signup and trial flow
- Test subscription management
- Test admin functions

### New Feature Testing
- Test re-signup prevention
- Test account deletion tracking
- Test subscription restoration
- Test admin deletion history access

## 📈 Benefits of New System

1. **Trial Abuse Prevention**: Stops users from getting multiple free trials
2. **Audit Trail**: Complete history of all account deletions
3. **Revenue Protection**: Forces returning users to subscribe
4. **Data Integrity**: Permanent tracking of user behavior
5. **Admin Visibility**: Full insight into deletion patterns
6. **Security**: Enhanced protection against abuse

## ⚠️ Important Notes

- **Data Recovery**: Once deleted, user data cannot be restored (by design)
- **Email Tracking**: System tracks by email address permanently
- **Subscription Required**: Returning users must subscribe to continue
- **Admin Access**: Only super admin can view deletion history
- **Audit Trail**: All deletions are permanently recorded

This enhanced system provides enterprise-level trial management with complete abuse prevention while maintaining full backward compatibility.
