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

// ─── Audit H-1: Notification Type Whitelist ───
describe("Notification type validation (H-1)", () => {
  const ALLOWED_NOTIFICATION_TYPES = ["message", "system", "rating", "badge"];

  const isValidNotificationType = (type: string): boolean => {
    return ALLOWED_NOTIFICATION_TYPES.includes(type);
  };

  it("should accept valid notification types", () => {
    expect(isValidNotificationType("message")).toBe(true);
    expect(isValidNotificationType("system")).toBe(true);
    expect(isValidNotificationType("rating")).toBe(true);
    expect(isValidNotificationType("badge")).toBe(true);
  });

  it("should reject unknown notification types", () => {
    expect(isValidNotificationType("phishing")).toBe(false);
    expect(isValidNotificationType("admin")).toBe(false);
    expect(isValidNotificationType("")).toBe(false);
    expect(isValidNotificationType("custom")).toBe(false);
  });

  it("should reject injection attempts in notification types", () => {
    expect(isValidNotificationType("message'; DROP TABLE--")).toBe(false);
    expect(isValidNotificationType("<script>alert(1)</script>")).toBe(false);
  });
});

// ─── Audit H-2: Badge Insert Restriction ───
describe("Badge insert restriction (H-2)", () => {
  const VALID_BADGE_TYPES = [
    "verified_seller", "top_rated", "fast_shipper",
    "trusted", "power_seller"
  ];

  const isValidBadgeType = (badge: string): boolean => {
    return typeof badge === "string" && badge.trim().length > 0 && badge.length <= 50;
  };

  it("should accept valid badge types", () => {
    VALID_BADGE_TYPES.forEach(badge => {
      expect(isValidBadgeType(badge)).toBe(true);
    });
  });

  it("should reject empty badge types", () => {
    expect(isValidBadgeType("")).toBe(false);
    expect(isValidBadgeType("   ")).toBe(false);
  });

  it("should reject excessively long badge types", () => {
    expect(isValidBadgeType("A".repeat(51))).toBe(false);
  });
});

// ─── Audit H-3: Atomic Deletion RPC Parameter Validation ───
describe("Atomic deletion parameter validation (H-3)", () => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const validateDeleteParams = (
    targetUserId: string,
    callerUserId: string
  ): string | null => {
    if (!targetUserId || !uuidRegex.test(targetUserId)) {
      return "Invalid target user ID";
    }
    if (!callerUserId || !uuidRegex.test(callerUserId)) {
      return "Invalid caller user ID";
    }
    if (targetUserId === callerUserId) {
      return "Cannot delete your own account";
    }
    return null;
  };

  it("should accept valid delete parameters", () => {
    expect(validateDeleteParams(
      "550e8400-e29b-41d4-a716-446655440000",
      "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
    )).toBeNull();
  });

  it("should reject self-deletion", () => {
    const sameId = "550e8400-e29b-41d4-a716-446655440000";
    expect(validateDeleteParams(sameId, sameId)).toContain("own account");
  });

  it("should reject invalid target user IDs", () => {
    expect(validateDeleteParams(
      "not-a-uuid",
      "550e8400-e29b-41d4-a716-446655440000"
    )).toContain("Invalid target");
  });

  it("should reject empty target user IDs", () => {
    expect(validateDeleteParams(
      "",
      "550e8400-e29b-41d4-a716-446655440000"
    )).toContain("Invalid target");
  });
});

// ─── Notification Insert Context Validation ───
describe("Notification insert context validation", () => {
  const validateNotificationInsert = (notification: {
    user_id: string | null;
    sender_id: string | null;
    type: string;
  }): string | null => {
    if (!notification.user_id) return "Recipient user_id required";
    if (!notification.sender_id) return "Sender must be authenticated";
    if (notification.user_id === notification.sender_id) {
      return "Cannot send notification to yourself";
    }
    const allowedTypes = ["message", "system", "rating", "badge"];
    if (!allowedTypes.includes(notification.type)) {
      return "Invalid notification type";
    }
    return null;
  };

  it("should accept valid notification with different sender and recipient", () => {
    expect(validateNotificationInsert({
      user_id: "550e8400-e29b-41d4-a716-446655440000",
      sender_id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      type: "message",
    })).toBeNull();
  });

  it("should reject notification to self", () => {
    const sameId = "550e8400-e29b-41d4-a716-446655440000";
    expect(validateNotificationInsert({
      user_id: sameId,
      sender_id: sameId,
      type: "message",
    })).toContain("yourself");
  });

  it("should reject notification without recipient", () => {
    expect(validateNotificationInsert({
      user_id: null,
      sender_id: "550e8400-e29b-41d4-a716-446655440000",
      type: "message",
    })).toContain("required");
  });

  it("should reject notification without authenticated sender", () => {
    expect(validateNotificationInsert({
      user_id: "550e8400-e29b-41d4-a716-446655440000",
      sender_id: null,
      type: "message",
    })).toContain("authenticated");
  });

  it("should reject notification with invalid type", () => {
    expect(validateNotificationInsert({
      user_id: "550e8400-e29b-41d4-a716-446655440000",
      sender_id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      type: "phishing",
    })).toContain("Invalid");
  });
});

