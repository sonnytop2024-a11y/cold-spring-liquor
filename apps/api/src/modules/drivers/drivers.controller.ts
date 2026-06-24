import { Controller, Get, Patch, Body, UseGuards, Request, Query } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { DriversService } from "./drivers.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@ApiTags("drivers")
@Controller("driver")
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Patch("status")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  setStatus(@Body() body: { online: boolean }, @Request() req: any) {
    return this.driversService.setOnlineStatus(req.user.id, body.online);
  }

  @Patch("location")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  updateLocation(@Body() body: { lat: number; lng: number }, @Request() req: any) {
    return this.driversService.updateLocation(req.user.id, body.lat, body.lng);
  }

  @Get("deliveries")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  deliveries(@Request() req: any) {
    return { newOrders: [], activeOrders: [] };
  }
}
