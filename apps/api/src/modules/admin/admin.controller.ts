import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ProductsService } from "../products/products.service";
import { OrdersService } from "../orders/orders.service";
import { DriversService } from "../drivers/drivers.service";

@ApiTags("admin")
@Controller("admin")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly ordersService: OrdersService,
    private readonly driversService: DriversService,
  ) {}

  @Get("stats/today")
  async todayStats() {
    const activeDrivers = await this.driversService.findActive();
    return {
      todayRevenue: 0,
      todayOrders: 0,
      activeDrivers: activeDrivers.length,
      lowStockItems: 0,
    };
  }

  @Get("orders")
  findOrders(@Query() query: Record<string, string>) {
    return this.ordersService.findAll(query);
  }

  @Patch("orders/:id/status")
  updateOrderStatus(@Param("id") id: string, @Body() body: { status: any; driverId?: string }) {
    return this.ordersService.updateStatus(id, body.status, body.driverId);
  }

  @Patch("orders/:id/assign-driver")
  assignDriver(@Param("id") id: string, @Body() body: { driverId: string }) {
    return this.ordersService.assignDriver(id, body.driverId);
  }

  @Get("drivers")
  findDrivers(@Query("status") status?: string) {
    if (status === "active") return this.driversService.findActive();
    return this.driversService.findAll();
  }

  @Get("reports/revenue")
  revenueReport(@Query("period") period: string) {
    return [];
  }
}
