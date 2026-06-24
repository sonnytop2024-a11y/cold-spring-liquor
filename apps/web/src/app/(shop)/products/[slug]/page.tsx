import { ProductDetail } from "@/components/product/ProductDetail";
import { RelatedProducts } from "@/components/product/RelatedProducts";

export default function ProductDetailPage({ params }: { params: { slug: string } }) {
  return (
    <div className="container-main py-8">
      <ProductDetail slug={params.slug} />
      <RelatedProducts slug={params.slug} />
    </div>
  );
}
