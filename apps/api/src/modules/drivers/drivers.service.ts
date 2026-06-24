import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Driver } from "./driver.entity";

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
  ) {}

  async findActive(): Promise<Driver[]> {
    return this.driverRepo.find({ where: { isOnline: true, isActive: true } });
  }

  async updateLocation(driverId: string, lat: number, lng: number): Promise<void> {
    await this.driverRepo.update(driverId, { currentLat: lat, currentLng: lng });
  }

  async setOnlineStatus(driverId: string, isOnline: boolean): Promise<void> {
    await this.driverRepo.update(driverId, { isOnline });
  }

  async findById(id: string): Promise<Driver> {
    const driver = await this.driverRepo.findOne({ where: { id } });
    if (!driver) throw new NotFoundException();
    return driver;
  }

  async findAll(): Promise<Driver[]> {
    return this.driverRepo.find({ where: { isActive: true } });
  }
}