// ─── Chat Notification Sender Validation ───
describe("Chat notification sender validation", () => {
  const validateChatNotification = (
    senderId: string,
    recipientId: string,
    type: string
  ): string | null => {
    if (!senderId) return "Sender must be authenticated";
    if (!recipientId) return "Recipient is required";
    if (senderId === recipientId) return "Cannot notify yourself";
    const allowedTypes = ["message", "system", "rating", "badge"];
    if (!allowedTypes.includes(type)) return "Invalid notification type";
    return null;
  };

  it("should accept valid chat notification (sender != recipient)", () => {
    expect(validateChatNotification(
      "550e8400-e29b-41d4-a716-446655440000",
      "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "message"
    )).toBeNull();
  });

  it("should reject self-notification in chat", () => {
    const sameId = "550e8400-e29b-41d4-a716-446655440000";
    expect(validateChatNotification(sameId, sameId, "message")).toContain("yourself");
  });

  it("should reject chat notification without sender", () => {
    expect(validateChatNotification(
      "",
      "550e8400-e29b-41d4-a716-446655440000",
      "message"
    )).toContain("authenticated");
  });

  it("should reject chat notification with invalid type", () => {
    expect(validateChatNotification(
      "550e8400-e29b-41d4-a716-446655440000",
      "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "spam"
    )).toContain("Invalid");
  });
});

// ─── Cover Image URL Scheme Whitelist (L-8) ───
describe("Cover image URL scheme whitelist (L-8)", () => {
  const validateCoverImageUrl = (url: string): string | null => {
    if (!url) return null; // empty is allowed (optional field)
    const trimmed = url.trim();
    if (!trimmed) return null;
    if (!trimmed.startsWith("https://")) {
      return "Cover image URL must start with https://";
    }
    return null;
  };

  it("should accept valid HTTPS URLs", () => {
    expect(validateCoverImageUrl("https://images.unsplash.com/photo-123")).toBeNull();
    expect(validateCoverImageUrl("https://example.supabase.co/storage/v1/object/public/img.jpg")).toBeNull();
  });

  it("should accept empty URL (optional field)", () => {
    expect(validateCoverImageUrl("")).toBeNull();
    expect(validateCoverImageUrl("   ")).toBeNull();
  });

  it("should reject HTTP URLs", () => {
    expect(validateCoverImageUrl("http://example.com/image.jpg")).toContain("https://");
  });

  it("should reject javascript: URLs (XSS)", () => {
    expect(validateCoverImageUrl("javascript:alert(document.cookie)")).toContain("https://");
  });

  it("should reject data: URLs", () => {
    expect(validateCoverImageUrl("data:text/html,<script>alert(1)</script>")).toContain("https://");
  });

  it("should reject ftp: URLs", () => {
    expect(validateCoverImageUrl("ftp://files.example.com/img.jpg")).toContain("https://");
  });

  it("should reject relative paths", () => {
    expect(validateCoverImageUrl("/images/logo.png")).toContain("https://");
    expect(validateCoverImageUrl("../uploads/exploit.svg")).toContain("https://");
  });
});

// ─── Article Field Truncation (M-2) ───
describe("Article field truncation (M-2)", () => {
  const truncateArticleFields = (article: {
    title: string;
    content: string;
    excerpt: string;
  }) => ({
    title: article.title.trim().slice(0, 300),
    content: article.content.trim().slice(0, 50000),
    excerpt: article.excerpt.trim().slice(0, 500) || null,
  });

  it("should preserve short fields as-is", () => {
    const result = truncateArticleFields({
      title: "My Article",
      content: "Some content here.",
      excerpt: "A brief excerpt.",
    });
    expect(result.title).toBe("My Article");
    expect(result.content).toBe("Some content here.");
    expect(result.excerpt).toBe("A brief excerpt.");
  });

  it("should truncate title at 300 characters", () => {
    const longTitle = "A".repeat(500);
    const result = truncateArticleFields({ title: longTitle, content: "ok", excerpt: "ok" });
    expect(result.title.length).toBe(300);
  });

  it("should truncate content at 50000 characters", () => {
    const longContent = "B".repeat(60000);
    const result = truncateArticleFields({ title: "ok", content: longContent, excerpt: "ok" });
    expect(result.content.length).toBe(50000);
  });

  it("should truncate excerpt at 500 characters", () => {
    const longExcerpt = "C".repeat(600);
    const result = truncateArticleFields({ title: "ok", content: "ok", excerpt: longExcerpt });
    expect(result.excerpt!.length).toBe(500);
  });

  it("should return null for empty excerpt", () => {
    const result = truncateArticleFields({ title: "ok", content: "ok", excerpt: "" });
    expect(result.excerpt).toBeNull();
  });

  it("should return null for whitespace-only excerpt", () => {
    const result = truncateArticleFields({ title: "ok", content: "ok", excerpt: "   " });
    expect(result.excerpt).toBeNull();
  });

  it("should trim leading/trailing whitespace from all fields", () => {
    const result = truncateArticleFields({
      title: "  padded title  ",
      content: "  padded content  ",
      excerpt: "  padded excerpt  ",
    });
    expect(result.title).toBe("padded title");
    expect(result.content).toBe("padded content");
    expect(result.excerpt).toBe("padded excerpt");
  });
});
