import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, ArrowLeft, ShoppingBag } from "lucide-react";
import { PRODUCT_CATEGORIES } from "@/lib/constants";

interface Chat {
  id: string;
  product_id: string;
  buyer_id: string;
  seller_id: string;
  products?: any;
  buyer_profile?: any;
  seller_profile?: any;
}

interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

const ChatWindow = () => {
  const { chatId } = useParams();
  const { user, profile: myProfile } = useAuth();
  const navigate = useNavigate();
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!chatId || !user) return;

    const loadChat = async () => {
      const { data: chatData } = await supabase
        .from("chats")
        .select("*, products(*)")
        .eq("id", chatId)
        .single();

      if (!chatData) { navigate("/chats"); return; }
      if (chatData.buyer_id !== user.id && chatData.seller_id !== user.id) {
        navigate("/chats"); return;
      }
      setChat(chatData);

      const otherId = chatData.buyer_id === user.id ? chatData.seller_id : chatData.buyer_id;
      const { data: otherProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", otherId)
        .single();
      setOtherUser(otherProfile);

      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });
      setMessages(msgs || []);
    };

    loadChat();

    const channel = supabase
      .channel(`chat-${chatId}`)
      .on("broadcast", { event: "new-message" }, (payload) => {
        setMessages(prev => {
          if (prev.some(m => m.id === payload.payload.id || (m.content === payload.payload.content && m.sender_id === payload.payload.sender_id && Math.abs(new Date(m.created_at).getTime() - new Date(payload.payload.created_at).getTime()) < 5000))) return prev;
          return [...prev, payload.payload as Message];
        });
      })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `chat_id=eq.${chatId}`,
      }, (payload) => {
        setMessages(prev => {
          // deduplicate if we already received it via broadcast or optimistic update
          if (prev.some(m => m.content === payload.new.content && m.sender_id === payload.new.sender_id && Math.abs(new Date(m.created_at).getTime() - new Date(payload.new.created_at).getTime()) < 5000)) {
            return prev;
          }
          return [...prev, payload.new as Message];
        });
      })
      .subscribe();

    channelRef.current = channel;

    return () => { 
      supabase.removeChannel(channel); 
      channelRef.current = null;
    };
  }, [chatId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user || !chatId || !chat) return;
    setSending(true);
    const content = input.trim();
    setInput("");

    // Optimistic update
    const newMessage: Message = {
      id: crypto.randomUUID(),
      chat_id: chatId,
      sender_id: user.id,
      content,
      created_at: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, newMessage]);

    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "new-message",
        payload: newMessage
      });
    }

    supabase.from("messages").insert({ chat_id: chatId, sender_id: user.id, content }).then(() => {});

    // Send notification to the other user
    const recipientId = chat.buyer_id === user.id ? chat.seller_id : chat.buyer_id;
    const senderName = myProfile?.full_name || "Someone";
    supabase.from("notifications").insert({
      user_id: recipientId,
      type: "message",
      title: `New message from ${senderName}`,
      message: content.length > 100 ? content.substring(0, 100) + "..." : content,
      related_id: chatId,
    }).then(() => {}); // fire and forget

    setSending(false);
  };

  if (!chat) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const catInfo = PRODUCT_CATEGORIES.find(c => c.value === chat.products?.category);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button onClick={() => navigate("/chats")} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-9 h-9 rounded-full gradient-cta flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {otherUser?.full_name?.[0]?.toUpperCase() || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">{otherUser?.full_name || "User"}</p>
          <p className="text-xs text-muted-foreground truncate">{otherUser?.area}</p>
        </div>
        {chat.products && (
          <button
            onClick={() => navigate(`/product/${chat.product_id}`)}
            className="flex items-center gap-2 bg-muted rounded-xl px-3 py-1.5 hover:bg-muted/80 transition-colors max-w-[140px]"
          >
            <span className="text-lg">{catInfo?.emoji || "🎀"}</span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{chat.products.name}</p>
              <p className="text-xs text-primary font-semibold">₹{chat.products.selling_price}</p>
            </div>
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-muted-foreground text-sm">Start the conversation!</p>
            <p className="text-xs text-muted-foreground mt-1">Ask about the product condition or arrange to meet.</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                isMe
                  ? "gradient-cta text-white rounded-br-sm"
                  : "bg-card border border-border text-foreground rounded-bl-sm"
              }`}>
                <p>{msg.content}</p>
                <p className={`text-[10px] mt-1 ${isMe ? "text-white/70" : "text-muted-foreground"}`}>
                  {new Date(msg.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="bg-card border-t border-border px-4 py-3 flex gap-2 flex-shrink-0">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-xl border-border bg-background"
          disabled={sending}
        />
        <Button type="submit" disabled={!input.trim() || sending} size="icon" className="gradient-cta border-0 text-primary-foreground rounded-xl w-10 h-10 flex-shrink-0">
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
};

const ChatList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchChats = async () => {
      const { data } = await supabase
        .from("chats")
        .select("*, products(*)")
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (data) {
        const chatsWithProfiles = await Promise.all(
          data.map(async (chat) => {
            const otherId = chat.buyer_id === user.id ? chat.seller_id : chat.buyer_id;
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, area")
              .eq("user_id", otherId)
              .single();
            return { ...chat, other_profile: profile };
          })
        );
        setChats(chatsWithProfiles);
      }
      setLoading(false);
    };
    fetchChats();
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <h1 className="font-display text-2xl font-bold text-foreground mb-6">My Chats</h1>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : chats.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">💬</div>
            <h3 className="font-display text-xl font-semibold text-foreground mb-2">No chats yet</h3>
            <p className="text-muted-foreground text-sm mb-6">Find a product you love and chat with the seller.</p>
            <Button asChild className="gradient-cta border-0 text-primary-foreground rounded-xl">
              <a href="/browse">Browse Products</a>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {chats.map((chat) => {
              const catInfo = PRODUCT_CATEGORIES.find(c => c.value === chat.products?.category);
              return (
                <button
                  key={chat.id}
                  onClick={() => navigate(`/chats/${chat.id}`)}
                  className="w-full flex items-center gap-4 p-4 bg-card rounded-2xl border border-border hover:shadow-card transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center text-2xl flex-shrink-0 border border-border">
                    {catInfo?.emoji || "🎀"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">
                      {chat.other_profile?.full_name || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      Re: {chat.products?.brand} {chat.products?.name}
                    </p>
                    <p className="text-xs text-primary font-medium">₹{chat.products?.selling_price}</p>
                  </div>
                  <div className="text-xs text-muted-foreground flex-shrink-0">
                    {new Date(chat.created_at).toLocaleDateString("en-IN")}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export { ChatList, ChatWindow };
