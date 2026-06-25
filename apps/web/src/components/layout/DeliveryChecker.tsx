"use client";

import { useState, useRef, useEffect } from "react";
import { MapPin, CheckCircle, XCircle, Loader2 } from "lucide-react";

type Status = "idle" | "loading" | "available" | "unavailable";

const SERVED_AREAS = ["Leander", "Cedar Park", "Liberty Hill"];

// Local TX street suggestions — used as fallback when no Google API key
const LOCAL_SUGGESTIONS = [
  "100 S Bagdad Rd, Leander, TX 78641",
  "200 Crystal Falls Pkwy, Leander, TX 78641",
  "500 US-183, Leander, TX 78641",
  "1000 Ronald Reagan Blvd, Cedar Park, TX 78613",
  "820 E Whitestone Blvd, Cedar Park, TX 78613",
  "1890 E Whitestone Blvd, Cedar Park, TX 78613",
  "300 N Bell Blvd, Cedar Park, TX 78613",
  "401 N Bell Blvd, Cedar Park, TX 78613",
  "15609 Ronald Reagan Blvd, Leander, TX 78641",
  "100 Sundance Pkwy, Liberty Hill, TX 78642",
  "200 Loop 332, Liberty Hill, TX 78642",
  "6000 W State Hwy 29, Liberty Hill, TX 78642",
  "2200 Hero Way, Leander, TX 78641",
  "1501 E Whitestone Blvd, Cedar Park, TX 78613",
  "750 Crystal Falls Pkwy, Leander, TX 78641",
  "3900 N Bell Blvd, Cedar Park, TX 78613",
  "900 N Vista Ridge Blvd, Cedar Park, TX 78613",
];

interface PlacesAutocomplete {
  getPlacePredictions: (
    req: { input: string; componentRestrictions: { country: string }; types: string[] },
    cb: (results: Array<{ description: string }> | null) => void
  ) => void;
}

declare global {
  interface Window {
    google?: {
      maps: {
        places: {
          AutocompleteService: new () => PlacesAutocomplete;
        };
      };
    };
  }
}

async function checkDelivery(address: string): Promise<boolean> {
  try {
    const res = await fetch("/api/delivery/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
    });
    const data = await res.json();
    return data.available;
  } catch {
    const lower = address.toLowerCase();
    return SERVED_AREAS.some((city) => lower.includes(city.toLowerCase()));
  }
}

function getSuggestions(input: string): string[] {
  if (input.length < 3) return [];
  const lower = input.toLowerCase();
  return LOCAL_SUGGESTIONS.filter((s) => s.toLowerCase().includes(lower)).slice(0, 6);
}

export function DeliveryChecker() {
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<PlacesAutocomplete | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load Google Places Autocomplete if key available
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!key || window.google?.maps?.places) return;
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    script.async = true;
    document.head.appendChild(script);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function fetchSuggestions(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // Try Google Places first
      if (window.google?.maps?.places) {
        if (!autocompleteRef.current) {
          autocompleteRef.current = new window.google.maps.places.AutocompleteService();
        }
        autocompleteRef.current.getPlacePredictions(
          { input: value, componentRestrictions: { country: "us" }, types: ["address"] },
          (results) => {
            if (results) {
              setSuggestions(results.map((r) => r.description));
              setShowSuggestions(true);
            } else {
              fallbackSuggestions(value);
            }
          }
        );
      } else {
        fallbackSuggestions(value);
      }
    }, 200);
  }

  function fallbackSuggestions(value: string) {
    const s = getSuggestions(value);
    setSuggestions(s);
    setShowSuggestions(s.length > 0);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setAddress(v);
    setActiveIdx(-1);
    setStatus("idle");
    if (v.length >= 3) {
      fetchSuggestions(v);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }

  function selectSuggestion(s: string) {
    setAddress(s);
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveIdx(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      if (activeIdx >= 0 && suggestions[activeIdx]) {
        selectSuggestion(suggestions[activeIdx]);
      } else {
        handleCheck();
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }

  async function handleCheck() {
    const val = address.trim();
    if (!val) return;
    setShowSuggestions(false);
    setStatus("loading");
    const available = await checkDelivery(val);
    setStatus(available ? "available" : "unavailable");
  }

  return (
    <section id="delivery-check" className="bg-gradient-to-r from-green-600 to-green-700 py-10">
      <div className="container-main text-center text-white">
        <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1 text-sm font-semibold mb-3">
          🚚 FREE Delivery — No Tip, No Hidden Fees
        </div>
        <h2 className="font-heading text-2xl md:text-3xl font-bold mb-1">
          Do We Deliver to Your Area?
        </h2>
        <p className="text-green-100 mb-2">
          We serve <strong>Leander</strong>, <strong>Cedar Park</strong>, and{" "}
          <strong>Liberty Hill</strong> within 10 miles of our store
        </p>
        <p className="text-green-200 text-sm mb-6">
          15609 Ronald Reagan Blvd, Leander, TX 78641
        </p>

        <div className="max-w-xl mx-auto" ref={containerRef}>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <MapPin
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10"
              />
              <input
                type="text"
                value={address}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Start typing your address..."
                autoComplete="off"
                className="w-full pl-10 pr-4 py-3 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-white"
              />

              {/* Suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden text-left">
                  {suggestions.map((s, i) => (
                    <li
                      key={s}
                      onMouseDown={() => selectSuggestion(s)}
                      className={`flex items-center gap-2 px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                        i === activeIdx ? "bg-green-50 text-green-800" : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <MapPin size={13} className="text-green-500 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button
              onClick={handleCheck}
              disabled={status === "loading"}
              className="bg-white text-green-700 hover:bg-green-50 disabled:opacity-60 font-bold px-6 py-3 rounded-xl transition-colors flex items-center gap-2 shrink-0"
            >
              {status === "loading" ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                "Check Now"
              )}
            </button>
          </div>
        </div>

        {status === "available" && (
          <div className="mt-5 flex items-center justify-center gap-2 text-white font-semibold text-lg">
            <CheckCircle size={24} className="text-white" />
            <span>Great news — we deliver FREE to your address! 🎉</span>
          </div>
        )}
        {status === "unavailable" && (
          <div className="mt-5 flex flex-col items-center gap-2 text-white">
            <div className="flex items-center gap-2 font-semibold text-lg">
              <XCircle size={24} />
              <span>Outside our current delivery zone</span>
            </div>
            <p className="text-green-100 text-sm">
              We currently serve Leander, Cedar Park, and Liberty Hill within 10 miles of our store.
            </p>
          </div>
        )}

        {/* Area pills */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {SERVED_AREAS.map((city) => (
            <button
              key={city}
              onClick={() => {
                setAddress(`${city}, TX`);
                setStatus("idle");
              }}
              className="bg-white/20 border border-white/30 hover:bg-white/30 text-white text-sm font-medium px-4 py-1.5 rounded-full transition-colors"
            >
              ✓ {city}, TX
            </button>
          ))}
        </div>
        <p className="text-green-200 text-xs mt-3">
          Click a city above or start typing your address for suggestions
        </p>
      </div>
    </section>
  );
}
