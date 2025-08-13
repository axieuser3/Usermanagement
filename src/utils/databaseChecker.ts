import { supabase } from '../lib/supabase';

export interface DatabaseStatus {
  tables: { [key: string]: boolean };
  views: { [key: string]: boolean };
  functions: { [key: string]: boolean };
  errors: string[];
}

/**
 * Check the status of all required database objects
 */
export async function checkDatabaseStatus(): Promise<DatabaseStatus> {
  const status: DatabaseStatus = {
    tables: {},
    views: {},
    functions: {},
    errors: []
  };

  // Check tables
  const requiredTables = [
    'stripe_customers',
    'stripe_subscriptions', 
    'stripe_orders',
    'user_trials'
  ];

  for (const table of requiredTables) {
    try {
      const { error } = await supabase.from(table).select('count').limit(1);
      status.tables[table] = !error;
      if (error) {
        status.errors.push(`Table ${table}: ${error.message}`);
      }
    } catch (err) {
      status.tables[table] = false;
      status.errors.push(`Table ${table}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  // Check views
  const requiredViews = [
    'user_trial_info',
    'user_access_status',
    'stripe_user_subscriptions',
    'stripe_user_orders'
  ];

  for (const view of requiredViews) {
    try {
      const { error } = await supabase.from(view).select('*').limit(1);
      status.views[view] = !error;
      if (error) {
        status.errors.push(`View ${view}: ${error.message}`);
      }
    } catch (err) {
      status.views[view] = false;
      status.errors.push(`View ${view}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  // Check functions
  const requiredFunctions = [
    'sync_subscription_status',
    'protect_paying_customers',
    'get_user_access_level',
    'verify_user_protection'
  ];

  for (const func of requiredFunctions) {
    try {
      // Try to call the function with minimal parameters
      let result;
      if (func === 'get_user_access_level' || func === 'verify_user_protection') {
        // These functions require a user_id parameter
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          result = await supabase.rpc(func, { p_user_id: user.id });
        } else {
          // Skip if no user is logged in
          status.functions[func] = true;
          continue;
        }
      } else {
        result = await supabase.rpc(func);
      }
      
      status.functions[func] = !result.error;
      if (result.error) {
        status.errors.push(`Function ${func}: ${result.error.message}`);
      }
    } catch (err) {
      status.functions[func] = false;
      status.errors.push(`Function ${func}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  return status;
}

/**
 * Generate a human-readable report of database status
 */
export function generateDatabaseReport(status: DatabaseStatus): string {
  let report = '📊 DATABASE STATUS REPORT\n\n';

  // Tables section
  report += '🗄️ TABLES:\n';
  Object.entries(status.tables).forEach(([table, isWorking]) => {
    report += `  ${isWorking ? '✅' : '❌'} ${table}\n`;
  });

  // Views section
  report += '\n👁️ VIEWS:\n';
  Object.entries(status.views).forEach(([view, isWorking]) => {
    report += `  ${isWorking ? '✅' : '❌'} ${view}\n`;
  });

  // Functions section
  report += '\n⚙️ FUNCTIONS:\n';
  Object.entries(status.functions).forEach(([func, isWorking]) => {
    report += `  ${isWorking ? '✅' : '❌'} ${func}\n`;
  });

  // Errors section
  if (status.errors.length > 0) {
    report += '\n🚨 ERRORS:\n';
    status.errors.forEach(error => {
      report += `  • ${error}\n`;
    });
  }

  return report;
}

/**
 * Quick check if all critical database objects are working
 */
export async function isDatabaseHealthy(): Promise<boolean> {
  const status = await checkDatabaseStatus();
  
  // Check if all tables are working
  const allTablesWorking = Object.values(status.tables).every(Boolean);
  
  // Check if at least the critical views are working
  const criticalViews = ['user_trial_info', 'user_access_status', 'stripe_user_subscriptions'];
  const criticalViewsWorking = criticalViews.every(view => status.views[view]);
  
  return allTablesWorking && criticalViewsWorking;
}
