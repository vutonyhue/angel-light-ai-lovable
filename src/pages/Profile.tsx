import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigation } from '@/components/layout/Navigation';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AngelLogo } from '@/components/ui/AngelLogo';
import { EventsSection } from '@/components/profile/EventsSection';
import { toast } from 'sonner';
import { 
  User, 
  Mail, 
  Calendar, 
  Edit2, 
  Save, 
  Loader2,
  CalendarDays,
  Settings
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    if (user) {
      loadProfileData();
    }
  }, [user]);

  const loadProfileData = async () => {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user?.id)
      .maybeSingle();

    if (profileError) {
      console.error('Error loading profile:', profileError);
    } else {
      setProfile(profileData);
      setDisplayName(profileData?.display_name || '');
    }

    setLoading(false);
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('user_id', user?.id);

    if (error) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile updated successfully!');
      setEditing(false);
      setProfile({ ...profile, display_name: displayName });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-divine flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-divine">
      <Navigation />
      
      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Profile Header Card */}
          <div className="relative bg-card rounded-2xl border border-border/50 p-8 shadow-lg mb-6 overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative flex flex-col sm:flex-row items-center gap-6">
              {/* Avatar */}
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border-4 border-primary/30">
                  <User className="w-10 h-10 text-primary" />
                </div>
                <div className="absolute -bottom-1 -right-1">
                  <AngelLogo size="sm" />
                </div>
              </div>

              {/* Name and Email */}
              <div className="text-center sm:text-left flex-1">
                {editing ? (
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <div className="flex gap-2">
                      <Input
                        id="displayName"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your display name"
                      />
                      <Button onClick={handleSaveProfile} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                      <h1 className="text-2xl font-bold">
                        {profile?.display_name || 'User'}
                      </h1>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setEditing(true)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-muted-foreground flex items-center gap-1 justify-center sm:justify-start">
                      <Mail className="h-4 w-4" />
                      {user?.email}
                    </p>
                  </>
                )}
              </div>

              {/* Settings Link */}
              <div className="sm:ml-auto">
                <Link to="/settings">
                  <Button variant="outline" size="icon">
                    <Settings className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Stats Card */}
          <div className="bg-card rounded-xl border border-border/50 p-6 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-secondary/30 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Member Since</p>
                <p className="text-lg font-semibold">
                  {profile?.created_at 
                    ? new Date(profile.created_at).toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric'
                      })
                    : 'Recently'
                  }
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Your journey began
            </p>
          </div>

          {/* My Events Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">My Events</h2>
            </div>
            <EventsSection />
          </div>
        </div>
      </main>
    </div>
  );
}
