import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RewardsLedger, UserRewards } from "./rewards.entity";
import { RewardsService } from "./rewards.service";
import { RewardsController } from "./rewards.controller";

@Module({
  imports: [TypeOrmModule.forFeature([RewardsLedger, UserRewards])],
  providers: [RewardsService],
  controllers: [RewardsController],
  exports: [RewardsService],
})
export class RewardsModule {}
