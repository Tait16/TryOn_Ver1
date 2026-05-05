import TryOnWidget from "@/components/TryOnWidget";

type PageProps = {
  searchParams: {
    shop_ref?: string;
    shop_id?: string;
    product_id?: string;
  };
};

export default function TryOnWidgetPage({ searchParams }: PageProps) {
  const shopRef = searchParams.shop_ref || searchParams.shop_id || "";
  const productId = searchParams.product_id;

  return <TryOnWidget shopRef={shopRef} productId={productId} />;
}
