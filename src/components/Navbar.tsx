import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Plus, MessageCircle, User, LogOut, LayoutDashboard, Menu, X, Newspaper } from "lucide-react";
import { useState } from "react";
import NotificationBell from "@/components/NotificationBell";

const Navbar = () => {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

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
          <img src="/Swaptics logo 1.png" alt="Swaptics Logo" className="w-10 h-10 rounded-xl object-cover shadow-sm border border-border" />
          <span className="font-display font-semibold text-xl text-foreground group-hover:text-primary transition-colors">
            Swaptics
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
          <Link
            to="/articles"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive("/articles") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            Articles
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
          {user && <NotificationBell />}

          {user && profile && (
            <div className="flex items-center gap-2 px-2">
              <div className="w-7 h-7 rounded-full gradient-cta flex items-center justify-center text-white text-xs font-bold">
                {profile.full_name?.[0]?.toUpperCase()}
              </div>
              <span className="text-sm font-medium text-foreground max-w-[120px] truncate">
                Hi, {profile.full_name?.split(' ')[0]}
              </span>
            </div>
          )}

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
          <Link to="/articles" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Newspaper className="w-4 h-4" /> Articles
          </Link>
          {user ? (
            <>
              {profile && (
                <div className="flex items-center gap-2 px-3 py-2.5 mb-1 border-b border-border">
                  <div className="w-8 h-8 rounded-full gradient-cta flex items-center justify-center text-white text-xs font-bold">
                    {profile.full_name?.[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">Hi, {profile.full_name?.split(' ')[0]}!</p>
                    <p className="text-xs text-muted-foreground truncate">{profile.area}</p>
                  </div>
                </div>
              )}
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
