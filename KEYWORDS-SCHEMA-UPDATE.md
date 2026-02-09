# Campaign Keywords & Coupon Extracted Data Schema Update

## 📋 Overview

This update adds:
1. **`keywords` field** to the `campaigns` table - stores eligible products for each campaign
2. **Enhanced `extracted_data` field** in the `coupons` table - properly typed to store AI-extracted items
3. **Helper functions** for keyword matching
4. **Performance indexes** for faster queries

## 🗄️ Database Changes

### Campaigns Table

**New Field:** `keywords` (TEXT[])
- Stores an array of product keywords/names that are eligible for the campaign
- Example: `['Coca-Cola', 'Pepsi', 'Sprite', 'Fanta']`
- Empty array `[]` means all products are eligible

### Coupons Table

**Updated Field:** `extracted_data` (JSONB)
- Now properly typed to store structured data from AI extraction
- Contains: items, total, store, date, etc.
- Example:
```json
{
  "items": [
    {
      "name": "Coca-Cola 2L",
      "quantity": 2,
      "price": 3.99,
      "unit_price": 1.99
    },
    {
      "name": "Bread",
      "quantity": 1,
      "price": 2.50
    }
  ],
  "total": 10.48,
  "store": "Supermarket ABC",
  "date": "2026-02-09"
}
```

## 🚀 How to Apply

### Step 1: Run the Migration Script

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy the contents of **`add-keywords-and-extracted-data.sql`**
3. Paste and click **Run**

### Step 2: Verify the Changes

The script will automatically verify that:
- ✅ `keywords` column added to `campaigns`
- ✅ `extracted_data` is JSONB in `coupons`
- ✅ Indexes created for better performance
- ✅ Helper function `coupon_matches_campaign_keywords()` created

## 📊 TypeScript Types Updated

### Campaign Interface

```typescript
export interface Campaign {
  id: string
  title: string
  description: string | null
  start_date: string
  end_date: string
  is_active: boolean
  banner_url: string | null
  keywords: string[]  // ✅ NEW!
  created_at: string
  updated_at: string
}
```

### Coupon Interfaces

```typescript
export interface CouponItem {
  name: string
  quantity?: number
  price?: number
  unit_price?: number
}

export interface ExtractedData {
  items: CouponItem[]
  total?: number
  store?: string
  date?: string
  [key: string]: any // Allow additional fields
}

export interface Coupon {
  id: string
  user_id: string
  campaign_id: string
  image_url: string
  status: 'pending' | 'approved' | 'rejected'
  extracted_data: ExtractedData | null  // ✅ Now properly typed!
  points_awarded: number
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
}
```

## 🔧 Helper Functions

### `coupon_matches_campaign_keywords()`

Checks if a coupon contains any of the campaign's eligible products.

**Usage:**
```sql
SELECT * FROM coupons c
JOIN campaigns camp ON c.campaign_id = camp.id
WHERE coupon_matches_campaign_keywords(
  c.extracted_data->'items',
  camp.keywords
);
```

**Logic:**
- If campaign has no keywords (`[]`), all coupons match ✅
- Otherwise, checks if any item name contains any keyword
- Case-insensitive matching
- Uses `LIKE '%keyword%'` pattern

## 📝 Usage Examples

### Example 1: Create Campaign with Keywords

```typescript
const campaign = await fetch('/api/campaigns', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Beer Promotion',
    description: 'Upload beer receipts to earn points',
    start_date: '2026-02-01',
    end_date: '2026-02-28',
    keywords: ['Beer', 'Cerveja', 'Heineken', 'Budweiser'],
    is_active: true
  })
})
```

### Example 2: Store Coupon with Extracted Data

```typescript
const coupon = await fetch('/api/coupons', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: userId,
    campaign_id: campaignId,
    image_url: imageUrl,
    extracted_data: {
      items: [
        {
          name: 'Heineken 6-pack',
          quantity: 2,
          price: 15.98,
          unit_price: 7.99
        },
        {
          name: 'Chips',
          quantity: 1,
          price: 2.99
        }
      ],
      total: 18.97,
      store: 'Supermarket ABC',
      date: '2026-02-09'
    }
  })
})
```

### Example 3: Query Matching Coupons

```typescript
// API route to get coupons that match campaign keywords
const { data: matchingCoupons } = await supabase
  .from('coupons')
  .select(`
    *,
    campaigns (
      title,
      keywords
    )
  `)
  .filter('campaign_id', 'eq', campaignId)
  .filter('extracted_data', 'not.is', null)
```

## 🎯 Business Logic

### Campaign Validation Flow

1. **Admin creates campaign** with specific keywords
   - Example: Beer campaign with `['Beer', 'Cerveja']`

2. **User uploads coupon** with image

3. **AI extracts data** from image
   ```json
   {
     "items": [
       { "name": "Heineken 6-pack", "quantity": 1, "price": 7.99 },
       { "name": "Chips", "quantity": 1, "price": 2.99 }
     ]
   }
   ```

4. **System validates** using helper function
   - Checks if "Heineken 6-pack" contains "Beer" or "Cerveja"
   - Result: ✅ Match found (contains "Heineken" or could match "Beer")

5. **Admin reviews** and awards points accordingly

## 🔍 Performance Optimizations

### Indexes Created

```sql
-- GIN index on keywords for fast array searches
CREATE INDEX idx_campaigns_keywords ON campaigns USING GIN(keywords);

-- GIN index on extracted_data for fast JSONB queries
CREATE INDEX idx_coupons_extracted_data ON coupons USING GIN(extracted_data);
```

**Benefits:**
- ⚡ Faster keyword searches
- ⚡ Faster JSONB queries
- ⚡ Better performance with large datasets

## ✅ Testing Checklist

- [ ] Run migration script in Supabase
- [ ] Verify `keywords` column exists in campaigns table
- [ ] Verify `extracted_data` is JSONB in coupons table
- [ ] Test creating campaign with keywords
- [ ] Test creating coupon with extracted_data
- [ ] Test keyword matching function
- [ ] Update frontend to support keywords input
- [ ] Update AI extraction to populate extracted_data

## 🔄 Migration Status

Files updated:
- ✅ `add-keywords-and-extracted-data.sql` - Database migration
- ✅ `src/types/campaign.ts` - Campaign TypeScript types
- ✅ `src/types/coupon.ts` - Coupon TypeScript types (NEW)
- ✅ `src/types/database.types.ts` - Database type definitions

## 📚 Next Steps

1. **Update Campaign Form** to allow admins to add keywords
2. **Implement AI Extraction** to populate extracted_data
3. **Add Validation Logic** in coupon approval to check keywords
4. **Create UI Components** to display extracted items
5. **Add Filtering** to show only matching coupons for each campaign

---

**After running the migration, your campaigns and coupons will support keyword-based validation!** 🎉
