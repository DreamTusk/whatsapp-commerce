import {
  Controller,
  Post,
  Param,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  // POST /api/payments/razorpay-webhook/:storeId
  // Public — no auth guard. Verified via HMAC signature inside the service.
  @Post('razorpay-webhook/:storeId')
  @HttpCode(HttpStatus.OK)
  handleRazorpayWebhook(
    @Param('storeId') storeId: string,
    @Headers('x-razorpay-signature') signature: string,
    @Req() req: any,
  ) {
    return this.paymentsService.handleRazorpayWebhook(storeId, req.rawBody!, signature);
  }
}
