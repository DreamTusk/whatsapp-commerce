import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PutObjectCommand, HeadObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { r2Client } from './r2.client';
import { PrismaService } from '../prisma/prisma.service';
import { BucketType, MediaEntity, MediaStatus } from '@prisma/client';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_DOC_TYPES = ['application/pdf'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_DOC_SIZE = 25 * 1024 * 1024;   // 25 MB

const ENTITY_FOLDER: Record<string, string> = {
  PRODUCT:  'products',
  CATEGORY: 'categories',
  BANNER:   'banners',
  STORE:    'store',
  INVOICE:  'invoices',
  DOCUMENT: 'documents',
};

const THUMBNAIL_SIZES: Record<string, { width: number; height: number }> = {
  PRODUCT:  { width: 400, height: 400 },
  CATEGORY: { width: 300, height: 200 },
  BANNER:   { width: 800, height: 400 },
  STORE:    { width: 200, height: 200 },
};

@Injectable()
export class FileService {
  private readonly publicBucket = process.env.R2_PUBLIC_BUCKET!;
  private readonly privateBucket = process.env.R2_PRIVATE_BUCKET!;
  private readonly publicUrl = (process.env.R2_PUBLIC_URL ?? '').replace(/\/$/, '');

  constructor(private prisma: PrismaService) {}

  async getStoreId(userId: string): Promise<string> {
    const userStore = await this.prisma.userStore.findFirst({ where: { userId } });
    if (!userStore) throw new NotFoundException('No store found for user');
    return userStore.storeId;
  }

  async getUploadUrl(dto: {
    storeId: string;
    entityType: MediaEntity;
    entityId?: string;
    mimeType: string;
    size: number;
    visibility: BucketType;
    originalName: string;
    uploadedBy?: string;
  }) {
    this.validateFile(dto.mimeType, dto.size);

    const ext = this.extFromMime(dto.mimeType);
    const uuid = randomUUID();
    const folder = ENTITY_FOLDER[dto.entityType] ?? dto.entityType.toLowerCase() + 's';
    const key = `${dto.storeId}/${folder}/${uuid}.${ext}`;
    const bucket = dto.visibility === BucketType.PUBLIC ? this.publicBucket : this.privateBucket;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: dto.mimeType,
    });

    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 900 });

    const media = await this.prisma.media.create({
      data: {
        storeId: dto.storeId,
        key,
        bucket: dto.visibility,
        mimeType: dto.mimeType,
        size: dto.size,
        originalName: dto.originalName,
        entityType: dto.entityType,
        entityId: dto.entityId ?? null,
        status: MediaStatus.PENDING,
        uploadedBy: dto.uploadedBy ?? null,
      },
    });

    return { uploadUrl, mediaId: media.id, key };
  }

  async confirmUpload(mediaId: string, storeId: string) {
    const media = await this.prisma.media.findFirst({
      where: { id: mediaId, storeId },
    });
    if (!media) throw new NotFoundException('Media record not found');
    if (media.status === MediaStatus.ACTIVE) return { media: this.formatMedia(media) };

    const bucket = media.bucket === BucketType.PUBLIC ? this.publicBucket : this.privateBucket;

    // Verify object exists in R2
    try {
      await r2Client.send(new HeadObjectCommand({ Bucket: bucket, Key: media.key }));
    } catch {
      throw new BadRequestException('File not found in storage — upload may have failed');
    }

    const url = media.bucket === BucketType.PUBLIC
      ? `${this.publicUrl}/${media.key}`
      : null;

    let thumbnailKey: string | null = null;
    let thumbnailUrl: string | null = null;

    if (ALLOWED_IMAGE_TYPES.includes(media.mimeType)) {
      const result = await this.generateThumbnail(media.key, media.entityType, storeId, media.bucket);
      thumbnailKey = result.thumbnailKey;
      thumbnailUrl = result.thumbnailUrl;
    }

    const updated = await this.prisma.media.update({
      where: { id: mediaId },
      data: { status: MediaStatus.ACTIVE, url, thumbnailKey, thumbnailUrl },
    });

    return { media: this.formatMedia(updated) };
  }

  async uploadFile(dto: {
    storeId: string;
    entityType: MediaEntity;
    mimeType: string;
    size: number;
    visibility: BucketType;
    originalName: string;
    uploadedBy: string;
    buffer: Buffer;
  }) {
    this.validateFile(dto.mimeType, dto.size);

    const ext = this.extFromMime(dto.mimeType);
    const uuid = randomUUID();
    const folder = ENTITY_FOLDER[dto.entityType] ?? dto.entityType.toLowerCase() + 's';
    const key = `${dto.storeId}/${folder}/${uuid}.${ext}`;
    const bucket = dto.visibility === BucketType.PUBLIC ? this.publicBucket : this.privateBucket;

    await r2Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: dto.buffer,
      ContentType: dto.mimeType,
    }));

    const url = dto.visibility === BucketType.PUBLIC
      ? `${this.publicUrl}/${key}`
      : null;

    let thumbnailKey: string | null = null;
    let thumbnailUrl: string | null = null;

    if (ALLOWED_IMAGE_TYPES.includes(dto.mimeType)) {
      const result = await this.generateThumbnail(key, dto.entityType, dto.storeId, dto.visibility);
      thumbnailKey = result.thumbnailKey;
      thumbnailUrl = result.thumbnailUrl;
    }

    const media = await this.prisma.media.create({
      data: {
        storeId: dto.storeId,
        key,
        bucket: dto.visibility,
        mimeType: dto.mimeType,
        size: dto.size,
        originalName: dto.originalName,
        entityType: dto.entityType,
        entityId: null,
        status: MediaStatus.ACTIVE,
        uploadedBy: dto.uploadedBy,
        url,
        thumbnailKey,
        thumbnailUrl,
      },
    });

    return { media: this.formatMedia(media) };
  }

  async getPrivateUrl(mediaId: string, storeId: string, expiresInSeconds = 900) {
    const media = await this.prisma.media.findFirst({
      where: { id: mediaId, storeId, bucket: BucketType.PRIVATE },
    });
    if (!media) throw new NotFoundException('Media not found');

    const command = new HeadObjectCommand({ Bucket: this.privateBucket, Key: media.key });
    const url = await getSignedUrl(r2Client, command, { expiresIn: expiresInSeconds });
    return { url };
  }

  async deleteMedia(mediaId: string, storeId: string) {
    const media = await this.prisma.media.findFirst({ where: { id: mediaId, storeId } });
    if (!media) throw new NotFoundException('Media not found');

    const bucket = media.bucket === BucketType.PUBLIC ? this.publicBucket : this.privateBucket;

    await Promise.all([
      r2Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: media.key })).catch(() => {}),
      media.thumbnailKey
        ? r2Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: media.thumbnailKey })).catch(() => {})
        : Promise.resolve(),
    ]);

    await this.prisma.media.delete({ where: { id: mediaId } });
  }

  async deleteMany(mediaIds: string[], storeId: string) {
    await Promise.all(mediaIds.map(id => this.deleteMedia(id, storeId)));
  }

  async cleanupOrphans() {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000);
    const orphans = await this.prisma.media.findMany({
      where: { status: MediaStatus.PENDING, createdAt: { lt: cutoff } },
    });

    for (const media of orphans) {
      const bucket = media.bucket === BucketType.PUBLIC ? this.publicBucket : this.privateBucket;
      await r2Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: media.key })).catch(() => {});
      await this.prisma.media.delete({ where: { id: media.id } }).catch(() => {});
    }

    return { cleaned: orphans.length };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private validateFile(mimeType: string, size: number) {
    const isImage = ALLOWED_IMAGE_TYPES.includes(mimeType);
    const isDoc = ALLOWED_DOC_TYPES.includes(mimeType);

    if (!isImage && !isDoc) {
      throw new BadRequestException(`File type ${mimeType} is not allowed`);
    }
    if (isImage && size > MAX_IMAGE_SIZE) {
      throw new BadRequestException('Image must be under 10 MB');
    }
    if (isDoc && size > MAX_DOC_SIZE) {
      throw new BadRequestException('Document must be under 25 MB');
    }
  }

  private extFromMime(mimeType: string): string {
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png':  'png',
      'image/webp': 'webp',
      'application/pdf': 'pdf',
    };
    return map[mimeType] ?? 'bin';
  }

  private async generateThumbnail(
    originalKey: string,
    entityType: MediaEntity,
    storeId: string,
    bucket: BucketType,
  ) {
    const size = THUMBNAIL_SIZES[entityType] ?? { width: 400, height: 400 };
    const bucketName = bucket === BucketType.PUBLIC ? this.publicBucket : this.privateBucket;

    // Download original from R2
    const response = await r2Client.send(new GetObjectCommand({ Bucket: bucketName, Key: originalKey }));
    const chunks: Buffer[] = [];
    for await (const chunk of response.Body as AsyncIterable<Buffer>) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Generate thumbnail
    const thumbBuffer = await sharp(buffer)
      .resize(size.width, size.height, { fit: 'cover' })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Build thumbnail key — insert /thumbs/ before filename
    const parts = originalKey.split('/');
    const filename = parts.pop()!;
    const thumbnailKey = [...parts, 'thumbs', filename.replace(/\.[^.]+$/, '.jpg')].join('/');

    await r2Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: thumbnailKey,
      Body: thumbBuffer,
      ContentType: 'image/jpeg',
    }));

    const thumbnailUrl = bucket === BucketType.PUBLIC
      ? `${this.publicUrl}/${thumbnailKey}`
      : null;

    return { thumbnailKey, thumbnailUrl };
  }

  private formatMedia(media: any) {
    return {
      id: media.id,
      key: media.key,
      url: media.url,
      thumbnail_url: media.thumbnailUrl,
      mime_type: media.mimeType,
      size: media.size,
      original_name: media.originalName,
      entity_type: media.entityType,
      entity_id: media.entityId,
      status: media.status,
      bucket: media.bucket,
      created_at: media.createdAt,
    };
  }
}
