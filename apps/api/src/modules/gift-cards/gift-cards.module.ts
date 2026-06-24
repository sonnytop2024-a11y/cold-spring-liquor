import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GiftCard } from "./gift-card.entity";
import { GiftCardsService } from "./gift-cards.service";
import { GiftCardsController } from "./gift-cards.controller";

@Module({
  imports: [TypeOrmModule.forFeature([GiftCard])],
  providers: [GiftCardsService],
  controllers: [GiftCardsController],
  exports: [GiftCardsService],
})
export class GiftCardsModule {}
