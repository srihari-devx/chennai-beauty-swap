import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, ShieldCheck, ClipboardList, Database, Share2, Lock,
  Clock, Cookie, UserCheck, Baby, RefreshCw, Mail
} from "lucide-react";

const sections = [
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

const PrivacyPolicy = () => {
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
            <ShieldCheck className="w-3.5 h-3.5" />
            Legal Document
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            Privacy Policy
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Your privacy matters to us. Learn how Swaptics collects,
            uses, and protects your personal information.
          </p>
          <p className="text-xs text-muted-foreground mt-4">
            Last updated: June 2026
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

export default PrivacyPolicy;
