/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 크롤링/파싱 라이브러리는 서버에서만 번들링한다.(Next 14)
  experimental: {
    serverComponentsExternalPackages: ["cheerio", "sanitize-html", "rss-parser"],
  },
  eslint: {
    // MVP: 빌드는 린트 에러로 막지 않는다(별도 npm run lint 사용).
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
