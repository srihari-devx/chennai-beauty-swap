import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  related_id: string | null;
  created_at: string;
}

// Request browser notification permission
const requestNotificationPermission = async () => {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
};

// Show a browser push notification
const showBrowserNotification = (notif: Notification) => {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    const notification = new window.Notification(notif.title, {
      body: notif.message,
      icon: "/favicon.ico",
      tag: notif.id, // prevents duplicate popups
      silent: false,
    });
    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000);
  } catch {
    // Fallback: some mobile browsers don't support constructor
  }
};

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    const items = (data || []) as Notification[];
    setNotifications(items);
    setUnreadCount(items.filter(n => !n.is_read).length);
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    if (!user) return;

    // Request push notification permission
    requestNotificationPermission();

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications(prev => [newNotif, ...prev].slice(0, 20));
          setUnreadCount(prev => prev + 1);

          // In-app toast notification
          if (newNotif.type === "message") {
            toast(newNotif.title, {
              description: newNotif.message,
              action: {
                label: "View",
                onClick: () => {
                  if (newNotif.related_id) {
                    window.location.href = `/chats/${newNotif.related_id}`;
                  }
                }
              }
            });
          } else {
            toast.info(newNotif.title, { description: newNotif.message });
          }

          // Trigger browser push notification
          showBrowserNotification(newNotif);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchNotifications]);

  const markAsRead = async (id: string) => {
    // @ts-ignore — custom RPC not in generated types
    await supabase.rpc("fn_mark_notification_read", { p_user_id: user?.id, p_notification_id: id });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    // @ts-ignore — custom RPC not in generated types
    await supabase.rpc("fn_mark_all_notifications_read", { p_user_id: user.id });
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  return { notifications, unreadCount, markAsRead, markAllAsRead, refetch: fetchNotifications };
};

