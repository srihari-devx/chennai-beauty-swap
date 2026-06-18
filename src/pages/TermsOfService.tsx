import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, ScrollText, Users, ShieldCheck, Package, AlertTriangle,
  CreditCard, Truck, Ban, Scale, Fingerprint, UserX, RefreshCw, Mail,
  ClipboardList, Database, Share2, Lock, Clock, Cookie, UserCheck, Baby
} from "lucide-react";

interface LegalSection {
  id: number;
  title: string;
  icon: React.ComponentType<any>;
  content: string;
}

const termsSections: LegalSection[] = [
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

const privacySections: LegalSection[] = [
  {
    id: 1,
    title: "Introduction",
    icon: ShieldCheck,
    content: `Welcome to Swaptics ("Platform", "we", "us", "our").\n\nYour privacy is important to us. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our platform.\n\nBy using the Platform, you agree to the terms of this Privacy Policy.`,
  },
  {
    id: 2,
    title: "Information We Collect",
    icon: ClipboardList,
    content: `When you use our Platform, we may collect:\n\n• Full name\n• Email address\n• Gender\n• Area of living`,
  },
  {
    id: 3,
    title: "How We Use Your Information",
    icon: Database,
    content: `We use your data to:\n\n• Create and manage your account\n• Resolve disputes and provide support\n• Improve platform functionality and user experience\n• Prevent fraud and ensure safety`,
  },
  {
    id: 4,
    title: "Sharing of Information",
    icon: Share2,
    content: `We do not sell your personal data.\n\nWe do not share your information with any third parties, except:\n\n• Legal Authorities — If required by law or to protect our rights and users.`,
  },
  {
    id: 5,
    title: "Data Storage & Security",
    icon: Lock,
    content: `We take reasonable measures to protect your data, including:\n\n• Encryption of sensitive information\n• Secure servers and access controls\n• Restricted access to personal data\n\nHowever, no system is 100% secure.`,
  },
  {
    id: 6,
    title: "Data Retention",
    icon: Clock,
    content: `We retain your information as long as your account is active.\n\nYou may request deletion of your account (see Section 8).`,
  },
  {
    id: 7,
    title: "Cookies & Tracking",
    icon: Cookie,
    content: `We may use cookies and similar technologies to:\n\n• Improve user experience\n• Analyze usage patterns\n• Remember preferences\n\nYou can control cookies through your browser settings.`,
  },
  {
    id: 8,
    title: "Your Rights",
    icon: UserCheck,
    content: `You have the right to:\n\n• Access your personal data\n• Update or correct information\n• Request account deletion\n• Opt out of marketing communications\n\nTo exercise these rights, contact us at:\n📧 swaptics.beauty.store@gmail.com`,
  },
  {
    id: 9,
    title: "Children's Privacy",
    icon: Baby,
    content: `The Platform is not intended for users under 18 years of age. We do not knowingly collect data from minors.`,
  },
  {
    id: 10,
    title: "Changes to This Policy",
    icon: RefreshCw,
    content: `We may update this Privacy Policy from time to time. Continued use of the Platform means you accept the updated policy.`,
  },
  {
    id: 11,
    title: "Contact Us",
    icon: Mail,
    content: `If you have any questions, contact us:\n\n📧 Email: swaptics.beauty.store@gmail.com`,
  },
];

interface TermsOfServiceProps {
  defaultTab?: "terms" | "privacy";
}

const TermsOfService = ({ defaultTab = "terms" }: TermsOfServiceProps) => {
  const [activeTab, setActiveTab] = useState<"terms" | "privacy">(defaultTab);
  const navigate = useNavigate();

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const handleTabChange = (tab: "terms" | "privacy") => {
    setActiveTab(tab);
    navigate(tab === "terms" ? "/terms" : "/privacy");
  };

  const isTerms = activeTab === "terms";
  const currentSections = isTerms ? termsSections : privacySections;
  const title = isTerms ? "Terms of Service" : "Privacy Policy";
  const subtitle = isTerms
    ? "Please read these terms carefully before using Swaptics. By using our platform, you agree to these terms."
    : "Your privacy matters to us. Learn how Swaptics collects, uses, and protects your personal information.";
  const lastUpdated = isTerms ? "Last updated: April 2026" : "Last updated: June 2026";
  const HeroIcon = isTerms ? ScrollText : ShieldCheck;

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
            <HeroIcon className="w-3.5 h-3.5" />
            Legal Document
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            {title}
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            {subtitle}
          </p>
          <p className="text-xs text-muted-foreground mt-4">
            {lastUpdated}
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 px-4">
        <div className="container max-w-3xl mx-auto">
          {/* Tab Segmented Control */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex p-1 bg-muted border border-border rounded-xl shadow-inner">
              <button
                type="button"
                onClick={() => handleTabChange("terms")}
                className={`px-6 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                  isTerms
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Terms of Service
              </button>
              <button
                type="button"
                onClick={() => handleTabChange("privacy")}
                className={`px-6 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                  !isTerms
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Privacy Policy
              </button>
            </div>
          </div>

          <div key={activeTab} className="space-y-5 animate-fade-in">
            {currentSections.map((section, idx) => {
              const Icon = section.icon;
              return (
                <div
                  key={section.id}
                  className="bg-card rounded-2xl border border-border shadow-card p-6 hover:shadow-beauty transition-all duration-300"
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
          <div className="mt-12 text-center">
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
