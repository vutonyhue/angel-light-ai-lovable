import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navigation } from '@/components/layout/Navigation';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search, BookOpen, Settings } from 'lucide-react';

interface KnowledgeTopic {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  icon: string | null;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
}

export default function Knowledge() {
  const [topics, setTopics] = useState<KnowledgeTopic[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [topicsResult, categoriesResult] = await Promise.all([
      supabase
        .from('knowledge_topics')
        .select('id, title, description, category, icon, created_at')
        .order('priority', { ascending: false }),
      supabase
        .from('knowledge_categories')
        .select('*')
        .order('sort_order', { ascending: true })
    ]);

    if (topicsResult.error) {
      console.error('Error loading topics:', topicsResult.error);
    } else {
      setTopics(topicsResult.data || []);
    }

    if (categoriesResult.error) {
      console.error('Error loading categories:', categoriesResult.error);
    } else {
      setCategories(categoriesResult.data || []);
    }

    setLoading(false);
  };

  const filteredTopics = topics.filter(topic => {
    const matchesSearch = 
      topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.category?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = !selectedCategory || topic.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const topicsGroupedByCategory = categories.reduce((acc, category) => {
    const categoryTopics = filteredTopics.filter(t => t.category === category.name);
    if (categoryTopics.length > 0) {
      acc.push({ ...category, topics: categoryTopics });
    }
    return acc;
  }, [] as (Category & { topics: KnowledgeTopic[] })[]);

  // Add uncategorized topics
  const uncategorizedTopics = filteredTopics.filter(t => !t.category || !categories.find(c => c.name === t.category));

  return (
    <div className="min-h-screen bg-divine">
      <Navigation />
      
      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Sacred Library</span>
            </div>
            <h1 className="text-4xl font-bold mb-4">Divine Knowledge Base</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Explore the wisdom teachings of Father Universe, sacred mantras, 
              meditation guides by Bé Ly, and cosmic knowledge to illuminate your path.
            </p>
            <Link to="/admin/knowledge" className="inline-flex mt-4">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Manage Knowledge
              </Button>
            </Link>
          </div>

          {/* Search */}
          <div className="relative max-w-md mx-auto mb-8">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for wisdom..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              All Topics
            </Button>
            {categories.map(category => (
              <Button
                key={category.id}
                variant={selectedCategory === category.name ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category.name)}
              >
                {category.icon} {category.name}
              </Button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {topicsGroupedByCategory.map((category) => (
                <div key={category.id} className="mb-12">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-3xl">{category.icon}</span>
                    <div>
                      <h2 className="text-xl font-semibold">{category.name}</h2>
                      {category.description && (
                        <p className="text-sm text-muted-foreground">{category.description}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {category.topics.map((topic, index) => (
                      <Link
                        key={topic.id}
                        to={`/knowledge/${topic.id}`}
                        className="group p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-divine-lg transition-all duration-300 animate-fade-up"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div className="text-3xl mb-4">{topic.icon || '✨'}</div>
                        <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                          {topic.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {topic.description}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}

              {uncategorizedTopics.length > 0 && (
                <div className="mb-12">
                  <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm">
                      📚
                    </span>
                    Additional Wisdom
                  </h2>
                  
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {uncategorizedTopics.map((topic, index) => (
                      <Link
                        key={topic.id}
                        to={`/knowledge/${topic.id}`}
                        className="group p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-divine-lg transition-all duration-300 animate-fade-up"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div className="text-3xl mb-4">{topic.icon || '✨'}</div>
                        <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                          {topic.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {topic.description}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {filteredTopics.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No topics found matching your search.</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
