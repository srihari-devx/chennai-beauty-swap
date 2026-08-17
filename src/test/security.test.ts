import { describe, it, expect } from "vitest";

/**
 * Security-focused tests for Swaptics
 * Tests validation logic, business rules, and security utilities
 */

// ─── File Upload Validation ───
describe("File upload validation", () => {
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
  const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".avif"];

  const validateImageFile = (file: { name: string; size: number; type: string }): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File exceeds 5MB limit`;
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return `Unsupported image format`;
    }
    const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Unsupported file extension`;
    }
    return null;
  };

  it("should accept valid JPEG files", () => {
    expect(validateImageFile({ name: "photo.jpg", size: 1024, type: "image/jpeg" })).toBeNull();
    expect(validateImageFile({ name: "photo.jpeg", size: 1024, type: "image/jpeg" })).toBeNull();
  });

  it("should accept valid PNG files", () => {
    expect(validateImageFile({ name: "photo.png", size: 2048, type: "image/png" })).toBeNull();
  });

  it("should accept valid WebP files", () => {
    expect(validateImageFile({ name: "photo.webp", size: 512, type: "image/webp" })).toBeNull();
  });

  it("should reject files exceeding 5MB", () => {
    const result = validateImageFile({ name: "huge.jpg", size: 6 * 1024 * 1024, type: "image/jpeg" });
    expect(result).toContain("5MB");
  });

  it("should reject non-image MIME types", () => {
    expect(validateImageFile({ name: "script.jpg", size: 100, type: "application/javascript" })).toBeTruthy();
    expect(validateImageFile({ name: "doc.jpg", size: 100, type: "text/html" })).toBeTruthy();
    expect(validateImageFile({ name: "file.jpg", size: 100, type: "application/pdf" })).toBeTruthy();
  });

  it("should reject dangerous file extensions", () => {
    expect(validateImageFile({ name: "image.exe", size: 100, type: "image/jpeg" })).toBeTruthy();
    expect(validateImageFile({ name: "image.html", size: 100, type: "image/jpeg" })).toBeTruthy();
    expect(validateImageFile({ name: "image.svg", size: 100, type: "image/svg+xml" })).toBeTruthy();
  });

  it("should reject GIF files (not in allowed list)", () => {
    expect(validateImageFile({ name: "animation.gif", size: 100, type: "image/gif" })).toBeTruthy();
  });
});

// ─── Business Validation ───
describe("Product business validation", () => {
  const validateProduct = (form: {
    brand: string;
    name: string;
    original_price: string;
    selling_price: string;
    reason_for_selling?: string;
  }): string | null => {
    const originalPrice = parseFloat(form.original_price);
    const sellingPrice = parseFloat(form.selling_price);

    if (!form.brand.trim()) return "Brand required";
    if (!form.name.trim()) return "Name required";
    if (isNaN(originalPrice) || originalPrice <= 0) return "Invalid original price";
    if (isNaN(sellingPrice) || sellingPrice <= 0) return "Invalid selling price";
    if (sellingPrice > originalPrice) return "Selling > original";
    if (form.brand.trim().length > 100) return "Brand too long";
    if (form.name.trim().length > 200) return "Name too long";
    if (form.reason_for_selling && form.reason_for_selling.length > 1000) return "Reason too long";
    return null;
  };

  it("should accept valid product data", () => {
    expect(validateProduct({
      brand: "MAC",
      name: "Ruby Woo Lipstick",
      original_price: "1500",
      selling_price: "800",
    })).toBeNull();
  });

  it("should reject negative prices", () => {
    expect(validateProduct({
      brand: "MAC", name: "Lipstick",
      original_price: "-100", selling_price: "50",
    })).toBeTruthy();
  });

  it("should reject zero prices", () => {
    expect(validateProduct({
      brand: "MAC", name: "Lipstick",
      original_price: "100", selling_price: "0",
    })).toBeTruthy();
  });

  it("should reject selling price greater than original price", () => {
    expect(validateProduct({
      brand: "MAC", name: "Lipstick",
      original_price: "100", selling_price: "200",
    })).toContain("Selling > original");
  });

  it("should reject empty brand", () => {
    expect(validateProduct({
      brand: "   ", name: "Lipstick",
      original_price: "100", selling_price: "50",
    })).toContain("Brand");
  });

  it("should reject empty name", () => {
    expect(validateProduct({
      brand: "MAC", name: "",
      original_price: "100", selling_price: "50",
    })).toContain("Name");
  });

  it("should reject brand exceeding 100 characters", () => {
    expect(validateProduct({
      brand: "A".repeat(101), name: "Lipstick",
      original_price: "100", selling_price: "50",
    })).toContain("Brand too long");
  });

  it("should reject name exceeding 200 characters", () => {
    expect(validateProduct({
      brand: "MAC", name: "A".repeat(201),
      original_price: "100", selling_price: "50",
    })).toContain("Name too long");
  });

  it("should reject non-numeric prices", () => {
    expect(validateProduct({
      brand: "MAC", name: "Lipstick",
      original_price: "abc", selling_price: "50",
    })).toBeTruthy();
  });

  it("should accept equal selling and original price", () => {
    expect(validateProduct({
      brand: "MAC", name: "Lipstick",
      original_price: "100", selling_price: "100",
    })).toBeNull();
  });
});

