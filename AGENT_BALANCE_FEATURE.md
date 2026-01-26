# Agent Balance Tracking Feature

## Overview
This feature implements agent-specific purchase tracking that automatically combines previous outstanding balances with new purchases. When a user buys products from an agent and has a remaining debt, the system will automatically add that debt to the next purchase from the same agent.

## How It Works

### 1. Agent Balance Tracking
- Each agent/supplier has a running balance tracked in the database
- **Negative balance** = Shop owes money to the agent (debt)
- **Positive balance** = Agent owes money to the shop (overpayment)
- **Zero balance** = All payments are settled

### 2. Purchase Flow

#### When Creating a New Purchase:
1. User selects or types an agent name
2. System checks if there's a previous balance for that agent
3. If there's an outstanding debt (negative balance):
   - The debt amount is displayed to the user
   - The total amount due = Current purchase cost + Previous debt
4. User enters the amount paid
5. System calculates the new remaining balance
6. Balance is automatically updated in the database

#### Example Scenario:
- **First Purchase:**
  - Product cost: TSh 100,000
  - Amount paid: TSh 70,000
  - Remaining: -TSh 30,000 (debt)
  
- **Second Purchase from Same Agent:**
  - Product cost: TSh 50,000
  - Previous debt: TSh 30,000
  - **Total amount due: TSh 80,000**
  - Amount paid: TSh 80,000
  - New remaining: TSh 0 (settled)

### 3. Visual Indicators

#### Agent Balance Summary Card:
- Displays all agents with their current balances
- Color-coded:
  - **Red**: Outstanding debt (negative balance)
  - **Green**: Overpayment (positive balance)
  - **White**: Settled (zero balance)

#### Purchase Form:
- Agent name field with autocomplete suggestions
- Shows previous balance when agent is selected
- Displays warning if there's outstanding debt
- Shows both current purchase cost and total amount due
- Calculates remaining balance in real-time

## Database Schema

### Agent Balances Table
```sql
CREATE TABLE public.agent_balances (
  id UUID PRIMARY KEY,
  shop_id UUID REFERENCES profiles(id),
  agent_name TEXT NOT NULL,
  balance NUMERIC DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(shop_id, agent_name)
);
```

### Update Function
```sql
CREATE FUNCTION update_agent_balance(
  p_shop_id UUID,
  p_agent_name TEXT,
  p_amount_change NUMERIC
) RETURNS NUMERIC
```

## Installation

### 1. Run Database Migration
Execute the SQL migration file to create the agent balances table:
```bash
# Run this SQL file in your Supabase SQL editor
agent_balances_migration.sql
```

### 2. Files Modified
- [`components/Admin/Purchases.tsx`](components/Admin/Purchases.tsx) - Updated purchase form and display
- [`App.tsx`](App.tsx) - Added agent balance fetching and update logic
- [`agent_balances_migration.sql`](agent_balances_migration.sql) - Database schema

## Features

### ✅ Automatic Balance Tracking
- Balances are automatically calculated and stored
- No manual intervention required

### ✅ Visual Feedback
- Clear display of agent balances
- Color-coded status indicators
- Real-time balance calculations

### ✅ Agent Suggestions
- Autocomplete for agent names
- Shows current balance in suggestions
- Easy to select previous agents

### ✅ Debt Consolidation
- Previous debts automatically added to new purchases
- Clear breakdown of costs
- Transparent payment tracking

### ✅ Balance History
- Last updated timestamp for each agent
- Complete audit trail through expense logs

## Usage

### For Shop Owners/Admins:

1. **Navigate to Purchases Page**
   - Click on "Purchases" in the sidebar

2. **View Agent Balances**
   - See all agents and their current balances at the top
   - Red cards indicate agents you owe money to
   - Green cards indicate overpayments

3. **Create New Purchase**
   - Click "New Purchase" button
   - Select or type agent name
   - If agent has previous debt, it will be displayed
   - Enter product details and quantity
   - System shows total amount due (including previous debt)
   - Enter amount paid
   - System calculates new balance

4. **Delete Purchase**
   - Click delete button on any purchase
   - Agent balance is automatically reverted

## Benefits

1. **No Lost Debts**: Never forget outstanding payments to agents
2. **Automatic Calculations**: System handles all balance calculations
3. **Clear Visibility**: See all agent balances at a glance
4. **Accurate Records**: Complete audit trail of all transactions
5. **Time Saving**: No manual tracking needed

## Technical Details

### Balance Calculation Logic
```typescript
// Get previous balance for selected agent
const previousBalance = agentBalance ? agentBalance.balance : 0;

// Calculate total amount due
const totalCost = quantity * unitPrice;
const totalAmountDue = previousBalance < 0 
  ? totalCost + Math.abs(previousBalance) 
  : totalCost;

// Calculate new remaining balance
const amountRemained = amountPaid - totalAmountDue;
```

### Database Update
```typescript
// Update agent balance using stored procedure
await supabase.rpc('update_agent_balance', {
  p_shop_id: shopId,
  p_agent_name: agentName,
  p_amount_change: amountRemained
});
```

## Security

- Row Level Security (RLS) enabled on agent_balances table
- Users can only see balances for their own shop
- Only admins can modify balances (through purchases)
- All operations are logged in expense_logs

## Future Enhancements

Potential improvements for future versions:
- Agent payment history view
- Payment reminders for overdue debts
- Agent contact information
- Bulk payment processing
- Export agent statements
- SMS/Email notifications for agents

## Support

For issues or questions about this feature, please check:
1. Database migration was run successfully
2. Agent balances table exists in Supabase
3. RLS policies are properly configured
4. User has admin permissions

## Version
- **Version**: 1.0.0
- **Date**: January 2026
- **Compatibility**: Stock Master v2.0+
