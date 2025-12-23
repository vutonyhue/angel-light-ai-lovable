import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { UserEventCard } from './UserEventCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarCheck, CalendarX, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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

interface EventRegistration {
  event_id: string;
  events: Event;
}

export function EventsSection() {
  const { user } = useAuth();
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [unregisteringId, setUnregisteringId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadUserEvents();
    }
  }, [user]);

  const loadUserEvents = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('event_registrations')
      .select(`
        event_id,
        events (
          id,
          title,
          description,
          date,
          time,
          address,
          target_date,
          background_image_url,
          creator
        )
      `)
      .eq('user_id', user?.id);

    if (error) {
      console.error('Error loading user events:', error);
      toast.error('Failed to load your events');
    } else if (data) {
      const now = new Date();
      const upcoming: Event[] = [];
      const past: Event[] = [];

      data.forEach((registration: any) => {
        if (registration.events) {
          const eventDate = new Date(registration.events.target_date);
          if (eventDate >= now) {
            upcoming.push(registration.events);
          } else {
            past.push(registration.events);
          }
        }
      });

      // Sort upcoming by date ascending, past by date descending
      upcoming.sort((a, b) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime());
      past.sort((a, b) => new Date(b.target_date).getTime() - new Date(a.target_date).getTime());

      setUpcomingEvents(upcoming);
      setPastEvents(past);
    }

    setLoading(false);
  };

  const handleUnregister = async (eventId: string) => {
    setUnregisteringId(eventId);
    
    const { error } = await supabase
      .from('event_registrations')
      .delete()
      .eq('user_id', user?.id)
      .eq('event_id', eventId);

    if (error) {
      console.error('Error unregistering from event:', error);
      toast.error('Failed to cancel registration');
    } else {
      toast.success('Registration canceled successfully');
      setUpcomingEvents(prev => prev.filter(e => e.id !== eventId));
    }

    setUnregisteringId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border/50 p-6">
      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="upcoming" className="gap-2">
            <CalendarCheck className="h-4 w-4" />
            Upcoming ({upcomingEvents.length})
          </TabsTrigger>
          <TabsTrigger value="past" className="gap-2">
            <CalendarX className="h-4 w-4" />
            Past ({pastEvents.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          {upcomingEvents.length === 0 ? (
            <div className="text-center py-12">
              <CalendarCheck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No upcoming events</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Browse events and register to see them here
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {upcomingEvents.map((event) => (
                <UserEventCard
                  key={event.id}
                  event={event}
                  onUnregister={handleUnregister}
                  isUnregistering={unregisteringId === event.id}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past">
          {pastEvents.length === 0 ? (
            <div className="text-center py-12">
              <CalendarX className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No past events</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Events you've attended will appear here
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {pastEvents.map((event) => (
                <UserEventCard
                  key={event.id}
                  event={event}
                  isPast
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
