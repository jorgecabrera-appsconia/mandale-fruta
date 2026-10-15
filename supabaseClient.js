// Supabase Client Configuration
// Project: mandale-fruta (ID: wogykodoovgwcjdxmosw)

const SUPABASE_URL = 'https://wogykodoovgwcjdxmosw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvZ3lrb2Rvb3Znd2NqZHhtb3N3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTczMzksImV4cCI6MjEwNzY3MzMzOX0.0svx5v2edhzt3dNdVvJ1Wk6h3EVK9nIZ2JYGcHcYSKY';

// Export for module systems or attach to window for plain browser scripts
if (typeof window !== 'undefined') {
  window.SUPABASE_CONFIG = {
    url: SUPABASE_URL,
    anonKey: SUPABASE_KEY
  };
}
