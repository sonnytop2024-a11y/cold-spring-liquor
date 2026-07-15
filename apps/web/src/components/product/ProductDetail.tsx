"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useState, useCallback, useRef } from "react";
import { ShoppingCart, Zap, Star, Gift, Minus, Plus, Upload, MessageSquarePlus, ShieldCheck, RefreshCw, Trash2, Check } from "lucide-react";
import { fetchProductBySlug } from "@/lib/api/products";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { formatCurrency } from "@/lib/utils";
import { categoryPlaceholder } from "@/lib/categoryPlaceholder";

function useBtnPop(): [boolean, () => void] {
  const [popping, setPopping] = useState(false);
  const trigger = useCallback(() => {
    setPopping(true);
    setTimeout(() => setPopping(false), 420);
  }, []);
  return [popping, trigger];
}

export function ProductDetail({ slug }: { slug: string }) {
  const [qty, setQty] = useState(1);
  const [cartPop, triggerCart] = useBtnPop();
  const [buyPop, triggerBuy] = useBtnPop();
  const [imgError, setImgError] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const { user, isLoggedIn } = useAuthStore();

  // ── Missing Product Image Assistance ──────────────────────────────────────
  const [refPhotoUrl, setRefPhotoUrl] = useState<string | null>(null);
  const [refPhotoPreview, setRefPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [verificationNote, setVerificationNote] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setUploadError("Only JPG, PNG, or WEBP files are allowed.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setUploadError("File too large. Maximum size is 8 MB.");
      return;
    }
    setUploadError("");
    setRefPhotoPreview(URL.createObjectURL(file));
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/upload/verification-photo", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed. Please try again.");
      setRefPhotoUrl(data.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      setRefPhotoPreview(null);
    } finally {
      setUploadingPhoto(false);
    }
  }

  function removeRefPhoto() {
    setRefPhotoUrl(null);
    setRefPhotoPreview(null);
    setUploadError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => fetchProductBySlug(slug),
  });

  // Check active flash deals — if this product has one, use its salePrice
  const { data: flashDeals } = useQuery({
    queryKey: ["flash-deals"],
    queryFn: () => fetch("/api/deals/flash").then(r => r.ok ? r.json() : []),
    staleTime: 60_000,
  });
  const flashDeal = product && Array.isArray(flashDeals)
    ? flashDeals.find((d: { slug: string; salePrice: number }) => d.slug === product.slug)
    : null;
  const effectiveProduct = flashDeal
    ? { ...product!, salePrice: flashDeal.salePrice }
    : product;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-pulse">
        <div className="bg-gray-100 rounded-2xl h-[480px]" />
        <div className="space-y-4">
          <div className="h-6 bg-gray-100 rounded w-1/3" />
          <div className="h-10 bg-gray-100 rounded w-2/3" />
          <div className="h-4 bg-gray-100 rounded w-1/4" />
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return <div className="text-center py-20 text-gray-500">Product not found.</div>;
  }

  const discountPct = effectiveProduct!.salePrice
    ? Math.round(((effectiveProduct!.price - effectiveProduct!.salePrice) / effectiveProduct!.price) * 100)
    : 0;

  // Reward / promo info for the bottom badge
  const hasPoints = isLoggedIn && user && user.points > 0;
  const rewardLine = hasPoints
    ? `You have ${user!.points.toLocaleString()} reward points · Use at checkout`
    : "Promo codes & rewards available at checkout";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
      {/* Image */}
      <div className="relative">
        <div className="bg-gray-50 rounded-2xl overflow-hidden aspect-square flex items-center justify-center relative">
          {product.imageUrl && !imgError ? (
            <>
              <Image
                src={product.imageUrl}
                alt={product.name}
                width={480}
                height={480}
                priority
                className="object-cover rounded-2xl w-full h-full"
                onError={() => setImgError(true)}
              />
              {/* Decorative champagne bottle — bottom-right corner, subtle watermark */}
              <div className="absolute bottom-3 right-3 opacity-10 pointer-events-none select-none hidden sm:block">
                <svg width="56" height="120" viewBox="0 0 46 96" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="17" y="1" width="12" height="12" rx="3" fill="#b8962e"/>
                  <rect x="19" y="13" width="8" height="28" rx="2" fill="#1a4a2e"/>
                  <path d="M19 41 Q10 50 9 58 L37 58 Q36 50 27 41 Z" fill="#1a4a2e"/>
                  <rect x="9" y="58" width="28" height="34" rx="4" fill="#1a4a2e"/>
                  <rect x="9" y="90" width="28" height="3" rx="1.5" fill="#0d2518"/>
                </svg>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-white rounded-2xl">
              {/* Category illustration placeholder — replaced automatically once a real photo is uploaded */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={categoryPlaceholder(product.category)}
                alt={product.name}
                className="w-[58%] h-[58%] object-contain"
              />
            </div>
          )}
        </div>
        {discountPct > 0 && (
          <span className="absolute top-4 left-4 bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">
            -{discountPct}% OFF
          </span>
        )}
      </div>

      {/* Info */}
      <div className="relative">
        {/* Decorative champagne bottle — top-right of info panel */}
        <div className="absolute -top-2 right-0 opacity-[0.06] pointer-events-none select-none hidden lg:block">
          <svg width="80" height="170" viewBox="0 0 46 96" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="17" y="1" width="12" height="12" rx="3" fill="#b8962e"/>
            <rect x="17" y="1" width="5" height="12" rx="1.5" fill="#d4af37" opacity="0.7"/>
            <line x1="17" y1="4" x2="29" y2="4" stroke="#d4af37" strokeWidth="0.8" opacity="0.9"/>
            <line x1="17" y1="7" x2="29" y2="7" stroke="#d4af37" strokeWidth="0.8" opacity="0.7"/>
            <rect x="19" y="13" width="8" height="28" rx="2" fill="#1a3a22"/>
            <rect x="19" y="13" width="3" height="28" rx="1" fill="white" opacity="0.08"/>
            <path d="M19 41 Q10 50 9 58 L37 58 Q36 50 27 41 Z" fill="#1a3a22"/>
            <rect x="9" y="58" width="28" height="34" rx="4" fill="#1a3a22"/>
            <rect x="12" y="63" width="22" height="22" rx="2" fill="#f5f0dc" opacity="0.9"/>
            <rect x="12" y="63" width="22" height="4" rx="1.5" fill="#d4af37" opacity="0.9"/>
            <rect x="9" y="90" width="28" height="3" rx="1.5" fill="#0a1f10"/>
          </svg>
        </div>

        <p className="text-sm font-medium text-brand-600 uppercase tracking-wide mb-1">
          {product.category} · {product.brand}
        </p>
        <h1 className="font-product text-3xl font-bold mb-3">{product.name}</h1>

        {(product.rating ?? 0) > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  className={
                    i < Math.round(product.rating ?? 0)
                      ? "fill-amber-400 text-amber-400"
                      : "text-gray-200"
                  }
                />
              ))}
            </div>
            <span className="text-sm text-gray-600">
              {(product.rating ?? 0).toFixed(1)} ({product.reviewCount ?? 0} reviews)
            </span>
          </div>
        )}

        <div className="flex items-baseline gap-3 mb-2">
          <span className="font-product text-4xl font-black">
            {formatCurrency(effectiveProduct!.salePrice ?? effectiveProduct!.price)}
          </span>
          {effectiveProduct!.salePrice && (
            <span className="font-product text-xl text-gray-400 line-through">
              {formatCurrency(effectiveProduct!.price)}
            </span>
          )}
        </div>

        {/* Pills: abv only */}
        <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-6">
          {product.abv > 0 && (
            <span className="bg-gray-100 px-3 py-1 rounded-full">{product.abv}% ABV</span>
          )}
          {!product.inStock && (
            <span className="px-3 py-1 rounded-full font-medium bg-red-100 text-red-600">
              Out of Stock
            </span>
          )}
          {product.pickupOnly && (
            <span className="px-3 py-1 rounded-full font-medium bg-blue-100 text-blue-700">
              🏬 Pickup Only
            </span>
          )}
        </div>

        {product.description && (
          <p className="text-gray-600 leading-relaxed mb-6">{product.description}</p>
        )}

        {product.inStock && (
          <>
            {/* Quantity */}
            <div className="flex items-center gap-4 mb-4">
              <span className="text-sm font-medium text-gray-700">Quantity</span>
              <div className="flex items-center border rounded-lg overflow-hidden">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="px-3 py-2 hover:bg-gray-50 transition-colors"
                >
                  <Minus size={16} />
                </button>
                <span className="px-4 py-2 font-semibold min-w-[3rem] text-center">
                  {qty}
                </span>
                <button
                  onClick={() => setQty((q) => Math.min(effectiveProduct!.stockQty, q + 1))}
                  disabled={qty >= effectiveProduct!.stockQty}
                  className="px-3 py-2 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                  <Plus size={16} />
                </button>
              </div>
              {qty >= effectiveProduct!.stockQty && (
                <span className="text-xs text-amber-600 font-medium">Only {effectiveProduct!.stockQty} left in stock</span>
              )}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => { triggerCart(); addItem(effectiveProduct!, qty, { referenceImageUrl: refPhotoUrl ?? undefined, verificationNote: verificationNote.trim() || undefined }); }}
                className={`flex-1 flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold px-6 py-3.5 rounded-xl transition-all ${cartPop ? "scale-95 shadow-[0_0_20px_4px_rgba(249,115,22,0.45)]" : "shadow-none"}`}
                style={{ transition: "transform 0.15s cubic-bezier(.36,.07,.19,.97), box-shadow 0.25s ease" }}
              >
                <ShoppingCart size={18} className={cartPop ? "animate-bounce" : ""} />
                Add to Cart
              </button>
              <button
                onClick={() => { triggerBuy(); addItem(effectiveProduct!, qty, { referenceImageUrl: refPhotoUrl ?? undefined, verificationNote: verificationNote.trim() || undefined }); window.location.href = "/checkout"; }}
                className={`flex-1 flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold px-6 py-3.5 rounded-xl transition-all ${buyPop ? "scale-95 shadow-[0_0_20px_4px_rgba(255,255,255,0.18)]" : "shadow-none"}`}
                style={{ transition: "transform 0.15s cubic-bezier(.36,.07,.19,.97), box-shadow 0.25s ease" }}
              >
                <Zap size={18} className={buyPop ? "animate-pulse" : ""} />
                Buy Now
              </button>
            </div>

            {/* Missing Product Image Assistance — only for products with no photo */}
            {(!product.imageUrl || imgError) && (
              <div className="relative mt-4 rounded-[20px] border-[1.5px] border-brand-200 bg-gradient-to-b from-brand-50 to-white p-5">
                <div className="flex gap-3 mb-4">
                  <div className="shrink-0 w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center">
                    <ShieldCheck size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-gray-900 mb-0.5">Help us get the right product for you</p>
                    <p className="text-[13px] text-gray-500 leading-snug">
                      This product doesn&apos;t have a photo yet. Upload a picture or add a note so we can make sure you receive the exact product you want.
                    </p>
                  </div>
                </div>

                <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3.5">
                  <span className="hidden sm:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white border border-gray-200 items-center justify-center text-[10px] font-bold text-gray-400">
                    OR
                  </span>

                  <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center flex flex-col items-center gap-1.5">
                    <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center">
                      <Upload size={18} />
                    </div>
                    <p className="text-sm font-bold text-gray-800">Upload a Photo</p>
                    <p className="text-xs text-gray-400 leading-snug">Share a clear photo of the bottle or label.</p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="mt-1 w-full flex items-center justify-center gap-1.5 border-[1.5px] border-brand-500 text-brand-600 hover:bg-brand-50 rounded-lg py-2 text-xs font-bold transition-colors disabled:opacity-60"
                    >
                      <Upload size={13} /> {uploadingPhoto ? "Uploading…" : "Upload Photo"}
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={handlePhotoSelected} />
                  </div>

                  <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center flex flex-col items-center gap-1.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                      <MessageSquarePlus size={18} />
                    </div>
                    <p className="text-sm font-bold text-gray-800">Add a Note</p>
                    <p className="text-xs text-gray-400 leading-snug">Tell us the flavor, size, or packaging.</p>
                    <button
                      type="button"
                      onClick={() => setNoteOpen(true)}
                      className="mt-1 w-full flex items-center justify-center gap-1.5 border-[1.5px] border-blue-700 text-blue-700 hover:bg-blue-50 rounded-lg py-2 text-xs font-bold transition-colors"
                    >
                      <MessageSquarePlus size={13} /> {verificationNote ? "Edit Note" : "Add Note"}
                    </button>
                  </div>
                </div>

                {uploadError && (
                  <p className="text-xs text-red-600 font-medium mb-3">{uploadError}</p>
                )}

                {refPhotoPreview && (
                  <div className="bg-white border border-green-200 rounded-2xl p-3 flex items-center gap-3 mb-3.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={refPhotoPreview} alt="Uploaded reference" className="w-14 h-14 rounded-lg object-cover shrink-0 bg-gray-100" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-800 truncate">Reference photo</p>
                      {uploadingPhoto ? (
                        <p className="text-[11px] text-gray-400 font-semibold">Uploading…</p>
                      ) : refPhotoUrl ? (
                        <p className="text-[11px] text-green-600 font-bold flex items-center gap-1"><Check size={11} /> Photo attached</p>
                      ) : null}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button type="button" onClick={() => fileInputRef.current?.click()} title="Replace photo"
                        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
                        <RefreshCw size={13} />
                      </button>
                      <button type="button" onClick={removeRefPhoto} title="Remove photo"
                        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )}

                {noteOpen && (
                  <div className="bg-white border border-gray-200 rounded-2xl p-3.5 mb-3.5">
                    <textarea
                      value={verificationNote}
                      onChange={(e) => setVerificationNote(e.target.value.slice(0, 500))}
                      maxLength={500}
                      autoFocus
                      placeholder='e.g. "Green bottle, 750mL, the one with the gold label"'
                      className="w-full min-h-[64px] text-sm text-gray-800 placeholder:text-gray-400 outline-none resize-none"
                    />
                    <div className="flex items-center justify-between mt-1.5 pt-2 border-t border-gray-100">
                      <span className="text-[11px] text-gray-400 tabular-nums">{verificationNote.length}/500</span>
                      <button type="button" onClick={() => setNoteOpen(false)} className="text-xs font-bold text-brand-600">Done</button>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2 text-xs text-gray-500 leading-snug">
                  <ShieldCheck size={14} className="text-brand-600 shrink-0 mt-0.5" />
                  We&apos;ll review your photo and note before preparing your order, to make sure you receive the correct product.
                </div>
              </div>
            )}
          </>
        )}

        {/* Reward / promo badge — replaces old delivery info */}
        <div className="mt-6 flex items-center gap-3 bg-brand-50 rounded-xl p-4">
          <Gift size={20} className="text-brand-600 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-brand-700">10–30 Minute Delivery</p>
            <p className="text-brand-600">{rewardLine}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
