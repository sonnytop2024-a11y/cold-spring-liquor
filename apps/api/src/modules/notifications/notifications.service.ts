import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import twilio from "twilio";
import type { Order } from "../orders/order.entity";

@Injectable()
export class NotificationsService {
  private twilioClient: twilio.Twilio | null = null;

  constructor(private readonly configService: ConfigService) {
    const sid = configService.get("TWILIO_ACCOUNT_SID");
    const token = configService.get("TWILIO_AUTH_TOKEN");
    if (sid && token) {
      this.twilioClient = twilio(sid, token);
    }
  }

  async sendSms(to: string, body: string): Promise<void> {
    if (!this.twilioClient) return;
    await this.twilioClient.messages.create({
      from: this.configService.get("TWILIO_PHONE_NUMBER"),
      to,
      body,
    });
  }

  async sendOrderConfirmation(order: Order): Promise<void> {
    await this.sendSms(
      "+1XXXXXXXXXX",
      `✅ Order #${order.orderNumber} confirmed! Total: $${order.total}. Track: https://coldspringliquor.com/track/${order.id}`,
    );
  }

  async sendStatusUpdate(order: Order): Promise<void> {
    const messages: Record<string, string> = {
      out_for_delivery: `🚗 Your order #${order.orderNumber} is on the way! ETA: ${order.estimatedDelivery ?? "soon"}.`,
      delivered: `✅ Order #${order.orderNumber} delivered! Enjoy! 🎉`,
    };
    const msg = messages[order.status];
    if (msg) await this.sendSms("+1XXXXXXXXXX", msg);
  }
}
