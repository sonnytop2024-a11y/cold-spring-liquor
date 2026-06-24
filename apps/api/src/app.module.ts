import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductsModule } from "./modules/products/products.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { DeliveryModule } from "./modules/delivery/delivery.module";
import { AuthModule } from "./modules/auth/auth.module";
import { DriversModule } from "./modules/drivers/drivers.module";
import { UsersModule } from "./modules/users/users.module";
import { AdminModule } from "./modules/admin/admin.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { RewardsModule } from "./modules/rewards/rewards.module";
import { CouponsModule } from "./modules/coupons/coupons.module";
import { GiftCardsModule } from "./modules/gift-cards/gift-cards.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres",
        url: config.get("DATABASE_URL"),
        autoLoadEntities: true,
        synchronize: config.get("NODE_ENV") === "development",
        logging: config.get("NODE_ENV") === "development",
      }),
    }),

    AuthModule,
    UsersModule,
    ProductsModule,
    OrdersModule,
    DeliveryModule,
    DriversModule,
    AdminModule,
    NotificationsModule,
    RewardsModule,
    CouponsModule,
    GiftCardsModule,
  ],
})
export class AppModule {}
