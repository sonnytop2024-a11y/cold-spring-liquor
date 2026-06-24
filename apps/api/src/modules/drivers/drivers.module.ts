import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Driver } from "./driver.entity";
import { DriversService } from "./drivers.service";
import { DriversController } from "./drivers.controller";
import { DriversGateway } from "./drivers.gateway";
import { OrdersModule } from "../orders/orders.module";

@Module({
  imports: [TypeOrmModule.forFeature([Driver]), OrdersModule],
  controllers: [DriversController],
  providers: [DriversService, DriversGateway],
  exports: [DriversService],
})
export class DriversModule {}
