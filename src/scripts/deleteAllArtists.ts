import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "YOUR_SUPABASE_URL";
const supabaseAnonKey = "YOUR_SUPABASE_ANON_KEY"; // Use service_role key for full access

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function deleteAllArtists() {
  // Fetch all artists with image URLs
  const { data: allArtists, error: fetchError } = await supabase.from("artists").select("id, image_url");
  if (fetchError) {
    console.error("Failed to fetch artists:", fetchError);
    return;
  }

  const paths: string[] = [];
  allArtists?.forEach((artist: any) => {
    if (artist.image_url) {
      try {
        const urlObj = new URL(artist.image_url);
        const p = urlObj.pathname.split("/").pop();
        if (p) paths.push(p);
      } catch (_) {}
    }
  });

  // Delete artist records
  const { error: deleteError } = await supabase.from("artists").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (deleteError) {
    console.error("Delete artists failed:", deleteError);
    return;
  }

  // Delete images from storage bucket "artist-images"
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage.from("artist-images").remove(paths);
    if (storageError) console.error("Failed to delete artist images:", storageError);
  }

  console.log("All artists and their images have been deleted.");
}

deleteAllArtists().catch(console.error);
