import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { ProductsModule } from "../products/products.module";
import { OrdersModule } from "../orders/orders.module";
import { DriversModule } from "../drivers/drivers.module";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [ProductsModule, OrdersModule, DriversModule, UsersModule],
  controllers: [AdminController],
})
export class AdminModule {}
