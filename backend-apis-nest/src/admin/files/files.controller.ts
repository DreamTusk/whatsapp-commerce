import { Controller, Post, Delete, Param, Body, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { FileService } from '../../shared/file.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BucketType, MediaEntity } from '@prisma/client';

@Controller('files')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FilesController {
  constructor(private fileService: FileService) {}

  // POST /api/files/upload — proxy upload (browser → backend → R2)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async upload(
    @CurrentUser() user: { userId: string },
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { entity_type: string; visibility?: string },
  ) {
    const storeId = await this.fileService.getStoreId(user.userId);
    return this.fileService.uploadFile({
      storeId,
      entityType: body.entity_type as MediaEntity,
      mimeType: file.mimetype,
      size: file.size,
      visibility: (body.visibility as BucketType) ?? BucketType.PUBLIC,
      originalName: file.originalname,
      uploadedBy: user.userId,
      buffer: file.buffer,
    });
  }

  // POST /api/files/upload-url
  @Post('upload-url')
  async getUploadUrl(
    @CurrentUser() user: { userId: string },
    @Body() body: {
      entity_type: string;
      entity_id?: string;
      mime_type: string;
      size: number;
      visibility?: string;
      original_name: string;
    },
  ) {
    const storeId = await this.fileService.getStoreId(user.userId);
    return this.fileService.getUploadUrl({
      storeId,
      entityType: body.entity_type as MediaEntity,
      entityId: body.entity_id,
      mimeType: body.mime_type,
      size: body.size,
      visibility: (body.visibility as BucketType) ?? BucketType.PUBLIC,
      originalName: body.original_name,
      uploadedBy: user.userId,
    });
  }

  // POST /api/files/confirm/:id
  @Post('confirm/:id')
  async confirmUpload(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    const storeId = await this.fileService.getStoreId(user.userId);
    return this.fileService.confirmUpload(id, storeId);
  }

  // DELETE /api/files/:id
  @Delete(':id')
  async deleteMedia(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    const storeId = await this.fileService.getStoreId(user.userId);
    await this.fileService.deleteMedia(id, storeId);
    return { message: 'File deleted' };
  }
}
