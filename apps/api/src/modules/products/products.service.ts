import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, FindManyOptions, ILike } from "typeorm";
import { Product } from "./product.entity";

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async findAll(query: Record<string, string>) {
    const { category, brand, q, featured, sale, limit = "20", page = "1", minPrice, maxPrice } = query;

    const where: FindManyOptions<Product>["where"] = { isDeleted: false };

    if (category) Object.assign(where, { category });
    if (brand) Object.assign(where, { brand });
    if (featured === "true") Object.assign(where, { featured: true });
    if (q) Object.assign(where, { name: ILike(`%${q}%`) });

    const qb = this.productRepo.createQueryBuilder("p").where("p.isDeleted = false");

    if (category) qb.andWhere("p.category = :category", { category });
    if (brand) qb.andWhere("p.brand ILIKE :brand", { brand: `%${brand}%` });
    if (featured === "true") qb.andWhere("p.featured = true");
    if (sale === "true") qb.andWhere("p.salePrice IS NOT NULL");
    if (q) qb.andWhere("(p.name ILIKE :q OR p.brand ILIKE :q)", { q: `%${q}%` });
    if (minPrice) qb.andWhere("COALESCE(p.salePrice, p.price) >= :minPrice", { minPrice });
    if (maxPrice) qb.andWhere("COALESCE(p.salePrice, p.price) <= :maxPrice", { maxPrice });

    const pageSize = Math.min(Number(limit), 100);
    const pageNum = Math.max(Number(page), 1);
    qb.skip((pageNum - 1) * pageSize).take(pageSize);

    const [products, total] = await qb.getManyAndCount();
    return { products, total, page: pageNum, pageSize };
  }

  async findBySlug(slug: string): Promise<Product> {
    const product = await this.productRepo.findOne({ where: { slug, isDeleted: false } });
    if (!product) throw new NotFoundException(`Product not found: ${slug}`);
    return product;
  }

  async findById(id: string): Promise<Product> {
    const product = await this.productRepo.findOne({ where: { id, isDeleted: false } });
    if (!product) throw new NotFoundException(`Product not found: ${id}`);
    return product;
  }

  async decrementStock(id: string, qty: number): Promise<void> {
    await this.productRepo.decrement({ id }, "stockQty", qty);
    const product = await this.findById(id);
    if (product.stockQty <= 0) {
      await this.productRepo.update(id, { inStock: false, stockQty: 0 });
    }
  }
}