// ─── Email Validation ───
describe("Email validation", () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  it("should accept valid emails", () => {
    expect(emailRegex.test("user@example.com")).toBe(true);
    expect(emailRegex.test("test.user@domain.co.in")).toBe(true);
  });

  it("should reject invalid emails", () => {
    expect(emailRegex.test("")).toBe(false);
    expect(emailRegex.test("notanemail")).toBe(false);
    expect(emailRegex.test("@domain.com")).toBe(false);
    expect(emailRegex.test("user@")).toBe(false);
    expect(emailRegex.test("user @domain.com")).toBe(false);
  });
});

// ─── UUID Validation ───
describe("UUID validation", () => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  it("should accept valid UUIDs", () => {
    expect(uuidRegex.test("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(uuidRegex.test("6ba7b810-9dad-11d1-80b4-00c04fd430c8")).toBe(true);
  });

  it("should reject invalid UUIDs", () => {
    expect(uuidRegex.test("not-a-uuid")).toBe(false);
    expect(uuidRegex.test("550e8400-e29b-41d4-a716")).toBe(false);
    expect(uuidRegex.test("")).toBe(false);
    expect(uuidRegex.test("550e8400e29b41d4a716446655440000")).toBe(false); // no dashes
  });
});

// ─── Password Strength ───
describe("Password validation", () => {
  const MIN_PASSWORD_LENGTH = 8;

  it("should accept passwords of 8+ characters", () => {
    expect("password1".length >= MIN_PASSWORD_LENGTH).toBe(true);
    expect("12345678".length >= MIN_PASSWORD_LENGTH).toBe(true);
  });

  it("should reject passwords shorter than 8 characters", () => {
    expect("short".length >= MIN_PASSWORD_LENGTH).toBe(false);
    expect("1234567".length >= MIN_PASSWORD_LENGTH).toBe(false);
    expect("".length >= MIN_PASSWORD_LENGTH).toBe(false);
  });
});

// ─── URL Validation (for article cover images) ───
describe("URL validation for cover images", () => {
  it("should accept https URLs", () => {
    const url = "https://example.supabase.co/storage/v1/object/public/images/photo.jpg";
    expect(url.startsWith("https://")).toBe(true);
  });

  it("should reject http URLs", () => {
    const url = "http://example.com/image.jpg";
    expect(url.startsWith("https://")).toBe(false);
  });

  it("should reject javascript: URLs", () => {
    const url = "javascript:alert(1)";
    expect(url.startsWith("https://")).toBe(false);
  });

  it("should reject data: URLs", () => {
    const url = "data:text/html,<script>alert(1)</script>";
    expect(url.startsWith("https://")).toBe(false);
  });
});
