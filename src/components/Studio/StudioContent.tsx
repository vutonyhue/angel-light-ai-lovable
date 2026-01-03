import { useState, useEffect } from "react";
import { Video, FileVideo, Upload, Edit, Trash2, Eye, ThumbsUp, MoreVertical, Globe, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getDefaultThumbnail } from "@/lib/defaultThumbnails";

interface VideoItem {
  id: string;
  title: string;
  thumbnail_url: string | null;
  view_count: number | null;
  like_count: number | null;
  is_public: boolean | null;
  created_at: string;
  duration: number | null;
}

export const StudioContent = () => {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchUserVideos();
    }
  }, [user]);

  const fetchUserVideos = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    // First get user's channel
    const { data: channel } = await supabase
      .from("channels")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!channel) {
      setIsLoading(false);
      return;
    }

    // Then fetch videos for that channel
    const { data, error } = await supabase
      .from("videos")
      .select("id, title, thumbnail_url, view_count, like_count, is_public, created_at, duration")
      .eq("channel_id", channel.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching videos:", error);
      toast.error("Không thể tải danh sách video");
    } else {
      setVideos(data || []);
    }
    setIsLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    const { error } = await supabase
      .from("videos")
      .delete()
      .eq("id", deleteId);

    if (error) {
      toast.error("Không thể xóa video");
    } else {
      toast.success("Đã xóa video");
      setVideos(videos.filter(v => v.id !== deleteId));
    }
    setDeleteId(null);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatViews = (views: number | null) => {
    if (!views) return "0";
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileVideo className="w-6 h-6 text-primary" />
            Nội dung
          </h2>
        </div>
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileVideo className="w-6 h-6 text-primary" />
          Nội dung ({videos.length} video)
        </h2>
        <Button onClick={() => navigate("/upload")}>
          <Upload className="w-4 h-4 mr-2" />
          Tải video lên
        </Button>
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-12">
          <Video className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">Chưa có video nào</h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-4">
            Bắt đầu chia sẻ nội dung của bạn với mọi người
          </p>
          <Button onClick={() => navigate("/upload")}>
            <Upload className="w-4 h-4 mr-2" />
            Tải video đầu tiên
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((video) => (
            <Card key={video.id} className="overflow-hidden group">
              <div className="relative aspect-video bg-muted">
                <img
                  src={video.thumbnail_url || getDefaultThumbnail(video.id)}
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded text-xs text-white">
                  {formatDuration(video.duration)}
                </div>
                <div className="absolute top-2 left-2">
                  {video.is_public ? (
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-500/80 rounded text-xs text-white">
                      <Globe className="w-3 h-3" />
                      Công khai
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/80 rounded text-xs text-white">
                      <Lock className="w-3 h-3" />
                      Riêng tư
                    </div>
                  )}
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium line-clamp-2 mb-1">{video.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(video.created_at)}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/edit-video/${video.id}`)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Chỉnh sửa
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setDeleteId(video.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Xóa video
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {formatViews(video.view_count)} lượt xem
                  </div>
                  <div className="flex items-center gap-1">
                    <ThumbsUp className="w-3 h-3" />
                    {formatViews(video.like_count)} thích
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa video?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Video sẽ bị xóa vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
