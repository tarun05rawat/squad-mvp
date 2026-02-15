## Supabase Storage Setup for Photos

### Step 1: Create Storage Bucket

1. Go to Supabase Dashboard → **Storage**
2. Click **New Bucket**
3. Enter bucket name: `squad-photos`
4. **Public bucket**: ✅ Yes (checked)
5. Click **Create bucket**

### Step 2: Set Storage Policies

After creating the bucket, click on `squad-photos` → **Policies** tab

#### Policy 1: Allow authenticated users to upload
```sql
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'squad-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

#### Policy 2: Allow public read access
```sql
CREATE POLICY "Anyone can view photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'squad-photos');
```

#### Policy 3: Users can delete their own photos
```sql
CREATE POLICY "Users can delete own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'squad-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### Step 3: Verify Setup

Run this in SQL Editor to verify:

```sql
SELECT
  name as bucket_name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'squad-photos';
```

You should see:
- `bucket_name`: squad-photos
- `public`: true
- `file_size_limit`: 10485760 (10MB)
- `allowed_mime_types`: `{image/*}` (optional - set if you want to restrict)

### Storage Structure

Photos will be stored as:
```
squad-photos/
  {user_id}/
    {photo_id}.jpg
```

Example: `squad-photos/a1b2c3.../photo-uuid.jpg`

### File Size Limit (Optional)

To set a 10MB limit, run:

```sql
UPDATE storage.buckets
SET file_size_limit = 10485760
WHERE id = 'squad-photos';
```

### MIME Type Restriction (Optional)

To only allow images, run:

```sql
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/heic', 'image/webp']
WHERE id = 'squad-photos';
```

---

## ✅ Setup Complete!

Your storage is ready for photo uploads. The app will:
- ✅ Upload photos to `squad-photos/{userId}/{photoId}.jpg`
- ✅ Store public URLs in the `photos` table
- ✅ Allow all squad members to view
- ✅ Allow uploaders to delete their own photos
