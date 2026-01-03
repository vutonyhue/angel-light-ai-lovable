import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Music, Sparkles, Plus, Play, Clock, Lock, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getDefaultThumbnail } from "@/lib/defaultThumbnails";

interface MeditationPlaylist {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  is_public: boolean | null;
  created_at: string;
  video_count?: number;
}

export const MeditationPlaylists = () => {
  const [playlists, setPlaylists] = useState<MeditationPlaylist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newPlaylist, setNewPlaylist] = useState({ name: "", description: "", isPublic: true });
  const [creating, setCreating] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchPlaylists();
  }, [user]);

  const fetchPlaylists = async () => {
    setIsLoading(true);
    
    let query = supabase
      .from("meditation_playlists")
      .select("*")
      .order("created_at", { ascending: false });

    // If user is logged in, show their playlists + public ones
    // If not logged in, only show public playlists
    if (!user) {
      query = query.eq("is_public", true);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching playlists:", error);
    } else {
      // Get video counts for each playlist
      const playlistsWithCounts = await Promise.all(
        (data || []).map(async (playlist) => {
          const { count } = await supabase
            .from("meditation_playlist_videos")
            .select("*", { count: "exact", head: true })
            .eq("playlist_id", playlist.id);
          return { ...playlist, video_count: count || 0 };
        })
      );
      setPlaylists(playlistsWithCounts);
    }
    setIsLoading(false);
  };

  const handleCreate = async () => {
    if (!user || !newPlaylist.name.trim()) {
      toast.error("Vui lòng nhập tên playlist");
      return;
    }

    setCreating(true);
    const { error } = await supabase.from("meditation_playlists").insert({
      name: newPlaylist.name.trim(),
      description: newPlaylist.description.trim() || null,
      is_public: newPlaylist.isPublic,
      user_id: user.id,
    });

    if (error) {
      toast.error("Không thể tạo playlist");
      console.error(error);
    } else {
      toast.success("Đã tạo playlist mới");
      setCreateOpen(false);
      setNewPlaylist({ name: "", description: "", isPublic: true });
      fetchPlaylists();
    }
    setCreating(false);
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden animate-pulse">
              <div className="aspect-video bg-muted" />
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Playlist Thiền định</h2>
            <p className="text-sm text-muted-foreground">{playlists.length} playlist</p>
          </div>
        </div>

        {user && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Tạo playlist
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tạo Playlist Thiền định</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Tên playlist</Label>
                  <Input
                    placeholder="Nhập tên playlist..."
                    value={newPlaylist.name}
                    onChange={(e) => setNewPlaylist({ ...newPlaylist, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mô tả</Label>
                  <Textarea
                    placeholder="Mô tả playlist..."
                    value={newPlaylist.description}
                    onChange={(e) => setNewPlaylist({ ...newPlaylist, description: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Công khai</Label>
                    <p className="text-xs text-muted-foreground">
                      Mọi người có thể xem playlist này
                    </p>
                  </div>
                  <Switch
                    checked={newPlaylist.isPublic}
                    onCheckedChange={(checked) => setNewPlaylist({ ...newPlaylist, isPublic: checked })}
                  />
                </div>
                <Button onClick={handleCreate} disabled={creating} className="w-full">
                  {creating ? "Đang tạo..." : "Tạo playlist"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {playlists.length === 0 ? (
        <div className="text-center py-12">
          <Music className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">Chưa có playlist nào</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            {user
              ? "Tạo playlist thiền định đầu tiên của bạn"
              : "Đăng nhập để tạo playlist thiền định của riêng bạn"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {playlists.map((playlist, index) => (
            <motion.div
              key={playlist.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow">
                <div className="relative aspect-video bg-gradient-to-br from-purple-500/20 to-cyan-500/20">
                  {playlist.thumbnail_url ? (
                    <img
                      src={playlist.thumbnail_url}
                      alt={playlist.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music className="w-12 h-12 text-muted-foreground/50" />
                    </div>
                  )}
                  
                  {/* Play overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Play className="w-7 h-7 text-white fill-white" />
                    </div>
                  </div>

                  {/* Visibility badge */}
                  <div className="absolute top-2 right-2">
                    {playlist.is_public ? (
                      <div className="flex items-center gap-1 px-2 py-1 bg-green-500/80 rounded text-xs text-white">
                        <Globe className="w-3 h-3" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/80 rounded text-xs text-white">
                        <Lock className="w-3 h-3" />
                      </div>
                    )}
                  </div>

                  {/* Video count */}
                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded text-xs text-white">
                    {playlist.video_count} video
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-medium line-clamp-1 mb-1">{playlist.name}</h3>
                  {playlist.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {playlist.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};
