import { useState, useEffect } from "react";
import { MessageCircle, Send, MoreVertical, Trash2, Heart, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  like_count: number | null;
  parent_id: string | null;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
  replies?: Comment[];
}

interface MusicCommentsProps {
  musicId: string;
  onCommentCountChange?: (count: number) => void;
}

export function MusicComments({ musicId, onCommentCountChange }: MusicCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchComments();
  }, [musicId]);

  const fetchComments = async () => {
    setIsLoading(true);
    
    // Fetch comments for this video/music
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("video_id", musicId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching comments:", error);
    } else {
      // Fetch profiles for each comment
      const commentsWithProfiles = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, avatar_url, username")
            .eq("user_id", comment.user_id)
            .maybeSingle();
          return { ...comment, profile };
        })
      );

      // Organize into parent comments and replies
      const parentComments = commentsWithProfiles.filter(c => !c.parent_id);
      const repliesMap = new Map<string, Comment[]>();
      
      commentsWithProfiles.filter(c => c.parent_id).forEach(reply => {
        const existing = repliesMap.get(reply.parent_id!) || [];
        repliesMap.set(reply.parent_id!, [...existing, reply]);
      });

      const organizedComments = parentComments.map(comment => ({
        ...comment,
        replies: repliesMap.get(comment.id) || [],
      }));

      setComments(organizedComments);
      onCommentCountChange?.(data?.length || 0);
    }
    setIsLoading(false);
  };

  const handleSubmitComment = async (parentId?: string) => {
    const content = parentId ? replyContent : newComment;
    if (!content.trim() || !user) {
      if (!user) toast.error("Vui lòng đăng nhập để bình luận");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("comments").insert({
      content: content.trim(),
      video_id: musicId,
      user_id: user.id,
      parent_id: parentId || null,
    });

    if (error) {
      toast.error("Không thể gửi bình luận");
      console.error(error);
    } else {
      toast.success("Đã gửi bình luận");
      if (parentId) {
        setReplyContent("");
        setReplyingTo(null);
      } else {
        setNewComment("");
      }
      fetchComments();
    }
    setSubmitting(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      toast.error("Không thể xóa bình luận");
    } else {
      toast.success("Đã xóa bình luận");
      fetchComments();
    }
  };

  const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => (
    <div className={`flex gap-3 ${isReply ? "ml-12 mt-3" : ""}`}>
      <Avatar className="w-8 h-8">
        <AvatarImage src={comment.profile?.avatar_url || undefined} />
        <AvatarFallback>
          {(comment.profile?.display_name || comment.profile?.username || "U")[0].toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {comment.profile?.display_name || comment.profile?.username || "Người dùng"}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: vi })}
          </span>
        </div>
        <p className="text-sm mt-1">{comment.content}</p>
        <div className="flex items-center gap-4 mt-2">
          <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <Heart className="w-3 h-3" />
            {comment.like_count || 0}
          </button>
          {!isReply && user && (
            <button
              onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Reply className="w-3 h-3" />
              Trả lời
            </button>
          )}
          {user?.id === comment.user_id && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onClick={() => handleDeleteComment(comment.id)}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Xóa bình luận
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Reply input */}
        {replyingTo === comment.id && (
          <div className="flex gap-2 mt-3">
            <Textarea
              placeholder="Viết trả lời..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              className="min-h-[60px] text-sm"
            />
            <Button
              size="icon"
              onClick={() => handleSubmitComment(comment.id)}
              disabled={submitting || !replyContent.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Replies */}
        {comment.replies?.map((reply) => (
          <CommentItem key={reply.id} comment={reply} isReply />
        ))}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          <div className="h-5 w-24 bg-muted rounded animate-pulse" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-32" />
              <div className="h-4 bg-muted rounded w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Comment Count */}
      <div className="flex items-center gap-2">
        <MessageCircle className="w-5 h-5" />
        <h3 className="text-lg font-semibold">{comments.length} bình luận</h3>
      </div>

      {/* New Comment Input */}
      {user ? (
        <div className="flex gap-3">
          <Avatar className="w-8 h-8">
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <div className="flex-1 flex gap-2">
            <Textarea
              placeholder="Viết bình luận..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[60px]"
            />
            <Button
              size="icon"
              onClick={() => handleSubmitComment()}
              disabled={submitting || !newComment.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          Đăng nhập để bình luận
        </p>
      )}

      {/* Comments List */}
      {comments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Chưa có bình luận nào</p>
          <p className="text-sm">Hãy là người đầu tiên bình luận!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </div>
      )}
    </div>
  );
}
