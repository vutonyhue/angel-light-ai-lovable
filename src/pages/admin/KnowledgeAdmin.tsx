import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navigation } from '@/components/layout/Navigation';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2, Upload, ArrowLeft, Search, Filter } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface KnowledgeTopic {
  id: string;
  title: string;
  description: string | null;
  content: string;
  category: string | null;
  icon: string | null;
  keywords: string[] | null;
  priority: number | null;
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

export default function KnowledgeAdmin() {
  const { user } = useAuth();
  const [topics, setTopics] = useState<KnowledgeTopic[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [editingTopic, setEditingTopic] = useState<KnowledgeTopic | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [bulkUploadText, setBulkUploadText] = useState('');
  const [newCategory, setNewCategory] = useState({ name: '', description: '', icon: '✨' });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    category: '',
    icon: '✨',
    keywords: '',
    priority: 5
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    
    const [topicsResult, categoriesResult] = await Promise.all([
      supabase
        .from('knowledge_topics')
        .select('*')
        .order('category', { ascending: true })
        .order('priority', { ascending: false }),
      supabase
        .from('knowledge_categories')
        .select('*')
        .order('sort_order', { ascending: true })
    ]);

    if (topicsResult.error) {
      console.error('Error loading topics:', topicsResult.error);
      toast.error('Failed to load topics');
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
      topic.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || topic.category === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleSaveTopic = async () => {
    const keywordsArray = formData.keywords
      .split(',')
      .map(k => k.trim().toLowerCase())
      .filter(k => k.length > 0);

    const topicData = {
      title: formData.title,
      description: formData.description || null,
      content: formData.content,
      category: formData.category || null,
      icon: formData.icon || '✨',
      keywords: keywordsArray,
      priority: formData.priority
    };

    if (editingTopic) {
      const { error } = await supabase
        .from('knowledge_topics')
        .update(topicData)
        .eq('id', editingTopic.id);

      if (error) {
        toast.error('Failed to update topic');
        console.error(error);
      } else {
        toast.success('Topic updated successfully');
        setIsDialogOpen(false);
        loadData();
      }
    } else {
      const { error } = await supabase
        .from('knowledge_topics')
        .insert(topicData);

      if (error) {
        toast.error('Failed to create topic');
        console.error(error);
      } else {
        toast.success('Topic created successfully');
        setIsDialogOpen(false);
        loadData();
      }
    }
  };

  const handleDeleteTopic = async (id: string) => {
    if (!confirm('Are you sure you want to delete this topic?')) return;

    const { error } = await supabase
      .from('knowledge_topics')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete topic');
      console.error(error);
    } else {
      toast.success('Topic deleted');
      loadData();
    }
  };

  const handleCreateCategory = async () => {
    const slug = newCategory.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    const { error } = await supabase
      .from('knowledge_categories')
      .insert({
        name: newCategory.name,
        slug,
        description: newCategory.description || null,
        icon: newCategory.icon,
        sort_order: categories.length + 1
      });

    if (error) {
      toast.error('Failed to create category');
      console.error(error);
    } else {
      toast.success('Category created');
      setIsCategoryDialogOpen(false);
      setNewCategory({ name: '', description: '', icon: '✨' });
      loadData();
    }
  };

  const handleBulkUpload = async () => {
    try {
      // Parse JSON array of topics
      const topicsToUpload = JSON.parse(bulkUploadText);
      
      if (!Array.isArray(topicsToUpload)) {
        toast.error('Please provide a valid JSON array of topics');
        return;
      }

      const { error } = await supabase
        .from('knowledge_topics')
        .insert(topicsToUpload.map(t => ({
          title: t.title,
          description: t.description || null,
          content: t.content,
          category: t.category || null,
          icon: t.icon || '✨',
          keywords: t.keywords || [],
          priority: t.priority || 5
        })));

      if (error) {
        toast.error('Failed to upload topics');
        console.error(error);
      } else {
        toast.success(`Successfully uploaded ${topicsToUpload.length} topics`);
        setIsBulkUploadOpen(false);
        setBulkUploadText('');
        loadData();
      }
    } catch (e) {
      toast.error('Invalid JSON format');
    }
  };

  const openEditDialog = (topic: KnowledgeTopic) => {
    setEditingTopic(topic);
    setFormData({
      title: topic.title,
      description: topic.description || '',
      content: topic.content,
      category: topic.category || '',
      icon: topic.icon || '✨',
      keywords: topic.keywords?.join(', ') || '',
      priority: topic.priority || 5
    });
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingTopic(null);
    setFormData({
      title: '',
      description: '',
      content: '',
      category: categories[0]?.name || '',
      icon: '✨',
      keywords: '',
      priority: 5
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-divine">
      <Navigation />
      
      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-7xl">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <Link to="/knowledge" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Knowledge Base
              </Link>
              <h1 className="text-3xl font-bold">Knowledge Admin</h1>
              <p className="text-muted-foreground">Manage topics, categories, and content</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    New Category
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Category</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={newCategory.name}
                        onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                        placeholder="Category name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={newCategory.description}
                        onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                        placeholder="Category description"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Icon (emoji)</Label>
                      <Input
                        value={newCategory.icon}
                        onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                        placeholder="✨"
                      />
                    </div>
                    <Button onClick={handleCreateCategory} className="w-full">
                      Create Category
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Bulk Upload
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Bulk Upload Topics</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <p className="text-sm text-muted-foreground">
                      Paste a JSON array of topics. Each topic should have: title, content, category, description (optional), icon (optional), keywords (array, optional), priority (number, optional).
                    </p>
                    <Textarea
                      value={bulkUploadText}
                      onChange={(e) => setBulkUploadText(e.target.value)}
                      placeholder={`[
  {
    "title": "Topic Title",
    "content": "Topic content in markdown...",
    "category": "Divine Mantras",
    "description": "Short description",
    "icon": "🙏",
    "keywords": ["keyword1", "keyword2"],
    "priority": 5
  }
]`}
                      className="min-h-[300px] font-mono text-sm"
                    />
                    <Button onClick={handleBulkUpload} className="w-full">
                      Upload Topics
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Button onClick={openNewDialog}>
                <Plus className="h-4 w-4 mr-2" />
                New Topic
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topics..."
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-card rounded-xl p-4 border border-border/50">
              <p className="text-sm text-muted-foreground">Total Topics</p>
              <p className="text-2xl font-bold">{topics.length}</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border/50">
              <p className="text-sm text-muted-foreground">Categories</p>
              <p className="text-2xl font-bold">{categories.length}</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border/50">
              <p className="text-sm text-muted-foreground">Filtered Results</p>
              <p className="text-2xl font-bold">{filteredTopics.length}</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border/50">
              <p className="text-sm text-muted-foreground">High Priority</p>
              <p className="text-2xl font-bold">{topics.filter(t => (t.priority || 0) >= 8).length}</p>
            </div>
          </div>

          {/* Topics List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-medium">Topic</th>
                      <th className="text-left p-4 font-medium">Category</th>
                      <th className="text-left p-4 font-medium">Priority</th>
                      <th className="text-left p-4 font-medium">Keywords</th>
                      <th className="text-right p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filteredTopics.map((topic) => (
                      <tr key={topic.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{topic.icon || '✨'}</span>
                            <div>
                              <p className="font-medium">{topic.title}</p>
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {topic.description}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs">
                            {topic.category || 'Uncategorized'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`font-medium ${(topic.priority || 0) >= 8 ? 'text-primary' : 'text-muted-foreground'}`}>
                            {topic.priority || 0}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {topic.keywords?.slice(0, 3).map((keyword, i) => (
                              <span key={i} className="px-2 py-0.5 rounded bg-muted text-xs">
                                {keyword}
                              </span>
                            ))}
                            {(topic.keywords?.length || 0) > 3 && (
                              <span className="text-xs text-muted-foreground">
                                +{(topic.keywords?.length || 0) - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(topic)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteTopic(topic.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredTopics.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No topics found</p>
                </div>
              )}
            </div>
          )}

          {/* Edit/Create Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingTopic ? 'Edit Topic' : 'Create New Topic'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Topic title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Icon (emoji)</Label>
                    <Input
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      placeholder="✨"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.name}>
                            {cat.icon} {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority (1-10)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 5 })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Short description"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Keywords (comma-separated)</Label>
                  <Input
                    value={formData.keywords}
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                    placeholder="meditation, healing, peace"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Content (Markdown supported)</Label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Full content in markdown..."
                    rows={12}
                    className="font-mono text-sm"
                  />
                </div>

                <Button onClick={handleSaveTopic} className="w-full">
                  {editingTopic ? 'Update Topic' : 'Create Topic'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
}