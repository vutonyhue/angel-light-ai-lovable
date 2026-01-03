import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Music, Plus, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Playlist {
  id: string;
  name: string;
  thumbnail_url: string | null;
  hasTrack?: boolean;
}

interface AddToMusicPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackId: string;
  trackTitle: string;
}

export function AddToMusicPlaylistModal({
  isOpen,
  onClose,
  trackId,
  trackTitle,
}: AddToMusicPlaylistModalProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [creating, setCreating] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && user) {
      fetchPlaylists();
    }
  }, [isOpen, user, trackId]);

  const fetchPlaylists = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    // Fetch user's playlists
    const { data: playlistData, error } = await supabase
      .from("playlists")
      .select("id, name, thumbnail_url")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching playlists:", error);
    } else {
      // Check which playlists already have this track
      const playlistsWithStatus = await Promise.all(
        (playlistData || []).map(async (playlist) => {
          const { count } = await supabase
            .from("playlist_videos")
            .select("*", { count: "exact", head: true })
            .eq("playlist_id", playlist.id)
            .eq("video_id", trackId);
          return { ...playlist, hasTrack: (count || 0) > 0 };
        })
      );
      setPlaylists(playlistsWithStatus);
    }
    setIsLoading(false);
  };

  const handleCreatePlaylist = async () => {
    if (!user || !newPlaylistName.trim()) {
      toast.error("Vui lòng nhập tên playlist");
      return;
    }

    setCreating(true);
    const { data, error } = await supabase
      .from("playlists")
      .insert({
        name: newPlaylistName.trim(),
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      toast.error("Không thể tạo playlist");
      console.error(error);
    } else {
      // Add track to new playlist
      await supabase.from("playlist_videos").insert({
        playlist_id: data.id,
        video_id: trackId,
        position: 0,
      });
      
      toast.success(`Đã tạo playlist và thêm "${trackTitle}"`);
      setNewPlaylistName("");
      fetchPlaylists();
    }
    setCreating(false);
  };

  const handleToggleTrack = async (playlist: Playlist) => {
    if (!user) return;

    setAdding(playlist.id);

    if (playlist.hasTrack) {
      // Remove from playlist
      const { error } = await supabase
        .from("playlist_videos")
        .delete()
        .eq("playlist_id", playlist.id)
        .eq("video_id", trackId);

      if (error) {
        toast.error("Không thể xóa khỏi playlist");
      } else {
        toast.success(`Đã xóa khỏi "${playlist.name}"`);
        setPlaylists(playlists.map(p => 
          p.id === playlist.id ? { ...p, hasTrack: false } : p
        ));
      }
    } else {
      // Add to playlist
      const { error } = await supabase.from("playlist_videos").insert({
        playlist_id: playlist.id,
        video_id: trackId,
        position: 0,
      });

      if (error) {
        toast.error("Không thể thêm vào playlist");
      } else {
        toast.success(`Đã thêm vào "${playlist.name}"`);
        setPlaylists(playlists.map(p => 
          p.id === playlist.id ? { ...p, hasTrack: true } : p
        ));
      }
    }
    setAdding(null);
  };

  if (!user) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Music className="w-5 h-5" />
              Thêm vào Playlist
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Vui lòng đăng nhập để thêm vào playlist
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="w-5 h-5" />
            Thêm vào Playlist
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Track being added */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Bài hát:</p>
            <p className="font-medium truncate">{trackTitle}</p>
          </div>

          {/* Create new playlist */}
          <div className="flex gap-2">
            <Input
              placeholder="Tên playlist mới..."
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreatePlaylist()}
            />
            <Button onClick={handleCreatePlaylist} disabled={creating}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>

          {/* Playlists list */}
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg animate-pulse">
                  <div className="w-12 h-12 bg-muted rounded" />
                  <div className="h-4 bg-muted rounded w-32" />
                </div>
              ))}
            </div>
          ) : playlists.length === 0 ? (
            <div className="text-center py-8">
              <Music className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Chưa có playlist nào</p>
              <p className="text-sm text-muted-foreground">Tạo playlist đầu tiên của bạn</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    onClick={() => handleToggleTrack(playlist)}
                    disabled={adding === playlist.id}
                    className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors w-full text-left"
                  >
                    <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                      {playlist.thumbnail_url ? (
                        <img
                          src={playlist.thumbnail_url}
                          alt={playlist.name}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <Music className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <span className="flex-1 font-medium truncate">{playlist.name}</span>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      playlist.hasTrack 
                        ? "bg-primary border-primary text-primary-foreground" 
                        : "border-muted-foreground"
                    }`}>
                      {adding === playlist.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : playlist.hasTrack ? (
                        <Check className="w-3 h-3" />
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
