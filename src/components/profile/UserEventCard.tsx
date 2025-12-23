import { Calendar, MapPin, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  address: string;
  target_date: string;
  background_image_url: string;
  creator: string;
}

interface UserEventCardProps {
  event: Event;
  isPast?: boolean;
  onUnregister?: (eventId: string) => void;
  isUnregistering?: boolean;
}

export function UserEventCard({ event, isPast = false, onUnregister, isUnregistering }: UserEventCardProps) {
  const eventDate = new Date(event.target_date);
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div 
      className={cn(
        "group relative bg-card rounded-xl border border-border/50 overflow-hidden transition-all hover:shadow-lg",
        isPast && "opacity-75"
      )}
    >
      {/* Background Image */}
      <div className="relative h-32 overflow-hidden">
        <img 
          src={event.background_image_url} 
          alt={event.title}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
        
        {isPast && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-muted/90 rounded-full text-xs font-medium">
            Completed
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2 line-clamp-1">{event.title}</h3>
        
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span>{formattedDate}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span>{event.time}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="line-clamp-1">{event.address}</span>
          </div>

          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span>By {event.creator}</span>
          </div>
        </div>

        {/* Actions */}
        {!isPast && onUnregister && (
          <div className="mt-4 pt-3 border-t border-border/50">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onUnregister(event.id)}
              disabled={isUnregistering}
            >
              {isUnregistering ? 'Canceling...' : 'Cancel Registration'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
