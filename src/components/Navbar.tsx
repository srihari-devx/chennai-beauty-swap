import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Plus, MessageCircle, User, LogOut, LayoutDashboard, Menu, X, Palette } from "lucide-react";
import { useState } from "react";
import NotificationBell from "@/components/NotificationBell";
import { useTheme } from "@/contexts/ThemeContext";

const Navbar = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
    setMenuOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-full gradient-cta flex items-center justify-center shadow-sm">
            <span className="text-white text-sm">✿</span>
          </div>
          <span className="font-display font-semibold text-lg text-foreground hidden sm:block">
            Chennai Beauty Swap
          </span>
          <span className="font-display font-semibold text-lg text-foreground sm:hidden">
            CBS
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            to="/browse"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive("/browse") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            Browse
          </Link>
          {user && (
            <>
              <Link
                to="/sell"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive("/sell") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                Sell
              </Link>
              <Link
                to="/chats"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive("/chats") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                Chats
              </Link>
              <Link
                to="/dashboard"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive("/dashboard") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                Dashboard
              </Link>
              {isAdmin && (
                <Link
                  to="/cbs-admin"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive("/cbs-admin") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  Admin
                </Link>
              )}
            </>
          )}
        </nav>

        {/* Right side */}
        <div className="hidden md:flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={() => setTheme(theme === "pink" ? "blue" : "pink")}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title={`Switch to ${theme === "pink" ? "blue" : "pink"} theme`}
          >
            <Palette className="w-4 h-4" />
          </button>

          {user && <NotificationBell />}

          {user ? (
            <>
              <Button size="sm" asChild className="gradient-cta text-primary-foreground border-0 shadow-sm">
                <Link to="/sell">
                  <Plus className="w-4 h-4" />
                  Sell Now
                </Link>
              </Button>
              <Button size="sm" variant="ghost" onClick={handleSignOut} className="text-muted-foreground">
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </>
          ) : (
            <Button size="sm" asChild className="gradient-cta text-primary-foreground border-0">
              <Link to="/auth">Sign In</Link>
            </Button>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <div className="md:hidden flex items-center gap-1">
          {user && <NotificationBell />}
          <button
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-border bg-card/95 backdrop-blur-md px-4 py-3 space-y-1">
          <Link to="/browse" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <ShoppingBag className="w-4 h-4" /> Browse Products
          </Link>
          {user ? (
            <>
              <Link to="/sell" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <Plus className="w-4 h-4" /> Sell Product
              </Link>
              <Link to="/chats" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <MessageCircle className="w-4 h-4" /> My Chats
              </Link>
              <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <User className="w-4 h-4" /> Dashboard
              </Link>
              {isAdmin && (
                <Link to="/cbs-admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <LayoutDashboard className="w-4 h-4" /> Admin
                </Link>
              )}
              <button
                onClick={() => { setTheme(theme === "pink" ? "blue" : "pink"); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Palette className="w-4 h-4" /> Switch to {theme === "pink" ? "Blue" : "Pink"} Theme
              </button>
              <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2 pt-2">
              <Button asChild className="w-full gradient-cta border-0 text-primary-foreground">
                <Link to="/auth" onClick={() => setMenuOpen(false)}>Sign In</Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
