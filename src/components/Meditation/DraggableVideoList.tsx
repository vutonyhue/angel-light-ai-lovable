import { useState } from "react";
import { Music, GripVertical, Trash2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDefaultThumbnail } from "@/lib/defaultThumbnails";

interface PlaylistVideo {
  id: string;
  video_id: string;
  position: number;
  video?: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    duration?: number | null;
  };
}

interface DraggableVideoListProps {
  videos: PlaylistVideo[];
  onReorder: (videos: PlaylistVideo[]) => void;
  onRemove?: (videoId: string) => void;
  onPlay?: (videoId: string) => void;
}

const formatDuration = (seconds: number | null | undefined) => {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const DraggableVideoList = ({ 
  videos, 
  onReorder, 
  onRemove,
  onPlay 
}: DraggableVideoListProps) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  if (videos.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Chưa có video nào trong playlist</p>
        <p className="text-sm mt-1">Thêm video để bắt đầu</p>
      </div>
    );
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newVideos = [...videos];
    const [removed] = newVideos.splice(draggedIndex, 1);
    newVideos.splice(index, 0, removed);

    // Update positions
    const updatedVideos = newVideos.map((video, i) => ({
      ...video,
      position: i,
    }));

    onReorder(updatedVideos);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-2">
      {videos.map((video, index) => (
        <div
          key={video.id}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={() => handleDrop(index)}
          onDragEnd={handleDragEnd}
          className={`flex items-center gap-3 p-3 bg-muted/50 rounded-lg transition-all cursor-move group
            ${draggedIndex === index ? "opacity-50 scale-95" : ""}
            ${dragOverIndex === index ? "ring-2 ring-primary" : ""}
          `}
        >
          {/* Drag Handle */}
          <div className="text-muted-foreground hover:text-foreground">
            <GripVertical className="w-5 h-5" />
          </div>

          {/* Position Number */}
          <span className="text-sm text-muted-foreground w-6 text-center">
            {index + 1}
          </span>

          {/* Thumbnail */}
          <div className="relative w-24 h-14 bg-muted rounded overflow-hidden flex-shrink-0">
            {video.video?.thumbnail_url ? (
              <img
                src={video.video.thumbnail_url}
                alt={video.video?.title || "Video"}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            
            {/* Play overlay */}
            {onPlay && (
              <button
                onClick={() => onPlay(video.video_id)}
                className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Play className="w-6 h-6 text-white fill-white" />
              </button>
            )}

            {/* Duration */}
            {video.video?.duration && (
              <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/70 rounded text-[10px] text-white">
                {formatDuration(video.video.duration)}
              </div>
            )}
          </div>

          {/* Title */}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{video.video?.title || "Video"}</p>
          </div>

          {/* Remove Button */}
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(video.video_id);
              }}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
};
