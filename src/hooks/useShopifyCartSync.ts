import { useEffect } from "react";
import { useShopifyCartStore } from "@/stores/shopifyCartStore";

export function useShopifyCartSync() {
  const syncCart = useShopifyCartStore((s) => s.syncCart);
  useEffect(() => {
    syncCart();
    const handler = () => {
      if (document.visibilityState === "visible") syncCart();
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [syncCart]);
}
