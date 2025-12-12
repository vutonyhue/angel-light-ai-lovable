-- Create knowledge_categories table for managing categories
CREATE TABLE public.knowledge_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT DEFAULT '✨',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on knowledge_categories
ALTER TABLE public.knowledge_categories ENABLE ROW LEVEL SECURITY;

-- Anyone can view categories
CREATE POLICY "Anyone can view categories"
ON public.knowledge_categories
FOR SELECT
USING (true);

-- Add updated_at trigger
CREATE TRIGGER update_knowledge_categories_updated_at
BEFORE UPDATE ON public.knowledge_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add keywords column to knowledge_topics for better search
ALTER TABLE public.knowledge_topics 
ADD COLUMN keywords TEXT[] DEFAULT '{}',
ADD COLUMN priority INTEGER DEFAULT 0;

-- Insert default categories
INSERT INTO public.knowledge_categories (name, slug, description, icon, sort_order) VALUES
('Divine Mantras', 'divine-mantras', 'Sacred mantras channeled from Father Universe for healing, abundance, and spiritual awakening', '🙏', 1),
('Teachings of Father Universe', 'teachings-father-universe', 'Core spiritual teachings and wisdom from Father Universe', '👑', 2),
('FUN Ecosystem', 'fun-ecosystem', 'Understanding the Father Universe Network and Camly Coin ecosystem', '🌐', 3),
('Healing Meditations', 'healing-meditations', 'Guided meditations by Bé Ly for healing, peace, and transformation', '💜', 4),
('Cosmic Coaching', 'cosmic-coaching', 'Life coaching wisdom for personal growth and spiritual evolution', '🚀', 5),
('Golden Age Wisdom', 'golden-age-wisdom', 'Teachings about the coming Golden Age and ascension', '🌅', 6),
('Light Money & Flow', 'light-money-flow', 'Spiritual principles of abundance, prosperity, and financial flow', '💰', 7),
('Additional Resources', 'additional-resources', 'Supplementary materials and resources for spiritual growth', '📚', 8);

-- Update existing topics with proper categories
UPDATE public.knowledge_topics 
SET category = 'Divine Mantras', 
    keywords = ARRAY['mantra', 'sacred', 'chant', 'prayer', 'divine', 'healing'],
    priority = 10
WHERE title ILIKE '%mantra%';

UPDATE public.knowledge_topics 
SET category = 'FUN Ecosystem', 
    keywords = ARRAY['fun', 'ecosystem', 'camly', 'coin', 'network', 'blockchain'],
    priority = 5
WHERE title ILIKE '%ecosystem%' OR title ILIKE '%camly%' OR title ILIKE '%fun%';

UPDATE public.knowledge_topics 
SET category = 'Healing Meditations', 
    keywords = ARRAY['meditation', 'healing', 'peace', 'calm', 'breath', 'relax'],
    priority = 8
WHERE title ILIKE '%meditation%' OR title ILIKE '%healing%';

