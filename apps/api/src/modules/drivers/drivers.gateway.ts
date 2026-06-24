import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { DriversService } from "./drivers.service";

@WebSocketGateway({ cors: true, namespace: "/tracking" })
export class DriversGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly driversService: DriversService) {}

  handleConnection(client: Socket) {
    const orderId = client.handshake.query.orderId as string;
    if (orderId) client.join(`order:${orderId}`);
  }

  handleDisconnect(_client: Socket) {}

  @SubscribeMessage("driver:location")
  async handleLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { driverId: string; lat: number; lng: number; orderId?: string },
  ) {
    await this.driversService.updateLocation(data.driverId, data.lat, data.lng);

    if (data.orderId) {
      this.server.to(`order:${data.orderId}`).emit("driver:location", {
        lat: data.lat,
        lng: data.lng,
      });
    }
  }
}
