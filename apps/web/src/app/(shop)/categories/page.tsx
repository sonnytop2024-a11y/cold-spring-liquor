import { CategoryShowcase } from "@/components/product/CategoryShowcase";

export const metadata = { title: "Shop by Category — Cold Spring Liquor" };

export default function CategoriesPage() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container-main py-6 sm:py-10">
        <div className="mb-5 sm:mb-7">
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-gray-900">Shop by Category</h1>
          <p className="text-sm text-gray-500 mt-1">Find exactly what you need.</p>
        </div>
        <CategoryShowcase />
      </div>
    </div>
  );
}