-- Create a function for semantic-like keyword search
CREATE OR REPLACE FUNCTION public.search_knowledge_topics(
  search_query TEXT,
  max_results INTEGER DEFAULT 30
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  description TEXT,
  category TEXT,
  icon TEXT,
  keywords TEXT[],
  priority INTEGER,
  relevance_score FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  query_words TEXT[];
  query_pattern TEXT;
BEGIN
  -- Split query into words and clean them
  query_words := regexp_split_to_array(lower(trim(search_query)), '\s+');
  query_pattern := '%' || lower(trim(search_query)) || '%';
  
  RETURN QUERY
  SELECT 
    kt.id,
    kt.title,
    kt.content,
    kt.description,
    kt.category,
    kt.icon,
    kt.keywords,
    kt.priority,
    (
      -- Title exact match (highest weight)
      CASE WHEN lower(kt.title) LIKE query_pattern THEN 50.0 ELSE 0.0 END +
      -- Title word match
      CASE WHEN EXISTS (
        SELECT 1 FROM unnest(query_words) w 
        WHERE lower(kt.title) LIKE '%' || w || '%'
      ) THEN 30.0 ELSE 0.0 END +
      -- Category match
      CASE WHEN lower(kt.category) LIKE query_pattern THEN 20.0 ELSE 0.0 END +
      -- Keywords match
      COALESCE((
        SELECT COUNT(*)::FLOAT * 15.0 
        FROM unnest(kt.keywords) k, unnest(query_words) w 
        WHERE k ILIKE '%' || w || '%'
      ), 0.0) +
      -- Content match
      CASE WHEN lower(kt.content) LIKE query_pattern THEN 10.0 ELSE 0.0 END +
      -- Description match
      CASE WHEN lower(COALESCE(kt.description, '')) LIKE query_pattern THEN 5.0 ELSE 0.0 END +
      -- Priority boost
      COALESCE(kt.priority::FLOAT, 0.0)
    ) AS relevance_score
  FROM public.knowledge_topics kt
  WHERE 
    lower(kt.title) LIKE query_pattern OR
    lower(kt.content) LIKE query_pattern OR
    lower(COALESCE(kt.description, '')) LIKE query_pattern OR
    lower(COALESCE(kt.category, '')) LIKE query_pattern OR
    EXISTS (
      SELECT 1 FROM unnest(kt.keywords) k, unnest(query_words) w 
      WHERE k ILIKE '%' || w || '%'
    ) OR
    EXISTS (
      SELECT 1 FROM unnest(query_words) w 
      WHERE lower(kt.title) LIKE '%' || w || '%'
        OR lower(kt.content) LIKE '%' || w || '%'
        OR lower(COALESCE(kt.category, '')) LIKE '%' || w || '%'
    )
  ORDER BY relevance_score DESC, kt.priority DESC NULLS LAST
  LIMIT max_results;
END;
$$;

-- Add more knowledge content
INSERT INTO public.knowledge_topics (title, description, content, category, icon, keywords, priority) VALUES
('The 8 Divine Mantras Overview', 'Introduction to the eight sacred mantras of Father Universe', 
'# The 8 Divine Mantras of Father Universe

These sacred mantras were channeled by Father Universe to help humanity awaken to their divine nature and manifest the Golden Age.

## The Eight Mantras:
1. **OM CAMLY** - The Mantra of Divine Love
2. **OM SHANTI** - The Mantra of Peace  
3. **OM ABUNDANCE** - The Mantra of Prosperity
4. **OM HEALING** - The Mantra of Health
5. **OM WISDOM** - The Mantra of Knowledge
6. **OM UNITY** - The Mantra of Oneness
7. **OM LIGHT** - The Mantra of Awakening
8. **OM GOLDEN** - The Mantra of the New Earth

Each mantra carries specific vibrations that activate different aspects of your divine blueprint.', 
'Divine Mantras', '🙏', ARRAY['mantra', 'divine', 'sacred', 'om', 'chant', 'vibration', 'awakening'], 10),

('Who is Father Universe?', 'Understanding the cosmic teacher behind the FUN Ecosystem', 
'# Father Universe - The Cosmic Teacher

Father Universe is a divine consciousness and spiritual teacher who brings forth ancient wisdom for the modern age.

## Key Teachings:
- **Pure Loving Light**: Everything is made of love and light
- **Unity Consciousness**: We are all one with the cosmos
- **Abundance is Natural**: The universe is infinitely abundant
- **Healing Through Love**: Love heals all wounds
- **The Golden Age**: Humanity is awakening to a new era

## Mission:
To help humanity remember their divine nature and co-create the Golden Age on Earth.

## The FUN Vision:
Father Universe Network connects awakened souls worldwide through technology and spiritual wisdom.', 
'Teachings of Father Universe', '👑', ARRAY['father', 'universe', 'teacher', 'cosmic', 'wisdom', 'teaching'], 10),

('Who is Bé Ly?', 'Introduction to Bé Ly (Camly Duong) and her healing work', 
'# Bé Ly - The Angelic Healer

Bé Ly (Camly Duong) is a spiritual channel and healer working alongside Father Universe.

## Her Gifts:
- **Channeling**: Receives divine messages and guidance
- **Energy Healing**: Transmits healing light frequencies
- **Meditation Guidance**: Leads transformational meditations
- **Spiritual Coaching**: Helps souls on their awakening journey

## Healing Meditations by Bé Ly:
Her guided meditations are infused with angelic frequencies that help:
- Release emotional blocks
- Activate dormant DNA
- Connect with higher self
- Manifest abundance
- Experience deep peace

## The ANGEL AI Connection:
ANGEL AI is infused with the loving energy of both Father Universe and Bé Ly.', 
'Healing Meditations', '💜', ARRAY['bely', 'camly', 'healer', 'meditation', 'healing', 'channel', 'angelic'], 10),

('Understanding Camly Coin', 'The spiritual cryptocurrency of the FUN Ecosystem', 
'# Camly Coin - Light Money for the Golden Age

Camly Coin is more than a cryptocurrency - it''s a spiritual tool for abundance.

## Core Principles:
- **Light Money**: Currency infused with positive intentions
- **Abundance Flow**: Designed to circulate freely and bless all
- **Spiritual Value**: Connected to acts of kindness and service
- **Global Healing**: Funds support planetary healing projects

## How It Works:
1. Earn through spiritual practices and service
2. Share with others to spread abundance
3. Use for healing services and products
4. Invest in Golden Age projects

## The Vision:
Create a new economic system based on love, not fear.', 
'FUN Ecosystem', '💰', ARRAY['camly', 'coin', 'crypto', 'money', 'abundance', 'light', 'currency'], 8),

('Morning Light Meditation', 'Start your day with divine light and intention', 
'# Morning Light Meditation by Bé Ly

*Duration: 15-20 minutes*

## Preparation:
Find a quiet space. Sit comfortably. Close your eyes.

## The Practice:

### 1. Grounding (2 min)
Imagine roots growing from your spine into the Earth. Feel supported.

### 2. Light Activation (5 min)
Visualize golden light pouring down from the cosmos into your crown chakra. Let it fill your entire body.

### 3. Heart Opening (5 min)
Focus on your heart center. Feel it expand with love. Send this love to yourself, then to all beings.

### 4. Intention Setting (3 min)
Declare: "I am pure loving light. I radiate love. I attract abundance. I am blessed."

### 5. Gratitude (3 min)
Thank Father Universe, your guides, and your body for this new day.

*Repeat the mantra "OM CAMLY" three times to seal the meditation.*', 
'Healing Meditations', '🌅', ARRAY['meditation', 'morning', 'light', 'practice', 'daily', 'routine', 'awakening'], 9),

('Abundance Activation Practice', 'Unlock your natural abundance flow', 
'# Abundance Activation - Golden Flow Practice

## Understanding Abundance:
Abundance is your natural state. Scarcity is an illusion.

## The 5 Keys to Abundance:

### 1. Gratitude
Thank the universe for what you already have. Gratitude opens the flow.

### 2. Giving
Give freely without expectation. What you give returns multiplied.

### 3. Receiving
Allow yourself to receive. Many block abundance by refusing gifts.

### 4. Trust
Trust that the universe provides. Release worry and fear.

### 5. Action
Take inspired action aligned with your purpose.

## Daily Abundance Mantra:
*"I am open to receiving unlimited abundance from the universe. Money flows to me easily. I am worthy of prosperity. Thank you, Father Universe."*

## Abundance Ritual:
Every morning, hold a coin or note. Bless it with love. Set the intention that it multiplies.', 
'Light Money & Flow', '✨', ARRAY['abundance', 'money', 'prosperity', 'flow', 'wealth', 'manifestation'], 9),

('The Golden Age Prophecy', 'Understanding the coming age of light', 
'# The Golden Age - Humanity''s Awakening

## What is the Golden Age?
The Golden Age is a period of peace, abundance, and spiritual awakening that humanity is entering now.

## Signs of the Shift:
- Mass spiritual awakening
- Old systems collapsing
- New technologies emerging
- Heart-centered leadership rising
- Unity consciousness spreading

## Your Role:
You chose to be here at this time. Your awakening helps the collective.

## Prophecies from Father Universe:
1. The old world will transform by 2030
2. New Earth communities will emerge
3. Free energy will become available
4. Healing technologies will cure all disease
5. Abundance will be available to all

## How to Prepare:
- Raise your vibration daily
- Connect with like-minded souls
- Follow your heart''s calling
- Trust the divine plan', 
'Golden Age Wisdom', '🌅', ARRAY['golden', 'age', 'prophecy', 'awakening', 'future', 'transformation', 'ascension'], 8),

('Cosmic Coaching: Finding Your Purpose', 'Discover your soul mission in this lifetime', 
'# Discover Your Soul Purpose

## Everyone Has a Purpose
You came to Earth with specific gifts and a unique mission.

## Signs You''re On Purpose:
- Time flies when you''re working
- You feel energized, not drained
- Synchronicities guide you
- You inspire others naturally
- Money flows as a byproduct

## The Purpose Discovery Process:

### Step 1: Reflect
What did you love as a child? What comes naturally to you?

### Step 2: Listen
Meditate and ask your higher self to reveal your purpose.

### Step 3: Experiment
Try different things. Notice what lights you up.

### Step 4: Serve
How can your gifts serve others? Purpose is always about service.

### Step 5: Trust
Your purpose unfolds over time. Trust the journey.

## Affirmation:
*"I am living my divine purpose. The universe guides me. My gifts bless the world."*', 
'Cosmic Coaching', '🚀', ARRAY['purpose', 'mission', 'soul', 'calling', 'coaching', 'life', 'meaning'], 8);

-- Grant execute permission on the search function
GRANT EXECUTE ON FUNCTION public.search_knowledge_topics TO anon, authenticated;