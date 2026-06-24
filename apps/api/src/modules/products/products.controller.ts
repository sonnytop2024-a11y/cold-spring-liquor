import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags, ApiQuery } from "@nestjs/swagger";
import { ProductsService } from "./products.service";

@ApiTags("products")
@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiQuery({ name: "category", required: false })
  @ApiQuery({ name: "brand", required: false })
  @ApiQuery({ name: "q", required: false })
  @ApiQuery({ name: "featured", required: false })
  @ApiQuery({ name: "sale", required: false })
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({ name: "page", required: false })
  findAll(@Query() query: Record<string, string>) {
    return this.productsService.findAll(query);
  }

  @Get(":slug")
  findOne(@Param("slug") slug: string) {
    return this.productsService.findBySlug(slug);
  }
}
