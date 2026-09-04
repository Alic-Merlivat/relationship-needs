import type { NextConfig } from "next";

/**
 * Token-bearing paths must not leak their token onward.
 *
 * `no-referrer` stops the full URL — token included — being sent in the
 * Referer header of any outbound request the page makes, and `noindex`
 * keeps a shared or crawled link out of search results.
 */
const TOKEN_ROUTE_HEADERS = [
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  { key: "Cache-Control", value: "private, no-store" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/r/:path*", headers: TOKEN_ROUTE_HEADERS },
      { source: "/invite/:path*", headers: TOKEN_ROUTE_HEADERS },
      { source: "/compare", headers: TOKEN_ROUTE_HEADERS },
    ];
  },
};

export default nextConfig;
