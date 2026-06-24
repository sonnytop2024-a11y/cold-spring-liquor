import { Controller, Post, Body } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { DeliveryService } from "./delivery.service";

@ApiTags("delivery")
@Controller("delivery")
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Post("check")
  check(@Body() body: { address: string }) {
    return this.deliveryService.checkAvailability(body.address);
  }
}
