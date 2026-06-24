import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://wrqmeyjmlrnnxvrhlact.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndycW1leWptbHJubnh2cmhsYWN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MDIwMjMsImV4cCI6MjA5NzM3ODAyM30.2_x6UdWQeZhxxZ2ynyuRG2psOoONr5A-NdRMeyc-TOo";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function main() {
    const artistId = '4f19611e-d242-4f36-9c19-527fc3a47e12';
    console.log("Checking artworks for artist", artistId);
    const { data: artworks, error } = await supabase.from('artworks').select('*').eq('artist_id', artistId);
    if (error) {
        console.error("Error fetching artworks:", error);
    } else {
        console.log(`Found ${artworks.length} artworks`);
    }
}
main();
