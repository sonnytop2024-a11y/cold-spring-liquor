import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Order, OrderStatus } from "./order.entity";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly notificationsService: NotificationsService,
  ) {}

  private generateOrderNumber(): string {
    return `CSL-${Date.now().toString(36).toUpperCase()}`;
  }

  async create(data: Partial<Order>): Promise<Order> {
    const order = this.orderRepo.create({
      ...data,
      orderNumber: this.generateOrderNumber(),
      status: "received",
    });
    const saved = await this.orderRepo.save(order);
    await this.notificationsService.sendOrderConfirmation(saved);
    return saved;
  }

  async findById(id: string): Promise<Order> {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException(`Order not found: ${id}`);
    return order;
  }

  async findByCustomer(customerId: string): Promise<Order[]> {
    return this.orderRepo.find({
      where: { customerId },
      order: { createdAt: "DESC" },
    });
  }

  async updateStatus(id: string, status: OrderStatus, driverId?: string): Promise<Order> {
    const order = await this.findById(id);
    order.status = status;
    if (driverId) order.driverId = driverId;
    if (status === "delivered") order.deliveredAt = new Date();
    const updated = await this.orderRepo.save(order);
    await this.notificationsService.sendStatusUpdate(updated);
    return updated;
  }

  async assignDriver(orderId: string, driverId: string): Promise<Order> {
    return this.updateStatus(orderId, "driver_assigned", driverId);
  }

  async findAll(query: Record<string, string>) {
    const { limit = "20", sort = "createdAt:desc" } = query;
    const [field, direction] = sort.split(":");
    const [orders, total] = await this.orderRepo.findAndCount({
      take: Number(limit),
      order: { [field]: direction.toUpperCase() as "ASC" | "DESC" },
    });
    return { orders, total };
  }
}
