export type Role = "member" | "board";

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  house_id: number | null;
  role: Role;
  board_title: string | null;
  status: "active" | "removed";
  phone: string | null;
  in_directory: boolean;
  show_phone: boolean;
  notify_board: boolean;
  notify_replies: boolean;
  notify_comments: boolean;
  notify_new_listings: boolean;
  notify_new_events: boolean;
  created_at: string;
};

export type House = { id: number; street_number: string; street: string };

export type PostType = "listing" | "event" | "question" | "announcement" | "sighting";

export type Post = {
  id: number;
  type: PostType;
  author_id: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
  hidden: boolean;
  pinned_until: string | null;
  emailed_at: string | null;
  emailed_count: number | null;
  price_cents: number | null;
  is_free: boolean;
  category: string | null;
  listing_status: "available" | "pending" | "sold" | null;
  expires_at: string | null;
  starts_at: string | null;
  ends_at: string | null;
  location: string | null;
};

export type Author = { id: string; full_name: string; role: Role; status: string; house: House | null };

export type PostWithAuthor = Post & {
  author: Author;
  photos: { id: number; path: string; position: number }[];
  comments: { count: number }[];
};

export const CATEGORIES = ["Furniture", "Kids", "Yard & garden", "Tools", "Electronics", "Clothing", "Other"] as const;

/** Select string for a post with its author, photos and comment count. */
export const POST_SELECT =
  "*, author:profiles!posts_author_id_fkey(id, full_name, role, status, house:houses(*)), photos:post_photos(id, path, position), comments(count)";

/** Categories for recommended services, based on the old amherstwoods.com Resources page. */
export const SERVICE_CATEGORIES = [
  "Appliance repair", "Arborist & tree work", "Carpentry", "Chimney", "Cleaning", "Computer help", "Electrician",
  "Excavation & septic/sewer", "Flooring", "General contractor", "Gutters & windows", "Heating & cooling",
  "Landscaping & lawn", "Masonry", "Movers", "Painting", "Pet sitting", "Plumbing", "Power washing", "Roofing",
  "Snow plowing", "Solar", "Trash & recycling", "Upholstery", "Other",
] as const;

export const DOC_CATEGORIES = [
  "By-laws and rules", "Annual meeting minutes", "Board meeting minutes", "Financial", "Neighborhood history", "Other",
] as const;

export const BOARD_TITLES = ["President", "Vice President", "Secretary", "Treasurer", "Board member"] as const;
