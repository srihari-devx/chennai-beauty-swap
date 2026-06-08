import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, ScrollText, Users, ShieldCheck, Package, AlertTriangle,
  CreditCard, Truck, Ban, Scale, Fingerprint, UserX, RefreshCw, Mail
} from "lucide-react";

const sections = [
  {
    id: 1,
    title: "Introduction",
    icon: ScrollText,
    content: `Welcome to Swaptics.\n\nBy accessing or using our Platform, you agree to be bound by these Terms of Service. If you do not agree to these Terms, you must not use the Platform.`,
  },
  {
    id: 2,
    title: "Nature of the Platform",
    icon: ShieldCheck,
    content: `The Platform is an online marketplace that connects buyers and sellers of skincare and personal care products.\n\n• We do not own, manufacture, or directly sell any products listed.\n• We act solely as an intermediary between users.`,
  },
  {
    id: 3,
    title: "User Eligibility",
    icon: Users,
    content: `To use the Platform, you must:\n\n• Be at least 18 years old\n• Provide accurate and complete information\n• Use the Platform only for lawful purposes\n\nWe reserve the right to suspend or terminate accounts at our discretion if these requirements are not met.`,
  },
  {
    id: 4,
    title: "Seller Responsibilities",
    icon: Package,
    content: `By listing products on the Platform, sellers agree that:\n\n• All products must be authentic and legally obtained\n• Product condition must be accurately described\n• Only permitted categories and conditions may be listed\n• Products must not be expired at the time of sale\n• Sellers must comply with all applicable laws and regulations\n\nStrict Prohibitions — Sellers must not:\n\n• Sell counterfeit or fake products\n• Sell contaminated, used beyond allowed limits, or unsafe items\n• Misrepresent product details or condition\n\nViolations may result in:\n• Removal of listings\n• Account suspension\n• Permanent ban from the Platform`,
  },
  {
    id: 5,
    title: "Product Conditions & Hygiene",
    icon: AlertTriangle,
    content: `• Only specific product conditions (e.g., sealed, unused, or limited-use where permitted) are allowed.\n• Certain categories may be restricted to sealed products only.\n• Buyers are responsible for reviewing product details before purchase.\n\n⚠️ The Platform does not guarantee product hygiene, safety, or suitability for individual skin types.`,
  },
  {
    id: 6,
    title: "Buyer Responsibilities",
    icon: Users,
    content: `Buyers agree to:\n\n• Carefully review product descriptions, images, and seller details\n• Use purchased products at their own discretion and risk`,
  },
  {
    id: 7,
    title: "Payments",
    icon: CreditCard,
    content: `• The Platform does not process or guarantee payments between users.\n• Buyers are advised to make payments only after verifying the product and seller.\n• Any financial transaction is solely between the buyer and seller.`,
  },
  {
    id: 8,
    title: "Delivery and Exchange",
    icon: Truck,
    content: `• Buyers and sellers are fully responsible for arranging delivery or exchange.\n• For in-person transactions, users are strongly advised to meet in safe, public locations.\n• The Platform is not responsible for any issues arising during delivery or exchange.`,
  },
  {
    id: 9,
    title: "Prohibited Activities",
    icon: Ban,
    content: `Users must not:\n\n• Engage in fraudulent or illegal activities\n• Provide false or misleading information\n• Attempt to bypass the Platform for transactions\n• Abuse dispute or reporting systems\n• Upload deceptive or inappropriate content`,
  },
  {
    id: 10,
    title: "Limitation of Liability",
    icon: Scale,
    content: `To the maximum extent permitted by law, the Platform shall not be liable for:\n\n• Product quality, authenticity, or effectiveness\n• Allergic reactions, skin issues, or health-related concerns\n• Any indirect, incidental, or consequential damages\n\nAll purchases and product usage are at the buyer's own risk.`,
  },
  {
    id: 11,
    title: "Intellectual Property",
    icon: Fingerprint,
    content: `All content on the Platform, including logos, design, text, and branding, is the property of Swaptics and may not be used without prior written permission.`,
  },
  {
    id: 12,
    title: "Account Suspension and Termination",
    icon: UserX,
    content: `We reserve the right to suspend or terminate accounts for:\n\n• Violation of these Terms\n• Fraudulent or suspicious activity\n• Repeated disputes or misuse of the Platform`,
  },
  {
    id: 13,
    title: "Changes to Terms",
    icon: RefreshCw,
    content: `We may update these Terms at any time without prior notice. Continued use of the Platform after changes are posted constitutes acceptance of the updated Terms.`,
  },
  {
    id: 14,
    title: "Contact Information",
    icon: Mail,
    content: `For questions or concerns regarding these Terms, please contact us at:\n\nswaptics.beauty.store@gmail.com`,
  },
];

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <section className="gradient-hero pt-12 pb-16 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-lavender/60 blur-3xl" />
        </div>
        <div className="container max-w-3xl mx-auto relative z-10 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-card/60 border border-primary/20 rounded-full px-4 py-1.5 text-sm text-primary font-medium mb-6 shadow-sm">
            <ScrollText className="w-3.5 h-3.5" />
            Legal Document
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            Terms of Service
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Please read these terms carefully before using Swaptics.
            By using our platform, you agree to these terms.
          </p>
          <p className="text-xs text-muted-foreground mt-4">
            Last updated: April 2026
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 px-4">
        <div className="container max-w-3xl mx-auto">
          <div className="space-y-5">
            {sections.map((section, idx) => {
              const Icon = section.icon;
              return (
                <div
                  key={section.id}
                  className="bg-card rounded-2xl border border-border shadow-card p-6 hover:shadow-beauty transition-all duration-300 animate-fade-in"
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl gradient-cta flex items-center justify-center shadow-sm">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-display text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                        <span className="text-primary text-sm font-bold">
                          {section.id}.
                        </span>
                        {section.title}
                      </h2>
                      <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                        {section.content}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Back button */}
          <div className="mt-10 text-center">
            <Button
              variant="outline"
              asChild
              className="rounded-xl border-primary/30 hover:bg-primary/5"
            >
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TermsOfService;
