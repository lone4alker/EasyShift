# Staff Management System Setup

This guide will help you set up the staff management system with Supabase integration.

## Database Setup

### 1. Create the Staff Table

Run the SQL script in your Supabase SQL editor:

```bash
# Execute the SQL file in Supabase dashboard
# Go to: Supabase Dashboard > SQL Editor > New Query
# Copy and paste the contents of supabase-staff-table-setup.sql
```

### 2. Verify Businesses Table Structure

Ensure your `businesses` table has the following structure:

```sql
-- Businesses table should have at least:
CREATE TABLE businesses (
    id BIGSERIAL PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES auth.users(id),
    business_name TEXT NOT NULL,
    business_type TEXT,
    owner_email TEXT,
    owner_full_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Features Implemented

### ✅ Database Integration
- **Staff Table**: Complete table structure with relationships to businesses
- **Foreign Keys**: Proper relationships between staff, businesses, and auth.users
- **Row Level Security**: Users can only access/modify their own staff
- **Indexes**: Optimized for performance

### ✅ Staff Management Functions
- **Fetch Staff**: Load staff members from database based on business_id
- **Add Staff**: Insert new staff members with validation
- **Delete Staff**: Remove staff members with confirmation
- **Real-time Updates**: Immediate UI updates after database operations

### ✅ User Experience
- **Loading States**: Visual feedback during database operations
- **Error Handling**: Comprehensive error messages and user feedback
- **Success Messages**: Confirmation of successful operations
- **Form Validation**: Required field validation
- **Responsive Design**: Works on all screen sizes

## How to Use

### 1. Staff Management Page
Navigate to `/owner/staff-management` after logging in as a business owner.

### 2. Adding Staff Members
1. Click "Add New Staff" button
2. Fill in required information:
   - Full Name (required)
   - Role (required)
   - Email (required)
   - Phone (optional)
   - Hourly Rate
   - Max Hours per Day
   - Weekly Availability
3. Click "Add Staff Member"

### 3. Managing Existing Staff
- **View**: All staff members are displayed with their information
- **Delete**: Click the delete (trash) icon to remove a staff member
- **Edit**: Edit functionality can be added as needed

## Database Schema

### Staff Table Fields
- `id`: Primary key (auto-generated)
- `business_id`: Foreign key to businesses table
- `owner_id`: Foreign key to auth.users (for security)
- `full_name`: Staff member's full name
- `role`: Job role (Barista, Cashier, etc.)
- `email`: Email address (unique per business)
- `phone`: Phone number (optional)
- `hourly_rate`: Wage per hour
- `max_hours`: Maximum hours per day
- `availability`: JSON array of weekly availability
- `is_active`: Boolean flag for active status
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

### Availability Structure
```json
[
  {"day": "Monday", "start": "09:00", "end": "17:00"},
  {"day": "Tuesday", "start": "09:00", "end": "17:00"},
  {"day": "Wednesday", "start": "09:00", "end": "17:00"}
]
```

## Security Features

### Row Level Security (RLS)
- Users can only access staff from their own businesses
- Insert/Update/Delete operations are restricted to business owners
- All queries are automatically filtered by user permissions

### Data Validation
- Required field validation on frontend
- Database constraints prevent invalid data
- Unique email constraint per business
- Foreign key constraints ensure data integrity

## Error Handling

The system handles various error scenarios:
- **Database Connection Issues**: Clear error messages
- **Validation Errors**: Field-specific feedback
- **Permission Errors**: Appropriate user messaging
- **Network Issues**: Retry suggestions

## Next Steps

### Potential Enhancements
1. **Edit Staff**: Add inline editing capability
2. **Bulk Operations**: Import/export staff data
3. **Staff Profiles**: Extended information and photos
4. **Scheduling Integration**: Connect with scheduling system
5. **Notifications**: Email/SMS notifications for staff
6. **Reporting**: Staff analytics and reports

### Integration Points
- Connect with scheduling system using staff IDs
- Integrate with payroll using hourly rates
- Use availability data for auto-scheduling
- Connect with attendance tracking

## Troubleshooting

### Common Issues

1. **Staff not loading**
   - Check if businesses table has data for current user
   - Verify RLS policies are properly set
   - Check browser console for errors

2. **Cannot add staff**
   - Ensure required fields are filled
   - Check if business_id is properly retrieved
   - Verify user permissions

3. **Database errors**
   - Check Supabase connection
   - Verify table structure
   - Review RLS policies

### Support
For issues or questions, check:
1. Browser developer console for errors
2. Supabase logs in dashboard
3. Network tab for API call failures