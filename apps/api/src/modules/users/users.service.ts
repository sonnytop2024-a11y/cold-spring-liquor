import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./user.entity";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findByFirebaseUid(firebaseUid: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { firebaseUid } });
    if (!user) throw new NotFoundException();
    return user;
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException();
    return user;
  }

  async create(data: Partial<User>): Promise<User> {
    return this.userRepo.save(this.userRepo.create(data));
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    await this.userRepo.update(id, data);
    return this.findById(id);
  }
}
