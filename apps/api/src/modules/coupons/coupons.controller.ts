import { Controller, Post, Get, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { CouponsService } from "./coupons.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@ApiTags("coupons")
@Controller("coupons")
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post("validate")
  validate(@Body() body: { code: string; subtotal: number; category?: string }) {
    return this.couponsService.validate(body.code, body.subtotal, body.category);
  }

  @Get("all")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  findAll() {
    return this.couponsService.findAll();
  }

  @Post("admin/create")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  create(@Body() body: any) {
    return this.couponsService.create(body);
  }
}
