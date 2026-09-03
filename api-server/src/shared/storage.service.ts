import { Injectable } from '@nestjs/common';

// Storage integration pending. Wire in local disk or S3 here later.
@Injectable()
export class StorageService {
  async uploadImage(_buffer: Buffer, _folder: string): Promise<string> {
    // TODO: implement local disk or cloud storage
    return '';
  }

  async deleteImage(_imagePath: string): Promise<void> {
    // TODO: implement deletion
  }
}
