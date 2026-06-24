import { Controller, Get, Post, Body, UseGuards, Request } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { RewardsService } from "./rewards.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@ApiTags("rewards")
@Controller("rewards")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Get("me")
  getMyRewards(@Request() req: any) {
    return this.rewardsService.getUserRewards(req.user.id);
  }

  @Post("redeem")
  redeemPoints(@Request() req: any, @Body() body: { points: number }) {
    return this.rewardsService.redeemPoints(req.user.id, body.points);
  }
}
