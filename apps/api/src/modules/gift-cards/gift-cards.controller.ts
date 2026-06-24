import { Controller, Post, Body, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { GiftCardsService } from "./gift-cards.service";

@ApiTags("gift-cards")
@Controller("gift-cards")
export class GiftCardsController {
  constructor(private readonly giftCardsService: GiftCardsService) {}

  @Post("purchase")
  purchase(@Body() body: { amount: number; recipientEmail: string; senderName: string; message?: string }) {
    return this.giftCardsService.purchase(body);
  }

  @Get("validate")
  validate(@Query("code") code: string) {
    return this.giftCardsService.validate(code);
  }

  @Post("redeem")
  redeem(@Body() body: { code: string; amount: number }) {
    return this.giftCardsService.redeem(body.code, body.amount);
  }
}
