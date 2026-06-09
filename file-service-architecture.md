# File Service Architecture

## Overview

A centralised `FileService` built on **Cloudflare R2** that handles all media uploads across the platform — product images, category/banner assets, invoices, documents, and other store media.

---

## Use Cases

| Use Case | Visibility | Examples |
|----------|------------|---------|
| Product images | Public | Multi-image per product, served to customers |
| Category images | Public | Category thumbnails |
| Banner images | Public | Storefront promotional banners |
| Store assets | Public | Logo, cover photo |
| Invoices | Private | Per-order PDF invoices |
| Documents | Private | Privacy policy, product catalogs, documentation |

---

## Bucket Strategy — Two R2 Buckets

```
whatsapp-commerce-public    ← Cloudflare CDN enabled, publicly accessible URL
whatsapp-commerce-private   ← No public access, presigned URLs only
```

**Why two buckets instead of one with prefixes:**
- Access control is explicit and obvious — no risk of misconfigured policies leaking private files
- Public bucket can have CDN caching enabled globally; private bucket never cached

---

## Folder Structure (Store Isolation)

Every file is scoped under `{storeId}/` to enforce tenant isolation at the storage level.

```
Public bucket:
  {storeId}/products/{uuid}.jpg
  {storeId}/products/thumbs/{uuid}.jpg
  {storeId}/categories/{uuid}.jpg
  {storeId}/banners/{uuid}.jpg
  {storeId}/store/{uuid}.jpg

Private bucket:
  {storeId}/invoices/{uuid}.pdf
  {storeId}/documents/{uuid}.pdf
```

Keys use UUIDs (not original filenames) to prevent enumeration and collisions.

---

## Database Schema

Add a `Media` table as the central registry for all uploaded files.

```prisma
model Media {
  id           String      @id @default(cuid())
  storeId      String
  store        Store       @relation(fields: [storeId], references: [id])

  key          String      @unique    // R2 object key (path inside bucket)
  bucket       BucketType             // PUBLIC | PRIVATE
  url          String?                // permanent public URL; null for private files
  mimeType     String
  size         Int                    // bytes
  originalName String

  entityType   MediaEntity            // what this file belongs to
  entityId     String?                // id of the owning record (nullable for unattached)

  status       MediaStatus            // PENDING | ACTIVE
  thumbnailKey String?                // R2 key for generated thumbnail (images only)
  thumbnailUrl String?                // public URL for thumbnail

  uploadedBy   String?
  user         User?       @relation(fields: [uploadedBy], references: [id])

  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
}

enum BucketType {
  PUBLIC
  PRIVATE
}

enum MediaStatus {
  PENDING   // presigned URL issued, upload not yet confirmed
  ACTIVE    // successfully uploaded and confirmed
}

enum MediaEntity {
  PRODUCT
  CATEGORY
  BANNER
  STORE
  INVOICE
  DOCUMENT
}
```

---

## Upload Flow (Presigned URL — Client Uploads Directly to R2)

The backend never proxies file bytes — it only coordinates. This keeps the backend lean and removes bandwidth bottlenecks for large files.

```
1. Client → POST /api/files/upload-url
           Body: { entityType, entityId?, mimeType, size, visibility: PUBLIC|PRIVATE }
           
   Backend:
   - Validates mimeType and size against allowed limits
   - Generates key: {storeId}/{entityType}/{uuid}.{ext}
   - Creates Media record with status: PENDING
   - Issues a presigned PUT URL (15-min expiry) against the correct bucket
   
   ← Response: { uploadUrl, mediaId, key }

2. Client → PUT {uploadUrl}
           (direct upload to R2 — no backend involved)

3. Client → POST /api/files/confirm/:mediaId

   Backend:
   - Verifies the object exists in R2
   - Marks Media record status: ACTIVE
   - For image mimetypes: generates thumbnail with Sharp,
     uploads thumbnail to R2, updates thumbnailKey + thumbnailUrl
   
   ← Response: Media record with final url + thumbnailUrl
```

---

## FileService — Method Contracts

```typescript
// Issue a presigned PUT URL and create a PENDING media record
getUploadUrl(dto: {
  storeId: string;
  entityType: MediaEntity;
  entityId?: string;
  mimeType: string;
  size: number;
  visibility: BucketType;
}): Promise<{ uploadUrl: string; mediaId: string; key: string }>

// Confirm upload completed — mark ACTIVE, generate thumbnail
confirmUpload(mediaId: string): Promise<Media>

// Get a short-lived presigned GET URL for private files (default 15 min)
getPrivateUrl(mediaId: string, expiresInSeconds?: number): Promise<string>

// Delete R2 object(s) and DB record immediately
deleteMedia(mediaId: string): Promise<void>

// Batch delete (e.g. delete all media when a product is removed)
deleteMany(mediaIds: string[]): Promise<void>

// Cron job — delete PENDING records + R2 objects older than 1 hour
cleanupOrphans(): Promise<void>
```

---

## Thumbnail Generation

- Library: **Sharp** (Node.js, no external service needed)
- Triggered automatically inside `confirmUpload()` for `image/*` mimetypes
- Thumbnail stored as a sibling object: `{storeId}/products/thumbs/{uuid}.jpg`
- Original and thumbnail keys both recorded on the `Media` record
- Non-image files (PDFs, etc.) do not get thumbnails

Thumbnail size defaults (adjust per entity type as needed):

| Entity | Dimensions |
|--------|-----------|
| Product | 400×400 (cover), 80×80 (cart thumbnail) |
| Category | 300×200 |
| Banner | 800×400 |
| Store logo | 200×200 |

---

## Draft Product Images — Access Control Decision

**Agreed approach: API-gated (public bucket, UUID keys)**

Product images are stored in the public bucket regardless of product publish state. The API never returns image URLs for unpublished products. UUID-based keys make URLs practically unguessable.

This matches how Shopify, WooCommerce, and most e-commerce platforms work. The alternative (moving files between buckets on publish/unpublish) adds R2 copy+delete operations on every state change with no meaningful security benefit given non-guessable keys.

---

## Unused File Cleanup

**Immediate delete (explicit removal):**
When a product image is replaced or removed, the service deletes the R2 object and the `Media` record in the same request. No background job needed.

**Orphan cleanup (failed/abandoned uploads):**
A scheduled cron job runs hourly targeting `Media` records where `status = PENDING` and `createdAt < now - 1hr`. For each: delete the R2 object (if it exists) and the DB record.

---

## Allowed File Types & Size Limits

| Category | Allowed Types | Max Size |
|----------|--------------|---------|
| Images | image/jpeg, image/png, image/webp | 10 MB |
| Documents | application/pdf | 25 MB |
| Video (future) | video/mp4 | 100 MB |

Validate on `getUploadUrl` before issuing the presigned URL — reject early.

---

## Environment Variables Required

```env
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_PUBLIC_BUCKET=whatsapp-commerce-public
R2_PRIVATE_BUCKET=whatsapp-commerce-private
R2_PUBLIC_URL=https://cdn.yourdomain.com   # Cloudflare CDN / r2.dev URL
```

---

## Implementation Order

1. Prisma migration — add `Media` table and enums
2. R2 client setup (`@aws-sdk/client-s3` — R2 is S3-compatible)
3. `FileService` — `getUploadUrl`, `confirmUpload`, `deleteMedia`, `getPrivateUrl`
4. Thumbnail generation with Sharp inside `confirmUpload`
5. `FilesController` — REST endpoints (`/files/upload-url`, `/files/confirm/:id`, `/files/:id`)
6. Wire `deleteMedia` into product/banner/category delete handlers
7. Orphan cleanup cron job
