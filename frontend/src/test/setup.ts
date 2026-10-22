import "@testing-library/jest-dom/vitest";
import { webcrypto } from "node:crypto";

Object.defineProperty(globalThis.crypto, "subtle", { value: webcrypto.subtle, configurable: true });

process.env.NEXT_PUBLIC_API_URL = "http://localhost:8000";
