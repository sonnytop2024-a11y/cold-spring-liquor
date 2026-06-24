import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { OrdersService } from "./orders.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@ApiTags("orders")
@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  create(@Body() body: any, @Request() req: any) {
    return this.ordersService.create({ ...body, customerId: req.user.id });
  }

  @Get("my")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  myOrders(@Request() req: any) {
    return this.ordersService.findByCustomer(req.user.id);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  findOne(@Param("id") id: string) {
    return this.ordersService.findById(id);
  }

  @Get(":id/driver-location")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  driverLocation(@Param("id") id: string) {
    return { lat: 30.5786, lng: -97.8536 };
  }
}
