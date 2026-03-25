const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["10.145.34.62", "localhost", "127.0.0.1"],
  turbopack: {
    root: path.resolve(__dirname, "..", ".."),
  },
};

module.exports = nextConfig;
